import { useEffect, useRef, useState } from 'react';

export const TICKER_TEXT = 'Accessible by default / Keyboard first / AA contrast in light and dark / Reduced motion respected / Mobile first /';
export const TICKER_SENTENCES = 'Accessible by default. Keyboard first. AA contrast in light and dark. Reduced motion respected. Mobile first.';

const reduceQuery = () => (typeof matchMedia === 'function' ? matchMedia('(prefers-reduced-motion: reduce)') : null);

/** Duration of one loop, from the --duration-ticker token (36s in kinetic). */
function tickerMs(el: Element) {
  const v = getComputedStyle(el).getPropertyValue('--duration-ticker').trim();
  const n = parseFloat(v);
  if (!Number.isFinite(n) || n <= 0) return 36000;
  return v.endsWith('ms') ? n : n * 1000;
}

/**
 * Release-note marquee (HANDOFF motion table, Creatives 2026-11-10).
 * Web Animations API, not @keyframes (token-lint).
 * WCAG 2.2.2: one visible toggle, "Pause release notes"/"Play release notes" (Creatives' labels, no aria-pressed).
 * It starts paused under reduced motion, and also holds still while hovered or while focus is inside it.
 * Playing: the moving copy is clipped sideways and aria-hidden; screen readers get the sentence version.
 * Paused (Pause pressed or reduced motion): the marquee is swapped for every note as static text that wraps, so
 * nothing is clipped for sighted users and the text is read once (CA 2026-11-10). A hover or focus hold stays
 * clipped, since it resumes on its own.
 */
export function Ticker() {
  const track = useRef<HTMLDivElement>(null);
  const anim = useRef<Animation | null>(null);
  const [paused, setPaused] = useState(() => !!reduceQuery()?.matches);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const held = hovered || focused;

  useEffect(() => {
    const el = track.current;
    if (!el || typeof el.animate !== 'function') return;
    const a = el.animate([{ transform: 'translateX(0)' }, { transform: 'translateX(-50%)' }], { duration: tickerMs(el), iterations: Infinity, easing: 'linear' });
    a.pause();
    anim.current = a;
    return () => { a.cancel(); anim.current = null; };
  }, []);

  useEffect(() => {
    const q = reduceQuery();
    if (!q) return;
    const on = (e: MediaQueryListEvent) => { if (e.matches) setPaused(true); };
    q.addEventListener('change', on);
    return () => q.removeEventListener('change', on);
  }, []);

  useEffect(() => {
    const a = anim.current;
    if (!a) return;
    if (paused || held) a.pause(); else a.play();
  }, [paused, held]);

  return (
    <div
      className="dd-ticker"
      role="region"
      aria-label="Release notes"
      data-state={paused ? 'paused' : 'playing'}
      data-paused={paused || held ? '' : undefined}
      onPointerEnter={() => setHovered(true)}
      onPointerLeave={() => setHovered(false)}
      onFocus={() => setFocused(true)}
      onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setFocused(false); }}
    >
      {/* The track stays mounted while paused so Play resumes where it stopped. */}
      <div className="dd-ticker-clip" hidden={paused}>
        <div className="dd-ticker-track" ref={track} aria-hidden="true"><span>{TICKER_TEXT}</span><span>{TICKER_TEXT}</span></div>
        {!paused && <span className="sr-only">{TICKER_SENTENCES}</span>}
      </div>
      {paused && <p className="dd-ticker-static">{TICKER_SENTENCES}</p>}
      <button type="button" className="dd-tickbtn" onClick={() => setPaused((p) => !p)}>{paused ? 'Play release notes' : 'Pause release notes'}</button>
    </div>
  );
}
