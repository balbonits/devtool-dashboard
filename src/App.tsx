import { Button, Input, Select, Table, Tabs, ToastProvider, type Column } from 'ember-ui';
import { useEffect, useMemo, useRef, useState } from 'react';
import { AlertBanner, recentProdFailures } from './AlertBanner';
import { RunDrawer } from './RunDrawer';
import { closeRun, openRun, useRoute, useWide } from './lib/route';
import { SkeletonRows, StatusBadge } from './components';
import { allGreen, makeRuns } from './lib/data';
import { DEFAULT_FILTERS, applyFilters, hasFilters, readFilters, services, writeFilters, type Filters } from './lib/filters';
import { ago, duration } from './lib/format';
import { ENVS, STATUSES, type Run } from './lib/types';

export type DemoState = 'loading' | 'error' | 'green' | null;

export function demoFromUrl(search: string): DemoState {
  const s = new URLSearchParams(search).get('state');
  return s === 'loading' || s === 'error' || s === 'green' ? s : null;
}

export function App({ demo = demoFromUrl(window.location.search), runs }: { demo?: DemoState; runs?: Run[] }) {
  return (
    <ToastProvider>
      <Dashboard demo={demo} initialRuns={runs} />
    </ToastProvider>
  );
}

type Load = { kind: 'loading' } | { kind: 'error' } | { kind: 'ready'; runs: Run[] };

function useRuns(demo: DemoState, initial?: Run[]) {
  const [load, setLoad] = useState<Load>(() => (initial ? { kind: 'ready', runs: initial } : { kind: 'loading' }));
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    if (initial || demo === 'loading') return;
    // Mock fetch: no backend in this prototype.
    const t = setTimeout(() => {
      if (demo === 'error' && attempt === 0) setLoad({ kind: 'error' });
      else setLoad({ kind: 'ready', runs: demo === 'green' ? allGreen(makeRuns()) : makeRuns() });
    }, 300);
    return () => clearTimeout(t);
  }, [demo, initial, attempt]);
  return { load, retry: () => { setLoad({ kind: 'loading' }); setAttempt((n) => n + 1); } };
}

function useFilters(): [Filters, (patch: Partial<Filters>) => void] {
  const [f, setF] = useState<Filters>(() => readFilters(window.location.search));
  const update = (patch: Partial<Filters>) => {
    setF((prev) => {
      const next = { ...prev, ...patch };
      const qs = writeFilters(next, window.location.search);
      window.history.replaceState(window.history.state, '', `${window.location.pathname}${qs}${window.location.hash}`);
      return next;
    });
  };
  return [f, update];
}

function Dashboard({ demo, initialRuns }: { demo: DemoState; initialRuns?: Run[] }) {
  const { load, retry } = useRuns(demo, initialRuns);
  const [filters, setFilters] = useFilters();
  const route = useRoute();
  const wide = useWide();
  const [tabsKey, setTabsKey] = useState(0); // remounts the uncontrolled Tabs only when code (not the user) changes the env
  const lastRun = useRef<string | null>(null);
  const envLabel = ENVS.find((e) => e.id === filters.env)!.label;
  const runs = load.kind === 'ready' ? load.runs : [];
  const open = route.name === 'run' ? runs.find((r) => r.id === route.id) : undefined;
  const failures = useMemo(() => recentProdFailures(load.kind === 'ready' ? load.runs : []), [load]);

  // R-5: every route change updates the title; closing the drawer returns focus to the row it came from (or the H1).
  useEffect(() => {
    if (route.name === 'run') {
      lastRun.current = route.id;
      document.title = open ? `${open.service} ${open.sha} · Run log · Deploys` : 'Run not found · Deploys';
      return;
    }
    document.title = `Deploys · ${envLabel} · Dev dashboard prototype`;
    if (lastRun.current) {
      const id = lastRun.current;
      lastRun.current = null;
      requestAnimationFrame(() => {
        const row = document.getElementById(`logs-${id}`);
        if (row) row.focus(); else document.querySelector<HTMLElement>('#main h1')?.focus();
      });
    }
  }, [route, open, envLabel]);

  const viewFailure = (run: Run) => {
    if (filters.env !== run.env) setTabsKey((k) => k + 1);
    setFilters({ env: run.env, status: 'failed', service: run.service, branch: '', q: '' });
    openRun(run.id);
  };

  return (
    <div className={`ember dd-app${route.name === 'run' && wide ? ' dd-app--drawer' : ''}`}>
      <a className="dd-skip em-focus" href="#main" onClick={(e) => { e.preventDefault(); document.getElementById('main')?.focus(); }}>Skip to content</a>
      <aside aria-label="About this prototype"><p className="dd-demo-note">
        Prototype with fictional services and runs. Nothing here is real data.
        {demo && <> Previewing the <strong>{demo === 'green' ? 'all green' : demo}</strong> state. <a href="./">Exit preview</a></>}
      </p></aside>
      <main id="main" className="dd-main" tabIndex={-1}>
        <header className="dd-head">
          <h1 className="em-focus" tabIndex={-1}>Deploys</h1>
          <form role="search" className="dd-search" onSubmit={(e) => e.preventDefault()}>
            <Input label="Search runs" type="search" placeholder="Service, commit, branch or author" value={filters.q} onChange={(e) => setFilters({ q: e.target.value })} />
          </form>
        </header>
        {load.kind === 'error' && (
          <div role="alert" className="dd-banner dd-banner--error">
            <p>Couldn't load deploys.</p>
            <Button variant="secondary" onClick={retry}>Retry</Button>
          </div>
        )}
        {load.kind === 'ready' && <AlertBanner failures={failures} onView={viewFailure} />}
        <Tabs
          key={tabsKey}
          label="Environment"
          defaultTab={filters.env}
          onChange={(id) => setFilters({ env: id as Filters['env'] })}
          tabs={ENVS.map((env) => ({
            id: env.id,
            label: env.label,
            // Only the selected panel is rendered, so there is one filter bar and one table in the page.
            content: env.id === filters.env ? <EnvPanel load={load} filters={filters} setFilters={setFilters} /> : null,
          }))}
        />
      </main>
      <footer className="dd-footer">
        <p>
          A UX case study prototype by John Dilig, built with <a href="/ux/design-system/">Ember UI</a>.{' '}
          <a href="/ux/">All UX case studies</a> · <a href="https://github.com/balbonits/devtool-dashboard">Source on GitHub</a>
        </p>
      </footer>
      {route.name === 'run' && load.kind === 'ready' && <RunDrawer run={open} wide={wide} onClose={closeRun} />}
    </div>
  );
}

