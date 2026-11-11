// Shared target-size measuring (WCAG 2.5.8; project --target-min 44px) for scripts/target-audit.mjs and scripts/e2e.mjs.
// A control's target is its own box plus any absolutely positioned ::before that extends it (Ember's sort headers and
// small buttons), or, for an Ember checkbox, the whole .em-check row that its label's ::before covers. Each target is
// clipped to the padding box of every ancestor that clips overflow (Ember's overflow:auto tablist), then hit-tested with
// elementFromPoint at its centre and next to the middle of each edge, so a covered target fails.
// Inline links inside a sentence are exempt (2.5.8); a link counts as inline when the text right next to it has letters.

export const MIN = 44;

/** Known gaps the guard allows, narrowly: a control matching `selector` may be `floor` px tall (so floor - 1 still
 *  fails) but must stay under 44 (so the check fails once it's fixed and the entry can't go stale). Empty since the
 *  kinetic theme (DASH-EMBER-V03): the dashboard draws its own tabs, and the Ember pin includes HIT-PATCH
 *  (a11y-design-system #36), so the old .em-tab entry no longer applies. */
export const KNOWN_GAPS = [];

/** Page states to open, as [name, path, open(page) | null, scope selector]. */
export const STATES = [
  ['page', '', null, 'body'],
  ['run log (drawer or dialog)', '#/run/run-01', null, '.dd-drawer, dialog[open]'],
  ['shortcuts dialog', '', async (p) => { await p.getByRole('button', { name: 'Keyboard shortcuts' }).click(); await p.locator('dialog[open]').waitFor(); }, 'dialog[open]'],
  ['toast (in the shortcuts dialog)', '', async (p) => { await p.getByRole('button', { name: 'Keyboard shortcuts' }).click(); await p.locator('dialog[open]').waitFor(); await p.getByRole('checkbox', { name: /Single-key shortcuts/ }).click(); await p.locator('.em-toast-viewport--modal .em-toast').first().waitFor(); }, '.em-toast-viewport--modal'],
  ['no results', '?q=no-such-run', null, 'main'],
  ['load error', '?state=error', null, 'main'],
];

