import { Button } from 'ember-ui';
import { useState } from 'react';
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

/** Production failures in the last hour. Announced (role=alert) only the first time this set of failures shows up in a session. */
export function AlertBanner({ failures, onView }: { failures: Run[]; onView: (run: Run) => void }) {
  const key = failures.map((r) => r.id).join(',');
  const [isNew] = useState(() => {
    const fresh = key !== '' && readSeen() !== key;
    try { sessionStorage.setItem(SEEN_KEY, key); } catch { /* storage blocked: treat as new each time */ }
    return fresh;
  });
  if (!failures.length) return null;
  const n = failures.length;
  return (
    <section className="dd-banner dd-banner--alert" aria-labelledby="dd-alert-text">
      <p id="dd-alert-text" role={isNew ? 'alert' : undefined}>
        <span aria-hidden="true" className="dd-status-icon dd-alert-icon">✕ </span>
        {n} production deploy{n === 1 ? '' : 's'} failed in the last hour
      </p>
      <Button variant="secondary" onClick={() => onView(failures[0])}>View failing deploy</Button>
    </section>
  );
}
