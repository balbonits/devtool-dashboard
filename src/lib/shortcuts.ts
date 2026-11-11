import { useCallback, useEffect, useState } from 'react';

/** The one key map. The shortcuts dialog renders this list, and a test checks the handler covers every single-key entry. */
export const SHORTCUTS = [
  { key: '/', aria: '/', label: 'Search', single: true },
  { key: 'f', aria: 'F', label: 'Filters', single: true },
  { key: 'j', aria: 'J', label: 'Next run', single: true },
  { key: 'k', aria: 'K', label: 'Previous run', single: true },
  { key: 'Enter', aria: 'Enter', label: 'Open log', single: false },
  { key: 'Esc', aria: 'Escape', label: 'Close log', single: false },
  { key: '?', aria: '?', label: 'Show this list', single: true },
] as const;

export type SingleKey = Extract<(typeof SHORTCUTS)[number], { single: true }>['key'];
export const ariaFor = (key: SingleKey) => SHORTCUTS.find((s) => s.key === key)!.aria;

export const SHORTCUTS_KEY = 'jdilig:dash-shortcuts:v1' // HANDOFF H-4;

function readEnabled(): { on: boolean; blocked: boolean } {
  try { return { on: localStorage.getItem(SHORTCUTS_KEY) !== 'off', blocked: false }; } catch { return { on: true, blocked: true }; }
}

/** On by default; persisted when storage works, in memory only when it is blocked (then `blocked` is true). */
export function useShortcutSetting(): [boolean, (on: boolean) => void, boolean] {
  const [state, setState] = useState(readEnabled);
  const set = useCallback((next: boolean) => {
    let blocked = false;
    try { localStorage.setItem(SHORTCUTS_KEY, next ? 'on' : 'off'); } catch { blocked = true; }
    setState({ on: next, blocked });
  }, []);
  return [state.on, set, state.blocked];
}

/** True when a single-key shortcut must not fire for this event. */
export function shouldIgnore(e: KeyboardEvent): boolean {
  if (e.ctrlKey || e.altKey || e.metaKey || e.defaultPrevented || e.isComposing) return true;
  const t = e.target as HTMLElement | null;
  if (t && (t.closest('input, select, textarea, [contenteditable]:not([contenteditable="false"])'))) return true;
  return !!document.querySelector('dialog[open]');
}

export type ShortcutActions = Record<SingleKey, () => void>;

export function useShortcuts(enabled: boolean, actions: ShortcutActions) {
  useEffect(() => {
    if (!enabled) return;
    const on = (e: KeyboardEvent) => {
      if (shouldIgnore(e)) return;
      const key = e.key.length === 1 ? e.key.toLowerCase() : e.key;
      if (key in actions) {
        e.preventDefault();
        actions[key as SingleKey]();
      }
    };
    document.addEventListener('keydown', on);
    return () => document.removeEventListener('keydown', on);
  }, [enabled, actions]);
}

/** Move focus between the rows' Log buttons. */
export function moveRow(step: 1 | -1) {
  const rows = [...document.querySelectorAll<HTMLElement>('#main [id^="logs-"]')];
  if (!rows.length) return;
  const i = rows.indexOf(document.activeElement as HTMLElement);
  const next = i < 0 ? (step === 1 ? 0 : rows.length - 1) : Math.min(rows.length - 1, Math.max(0, i + step));
  rows[next].focus();
  rows[next].scrollIntoView({ block: 'nearest' });
}
