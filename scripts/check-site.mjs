import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const pages = ['index.html', 'guide/index.html', 'download/index.html', 'privacy/index.html', '404.html'];
let links = 0;
for (const relative of pages) {
  const full = path.join(root, relative);
  const html = fs.readFileSync(full, 'utf8');
  assert.match(html, /<html[^>]+lang="ko"/i, `${relative} language`);
  assert.match(html, /<title>[^<]+<\/title>/i, `${relative} title`);
  assert.match(html, /name="description"/i, `${relative} description`);
  assert.match(html, /<h1[\s>]/i, `${relative} H1`);
  assert.doesNotMatch(html, /\{\{[A-Z_]+\}\}/, `${relative} render tokens`);
  for (const match of html.matchAll(/<script[^>]+type="application\/(?:ld\+)?json"[^>]*>([\s\S]*?)<\/script>/g)) JSON.parse(match[1]);
  for (const match of html.matchAll(/(?:href|src)="([^"]+)"/g)) {
    const url = match[1].split('#')[0].split('?')[0];
    if (!url || /^(https?:|mailto:|data:|tel:)/.test(url)) continue;
    let local = url.startsWith('/juyuon/') ? path.join(root, url.slice('/juyuon/'.length)) : path.resolve(path.dirname(full), url);
    if (url.endsWith('/')) local = path.join(local, 'index.html');
    assert.ok(local.startsWith(root), `${relative} link escapes project: ${url}`);
    assert.ok(fs.existsSync(local), `${relative} missing link: ${url}`); links++;
  }
}
const sitemap = fs.readFileSync(path.join(root, 'sitemap.xml'), 'utf8');
for (const match of sitemap.matchAll(/<loc>(.*?)<\/loc>/g)) {
  const url = new URL(match[1]); assert.equal(url.origin, 'https://dnomad-space.github.io');
  assert.ok(url.pathname.startsWith('/juyuon/')); assert.equal(url.search, '');
  const file = path.join(root, url.pathname.slice('/juyuon/'.length), 'index.html');
  assert.ok(fs.existsSync(file), `Sitemap missing route: ${match[1]}`);
}
console.log(`Checked ${pages.length} HTML pages, JSON data, sitemap and ${links} internal references.`);
