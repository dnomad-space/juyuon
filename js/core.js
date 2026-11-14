export const FUEL_TYPES = Object.freeze({ gasoline: '휘발유', diesel: '경유', premium_gasoline: '고급휘발유' });
export const MAX_AGE_HOURS = 48;

export function finite(value) {
  if (value === null || value === undefined || typeof value === 'boolean' || (typeof value === 'string' && !value.trim())) return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

export function positive(value) {
  const number = finite(value);
  return number !== null && number > 0 ? number : null;
}

export function freshness(issuedAt, now = Date.now()) {
  if (typeof issuedAt !== 'string' || !/(Z|[+-]\d{2}:\d{2})$/.test(issuedAt)) return { usable: false, reason: 'unknown', hours: null };
  const time = Date.parse(issuedAt);
  const hours = (now - time) / 3600000;
  if (!Number.isFinite(hours) || hours < -0.1) return { usable: false, reason: 'unknown', hours: null };
  return { usable: hours < MAX_AGE_HOURS, reason: hours < MAX_AGE_HOURS ? 'current_issue' : 'older_issue', hours };
}

export function estimateFuelCost(price, liters) {
  const p = positive(price), l = positive(liters);
  return p !== null && l !== null && l <= 200 ? Math.round(p * l) : null;
}

export function forecastComparison(data, fuelType, liters, days, now = Date.now()) {
  if (fuelType !== 'gasoline' || data?.forecast?.fuel_type !== 'gasoline') return { available: false, reason: 'unsupported_fuel' };
  if (!freshness(data?.issued_at, now).usable || !freshness(data?.forecast?.issued_at, now).usable) return { available: false, reason: 'stale' };
  if (data?.forecast?.status !== 'published_reference_scenario') return { available: false, reason: 'missing' };
  const l = positive(liters), base = positive(data?.forecast?.model_baseline_price);
  if (l === null || l > 200 || base === null || ![7, 14].includes(days)) return { available: false, reason: 'invalid_input' };
  const point = data?.forecast?.points?.find(p => p.day === days && p.kind === 'forecast');
  const horizon = data?.forecast?.horizons?.[String(days)];
  const price = positive(point?.price);
  const expectedDate = new Date(`${data?.forecast?.baseline_date}T00:00:00Z`);
  if (!Number.isFinite(expectedDate.getTime())) return { available: false, reason: 'missing' };
  expectedDate.setUTCDate(expectedDate.getUTCDate() + days);
  if (price === null || point?.date !== expectedDate.toISOString().slice(0, 10) || horizon?.date !== point.date || horizon?.days !== days || positive(horizon?.price) !== price) return { available: false, reason: 'missing' };
  return { available: true, date: point.date, days, price, baseline: base, perLiter: Math.round((price - base) * 100) / 100, difference: Math.round((price - base) * l) };
}

export function compareStations({ firstPrice, secondPrice, liters, extraKm = 0, efficiency = null }) {
  const first = positive(firstPrice), second = positive(secondPrice), amount = positive(liters), km = finite(extraKm);
  if (first === null || second === null || first > 10000 || second > 10000 || amount === null || amount > 200 || km === null || km < 0 || km > 1000) return null;
  const economy = positive(efficiency);
  if (km > 0 && (economy === null || economy > 100)) return null;
  const difference = Math.round((first - second) * amount);
  const travelCost = Math.round(km > 0 ? km / economy * first : 0);
  return { priceDifference: difference, travelCost, netDifference: difference - travelCost };
}

export function loadPreferences(storage) {
  try {
    const parsed = JSON.parse(storage.getItem('juyuon.web.preferences.v2') || '{}');
    return { fuelType: Object.hasOwn(FUEL_TYPES, parsed.fuelType) ? parsed.fuelType : 'gasoline', liters: [20, 40, 60].includes(parsed.liters) ? parsed.liters : 40 };
  } catch { return { fuelType: 'gasoline', liters: 40 }; }
}

export function savePreferences(storage, prefs) {
  try { storage.setItem('juyuon.web.preferences.v2', JSON.stringify({ fuelType: prefs.fuelType, liters: prefs.liters })); } catch { /* Private browsing must not block calculations. */ }
}

export function formatPrice(value) {
  const n = finite(value);
  return n === null ? '확인 필요' : n.toLocaleString('ko-KR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function formatWon(value) { const n = finite(value); return n === null ? '확인 필요' : Math.round(n).toLocaleString('ko-KR'); }
export function shortDate(value) { return /^\d{4}-\d{2}-\d{2}$/.test(value || '') ? `${Number(value.slice(5, 7))}.${Number(value.slice(8, 10))}` : '날짜 확인 필요'; }
export function issueLabel(value) {
  if (!value || !freshness(value, Date.parse(value)).usable) return '발행 시각 확인 필요';
  return new Intl.DateTimeFormat('ko-KR', { timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date(value));
}
export function escapeHtml(value) { return String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }

/** Chart only actual source points. Missing observations break the line. */
export function renderPriceChart(data, showForecast = false) {
  const history = (data?.history?.points || []).slice(-14).filter(p => /^\d{4}-\d{2}-\d{2}$/.test(p?.date));
  const lastObserved = [...history].reverse().find(p => positive(p.price) !== null);
  if (!lastObserved) return '<p class="empty-state">가격 흐름을 그릴 관측값이 부족합니다.</p>';
  const future = showForecast ? (data?.forecast?.points || []).filter(p => p.day > 0 && positive(p.price) !== null && /^\d{4}-\d{2}-\d{2}$/.test(p?.date)) : [];
  const valid = [...history, ...future].filter(p => positive(p.price) !== null);
  if (valid.length < 2) return '<p class="empty-state">가격 흐름을 그릴 관측값이 부족합니다.</p>';
  const W = 720, H = 246, pad = { l: 12, r: 68, t: 20, b: 40 };
  const dates = [...history, ...future].map(p => Date.parse(`${p.date}T00:00:00Z`));
  const minTime = Math.min(...dates), maxTime = Math.max(...dates);
  const prices = valid.map(p => p.price), lo = Math.min(...prices) - 5, hi = Math.max(...prices) + 5;
  const x = date => pad.l + (Date.parse(`${date}T00:00:00Z`) - minTime) / Math.max(86400000, maxTime - minTime) * (W - pad.l - pad.r);
  const y = price => pad.t + (hi - price) / (hi - lo) * (H - pad.t - pad.b);
  let paths = [], run = [];
  for (const point of history) {
    if (positive(point.price) !== null) run.push(point); else if (run.length) { paths.push(run); run = []; }
  }
  if (run.length) paths.push(run);
  const path = series => series.map((p, i) => `${i ? 'L' : 'M'}${x(p.date).toFixed(2)} ${y(p.price).toFixed(2)}`).join(' ');
  const last = [...history].reverse().find(p => positive(p.price) !== null);
  const grid = [0, 0.5, 1].map(r => { const p = lo + r * (hi - lo), yy = y(p); return `<line x1="${pad.l}" y1="${yy}" x2="${W - pad.r}" y2="${yy}" stroke="#E8E9E4"/><text x="${W - pad.r + 12}" y="${yy + 4}" fill="#7F827B" font-size="12">${Math.round(p).toLocaleString('ko-KR')}</text>`; }).join('');
  const observed = paths.map(series => `<path d="${path(series)}" fill="none" stroke="#242D29" stroke-width="2.5"/>`).join('');
  const forecast = future.length ? `<path d="${path([last, ...future])}" fill="none" stroke="#8C720A" stroke-width="2.5" stroke-dasharray="5 6"/>` : '';
  const lastX = x(last.date), lastY = y(last.price);
  const end = future.at(-1) || last;
  return `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="휘발유 전국 평균, 발행일별 저장 가격${future.length ? '과 발행 당시 예측 시나리오' : ''}. 원천 관측시각은 제공되지 않습니다." class="price-chart"><title>발행본에 담긴 휘발유 가격 흐름</title>${grid}${observed}${forecast}<circle cx="${lastX}" cy="${lastY}" r="5" fill="#242D29" stroke="#fff" stroke-width="3"/><text x="${pad.l}" y="${H - 10}" fill="#7F827B" font-size="12">${shortDate(history[0].date)}</text><text x="${Math.min(W - pad.r, Math.max(pad.l + 60, lastX))}" y="${H - 10}" fill="#384238" font-size="12" text-anchor="end">${shortDate(last.date)} 발행</text>${future.length ? `<text x="${x(end.date)}" y="${H - 10}" fill="#8C720A" font-size="12" text-anchor="end">${shortDate(end.date)} 예상</text>` : ''}</svg>`;
}
