import { useEffect, useState } from 'react';

/** Light/dark mode (HANDOFF H-3): stored under jdilig:mode, else prefers-color-scheme. Sets data-mode on <html>. */
export const MODE_KEY = 'jdilig:mode';
export type Mode = 'light' | 'dark';

export function readMode(): Mode | null {
  try {
    const v = localStorage.getItem(MODE_KEY);
    return v === 'light' || v === 'dark' ? v : null;
  } catch { return null; }
}

const systemMode = (): Mode => (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');

export function useMode(): [Mode, () => void] {
  const [mode, setMode] = useState<Mode>(() => readMode() ?? systemMode());
  const [chosen, setChosen] = useState(() => readMode() !== null);
  useEffect(() => {
    // With no saved choice, leave data-mode off so the theme's prefers-color-scheme rule (and OS changes) apply.
    if (chosen) document.documentElement.dataset.mode = mode;
    else delete document.documentElement.dataset.mode;
  }, [mode, chosen]);
  useEffect(() => {
    if (chosen) return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const on = () => setMode(mq.matches ? 'dark' : 'light');
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, [chosen]);
  const toggle = () => {
    const next: Mode = mode === 'dark' ? 'light' : 'dark';
    try { localStorage.setItem(MODE_KEY, next); } catch { /* storage blocked: still switches for this visit */ }
    setChosen(true);
    setMode(next);
  };
  return [mode, toggle];
}
