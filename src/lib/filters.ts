import { ENVS, STATUSES, type Env, type Run, type Status } from './types';

export type Filters = { env: Env; status: Status | ''; service: string; branch: string; q: string };
export const DEFAULT_FILTERS: Filters = { env: 'production', status: '', service: '', branch: '', q: '' };

/** Filters live in the query string so a filtered view can be shared or reloaded. */
export function readFilters(search: string): Filters {
  const p = new URLSearchParams(search);
  const env = p.get('env');
  const status = p.get('status');
  return {
    env: ENVS.some((e) => e.id === env) ? (env as Env) : 'production',
    status: STATUSES.some((s) => s.id === status) ? (status as Status) : '',
    service: p.get('service') ?? '',
    branch: p.get('branch') ?? '',
    q: p.get('q') ?? '',
  };
}

export function writeFilters(f: Filters, search: string): string {
  const p = new URLSearchParams(search);
  for (const k of ['env', 'status', 'service', 'branch', 'q'] as const) {
    if (f[k] && f[k] !== DEFAULT_FILTERS[k]) p.set(k, f[k]); else p.delete(k);
  }
  const s = p.toString();
  return s ? `?${s}` : '';
}

export function hasFilters(f: Filters): boolean {
  return Boolean(f.status || f.service || f.branch || f.q);
}

export function applyFilters(runs: Run[], f: Filters): Run[] {
  const q = f.q.trim().toLowerCase();
  const branch = f.branch.trim().toLowerCase();
  return runs.filter((r) =>
    r.env === f.env &&
    (!f.status || r.status === f.status) &&
    (!f.service || r.service === f.service) &&
    (!branch || r.branch.toLowerCase().includes(branch)) &&
    (!q || [r.service, r.sha, r.message, r.branch, r.author].some((v) => v.toLowerCase().includes(q))));
}

export function services(runs: Run[]): string[] {
  return [...new Set(runs.map((r) => r.service))].sort();
}
