import { useEffect, useRef, useState } from 'react';

export const TICKER_TEXT = 'Accessible by default / Keyboard first / AA contrast in light and dark / Reduced motion respected / Mobile first /';
const TICKER_SENTENCES = 'Accessible by default. Keyboard first. AA contrast in light and dark. Reduced motion respected. Mobile first.';

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
 * Web Animations API, not @keyframes (token-lint). The moving copy is aria-hidden; screen readers get the sentence version.
 * WCAG 2.2.2: a visible "Pause ticker"/"Play ticker" button, starts paused under reduced motion, and it also holds still
 * while hovered or while focus is inside it.
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
      aria-label="Release notes ticker"
      data-paused={paused || held ? '' : undefined}
      onPointerEnter={() => setHovered(true)}
      onPointerLeave={() => setHovered(false)}
      onFocus={() => setFocused(true)}
      onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setFocused(false); }}
    >
      <div className="dd-ticker-clip">
        <div className="dd-ticker-track" ref={track} aria-hidden="true"><span>{TICKER_TEXT}</span><span>{TICKER_TEXT}</span></div>
        <span className="sr-only">{TICKER_SENTENCES}</span>
      </div>
      <button type="button" className="dd-tickbtn" onClick={() => setPaused((p) => !p)}>{paused ? 'Play ticker' : 'Pause ticker'}</button>
    </div>
  );
}
