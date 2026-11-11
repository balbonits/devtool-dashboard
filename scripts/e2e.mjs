// Browser checks for R-5 (run links: title, focus, scroll), the log drawer and R-7 (single-key shortcuts and their off switch), on desktop (side panel) and mobile (modal).
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

for (const [label, width] of [['desktop', 1280], ['mobile', 375]]) {
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
  const before = await p.evaluate(() => window.scrollY);
  await p.focus('#logs-run-01');
  await p.keyboard.press('Enter');
  await p.waitForFunction(() => location.hash === '#/run/run-01');
  const title = await p.title();
  check(/^checkout-api \w+ · Run log · Deploys$/.test(title), `${label}: run title "${title}"`);
  const f = await active(p);
  check(label === 'desktop' ? f.startsWith('h2#dd-drawer-title') : f.includes('Close dialog'), `${label}: focus moved into the drawer (${f})`);

  // Jump to first error.
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
  await p.goto(base + '?env=staging', { waitUntil: 'networkidle' });
  await p.getByRole('button', { name: 'View failing deploy' }).click();
  await p.waitForFunction(() => location.hash === '#/run/run-01');
  const q = await p.evaluate(() => location.search);
  check(q.includes('status=failed') && q.includes('service=checkout-api') && !q.includes('env='), `${label}: View failing deploy filters to it (${q})`);
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
  // On mobile the log is a native dialog; wait until it has really closed, or the ? key is (correctly) ignored.
  await p.waitForFunction(() => !document.querySelector('dialog[open]'));
  // The ? dialog: axe-clean, then switch shortcuts off.
  await p.keyboard.press('?');
  await p.waitForSelector('dialog[open]');
  await p.addScriptTag({ content: axe });
  const v = await p.evaluate(async () => (await axe.run(document, { resultTypes: ['violations'] })).violations.filter((x) => ['serious', 'critical'].includes(x.impact)).map((x) => x.id));
  check(v.length === 0, `${label}: shortcuts dialog axe serious/critical: ${v.join(',') || 'none'}`);
  await p.getByRole('checkbox', { name: /Single-key shortcuts/ }).click();
  await p.getByRole('button', { name: 'Done' }).click();
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
// DASH-MODAL-TOAST: in the run-log modal (narrow), Copy link gives feedback in place, not via the page toast
// (which would sit behind the modal, inert). Wide screens (side panel, no modal) keep the toast.
for (const [label, width, fail] of [['320 modal', 320, false], ['320 modal, copy fails', 320, true], ['1280 drawer', 1280, false], ['1280 drawer, copy fails', 1280, true]]) {
  const ctx = await browser.newContext({ viewport: { width, height: 800 }, reducedMotion: 'reduce', permissions: ['clipboard-read', 'clipboard-write'] });
  if (fail) await ctx.addInitScript(() => { navigator.clipboard.writeText = () => Promise.reject(new Error('denied')); });
  const p = await ctx.newPage();
  await p.goto(base + '#/run/run-01', { waitUntil: 'networkidle' });
  const scope = width < 1024 ? p.locator('dialog[open]') : p.locator('.dd-drawer');
  await scope.waitFor();
  check((await p.locator('dialog:modal').count()) === (width < 1024 ? 1 : 0), `${label}: run log is ${width < 1024 ? 'a modal dialog' : 'the side panel'}`);
  const btn = scope.getByRole('button', { name: 'Copy link to this run' });
  const w0 = (await btn.boundingBox()).width;
  await btn.click();
  await p.waitForTimeout(150);
  const toasts = await p.locator('.em-toast-viewport .em-toast, .em-toast-viewport [role=status], .em-toast-viewport [role=alert]').count();
  if (width < 1024) {
    check(toasts === 0, `${label}: no page toast behind the modal (${toasts})`);
    const status = await scope.locator('[role=status]').allTextContents();
    const want = fail ? "Couldn't copy link" : 'Link copied';
    check(status.some((t) => t.includes(want)), `${label}: status in the dialog says "${want}" (${JSON.stringify(status)})`);
    if (fail) {
      check(await btn.count() === 1, `${label}: button keeps its label when the copy fails`);
    } else {
      const copied = scope.getByRole('button', { name: 'Copied', exact: true });
      const named = await copied.count() === 1;
      check(named, `${label}: button's accessible name is Copied`);
      if (named) {
      const w1 = (await copied.boundingBox()).width;
      check(Math.abs(w1 - w0) < 0.5, `${label}: button width stays put (${w0} -> ${w1})`);
      const bh = (await copied.boundingBox()).height;
      check(bh >= 44, `${label}: Copied button is 44px tall (${Math.round(w1)}x${Math.round(bh)})`);
      await p.waitForTimeout(2300);
      check(await scope.getByRole('button', { name: 'Copy link to this run' }).count() === 1, `${label}: label reverts after about 2 s`);
      }
    }
  } else {
    check(toasts > 0, `${label}: page toast still shows (${toasts})`);
    const toastText = await p.locator('.em-toast-viewport').innerText();
    check(toastText.includes(fail ? "Couldn't copy the link" : 'Link copied'), `${label}: toast text unchanged (${JSON.stringify(toastText.slice(0, 80))})`);
    check(await scope.getByRole('button', { name: 'Copy link to this run' }).count() === 1, `${label}: button label unchanged`);
  }
  await ctx.close();
}
await browser.close();
console.log(failed ? `${failed} e2e checks failed` : 'e2e: all checks passed');
process.exit(failed ? 1 : 0);
