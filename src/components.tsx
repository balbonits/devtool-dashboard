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

/**
 * Loading state (DASH-SPEC line 31, CA ruling 4): the table is already in place with aria-busy="true",
 * its skeleton rows are aria-hidden, and one polite status says "Loading runs". Nothing animates.
 * Once data lands this whole table is replaced by the real one, so no aria-busy is left behind.
 */
export function LoadingTable({ caption, headers, rows = 6 }: { caption: string; headers: string[]; rows?: number }) {
  return (
    <>
      <p className="dd-count" role="status">Loading runs</p>
      {/* Same scroll region as Ember's Table, so the wide table stays reachable by keyboard at 320px. */}
      <div className="em-table-wrap dd-loading" role="region" aria-labelledby="dd-loading-caption" tabIndex={0}>
        <table className="em-table em-table--dense" aria-busy="true">
          <caption id="dd-loading-caption">{caption}</caption>
          <thead><tr>{headers.map((h) => <th key={h} scope="col">{h}</th>)}</tr></thead>
          <tbody>
            {Array.from({ length: rows }, (_, i) => (
              <tr key={i} className="dd-skel-row" aria-hidden="true">
                {headers.map((h) => <td key={h}><span className="dd-skel-line" /></td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
