// Contrast for every kinetic token pair the dashboard uses (src/app.css), resolved from Ember's registered kinetic theme
// (node_modules/ember-ui/dist/ember.css), light and dark. Text pairs need 4.5:1, non-text (borders, rings, status
// shapes) 3:1. --border-subtle is decorative (dividers next to a stronger boundary) and is listed but not gated.
// Usage: node scripts/kinetic-contrast.mjs   (exit 1 on any failure)
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';

const css = readFileSync(createRequire(import.meta.url).resolve('ember-ui/styles.css'), 'utf8');
const blocks = [...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)].map(([, sel, body]) => [sel.trim().replace(/['"]/g, ''), body]);
const decl = (body) => Object.fromEntries([...body.matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)].map(([, k, v]) => [k, v.trim()]));
const pick = (test) => Object.assign({}, ...blocks.filter(([s]) => test(s)).map(([, b]) => decl(b)));
const isKinetic = (s) => s.split(',').some((p) => p.trim().startsWith('[data-theme=kinetic]'));
const base = { ...pick((s) => s === ':root'), ...pick((s) => isKinetic(s) && !s.includes('data-mode')) };
const modes = {
  light: { ...base, ...pick((s) => isKinetic(s) && s.includes('data-mode=light')) },
  dark: { ...base, ...pick((s) => isKinetic(s) && s.includes('data-mode=dark')) },
};
const resolve = (t, v, n = 0) => { const m = /^var\((--[\w-]+)\)$/.exec(v ?? ''); return m && n < 10 ? resolve(t, t[m[1]], n + 1) : v; };
const rgb = (hex) => { const h = hex.replace('#', ''); return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16) / 255); };
const lum = (hex) => { const [r, g, b] = rgb(hex).map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4)); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };

// [foreground token, background token, kind, where]
const PAIRS = [
  ['--text', '--color-bg', 'text', 'page, header, dialog, fields, secondary buttons, copy status'],
  ['--text-muted', '--color-bg', 'text', 'muted text, hints, tabs, captions, footer'],
  ['--text', '--surface-muted', 'text', 'focused row, log region'],
  ['--text-muted', '--surface-muted', 'text', 'disabled button label, log line numbers'],
  ['--danger', '--color-bg', 'text', 'failures banner and load-error headings, failed status'],
  ['--danger', '--surface-muted', 'text', 'ERROR log lines, log error message'],
  ['--success', '--color-bg', 'non-text', 'succeeded shape, all-green rule'],
  ['--info', '--color-bg', 'non-text', 'running shape'],
  ['--text-muted', '--color-bg', 'non-text', 'canceled shape outline'],
  ['--highlight-contrast', '--highlight', 'text', 'ticker text, Pause/Play label and border, focus ring in ticker'],
  ['--accent-contrast', '--accent', 'text', 'primary button'],
  ['--accent', '--color-bg', 'non-text', 'selected tab underline, primary button edge, drawer edge'],
  ['--hover-label', '--hover-fill', 'text', 'hover (Addendum 10 inverted)'],
  ['--text', '--surface-muted', 'text', 'secondary pressed (Ember)'],
  ['--accent-contrast', '--accent-hover', 'text', 'primary pressed (Ember)'],
  ['--border', '--color-bg', 'non-text', 'control edges, dialog, header rule, table head rule'],
  ['--border', '--surface-muted', 'non-text', 'log region top rule'],
  ['--focus-ring-color', '--color-bg', 'non-text', 'focus ring on page'],
  ['--focus-ring-color', '--surface-muted', 'non-text', 'focus ring on focused row and log'],
  ['--focus-ring-color', '--surface', 'non-text', 'focus ring on surface'],
  ['--border-subtle', '--color-bg', 'decorative', 'dividers (not gated)'],
];
let fails = 0;
console.log('| Mode | Foreground | Background | Values | Ratio | Needs | Result | Used for |\n|---|---|---|---|---|---|---|---|');
for (const [mode, t] of Object.entries(modes)) for (const [fg, bg, kind, where] of PAIRS) {
  const a = resolve(t, t[fg]), b = resolve(t, t[bg]);
  if (!/^#[0-9a-f]{6}$/i.test(a ?? '') || !/^#[0-9a-f]{6}$/i.test(b ?? '')) { console.log(`| ${mode} | \`${fg}\` | \`${bg}\` | unresolved (${a} / ${b}) | | | FAIL | ${where} |`); fails++; continue; }
  const r = ratio(a, b), need = kind === 'text' ? 4.5 : kind === 'non-text' ? 3 : 0;
  const ok = r >= need;
  if (!ok) fails++;
  console.log(`| ${mode} | \`${fg}\` | \`${bg}\` | ${a} on ${b} | ${r.toFixed(2)}:1 | ${need ? `${need}:1` : 'n/a'} | ${ok ? 'pass' : 'FAIL'} | ${where} |`);
}
console.log(`\n${PAIRS.length * 2} pairs, ${fails} failures`);
process.exit(fails ? 1 : 0);
