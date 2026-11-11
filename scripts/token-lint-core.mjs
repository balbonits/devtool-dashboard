// R-2/R-3 token rules for our own source (not Ember UI):
// - no @keyframes (motion comes from Ember UI);
// - no literal colors in CSS (theme tokens only);
// - border-radius, border widths, box-shadow and outline use only var(--…), 0 or none (ARCH-REVIEW R-2 shape tokens);
// - no retired token names (ARCH-REVIEW Addendum 5), matched by exact name so --focus-ring-color still passes.
export const RETIRED = ['--radius', '--focus', '--radius-field', '--radius-control', '--radius-surface', '--shadow-1', '--shadow-2', '--focus-ring', '--focus-offset'];
// Delete with the shim when Ember v0.3.1 lands.
export const SHIM = /(^|\/)src\/styles\/kinetic-shim\.css$/;
const RETIRED_RE = new RegExp(`(${RETIRED.map((n) => n.replace(/-/g, '\\-')).join('|')})(?![\\w-])`, 'g');
const stripVars = (v) => { let prev; do { prev = v; v = v.replace(/var\([^()]*\)/g, ''); } while (v !== prev); return v; };
const SHAPE = /(?:^|[;{\s])(border(?:-(?:top|right|bottom|left))?(?:-width)?|border-(?:top-|bottom-)?(?:left-|right-)?radius|box-shadow|outline(?:-width|-offset)?)\s*:\s*([^;}]+)/g;

/** Returns the problems in one file's text; an empty list means it passes. */
export function lintSource(file, text) {
  const bad = [];
  const src = text.replace(/\/\*[\s\S]*?\*\//g, (c) => c.replace(/[^\n]/g, ' ')).replace(/(^|[^:])\/\/.*$/gm, (m, a) => a + ' '.repeat(m.length - a.length));
  src.split('\n').forEach((line, i) => {
    const at = `${file}:${i + 1}`;
    if (/@keyframes/.test(line)) bad.push(`${at} @keyframes`);
    for (const [name] of line.matchAll(RETIRED_RE)) bad.push(`${at} retired token ${name}`);
    if (!file.endsWith('.css')) return;
    // The temporary kinetic token shim may define literal colors, but only as custom-property values (it's a token file).
    const tokenDecl = SHIM.test(file) && /^\s*--[\w-]+\s*:[^;{}]*;?\s*$/.test(line);
    if (!tokenDecl && /#[0-9a-f]{3,8}\b|\b(rgba?|hsla?|oklch)\(/i.test(line)) bad.push(`${at} literal color`);
    if (/^\s*\.sr-only/.test(line)) return; // visually-hidden utility, not a visible shape
    for (const [, prop, value] of line.matchAll(SHAPE)) {
      const rest = stripVars(value).replace(/\b(solid|dashed|dotted|double|none|0|transparent|inset)\b/g, '').trim();
      if (rest) bad.push(`${at} ${prop}: ${value.trim()} (use var(--…), 0 or none)`);
    }
  });
  return bad;
}
