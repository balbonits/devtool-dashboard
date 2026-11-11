// Browser checks for R-5 (run links: title, focus, scroll), the log drawer, the ticker and R-7 (single-key shortcuts and their off switch), in the right drawer (1024 and up) and the centred modal (below 1024).
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
// Ticker (Creatives 2026-11-10, WCAG 2.2.2): WAAPI marquee, visible Pause/Play after the header controls,
// starts paused under reduced motion, holds still on hover and on focus inside, moving copy aria-hidden.
for (const [width, rm] of [[320, 'no-preference'], [375, 'reduce'], [1280, 'no-preference']]) {
  const label = `ticker ${width} ${rm}`;
  const p = await (await browser.newContext({ viewport: { width, height: 800 }, reducedMotion: rm })).newPage();
  await p.goto(base, { waitUntil: 'networkidle' });
  const x = () => p.evaluate(() => new DOMMatrix(getComputedStyle(document.querySelector('.dd-ticker-track')).transform).m41);
  const moving = async () => { const a = await x(); await p.waitForTimeout(400); return a !== (await x()); };
  const btn = p.locator('.dd-ticker button');
  const want = rm === 'reduce' ? 'Play release notes' : 'Pause release notes';
  check((await btn.textContent()) === want && (await moving()) === (rm !== 'reduce'), `${label}: starts ${rm === 'reduce' ? 'paused' : 'moving'} with "${want}"`);
  const bb = await btn.boundingBox();
  check(bb.width >= 44 && bb.height >= 44, `${label}: button is ${Math.round(bb.width)}x${Math.round(bb.height)}`);
  // CA 2026-11-10: paused, the full text shows as static wrapping text (nothing clipped), and screen readers
  // get the notes exactly once in either state.
  const once = async () => ((await p.locator('.dd-ticker').ariaSnapshot()).match(/Accessible by default/g) || []).length === 1;
  const pausedOk = async () => {
    const r = await p.evaluate(() => {
      const t = document.querySelector('.dd-ticker'), st = t.querySelector('.dd-ticker-static');
      const box = st && st.getBoundingClientRect();
      return { state: t.dataset.state, clipShown: !!t.querySelector('.dd-ticker-clip').getClientRects().length,
        text: st?.textContent, visible: !!box && box.width > 0 && box.height > 0,
        clip: st ? Math.max(st.scrollWidth - st.clientWidth, st.scrollHeight - st.clientHeight, t.scrollWidth - t.clientWidth) : -1 };
    });
    return r.state === 'paused' && !r.clipShown && r.visible && r.clip <= 0 && /^Accessible by default\. .*Mobile first\.$/.test(r.text || '') && (await once());
  };
  if (rm === 'reduce') check(await pausedOk(), `${label}: starts paused with every note visible as static text, 0 clip, read once`);
  else check(await once(), `${label}: playing, the notes are read once (sentence version; moving copy aria-hidden)`);
  const names = await p.evaluate(() => { const t = document.querySelector('.dd-ticker'); return { hidden: t.querySelector('.dd-ticker-track').getAttribute('aria-hidden'), sr: t.querySelector('.sr-only')?.textContent, kf: document.querySelector('.dd-ticker-track').getAnimations().length }; });
  check(names.hidden === 'true' && (rm === 'reduce' ? names.sr === undefined : /Accessible by default\. Keyboard first\./.test(names.sr || '')) && names.kf === 1, `${label}: moving copy aria-hidden, sentence version for screen readers, one WAAPI animation`);
  const order = [];
  await p.keyboard.press('Tab');
  for (let i = 0; i < 4; i++) { await p.keyboard.press('Tab'); order.push(await p.evaluate(() => (document.activeElement.getAttribute('aria-label') || document.activeElement.textContent || '').trim())); }
  check(order[1] === 'Dark mode' || order[1] === 'Light mode', `${label}: mode toggle follows the logo`);
  check(/release notes$/.test(order[2]) && order[3] === 'Keyboard shortcuts', `${label}: ticker button sits between the header controls and "Keyboard shortcuts" (${order.join(' > ')})`);
  if (rm === 'reduce') { await btn.click(); await p.mouse.move(5, 790); await p.locator('h1').focus(); await p.waitForTimeout(100); }
  check(await moving(), `${label}: moving after ${rm === 'reduce' ? 'Play' : 'load'}`);
  await btn.focus(); await p.waitForTimeout(100); // one React render
  check(!(await moving()), `${label}: holds still while focus is inside`);
  await p.locator('h1').focus();
  await p.locator('.dd-ticker-clip').hover(); await p.waitForTimeout(100);
  check(!(await moving()), `${label}: holds still on hover`);
  await p.mouse.move(5, 790);
  check(await moving(), `${label}: moves again after hover and focus leave`);
  await btn.click(); await p.mouse.move(5, 790); await p.locator('h1').focus(); await p.waitForTimeout(100);
  check((await btn.textContent()) === 'Play release notes' && !(await moving()), `${label}: "Pause release notes" stops it and becomes "Play release notes"`);
  check(await pausedOk(), `${label}: after Pause, every note shows as static text with 0 clip, read once`);
  await p.context().close();
}
await browser.close();
console.log(failed ? `${failed} e2e checks failed` : 'e2e: all checks passed');
process.exit(failed ? 1 : 0);
