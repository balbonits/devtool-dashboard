// Axe + overflow + 44px target sweep over every state, at 1280/900/414/375/320 wide, light and dark, reduced motion.
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
  ['all-green', '?state=green'], ['loading', '?state=loading'], ['error', '?state=error'],
  ['run-log', '#/run/run-01'], ['run-log-filtered', '?status=failed&service=checkout-api#/run/run-01'], ['run-missing', '#/run/run-99'],
];
const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || '/usr/bin/google-chrome', args: ['--no-sandbox'] });
let failing = 0, runs = 0, minor = 0;
for (const width of [1280, 900, 414, 375, 320]) for (const scheme of ['light', 'dark']) {
  const ctx = await browser.newContext({ viewport: { width, height: 800 }, colorScheme: scheme, reducedMotion: 'reduce' });
  for (const [name, path] of pages) {
    const p = await ctx.newPage();
    await p.goto(base + path, { waitUntil: 'networkidle' });
    await p.waitForTimeout(500);
    await p.addScriptTag({ content: axe });
    const res = await p.evaluate(async () => {
      const r = await axe.run(document, { resultTypes: ['violations'] });
      // Every control is 44px+ both ways. Exempt: inline links inside a sentence (WCAG 2.5.8), the skip link until focused,
      // and Ember's .em-sort, whose ::before extends its hit area to 44px (checked separately below).
      const small = [...document.querySelectorAll('button, select, input, textarea, [role=tab], summary, a')]
        .filter((el) => !el.closest('p:not(.dd-demo-note)') && el.getClientRects().length && getComputedStyle(el).visibility !== 'hidden')
        .filter((el) => !(el.classList.contains('dd-skip') && document.activeElement !== el) && !el.classList.contains('em-sort'))
        .map((el) => [el, el.getBoundingClientRect()]).filter(([, b]) => b.height < 44 || b.width < 44)
        .map(([el, b]) => `${el.tagName.toLowerCase()}:${(el.textContent || el.getAttribute('aria-label') || '').trim().slice(0, 20)}:${Math.round(b.width)}x${Math.round(b.height)}`);
      const sortHit = [...document.querySelectorAll('.em-sort')].filter((el) => {
        const b = el.getBoundingClientRect(), s = getComputedStyle(el, '::before');
        return b.height + Math.abs(parseFloat(s.top)) + Math.abs(parseFloat(s.bottom)) < 44 || Math.max(b.width, parseFloat(s.minWidth) || 0) < 44;
      }).map((el) => `sort:${el.textContent.trim()}`);
      return { v: r.violations.map((x) => ({ id: x.id, impact: x.impact, n: x.nodes.length })), over: document.documentElement.scrollWidth - window.innerWidth, small: [...small, ...sortHit] };
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
await browser.close();
console.log(`axe: ${runs} runs (${pages.length} states x 1280/900/414/375/320 x light/dark), ${failing} failing. Minor/moderate: ${minor}`);
process.exit(failing ? 1 : 0);
