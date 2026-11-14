import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { escapeHtml, formatPrice, formatWon, estimateFuelCost, issueLabel, shortDate, renderPriceChart, finite } from '../js/core.js';
const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const data = JSON.parse(fs.readFileSync(path.join(root, 'data/briefing.json'), 'utf8'));
if (data.schema_version !== 2 || !data.issued_at || !data.prices) throw new Error('Invalid briefing data');
const origin = 'https://dnomad-space.github.io/juyuon/';
const schema = { '@context': 'https://schema.org', '@graph': [
  { '@type': 'WebSite', '@id': `${origin}#website`, url: origin, name: '주유온', alternateName: '주유ON', inLanguage: 'ko-KR', description: '유가 정보와 주유 타이밍 참고 전망, 주유비 비교 계산을 제공하는 서비스' },
  { '@type': 'WebPage', '@id': `${origin}#webpage`, url: origin, name: '주유온 2.0 | 주유 타이밍과 주유비 비교', inLanguage: 'ko-KR', isPartOf: { '@id': `${origin}#website` }, about: { '@type': 'Thing', name: '주유비와 유가 정보' } },
  { '@type': 'WebApplication', '@id': `${origin}#calculator`, name: '주유온 주유비 비교 계산기', url: `${origin}#compare`, applicationCategory: 'UtilitiesApplication', operatingSystem: '웹 브라우저', inLanguage: 'ko-KR', description: '사용자가 입력한 두 주유소 가격, 주유량, 추가 이동거리와 연비로 예상 비용을 비교합니다.', offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' } }
] };
const fuels = Object.values(data.prices);
const change = finite(data.prices.gasoline.change);
const tokens = {
  SCHEMA: JSON.stringify(schema).replaceAll('<', '\\u003c'),
  ISSUED_AT: escapeHtml(data.issued_at),
  ISSUED_LABEL: escapeHtml(issueLabel(data.issued_at)),
  GASOLINE_PRICE: formatPrice(data.prices.gasoline.price),
  PRICE_CHANGE: change === null ? '이전 저장값 비교 불가' : `${change < 0 ? '↘' : change > 0 ? '↗' : '−'} ${Math.abs(change).toFixed(2)}원 · ${shortDate(data.prices.gasoline.comparison_date)} 저장값 대비`,
  CHART: renderPriceChart(data),
  PRICE_ROWS: fuels.map(f => `<tr><th scope="row">${escapeHtml(f.label)}</th><td>${formatPrice(f.price)}</td><td>${finite(f.change) === null ? '확인 필요' : `${f.change > 0 ? '+' : ''}${Number(f.change).toFixed(2)}`}</td></tr>`).join(''),
  COST_40: formatWon(estimateFuelCost(data.prices.gasoline.price, 40)),
  REGION_COUNT: String(data.regional_summaries.length),
  REGION_ROWS: data.regional_summaries.map(r => `<tr><th scope="row">${escapeHtml(r.name)}</th><td>${formatPrice(r.price)}</td></tr>`).join(''),
  DATA: JSON.stringify(data).replaceAll('<', '\\u003c').replaceAll('>', '\\u003e').replaceAll('&', '\\u0026')
};
let template = fs.readFileSync(path.join(root, 'index.template.html'), 'utf8');
template = template.replace(/\{\{([A-Z_]+)\}\}/g, (_, key) => { if (!(key in tokens)) throw new Error(`Unknown token ${key}`); return tokens[key]; });
fs.writeFileSync(path.join(root, 'index.html'), template);
console.log(`Rendered public HTML from ${data.issued_at}; ${data.regional_summaries.length} regional samples.`);
