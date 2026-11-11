// Axe + overflow + 44px target sweep over every state, at 1440/1280/1024/900/768/414/375/320 wide, light and dark, reduced motion.
// Usage: node scripts/a11y.mjs [baseUrl]   (default http://127.0.0.1:4174/ux/dev-dashboard/)
// Optional: SHOTS=dir to save a screenshot of each run.
import { chromium } from 'playwright-core';
import { readFileSync, mkdirSync } from 'node:fs';
import { createRequire } from 'node:module';

const base = (process.argv[2] || 'http://127.0.0.1:4174/ux/dev-dashboard/').replace(/\/?$/, '/');
const axe = readFileSync(createRequire(import.meta.url).resolve('axe-core/axe.min.js'), 'utf8');
const shots = process.env.SHOTS;
if (shots) mkdirSync(shots, { recursive: true });

const pages = [
  ['production', ''], ['staging', '?env=staging'], ['preview', '?env=preview'],
  ['failed-filter', '?status=failed'], ['no-results', '?q=no-such-run'],
  ['all-green', '?state=green'], ['loading', '?state=loading'], ['error', '?state=error'], ['empty', '?env=preview&state=empty'],
  ['run-log', '#/run/run-01'], ['run-log-filtered', '?status=failed&service=checkout-api#/run/run-01'], ['run-missing', '#/run/run-99'], ['log-error', '?state=log-error#/run/run-01'],
];
const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || '/usr/bin/google-chrome', args: ['--no-sandbox'] });
let failing = 0, runs = 0, minor = 0;
const WIDTHS = [1440, 1280, 1024, 900, 768, 414, 375, 320];
for (const width of WIDTHS) for (const scheme of ['light', 'dark']) {
  const ctx = await browser.newContext({ viewport: { width, height: 800 }, colorScheme: scheme, reducedMotion: 'reduce' });
  for (const [name, path] of pages) {
    const p = await ctx.newPage();
    await p.goto(base + path, { waitUntil: 'networkidle' });
    await p.waitForTimeout(500);
    await p.addScriptTag({ content: axe });
    const res = await p.evaluate(async () => {
      const r = await axe.run(document, { resultTypes: ['violations'] });
      // Every control is 44px+ both ways. Exempt: inline links inside a sentence (WCAG 2.5.8) and the skip link until focused.
      const small = [...document.querySelectorAll('button, select, input, textarea, [role=tab], summary, a')]
        .filter((el) => !el.closest('p:not(.dd-demo-note)') && el.getClientRects().length && getComputedStyle(el).visibility !== 'hidden')
        .filter((el) => !(el.classList.contains('dd-skip') && document.activeElement !== el))
        .map((el) => [el, el.getBoundingClientRect()]).filter(([, b]) => b.height < 44 || b.width < 44)
        .map(([el, b]) => `${el.tagName.toLowerCase()}:${(el.textContent || el.getAttribute('aria-label') || '').trim().slice(0, 20)}:${Math.round(b.width)}x${Math.round(b.height)}`);
      return { v: r.violations.map((x) => ({ id: x.id, impact: x.impact, n: x.nodes.length })), over: document.documentElement.scrollWidth - window.innerWidth, small };
    });
    runs++;
    const bad = res.v.filter((x) => x.impact === 'serious' || x.impact === 'critical');
    minor += res.v.length - bad.length;
    if (bad.length || res.over > 0 || res.small.length) { failing++; console.log('FAIL', width, scheme, name, JSON.stringify(bad), 'overflow', res.over, 'small', res.small.join(' ')); }
    if (shots) await p.screenshot({ path: `${shots}/${name}-${width}-${scheme}.png`, fullPage: true });
    await p.close();
  }
  await ctx.close();
}
// 200% zoom: each DONE width at half the CSS width and twice the pixel density; nothing may scroll the page sideways
// (the table's own labelled scroll region excepted).
let zoomFail = 0;
for (const width of [1440, 1024, 768, 375, 320]) for (const scheme of ['light', 'dark']) {
  const ctx = await browser.newContext({ viewport: { width: Math.floor(width / 2), height: 400 }, deviceScaleFactor: 2, colorScheme: scheme, reducedMotion: 'reduce' });
  for (const [name, path] of pages) {
    const p = await ctx.newPage();
    await p.goto(base + path, { waitUntil: 'networkidle' });
    await p.waitForTimeout(500);
    const over = await p.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    runs++;
    if (over > 0) { zoomFail++; failing++; console.log('FAIL zoom-200', width, scheme, name, 'overflow', over); }
    await p.close();
  }
  await ctx.close();
}
console.log(`200% zoom at 1440/1024/768/375/320 x light/dark: ${pages.length * 10} runs, ${zoomFail} failing`);
// WCAG 1.4.4 + 1.4.12: at every DONE width plus 640 px (1280 at 200% zoom) with the text-spacing bookmarklet styles applied,
// nothing scrolls the page sideways and no text is clipped by an overflow:hidden box.
const spacing = '* { line-height: 1.5 !important; letter-spacing: 0.12em !important; word-spacing: 0.16em !important; } p { margin-bottom: 2em !important; }';
let spacingFail = 0;
for (const width of [1440, 1024, 768, 640, 375, 320]) {
  const ctx = await browser.newContext({ viewport: { width, height: 800 }, reducedMotion: 'reduce' });
  for (const [name, path] of pages) {
    const p = await ctx.newPage();
    await p.goto(base + path, { waitUntil: 'networkidle' });
    await p.addStyleTag({ content: spacing });
    await p.waitForTimeout(200);
    const r = await p.evaluate(() => ({
      over: document.documentElement.scrollWidth - window.innerWidth,
      clipped: [...document.querySelectorAll('body *')].filter((el) => {
        const cs = getComputedStyle(el);
        if (el.closest('.sr-only, [hidden], dialog:not([open])') || !el.getClientRects().length) return false;
        const hides = (v) => v === 'hidden' || v === 'clip';
        return (hides(cs.overflowX) && el.scrollWidth > el.clientWidth + 1) || (hides(cs.overflowY) && el.scrollHeight > el.clientHeight + 1);
      }).map((el) => `${el.tagName.toLowerCase()}.${el.className}`.slice(0, 50)),
    }));
    runs++;
    if (r.over > 0 || r.clipped.length) { spacingFail++; failing++; console.log('FAIL text-spacing', width, name, 'overflow', r.over, 'clipped', r.clipped.join(' ')); }
    await p.close();
  }
  await ctx.close();
}
console.log(`text spacing at 1440/1024/768/640/375/320: ${pages.length * 6} runs, ${spacingFail} failing`);
await browser.close();
console.log(`axe: ${pages.length * WIDTHS.length * 2} runs (${pages.length} states x ${WIDTHS.join('/')} x light/dark); ${runs} checks in all, ${failing} failing. Minor/moderate: ${minor}`);
process.exit(failing ? 1 : 0);
