import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const code = fs.readFileSync(new URL('../js/analytics.js', import.meta.url), 'utf8');
function context(hostname = 'dnomad-space.github.io', privacy = false) {
  const scripts = [], events = [];
  const window = {};
  const state = { window, navigator: { globalPrivacyControl: privacy }, location: { hostname, origin: 'https://' + hostname, pathname: '/juyuon/', search: '?lat=37.123&address=private' }, document: { referrer: 'https://example.com/private?query=secret', createElement: () => ({}), head: { appendChild: value => scripts.push(value) }, addEventListener: (...args) => events.push(args) }, Set, URL, Date };
  vm.createContext(state); return { state, window, scripts, events };
}
test('production GA initializes only once with the existing property and sanitized URL', () => {
  const c = context(); vm.runInContext(code, c.state); vm.runInContext(code, c.state);
  assert.equal(c.scripts.length, 1); assert.match(c.scripts[0].src, /G-DS93VNJFRN/);
  const config = Array.from(c.window.dataLayer[1]); assert.equal(config[2].page_location, 'https://dnomad-space.github.io/juyuon/'); assert.equal(config[2].page_referrer, 'https://example.com/');
  assert.equal(c.events.length, 1);
});
test('telemetry excludes raw user fields and ignores local QA and privacy opt-outs', () => {
  const c = context(); vm.runInContext(code, c.state);
  c.window.juyuonTrack('comparison_calculate', { source: 'price_only', latitude: 37, address: 'private', firstPrice: 1800 });
  const params = c.window.dataLayer.at(-1)[2]; assert.deepEqual(Object.keys(params), ['source']);
  for (const c of [context('localhost'), context('dnomad-space.github.io', true)]) { vm.runInContext(code, c.state); c.window.juyuonTrack('briefing_view', {}); assert.equal(c.scripts.length, 0); assert.equal(c.window.dataLayer.length, 0); }
});
