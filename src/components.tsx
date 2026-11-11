import type { Status } from './lib/types';

export const STATUS_LABEL: Record<Status, string> = { failed: 'Failed', running: 'Running', succeeded: 'Succeeded', canceled: 'Canceled' };

/**
 * Status is always a shape plus a word, never color alone (WCAG 1.4.1, HANDOFF H-4):
 * Succeeded square, Failed diamond, Running thin bar, Canceled hollow square.
 */
export function StatusBadge({ status }: { status: Status }) {
  return (
    <span className={`dd-status dd-status--${status}`}>
      <span className={`dd-shape dd-shape--${status}`} aria-hidden="true" />
      {STATUS_LABEL[status]}
    </span>
  );
}

/**
 * Loading state (H-4, CA ruling 4): the table is in place with aria-busy="true", its 5 skeleton rows are aria-hidden,
 * and one polite status says "Loading runs". Nothing animates (no shimmer).
 */
export function LoadingTable({ caption, headers, rows = 5 }: { caption: string; headers: string[]; rows?: number }) {
  return (
    <>
      <p className="dd-count" role="status">Loading runs</p>
      <div className="em-table-wrap dd-tscroll dd-loading" role="region" aria-labelledby="dd-loading-caption" tabIndex={0}>
        <table className="em-table em-table--dense" aria-busy="true">
          <caption id="dd-loading-caption">{caption}</caption>
          <thead><tr>{headers.map((h) => <th key={h} scope="col">{h === 'Actions' ? <span className="sr-only">Actions</span> : h}</th>)}</tr></thead>
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
