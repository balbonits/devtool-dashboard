import { allGreen, makeRuns } from './data';
import { applyFilters, readFilters, writeFilters, DEFAULT_FILTERS } from './filters';
import { ago, duration } from './format';

const NOW = Date.parse('2026-11-10T16:00:00-08:00');
const runs = makeRuns(NOW);

describe('mock data', () => {
  it('has 20-30 runs across all 3 environments, with failures', () => {
    expect(runs.length).toBeGreaterThanOrEqual(20);
    expect(runs.length).toBeLessThanOrEqual(30);
    expect(new Set(runs.map((r) => r.env))).toEqual(new Set(['production', 'staging', 'preview']));
    expect(runs.filter((r) => r.env === 'production' && r.status === 'failed').length).toBe(2);
  });
  it('failed runs have an ERROR line to jump to', () => {
    for (const r of runs.filter((x) => x.status === 'failed')) expect(r.log.some((l) => l.startsWith('ERROR'))).toBe(true);
  });
  it('all-green preview has no failures', () => {
    expect(allGreen(runs).some((r) => r.status === 'failed')).toBe(false);
  });
});

describe('filters', () => {
  it('round-trips through the query string and drops defaults', () => {
    const f = { ...DEFAULT_FILTERS, env: 'staging' as const, status: 'failed' as const, q: 'tokenizer' };
    const qs = writeFilters(f, '?state=green');
    expect(qs).toBe('?state=green&env=staging&status=failed&q=tokenizer');
    expect(readFilters(qs)).toEqual(f);
    expect(writeFilters(DEFAULT_FILTERS, '')).toBe('');
  });
  it('ignores unknown values', () => {
    expect(readFilters('?env=moon&status=on-fire')).toEqual(DEFAULT_FILTERS);
  });
  it('filters by env, status, service, branch and free text', () => {
    expect(applyFilters(runs, { ...DEFAULT_FILTERS, status: 'failed' }).map((r) => r.service)).toEqual(['checkout-api', 'search-indexer']);
    expect(applyFilters(runs, { ...DEFAULT_FILTERS, env: 'preview', branch: 'FEAT/' }).length).toBe(7);
    expect(applyFilters(runs, { ...DEFAULT_FILTERS, q: 'sam okafor' }).length).toBe(2);
    expect(applyFilters(runs, { ...DEFAULT_FILTERS, service: 'billing-cron', status: 'failed' })).toEqual([]);
  });
});

describe('format', () => {
  it('formats durations and ages', () => {
    expect(duration(null)).toBe('In progress');
    expect(duration(45)).toBe('45s');
    expect(duration(214)).toBe('3m 34s');
    expect(ago(new Date(NOW - 12 * 60_000).toISOString(), NOW)).toBe('12 min ago');
    expect(ago(new Date(NOW - 135 * 60_000).toISOString(), NOW)).toBe('2 h 15 min ago');
  });
});
