// R-2/R-3 token rules for our own source (not Ember UI):
// - no @keyframes (motion comes from Ember UI);
// - no literal colors in CSS (theme tokens only);
// - border-radius, border widths, box-shadow and outline use only var(--…), 0 or none (ARCH-REVIEW R-2 shape tokens).
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const files = [];
(function walk(d) { for (const n of readdirSync(d)) { const p = join(d, n); if (statSync(p).isDirectory()) walk(p); else if (/\.(css|tsx?)$/.test(n)) files.push(p); } })('src');
const stripVars = (v) => { let prev; do { prev = v; v = v.replace(/var\([^()]*\)/g, ''); } while (v !== prev); return v; };
const SHAPE = /(?:^|[;{\s])(border(?:-(?:top|right|bottom|left))?(?:-width)?|border-(?:top-|bottom-)?(?:left-|right-)?radius|box-shadow|outline(?:-width|-offset)?)\s*:\s*([^;}]+)/g;
const bad = [];
for (const f of files) {
  const src = readFileSync(f, 'utf8').replace(/\/\*[\s\S]*?\*\//g, (c) => c.replace(/[^\n]/g, ' '));
  src.split('\n').forEach((line, i) => {
    const at = `${f}:${i + 1}`;
    if (/@keyframes/.test(line)) bad.push(`${at} @keyframes`);
    if (!f.endsWith('.css')) return;
    if (/#[0-9a-f]{3,8}\b|\b(rgba?|hsla?|oklch)\(/i.test(line)) bad.push(`${at} literal color`);
    if (/^\s*\.sr-only/.test(line)) return; // visually-hidden utility, not a visible shape
    for (const [, prop, value] of line.matchAll(SHAPE)) {
      const rest = stripVars(value).replace(/\b(solid|dashed|dotted|double|none|0|transparent|inset)\b/g, '').trim();
      if (rest) bad.push(`${at} ${prop}: ${value.trim()} (use var(--…), 0 or none)`);
    }
  });
}
bad.forEach((b) => console.log('FAIL', b));
console.log(`${files.length} files checked, ${bad.length} problems`);
process.exit(bad.length ? 1 : 0);
