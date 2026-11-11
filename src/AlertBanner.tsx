import { Button } from 'ember-ui';
import type { Run } from './lib/types';

const HOUR = 60 * 60_000;

/** Failed runs in one environment in the last hour, newest first. */
export function recentFailures(runs: Run[], env: Run['env'], now = Date.now()): Run[] {
  return runs
    .filter((r) => r.env === env && r.status === 'failed' && now - new Date(r.started).getTime() <= HOUR)
    .sort((a, b) => b.started.localeCompare(a.started));
}

/**
 * Failures banner (HANDOFF H-4, Copy). A static section with a heading when the failures are there on load (CA ruling 3);
 * when they arrive after load (e.g. after Retry) the sentence is a polite status, since it's info, not a load error.
 */
export function FailuresBanner({ failures, envLabel, announce, onView }: { failures: Run[]; envLabel: string; announce: boolean; onView: (run: Run) => void }) {
  if (!failures.length) return null;
  const n = failures.length;
  return (
    <section className="dd-banner dd-banner--failed" aria-labelledby="dd-failed-title">
      <h2 id="dd-failed-title"><span className="dd-shape dd-shape--failed" aria-hidden="true" />Failed deploys</h2>
      <p role={announce ? 'status' : undefined}>{n === 1 ? `1 ${envLabel} deploy failed in the last hour.` : `${n} ${envLabel} deploys failed in the last hour.`}</p>
      <Button variant="danger" onClick={() => onView(failures[0])}>View failing deploy</Button>
    </section>
  );
}
