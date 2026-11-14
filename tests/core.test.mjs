import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { finite, freshness, estimateFuelCost, forecastComparison, compareStations, loadPreferences, renderPriceChart } from '../js/core.js';
const data = JSON.parse(fs.readFileSync(new URL('../data/briefing.json', import.meta.url)));
const now = Date.parse(data.issued_at) + 3600000;

test('unknown numbers cannot become zero-price observations', () => {
  [null, undefined, '', '  ', false, true, NaN, Infinity].forEach(value => assert.equal(finite(value), null));
  assert.equal(finite(0), 0); assert.equal(estimateFuelCost(null, 40), null); assert.equal(estimateFuelCost(1854.89, 40), 74196);
});
test('freshness uses an explicit timezone and rejects future or old issues', () => {
  assert.equal(freshness(data.issued_at, now).usable, true);
  assert.equal(freshness(data.issued_at, now + 48 * 3600000).usable, false);
  assert.equal(freshness('2026-11-14T09:05:08', now).usable, false);
  assert.equal(freshness(data.issued_at, now - 3 * 3600000).usable, false);
});
test('7/14-day comparisons use actual endpoint and model baseline', () => {
  assert.equal(forecastComparison(data, 'gasoline', 40, 7, now).difference, 220);
  assert.equal(forecastComparison(data, 'gasoline', 40, 14, now).difference, -800);
  assert.equal(forecastComparison(data, 'diesel', 40, 7, now).available, false);
  assert.equal(forecastComparison(data, 'premium_gasoline', 40, 14, now).available, false);
  assert.equal(forecastComparison(data, 'gasoline', 40, 14, now + 72 * 3600000).available, false);
});
test('missing or mislabeled D+14 never reuses a shorter horizon', () => {
  const missing = structuredClone(data); missing.forecast.points = missing.forecast.points.filter(p => p.day !== 14);
  assert.equal(forecastComparison(missing, 'gasoline', 40, 14, now).available, false);
  const mismatch = structuredClone(data); mismatch.forecast.horizons['14'].date = mismatch.forecast.horizons['7'].date;
  assert.equal(forecastComparison(mismatch, 'gasoline', 40, 14, now).available, false);
});
test('roundtrip extra distance can erase price savings and needs real efficiency', () => {
  assert.deepEqual(compareStations({ firstPrice: 1800, secondPrice: 1770, liters: 40 }), { priceDifference: 1200, travelCost: 0, netDifference: 1200 });
  assert.deepEqual(compareStations({ firstPrice: 1800, secondPrice: 1770, liters: 40, extraKm: 10, efficiency: 12 }), { priceDifference: 1200, travelCost: 1500, netDifference: -300 });
  assert.equal(compareStations({ firstPrice: 1800, secondPrice: 1770, liters: 40, extraKm: 10, efficiency: '' }), null);
  assert.equal(compareStations({ firstPrice: 1800, secondPrice: 1770, liters: 0 }), null);
});
test('invalid or unavailable storage keeps a usable calculator', () => {
  assert.deepEqual(loadPreferences({ getItem() { throw new Error(); } }), { fuelType: 'gasoline', liters: 40 });
  assert.deepEqual(loadPreferences({ getItem() { return '{"fuelType":"diesel","liters":60}'; } }), { fuelType: 'diesel', liters: 60 });
});
test('observed chart does not fabricate missing points or a confidence band', () => {
  const chart = renderPriceChart(data);
  assert.match(chart, /<svg/); assert.doesNotMatch(chart, /stroke-dasharray/);
  const projected = renderPriceChart(data, true);
  assert.match(projected, /stroke-dasharray/);
  assert.doesNotMatch(projected, /신뢰구간|예상범위/);
});
