import { Button } from 'ember-ui';
import { useMemo, useState } from 'react';
import { StatusBadge } from './components';
import { ago, duration } from './lib/format';
import { ariaFor } from './lib/shortcuts';
import type { Run, Status } from './lib/types';

/**
 * Runs table (HANDOFF H-2, H-4). Our own markup rather than Ember v0.2.2's Table, which can't take a visually hidden
 * "Actions" header or a custom sort order (reported to FSD for v0.3.x). Every data header is a <button> in the th,
 * the sorted th carries aria-sort plus an arrow glyph, and the table scrolls sideways inside its own focusable region.
 */
type Key = 'status' | 'service' | 'sha' | 'branch' | 'author' | 'started' | 'duration';
export type Sort = { key: Key; dir: 'ascending' | 'descending' };
export const DEFAULT_SORT: Sort = { key: 'started', dir: 'descending' };

// H-4: Status sorts Failed, Running, (In progress), Canceled, Succeeded.
const STATUS_RANK: Record<Status, number> = { failed: 0, running: 1, canceled: 3, succeeded: 4 };
const HEADERS: { key: Key; label: string }[] = [
  { key: 'status', label: 'Status' }, { key: 'service', label: 'Service' }, { key: 'sha', label: 'Commit' },
  { key: 'branch', label: 'Branch' }, { key: 'author', label: 'Author' }, { key: 'started', label: 'Started' },
  { key: 'duration', label: 'Duration' },
];
export const HEADER_LABELS = [...HEADERS.map((h) => h.label), 'Actions'];

function value(r: Run, k: Key): number | string {
  if (k === 'status') return STATUS_RANK[r.status];
  if (k === 'duration') return r.duration ?? Number.MAX_SAFE_INTEGER;
  return r[k];
}

export function sortRuns(rows: Run[], s: Sort): Run[] {
  const m = s.dir === 'ascending' ? 1 : -1;
  return [...rows].sort((a, b) => {
    const x = value(a, s.key), y = value(b, s.key);
    return (typeof x === 'number' && typeof y === 'number' ? x - y : String(x).localeCompare(String(y))) * m;
  });
}

export function RunsTable({ caption, rows, keysOn, onOpen, regionRef }: { caption: string; rows: Run[]; keysOn: boolean; onOpen: (r: Run) => void; regionRef?: React.Ref<HTMLDivElement> }) {
  const [sort, setSort] = useState<Sort>(DEFAULT_SORT);
  const sorted = useMemo(() => sortRuns(rows, sort), [rows, sort]);
  const flip = (key: Key) => setSort((s) => ({ key, dir: s.key === key ? (s.dir === 'ascending' ? 'descending' : 'ascending') : key === 'started' ? 'descending' : 'ascending' }));
  return (
    <div className="dd-tscroll" role="region" aria-labelledby="dd-runs-caption" tabIndex={0} ref={regionRef}>
      <table className="dd-runs">
        <caption id="dd-runs-caption">{caption}</caption>
        <thead>
          <tr>
            {HEADERS.map((h) => {
              const on = sort.key === h.key;
              return (
                <th key={h.key} scope="col" aria-sort={on ? sort.dir : undefined}>
                  <button type="button" className="dd-sort" onClick={() => flip(h.key)}>
                    {h.label}
                    <span className="dd-sort-icon" aria-hidden="true">{on ? (sort.dir === 'ascending' ? '↑' : '↓') : ''}</span>
                  </button>
                </th>
              );
            })}
            <th scope="col"><span className="sr-only">Actions</span></th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((r) => (
            <tr key={r.id}>
              <td><StatusBadge status={r.status} /></td>
              <th scope="row">{r.service}</th>
              <td><span className="dd-commit"><code>{r.sha}</code><span className="dd-msg">{r.message}</span></span></td>
              <td><code>{r.branch}</code></td>
              <td>{r.author}</td>
              <td><time dateTime={r.started} title={new Date(r.started).toLocaleString()}>{ago(r.started)}</time></td>
              <td>{duration(r.duration)}</td>
              <td>
                <Button
                  variant="secondary"
                  id={`logs-${r.id}`}
                  className="dd-open"
                  aria-label={`Open log for ${r.service} ${r.sha}`}
                  aria-keyshortcuts={keysOn ? `${ariaFor('j')} ${ariaFor('k')}` : undefined}
                  onClick={() => onOpen(r)}
                >
                  Open log
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
