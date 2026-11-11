// Target-size audit (WCAG 2.5.8; project --target-min 44px): every standalone interactive control in every state, with
// its rendered box and its effective target (box plus any ::before that extends it). Read-only: it loads pages, opens
// dialogs and measures. Prints a Markdown table.
// Usage: node scripts/target-audit.mjs [baseUrl] [widths]
//   e.g. node scripts/target-audit.mjs https://jdilig.me/ux/dev-dashboard/ 320,375,1280
import { chromium } from 'playwright-core';
import { STATES, KNOWN_GAPS, appliesAt, measureState } from './targets.mjs';

const base = (process.argv[2] || 'http://127.0.0.1:4174/ux/dev-dashboard/').replace(/\/?$/, '/');
const widths = (process.argv[3] || '320,375,1280').split(',').map(Number);
const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || '/usr/bin/google-chrome', args: ['--no-sandbox'] });
const rows = new Map();
let bad = 0, gaps = 0;
for (const state of STATES) for (const width of widths) {
  if (!appliesAt(state, width)) continue; // toast: 1024px+ only, see appliesAt
  const seen = new Map();
  for (const m of await measureState(browser, base, width, state)) {
    const n = (seen.get(m.control) || 0) + 1; seen.set(m.control, n);
    const key = `${state[0]}|${m.control}|${n}`;
    if (!rows.has(key)) rows.set(key, { state: state[0], control: m.control, cells: {}, via: new Set(), inline: m.inline });
    const r = rows.get(key);
    r.cells[width] = m.box === m.target ? m.box : `${m.box} (target ${m.target})`;
    if (!m.ok && m.gap) { r.cells[width] += ' **known gap**'; r.gap = KNOWN_GAPS.find((g) => g.id === m.gap).why; gaps++; }
    else if (!m.ok) { r.cells[width] += m.underModal ? ' **behind the modal dialog, not reachable**' : m.missed ? ` **FAIL, ${m.missed} of 5 hit points miss**` : ' **FAIL**'; bad++; }
    if (m.via) r.via.add(m.via);
  }
}
await browser.close();
// One line per distinct control (repeated rows such as the nine "Open log" buttons collapse with a count).
const lines = new Map();
const pageCells = new Map([...rows.values()].filter((r) => r.state === 'page').map((r) => [r.control, JSON.stringify(r.cells)]));
for (const r of rows.values()) {
  if (r.state !== 'page' && pageCells.get(r.control) === JSON.stringify(r.cells)) continue; // same as on the page
  const note = [r.inline ? 'inline link in a sentence, exempt' : '', r.gap || '', [...r.via].map((v) => `target via ${v}`).join(', ')].filter(Boolean).join('; ');
  const generic = r.control.replace(/"Open log for [^"]*"/, '"Open log for <service> <commit>"');
  const k = [r.state, generic, ...widths.map((w) => r.cells[w] || 'not shown'), note].join('\u0001');
  lines.set(k, (lines.get(k) || 0) + 1);
}
console.log(`| State | Control | ${widths.map((w) => `${w} px`).join(' | ')} | Note |`);
console.log(`|---|---|${widths.map(() => '---|').join('')}---|`);
for (const [k, n] of lines) {
  const [state, control, ...rest] = k.split('\u0001');
  const note = rest.pop();
  console.log(`| ${state} | ${control.replace(/\|/g, '\\|')}${n > 1 ? ` (x${n})` : ''} | ${rest.join(' | ')} | ${note} |`);
}
console.log(`\n${gaps ? `${gaps} measurements are known gaps (KNOWN_GAPS in scripts/targets.mjs). ` : ''}${bad ? `${bad} measurements under ${44}px or not hit-testable` : 'Every standalone control has a target of at least 44x44 at every width measured.'}`);