/** Runs in the page. Returns one entry per standalone control inside `scope`. */
export function measure({ scope, min, gaps = [] }) {
  const roots = [...document.querySelectorAll(scope)];
  const inPage = scope === 'body';
  const name = (el) => (el.getAttribute('aria-label') || el.labels?.[0]?.textContent || el.textContent || el.getAttribute('placeholder') || '')
    .replace(/\s+/g, ' ').trim().slice(0, 40);
  const letters = (n) => !!n && n.nodeType === 3 && /\p{L}/u.test(n.textContent);
  const inline = (el) => el.tagName === 'A' && !!el.closest('p') && (letters(el.previousSibling) || letters(el.nextSibling));
  const rect = (r) => ({ l: r.left, t: r.top, r: r.right, b: r.bottom });
  const area = (el) => {
    const check = el.matches('input[type=checkbox], input[type=radio]') && el.closest('.em-check');
    if (check) return { ...rect(check.getBoundingClientRect()), via: 'its .em-check row (label ::before)' };
    const b = rect(el.getBoundingClientRect());
    const s = getComputedStyle(el, '::before');
    if (s.content === 'none' || s.position !== 'absolute') return { ...b, via: '' };
    const off = (v) => (v === 'auto' ? null : parseFloat(v));
    const [t, r, bo, l] = [off(s.top), off(s.right), off(s.bottom), off(s.left)];
    if ([t, r, bo, l].includes(null)) return { ...b, via: '' };
    // Offsets are from the padding box, inside the border.
    const cs = getComputedStyle(el), bw = (k) => parseFloat(cs[`border${k}Width`]) || 0;
    const p = { l: b.l + bw('Left') + l, t: b.t + bw('Top') + t, r: b.r - bw('Right') - r, b: b.b - bw('Bottom') - bo };
    const minW = parseFloat(s.minWidth) || 0, minH = parseFloat(s.minHeight) || 0;
    if (p.r - p.l < minW) p.r = p.l + minW;
    if (p.b - p.t < minH) p.b = p.t + minH;
    return { l: Math.min(b.l, p.l), t: Math.min(b.t, p.t), r: Math.max(b.r, p.r), b: Math.max(b.b, p.b), via: '::before' };
  };
  // Clip the target to every ancestor that clips overflow (its padding box), e.g. Ember's overflow:auto tablist.
  const clip = (el, a) => {
    for (let n = el.parentElement; n && n !== document.documentElement; n = n.parentElement) {
      const c = getComputedStyle(n);
      if (c.overflowX === 'visible' && c.overflowY === 'visible') continue;
      const r = n.getBoundingClientRect(), bw = (k) => parseFloat(c[`border${k}Width`]) || 0;
      a = { ...a, l: Math.max(a.l, r.left + bw('Left')), t: Math.max(a.t, r.top + bw('Top')), r: Math.min(a.r, r.right - bw('Right')), b: Math.min(a.b, r.bottom - bw('Bottom')) };
    }
    return a;
  };
  const modal = document.querySelector('dialog:modal');
  const owns = (el, hit) => !!hit && (hit === el || el.contains(hit) || hit.closest('label')?.control === el
    || (el.closest('.em-check') && el.closest('.em-check').contains(hit)));
  const out = [];
  for (const root of roots) for (const el of root.querySelectorAll('button, select, input:not([type=hidden]), textarea, [role=tab], summary, a[href]')) {
    if (inPage && el.closest('dialog, .dd-drawer, .em-toast-viewport')) continue;
    if (!el.getClientRects().length || getComputedStyle(el).visibility === 'hidden') continue;
    if (el.closest('[aria-hidden=true]')) continue;
    el.scrollIntoView({ block: 'center', inline: 'center' });
    const box = el.getBoundingClientRect();
    const a = clip(el, area(el));
    const w = a.r - a.l, h = a.b - a.t;
    // Hit-test the centre and the outermost pixel (its centre, 0.5px in) at the middle of each edge, for points on
    // screen. Edge midpoints, not corners, because hit testing follows border-radius.
    // The exact edges come from geometry above (clip()); hit points sit in the second whole pixel in from each edge,
    // because Chrome snaps inline boxes' hit areas to pixels (a link whose rect ends at 176.2 stops hitting at 175.2).
    const cx = (a.l + a.r) / 2, cy = (a.t + a.b) / 2;
    const pts = [[cx, cy], [cx, Math.ceil(a.t) + 1.5], [cx, Math.floor(a.b) - 1.5], [Math.ceil(a.l) + 1.5, cy], [Math.floor(a.r) - 1.5, cy]]
      .filter(([x, y]) => x >= 0 && y >= 0 && x < innerWidth && y < innerHeight);
    const missed = pts.filter(([x, y]) => !owns(el, document.elementFromPoint(x, y))).length;
    const underModal = !!modal && !modal.contains(el);
    const kind = `${el.tagName.toLowerCase()}${el.getAttribute('role') ? `[role=${el.getAttribute('role')}]` : el.type && el.tagName !== 'A' && el.tagName !== 'BUTTON' ? `[${el.type}]` : ''}`;
    out.push({
      control: `${kind} "${name(el)}"`,
      box: `${Math.round(box.width)}x${Math.round(box.height)}`,
      target: `${Math.round(w)}x${Math.round(h)}`,
      via: a.via,
      inline: inline(el),
      ok: inline(el) || (Math.round(w) >= min && Math.round(h) >= min && missed === 0),
      missed,
      underModal,
      gap: (gaps.find((g) => el.matches(g.selector)) || {}).id || '',
    });
  }
  return out;
}

/** Opens a state on a fresh page at `width` and measures it. */
export async function measureState(browser, base, width, [, path, open, scope], extra = {}) {
  const ctx = await browser.newContext({ viewport: { width, height: 800 }, reducedMotion: 'reduce', ...extra });
  const p = await ctx.newPage();
  await p.goto(base + path, { waitUntil: 'networkidle' });
  await p.waitForTimeout(300);
  if (open) await open(p);
  const r = await p.evaluate(measure, { scope, min: MIN, gaps: KNOWN_GAPS.map(({ id, selector }) => ({ id, selector })) });
  await ctx.close();
  return r;
}
