import { FUEL_TYPES, finite, freshness, estimateFuelCost, forecastComparison, compareStations, loadPreferences, savePreferences, formatPrice, formatWon, issueLabel, shortDate, escapeHtml, renderPriceChart } from './core.js';

const $ = id => document.getElementById(id);
const track = (event, params) => window.juyuonTrack?.(event, params);
let data;
try { data = JSON.parse($('briefing-data').textContent); } catch { data = null; }

if (!data || data.schema_version !== 2 || !data.prices) {
  $('data-notice').textContent = '브리핑 데이터를 읽을 수 없습니다. 표시된 발행일을 확인하거나 아래에서 주유소 가격을 직접 비교해 주세요.';
  $('data-notice').classList.add('warning');
  track('web_data_error', { reason: 'invalid_snapshot' });
}

let storage;
try { storage = window.localStorage; } catch { storage = null; }
const preferences = loadPreferences(storage);
let state = { ...preferences, showForecast: false };

function render() {
  if (!data) return;
  const selected = data.prices[state.fuelType];
  if (!selected) return;
  const age = freshness(data.issued_at);
  const current = finite(selected.price);
  $('issued-at').textContent = `${issueLabel(data.issued_at)} KST 발행`;
  $('freshness-badge').textContent = age.usable ? '발행 시점 데이터' : age.reason === 'older_issue' ? '지난 발행본' : '발행 시각 확인 필요';
  $('freshness-badge').classList.toggle('older', !age.usable);
  $('data-notice').classList.toggle('warning', !age.usable);
  $('data-notice').textContent = age.usable
    ? '이 페이지는 발행 시점의 데이터를 담고 있습니다. 가격의 원천 관측 시각은 제공되지 않아 발행 시각과 구분합니다.'
    : '발행 후 48시간이 지났거나 발행 시각을 확인할 수 없어 전망 비교를 중단했습니다. 표시 가격은 지난 발행본이며, 아래에서 주유소 가격을 직접 비교할 수 있습니다.';
  $('current-price').textContent = formatPrice(current);
  const change = finite(selected.change);
  $('price-change').innerHTML = change === null ? '이전 가격과 비교할 데이터가 없습니다.' : `<span class="${change < 0 ? 'down' : change > 0 ? 'up' : ''}">${change < 0 ? '↘' : change > 0 ? '↗' : '−'} ${Math.abs(change).toFixed(2)}원</span> · ${escapeHtml(shortDate(selected.comparison_date))} 저장값 대비`;
  $('cost-label').textContent = `${selected.label} ${state.liters}L · 발행본 가격 기준`;
  const cost = estimateFuelCost(current, state.liters);
  $('estimated-cost').innerHTML = `${formatWon(cost)}<small>${cost === null ? '' : '원'}</small>`;
  document.querySelectorAll('[data-fuel]').forEach(button => {
    const active = button.dataset.fuel === state.fuelType;
    button.classList.toggle('active', active); button.setAttribute('aria-pressed', String(active));
  });
  document.querySelectorAll('[data-liters]').forEach(button => {
    const active = Number(button.dataset.liters) === state.liters;
    button.classList.toggle('active', active); button.setAttribute('aria-pressed', String(active));
  });
  const checks = [7, 14].map(days => forecastComparison(data, state.fuelType, state.liters, days));
  const canShowForecast = state.fuelType === 'gasoline' && checks.every(check => check.available);
  if (!canShowForecast) state.showForecast = false;
  $('show-forecast').checked = state.showForecast;
  $('show-forecast').disabled = !canShowForecast;
  if (state.fuelType === 'gasoline') {
    $('price-chart').innerHTML = renderPriceChart(data, state.showForecast);
    $('chart-note').textContent = state.showForecast
      ? '실선은 발행일별 저장값, 점선은 발행 당시 모델 시나리오입니다. 예측 오차 범위나 실제 미래 가격을 뜻하지 않습니다.'
      : '휘발유 전국 평균의 발행일별 저장값입니다. 관측 누락은 선으로 연결하지 않습니다.';
  } else {
    $('price-chart').innerHTML = `<p class="empty-state">${escapeHtml(FUEL_TYPES[state.fuelType])}의 과거 가격 이력과 전망은 제공하지 않습니다.<br>확인된 현재 발행본 가격으로 주유비를 계산해 보세요.</p>`;
    $('chart-note').textContent = '다른 유종의 가격이나 전망을 대신 표시하지 않습니다.';
  }
  const comparison = $('forecast-comparison');
  if (!age.usable) {
    comparison.innerHTML = '<p class="stale-forecast">지난 발행본의 전망 비교는 멈췄습니다.<br>방문할 주유소의 현재 가격을 직접 비교해 주세요.</p>';
  } else if (state.fuelType !== 'gasoline') {
    comparison.innerHTML = `<p class="stale-forecast">${escapeHtml(FUEL_TYPES[state.fuelType])} 미래 가격 전망은 제공하지 않습니다.<br>위 금액은 발행본 전국 평균 × ${state.liters}L입니다.</p>`;
  } else {
    comparison.innerHTML = `<p class="forecast-intro">발행 당시 전망대로 변한다면 · ${state.liters}L 기준</p>${checks.map((item, i) => item.available
      ? `<div class="forecast-row"><span>${shortDate(item.date)}<small>${item.days}일 전망</small></span><strong class="${item.difference < 0 ? 'down' : item.difference > 0 ? 'up' : ''}">${item.difference > 0 ? '+' : item.difference < 0 ? '−' : ''}${formatWon(Math.abs(item.difference))}원</strong></div>`
      : `<div class="forecast-row"><span>${[7, 14][i]}일 전망</span><span>비교 데이터 없음</span></div>`).join('')}<p class="forecast-intro">모델 기준가 ${formatPrice(data.forecast?.model_baseline_price)}원/L 대비. 실제 절약액이 아닙니다.</p>`;
  }
}

