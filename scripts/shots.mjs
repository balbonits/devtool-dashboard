// Milestone screenshots for PROGRESS.md. Usage: node scripts/shots.mjs <wireframe|prototype|final> [baseUrl]
import { chromium } from 'playwright-core';
import { mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const [milestone = 'prototype', baseArg] = process.argv.slice(2);
const base = (baseArg || 'http://127.0.0.1:4174/ux/dev-dashboard/').replace(/\/?$/, '/');
const day = new Date().toLocaleDateString('en-CA');
const out = fileURLToPath(new URL('../docs/screenshots/', import.meta.url));
mkdirSync(out, { recursive: true });
const b = await chromium.launch({ executablePath: process.env.CHROME_PATH || '/usr/bin/google-chrome', args: ['--no-sandbox'] });
async function shot(name, url, { width = 1280, height = 800, scheme = 'light', full = true } = {}) {
  const ctx = await b.newContext({ viewport: { width, height }, colorScheme: scheme, reducedMotion: 'reduce' });
  const p = await ctx.newPage();
  await p.goto(url, { waitUntil: 'networkidle' });
  await p.waitForTimeout(600);
  await p.screenshot({ path: `${out}${day}-${milestone}-${name}.png`, fullPage: full });
  await ctx.close();
}
if (milestone === 'wireframe') {
  await shot('wireframes', new URL('../docs/wireframes/wireframes.html', import.meta.url).href, { width: 1340 });
} else {
  await shot('production-desktop', base);
  await shot('production-mobile-dark', base, { width: 390, height: 844, scheme: 'dark', full: false });
  await shot('failed-filter', base + '?status=failed');
  await shot('no-results', base + '?q=no-such-run');
  await shot('all-green', base + '?state=green');
  await shot('error-mobile', base + '?state=error', { width: 390, height: 844, full: false });
}
await b.close();
console.log('saved', milestone);
