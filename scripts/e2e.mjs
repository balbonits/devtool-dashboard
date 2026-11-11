// Browser checks for R-5 (run links: title, focus, scroll), the log drawer and R-7 (single-key shortcuts and their off switch), in the right drawer (1024 and up) and the centred modal (below 1024).
// Usage: node scripts/e2e.mjs [baseUrl]   (default http://127.0.0.1:4174/ux/dev-dashboard/)
import { chromium } from 'playwright-core';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';

const axe = readFileSync(createRequire(import.meta.url).resolve('axe-core/axe.min.js'), 'utf8');

const base = (process.argv[2] || 'http://127.0.0.1:4174/ux/dev-dashboard/').replace(/\/?$/, '/');
const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || '/usr/bin/google-chrome', args: ['--no-sandbox'] });
let failed = 0;
const check = (ok, what) => { console.log(`${ok ? 'ok  ' : 'FAIL'} ${what}`); if (!ok) failed++; };
const active = (p) => p.evaluate(() => { const a = document.activeElement; return a ? `${a.tagName.toLowerCase()}#${a.id}|${(a.textContent || '').trim().slice(0, 40)}|${a.getAttribute('aria-label') || ''}` : ''; });

for (const [label, width] of [['desktop', 1280], ['tablet', 1024], ['mobile', 375]]) {
  const p = await (await browser.newContext({ viewport: { width, height: 800 }, reducedMotion: 'reduce' })).newPage();
  await p.goto(base, { waitUntil: 'networkidle' });
  await p.waitForSelector('#logs-run-01');

  // Skip link: first Tab stop, 44 px tall once visible, moves focus to main.
  await p.keyboard.press('Tab');
  const skip = await p.evaluate(() => { const a = document.activeElement; const b = a.getBoundingClientRect(); return { cls: a.className, h: b.height, w: b.width }; });
  check(skip.cls.includes('dd-skip') && skip.h >= 44 && skip.w >= 44, `${label}: first Tab is the skip link (${Math.round(skip.w)}x${Math.round(skip.h)})`);
  await p.keyboard.press('Enter');
  check((await active(p)).startsWith('main#main'), `${label}: skip link moves focus to main`);

  // Open from the row with the keyboard.
  await p.evaluate(() => window.scrollTo(0, 200));
  await p.focus('#logs-run-01');
  // Measured after focus, which may scroll the row into view; opening and closing the log must not move it.
  const before = await p.evaluate(() => window.scrollY);
  await p.keyboard.press('Enter');
  await p.waitForFunction(() => location.hash === '#/run/run-01');
  const title = await p.title();
  check(/^checkout-api run \w+ · Run log · Deploys$/.test(title), `${label}: run title "${title}"`);
  const f = await active(p);
  check(f.startsWith('h2#dd-run-title'), `${label}: focus moved to the run heading (${f})`);

  // Jump to first error, once the log has loaded.
  await p.waitForSelector('.dd-run-dialog ol');
  await p.getByRole('button', { name: 'Jump to first error' }).click();
  check((await active(p)).includes('ERROR'), `${label}: Jump to first error focuses the error line`);

  // Esc closes, focus returns to the row's Log button, scroll is where it was.
  await p.keyboard.press('Escape');
  await p.waitForFunction(() => !location.hash.includes('run'));
  await p.waitForTimeout(100);
  check((await active(p)).startsWith('button#logs-run-01'), `${label}: Esc returns focus to the row (${await active(p)})`);
  check(await p.title() === 'Deploys · Production · Dev dashboard prototype', `${label}: list title restored`);
  check(Math.abs((await p.evaluate(() => window.scrollY)) - before) < 60, `${label}: list scroll kept`);

  // Back button closes the drawer too.
  await p.click('#logs-run-02');
  await p.waitForFunction(() => location.hash === '#/run/run-02');
  await p.goBack();
  await p.waitForFunction(() => !location.hash.includes('run'));
  check(await p.locator('.dd-drawer, dialog[open]').count() === 0, `${label}: Back closes the drawer`);

  // Deep link opens straight into the run, and Close returns focus to that run's row.
  await p.goto(base + '?status=failed#/run/run-02', { waitUntil: 'networkidle' });
  await p.waitForFunction(() => document.title.startsWith('search-indexer'));
  check(true, `${label}: deep link opens the run`);
  await p.getByRole('button', { name: 'Close', exact: true }).click();
  await p.waitForFunction(() => !location.hash.includes('run'));
  await p.waitForTimeout(100);
  check((await active(p)).startsWith('button#logs-run-02'), `${label}: Close after deep link focuses the row`);

  // Alert banner action.
  await p.goto(base, { waitUntil: 'networkidle' });
  await p.getByRole('button', { name: 'View failing deploy' }).click();
  await p.waitForFunction(() => location.hash === '#/run/run-01');
  const q = await p.evaluate(() => location.search);
  check(q.includes('status=failed') && q.includes('service=checkout-api'), `${label}: View failing deploy filters to it (${q})`);
  check(await p.getByRole('tab', { name: 'Production' }).getAttribute('aria-selected') === 'true', `${label}: Production tab selected`);

  // R-7: typing j in search types a j and moves nothing.
  await p.goto(base, { waitUntil: 'networkidle' });
  await p.getByLabel('Search runs').click();
  await p.keyboard.type('j');
  check((await p.getByLabel('Search runs').inputValue()) === 'j' && (await active(p)).startsWith('input'), `${label}: j in search types, rows don't move`);
  await p.getByLabel('Search runs').fill('');
  // Shortcuts work when on.
  await p.locator('h1').focus();
  await p.keyboard.press('j');
  check((await active(p)).startsWith('button#logs-'), `${label}: j moves to a row`);
  await p.keyboard.press('Enter');
  await p.waitForFunction(() => location.hash.startsWith('#/run/'));
  check(true, `${label}: Enter on a row opens its log`);
  await p.keyboard.press('Escape');
  await p.waitForFunction(() => !location.hash.includes('run'));
  // The log is a native dialog; wait until it has really closed, or the ? key is (correctly) ignored.
  await p.waitForFunction(() => !document.querySelector('dialog[open]'));
  // The ? dialog: axe-clean, then switch shortcuts off.
  await p.keyboard.press('?');
  await p.waitForSelector('dialog[open]');
  await p.addScriptTag({ content: axe });
  const v = await p.evaluate(async () => (await axe.run(document, { resultTypes: ['violations'] })).violations.filter((x) => ['serious', 'critical'].includes(x.impact)).map((x) => x.id));
  check(v.length === 0, `${label}: shortcuts dialog axe serious/critical: ${v.join(',') || 'none'}`);
  await p.getByRole('checkbox', { name: /Single-key shortcuts/ }).click();
  await p.getByRole('button', { name: 'Close', exact: true }).click();
  await p.reload({ waitUntil: 'networkidle' });
  await p.locator('h1').focus();
  const url = p.url();
  for (const k of ['/', 'f', 'j', 'k', '?']) await p.keyboard.press(k);
  const still = (await active(p)).startsWith('h1') && (await p.locator('dialog[open]').count()) === 0 && p.url() === url;
  check(still, `${label}: with shortcuts off, / f j k ? do nothing after a reload`);
  await p.getByRole('button', { name: 'Keyboard shortcuts' }).click();
  check(!(await p.getByRole('checkbox', { name: /Single-key shortcuts/ }).isChecked()), `${label}: header button still opens the dialog, setting kept`);
  await p.context().close();
}
await browser.close();
console.log(failed ? `${failed} e2e checks failed` : 'e2e: all checks passed');
process.exit(failed ? 1 : 0);