document.querySelectorAll('[data-fuel]').forEach(button => button.addEventListener('click', () => {
  const fuelType = button.dataset.fuel;
  if (!Object.hasOwn(FUEL_TYPES, fuelType) || fuelType === state.fuelType) return;
  state.fuelType = fuelType;
  savePreferences(storage, state); render();
  track('fuel_select', { fuel_type: fuelType, source: 'briefing' });
}));

document.querySelectorAll('[data-liters]').forEach(button => button.addEventListener('click', () => {
  const liters = Number(button.dataset.liters);
  if (![20, 40, 60].includes(liters) || liters === state.liters) return;
  state.liters = liters; $('compare-liters').value = String(liters);
  savePreferences(storage, state); render();
  track('volume_select', { fuel_type: state.fuelType, volume_bucket: String(liters), source: 'briefing' });
}));

$('show-forecast').addEventListener('change', event => {
  state.showForecast = event.target.checked; render();
  if (state.showForecast) track('forecast_view', { fuel_type: state.fuelType, horizon_days: 14, data_state: freshness(data.issued_at).reason });
});

$('station-compare').addEventListener('submit', event => {
  event.preventDefault();
  const result = compareStations({ firstPrice: $('first-price').value, secondPrice: $('second-price').value, liters: $('compare-liters').value, extraKm: $('extra-km').value || 0, efficiency: $('efficiency').value });
  if (!result) {
    $('compare-result').innerHTML = '<p class="result-error">가격과 주유량을 확인해 주세요. 추가 이동거리가 있으면 실제 연비도 입력해 주세요.</p>';
    return;
  }
  const net = result.netDifference;
  const message = net > 0 ? `비교한 주유소가 <strong>${formatWon(net)}원</strong> 적게 듭니다.` : net < 0 ? `가까운 주유소가 <strong>${formatWon(-net)}원</strong> 적게 듭니다.` : '입력한 조건에서는 예상 비용이 같습니다.';
  $('compare-result').innerHTML = `<p class="result-main ${net > 0 ? 'result-positive' : net < 0 ? 'result-negative' : ''}">${message}</p><p class="result-breakdown">주유 가격 차이 ${result.priceDifference < 0 ? '−' : ''}${formatWon(Math.abs(result.priceDifference))}원 − 추가 이동 연료비 ${formatWon(result.travelCost)}원<br>입력한 가격과 주유량 기준이며, 실제 절약을 확인한 결과는 아닙니다.</p>`;
  track('comparison_calculate', { result_bucket: net > 0 ? 'comparison_cheaper' : net < 0 ? 'nearby_cheaper' : 'same', volume_bucket: Number($('compare-liters').value) <= 20 ? 'up_to_20' : Number($('compare-liters').value) <= 40 ? '21_to_40' : 'over_40', source: Number($('extra-km').value) > 0 ? 'with_detour' : 'price_only' });
});

$('compare-liters').value = String(state.liters);
render();
if (data) track('briefing_view', { fuel_type: state.fuelType, volume_bucket: String(state.liters), data_state: freshness(data.issued_at).reason, source: 'home' });
setInterval(() => { if (!document.hidden) render(); }, 60000);
