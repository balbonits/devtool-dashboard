// Browser checks for R-5 (run links: title, focus, scroll), the log drawer and R-7 (single-key shortcuts and their off switch), on desktop (side panel) and mobile (modal).
// Usage: node scripts/e2e.mjs [baseUrl]   (default http://127.0.0.1:4174/ux/dev-dashboard/)
import { chromium } from 'playwright-core';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { STATES, MIN, KNOWN_GAPS, appliesAt, measureState } from './targets.mjs';

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
// DASH-MODAL-TOAST: in the run-log modal (narrow), Copy link confirms in a visible role=status line in the dialog, not
// via the page toast (which would sit behind the modal, inert). The label swap to "Copied" is visual only. Wide screens
// (side panel, no modal) keep the toast.
const cases = [];
for (const width of [320, 375]) for (const scheme of ['light', 'dark']) cases.push([`${width} modal ${scheme}`, width, scheme, false]);
cases.push(['320 modal, copy fails', 320, 'light', true], ['1280 drawer', 1280, 'light', false], ['1280 drawer, copy fails', 1280, 'light', true]);
for (const [label, width, colorScheme, fail] of cases) {
  const ctx = await browser.newContext({ viewport: { width, height: 800 }, colorScheme, reducedMotion: 'reduce', permissions: ['clipboard-read', 'clipboard-write'] });
  if (fail) await ctx.addInitScript(() => { navigator.clipboard.writeText = () => Promise.reject(new Error('denied')); });
  const p = await ctx.newPage();
  await p.goto(base + '#/run/run-01', { waitUntil: 'networkidle' });
  const modal = width < 1024;
  const scope = modal ? p.locator('dialog[open]') : p.locator('.dd-drawer');
  await scope.waitFor();
  check((await p.locator('dialog:modal').count()) === (modal ? 1 : 0), `${label}: run log is ${modal ? 'a modal dialog' : 'the side panel'}`);
  const status = scope.locator('[role=status]');
  const btn = scope.getByRole('button', { name: 'Copy link to this run', exact: true });
  const toastCount = () => p.locator('.em-toast-viewport .em-toast').count();
  if (!modal) {
    check(await status.count() === 0, `${label}: no in-panel status line`);
    await btn.click();
    await p.waitForTimeout(200);
    check(await toastCount() > 0, `${label}: page toast still shows`);
    const t = await p.locator('.em-toast-viewport').innerText();
    check(t.includes(fail ? "Couldn't copy the link" : 'Link copied'), `${label}: toast text unchanged (${JSON.stringify(t.slice(0, 80))})`);
    check(await btn.count() === 1, `${label}: button label unchanged`);
    await ctx.close();
    continue;
  }
  check(await status.count() === 1 && (await status.textContent()) === '', `${label}: status line is in the dialog, empty, before the first copy`);
  const box0 = await btn.boundingBox();
  const top0 = await scope.locator('.dd-log-title').evaluate((el) => el.offsetTop);
  const want = fail ? "Couldn't copy link. Copy it from the address bar instead." : 'Link copied';
  await btn.click();
  await p.waitForTimeout(300);
  check(await toastCount() === 0, `${label}: no page toast behind the modal`);
  const top1 = await scope.locator('.dd-log-title').evaluate((el) => el.offsetTop);
  check(top1 === top0, `${label}: no layout shift when the status fills (log heading ${top0} -> ${top1})`);
  check((await status.textContent()) === want, `${label}: status says "${want}" (${JSON.stringify(await status.textContent())})`);
  const snap = await scope.ariaSnapshot();
  check(snap.includes(`status: ${want}`) || snap.includes(want), `${label}: status text is in the dialog's accessibility tree`);
  const vis = await status.evaluate((el) => { const r = el.getBoundingClientRect(), d = el.closest('dialog'); const hit = document.elementFromPoint(r.left + 4, r.top + r.height / 2); return { w: r.width, h: r.height, inDialog: !!d && d.contains(el), hit: !!hit && (hit === el || el.contains(hit)) }; });
  check(vis.w > 0 && vis.h >= 16 && vis.inDialog && vis.hit, `${label}: status line is visible in the dialog (${Math.round(vis.w)}x${Math.round(vis.h)})`);
  await p.addScriptTag({ content: axe });
  const cc = await p.evaluate(async () => (await axe.run(document.querySelector('dialog[open]'), { runOnly: ['color-contrast'], resultTypes: ['violations'] })).violations.map((v) => v.nodes.length));
  check(cc.length === 0, `${label}: status and dialog text pass 4.5:1 contrast (axe color-contrast)`);
  if (fail) {
    check(await btn.count() === 1, `${label}: button keeps its label when the copy fails`);
  } else {
    const copied = scope.getByRole('button', { name: 'Copied', exact: true });
    const named = await copied.count() === 1;
    check(named, `${label}: button's name follows its visible text (Copied)`);
    if (named) {
      const box1 = await copied.boundingBox();
      check(Math.abs(box1.width - box0.width) < 0.5 && Math.abs(box1.height - box0.height) < 0.5 && box1.height >= 44, `${label}: button size stays put (${Math.round(box0.width)}x${Math.round(box0.height)} -> ${Math.round(box1.width)}x${Math.round(box1.height)})`);
      check(await copied.getAttribute('aria-live') === null, `${label}: no aria-live on the button`);
    }
    // A second copy clears and refills the status, so it's announced again.
    const seen = [];
    await p.exposeFunction('ddSeen', (t) => seen.push(t));
    await status.evaluate((el) => new MutationObserver(() => window.ddSeen(el.textContent)).observe(el, { childList: true, characterData: true, subtree: true }));
    await (named ? copied : btn).click();
    await p.waitForTimeout(300);
    check(seen.includes('') && seen[seen.length - 1] === want, `${label}: second copy re-announces (${JSON.stringify(seen)})`);
    await p.waitForTimeout(2300);
    check(await btn.count() === 1, `${label}: label reverts after about 2 s`);
    check((await status.textContent()) === want, `${label}: status text stays (no auto-clear)`);
  }
  await ctx.close();
}
// DASH-TARGETS (WCAG 2.5.8, --target-min): every standalone control in every state has a target of at least 44x44 at
// 320 and 1280, counting a ::before that extends it, and that whole target is hit-testable. Inline links in a sentence
// are exempt. The toast state runs at 1024px+ only: below the drawer breakpoint the run log is a modal dialog and Copy
// link confirms inside it (DASH-MODAL-TOAST, checked above), so no toast sits behind the modal. Known gap: Ember v0.2.2 tabs are 43px effective (see KNOWN_GAPS in targets.mjs, a11y #36).
for (const width of [320, 1280]) for (const state of STATES) {
  if (!appliesAt(state, width)) continue;
  const found = await measureState(browser, base, width, state, { permissions: ['clipboard-read', 'clipboard-write'] });
  check(found.length > 0, `targets ${width} ${state[0]}: found ${found.length} controls`);
  for (const m of found) {
    if (m.inline) continue;
    const [w, h] = m.target.split('x').map(Number);
    const sized = w >= MIN && h >= MIN;
    if (m.underModal) { check(sized, `targets ${width} ${state[0]}: ${m.control} target ${m.target} (behind the modal dialog: known issue, size only)`); continue; }
    const gap = KNOWN_GAPS.find((g) => g.id === m.gap);
    if (gap) {
      // Narrow allowlist (fixed upstream in a11y-design-system #36, to be removed when the dashboard moves to Ember v0.3, DASH-EMBER-V03): at least gap.floor tall but under 44, full width, all hit points
      // land. Below the floor fails; 44+ also fails, because it's fixed and the entry must go.
      check(w >= MIN && h >= gap.floor && h < MIN && !m.missed, `targets ${width} ${state[0]}: ${m.control} target ${m.target} is the known ${gap.floor}px gap (${gap.id}, a11y-design-system #36)${h >= MIN ? '; it now reaches 44, so remove this KNOWN_GAPS entry (DASH-EMBER-V03)' : h < gap.floor ? `; below the ${gap.floor}px floor` : ''}`);
      continue;
    }
    if (!sized || m.missed) check(false, `targets ${width} ${state[0]}: ${m.control} box ${m.box}, target ${m.target}${m.missed ? `, ${m.missed} of 5 hit points miss` : ''}`);
  }
  if (found.every((m) => m.inline || m.underModal || m.gap || m.ok)) check(true, `targets ${width} ${state[0]}: every standalone control is 44x44+ and hit-testable`);
}

await browser.close();
console.log(failed ? `${failed} e2e checks failed` : 'e2e: all checks passed');
process.exit(failed ? 1 : 0);