const columns: Column<Run>[] = [
  { key: 'status', header: 'Status', sortable: true, render: (r) => <StatusBadge status={r.status} /> },
  { key: 'service', header: 'Service', sortable: true, rowHeader: true },
  { key: 'sha', header: 'Commit', render: (r) => <span className="dd-commit"><code>{r.sha}</code> <span className="dd-msg">{r.message}</span></span> },
  { key: 'branch', header: 'Branch', sortable: true, render: (r) => <code>{r.branch}</code> },
  { key: 'author', header: 'Author', sortable: true },
  { key: 'started', header: 'Started', sortable: true, render: (r) => <time dateTime={r.started} title={new Date(r.started).toLocaleString()}>{ago(r.started)}</time> },
  { key: 'duration', header: 'Duration', sortable: true, render: (r) => duration(r.duration) },
  {
    key: 'id', header: 'Actions',
    render: (r) => (
      <Button id={`logs-${r.id}`} variant="secondary" onClick={() => openRun(r.id)} aria-label={`Open log for ${r.service} ${r.sha}`}>Log</Button>
    ),
  },
];

function EnvPanel({ load, filters, setFilters }: { load: Load; filters: Filters; setFilters: (p: Partial<Filters>) => void }) {
  const all = useMemo(() => (load.kind === 'ready' ? load.runs : []), [load]);
  const envRuns = useMemo(() => all.filter((r) => r.env === filters.env), [all, filters.env]);
  const rows = useMemo(() => applyFilters(all, filters), [all, filters]);
  const envLabel = ENVS.find((e) => e.id === filters.env)!.label;
  const clear = () => setFilters({ status: DEFAULT_FILTERS.status, service: '', branch: '', q: '' });
  const healthy = load.kind === 'ready' && !envRuns.some((r) => r.status === 'failed');

  return (
    <>
      <div className="dd-filters" role="group" aria-label="Filters">
        <Select label="Status" value={filters.status} onChange={(e) => setFilters({ status: e.target.value as Filters['status'] })}>
          <option value="">All statuses</option>
          {STATUSES.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
        </Select>
        <Select label="Service" value={filters.service} onChange={(e) => setFilters({ service: e.target.value })}>
          <option value="">All services</option>
          {services(all).map((s) => <option key={s} value={s}>{s}</option>)}
        </Select>
        <Input label="Branch" value={filters.branch} onChange={(e) => setFilters({ branch: e.target.value })} />
        <Button variant="ghost" onClick={clear} disabled={!hasFilters(filters)}>Clear filters</Button>
      </div>
      {load.kind === 'loading' && <SkeletonRows />}
      {load.kind === 'error' && <p className="dd-muted">No runs to show until deploys load.</p>}
      {load.kind === 'ready' && (
        <>
          {healthy && <p className="dd-calm"><StatusBadge status="succeeded" /> All deploys healthy in {envLabel}.</p>}
          <p className="dd-count" role="status">{rows.length} of {envRuns.length} runs shown</p>
          <Table<Run>
            caption={`${envLabel} runs`}
            columns={columns}
            rows={rows}
            rowKey={(r) => r.id}
            dense
            initialSort={{ key: 'started', dir: 'descending' }}
            empty={<div className="dd-empty"><p>No runs match these filters.</p><Button variant="secondary" onClick={clear}>Clear filters</Button></div>}
          />
        </>
      )}
    </>
  );
}
