import { Button } from 'ember-ui';
import { useEffect, useState } from 'react';
import type { Run } from './lib/types';

const SEEN_KEY = 'jdilig:dev-dashboard:seen-alerts:v1';
const HOUR = 60 * 60_000;

export function recentProdFailures(runs: Run[], now = Date.now()): Run[] {
  return runs
    .filter((r) => r.env === 'production' && r.status === 'failed' && now - new Date(r.started).getTime() <= HOUR)
    .sort((a, b) => b.started.localeCompare(a.started));
}

function readSeen(): string {
  try { return sessionStorage.getItem(SEEN_KEY) ?? ''; } catch { return ''; }
}

/**
 * Production failures in the last hour. Announced (role=alert) only the first time this set of failures shows up in a session.
 * CA follow-up: the alert container mounts with nothing readable in it and the text goes in a moment later, because
 * screen readers often skip a live region that arrives with its text already inside. The text is laid out but
 * visibility:hidden until then (hidden text is not in the accessibility tree), so the banner doesn't shift (CLS).
 */
export function AlertBanner({ failures, onView }: { failures: Run[]; onView: (run: Run) => void }) {
  const key = failures.map((r) => r.id).join(',');
  const [isNew] = useState(() => {
    const fresh = key !== '' && readSeen() !== key;
    try { sessionStorage.setItem(SEEN_KEY, key); } catch { /* storage blocked: treat as new each time */ }
    return fresh;
  });
  const [filled, setFilled] = useState(!isNew);
  useEffect(() => {
    if (!isNew) return;
    const t = setTimeout(() => setFilled(true), 50);
    return () => clearTimeout(t);
  }, [isNew]);
  if (!failures.length) return null;
  const n = failures.length;
  return (
    <section className="dd-banner dd-banner--alert" aria-labelledby="dd-alert-text">
      <p id="dd-alert-text" role={isNew ? 'alert' : undefined}>
        <span className={filled ? undefined : 'dd-pending'}>
          <span aria-hidden="true" className="dd-status-icon dd-alert-icon">✕ </span>
          {n} production deploy{n === 1 ? '' : 's'} failed in the last hour
        </span>
      </p>
      <Button variant="secondary" onClick={() => onView(failures[0])}>View failing deploy</Button>
    </section>
  );
}
