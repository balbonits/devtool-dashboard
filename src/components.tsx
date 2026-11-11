import type { Status } from './lib/types';

const GLYPH: Record<Status, string> = { failed: '✕', running: '◔', succeeded: '✓', canceled: '–' };
const LABEL: Record<Status, string> = { failed: 'Failed', running: 'Running', succeeded: 'Succeeded', canceled: 'Canceled' };

/** Status is always a shape plus a word, never color alone (WCAG 1.4.1). */
export function StatusBadge({ status }: { status: Status }) {
  return (
    <span className={`dd-status dd-status--${status}`}>
      <span className="dd-status-icon" aria-hidden="true">{GLYPH[status]}</span>
      {LABEL[status]}
    </span>
  );
}

export function SkeletonRows({ rows = 6 }: { rows?: number }) {
  return (
    <div className="dd-skeleton" role="status" aria-live="polite">
      <span className="sr-only">Loading deploys</span>
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="dd-skel-row" aria-hidden="true">
          <span className="dd-skel-line" /><span className="dd-skel-line" /><span className="dd-skel-line" />
        </div>
      ))}
    </div>
  );
}
