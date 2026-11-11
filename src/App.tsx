import { Button, Input, Select, ToastProvider } from 'ember-ui';
import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { FailuresBanner, recentFailures } from './AlertBanner';
import { RunDialog } from './RunDialog';
import { RunsTable, HEADER_LABELS } from './RunsTable';
import { ShortcutsDialog } from './ShortcutsDialog';
import { Ticker } from './Ticker';
import { ariaFor, moveRow, useShortcutSetting, useShortcuts, type ShortcutActions } from './lib/shortcuts';
import { closeRun, openRun, useRoute } from './lib/route';
import { useMode } from './lib/mode';
import { LoadingTable } from './components';
import { allGreen, makeRuns } from './lib/data';
import { DEFAULT_FILTERS, applyFilters, hasFilters, readFilters, services, writeFilters, type Filters } from './lib/filters';
import { ENVS, STATUSES, type Env, type Run } from './lib/types';

/** Preview states: ?state=loading | error | green | empty (Preview has no runs) | log-error (first log load fails). */
export type DemoState = 'loading' | 'error' | 'green' | 'empty' | 'log-error' | null;
const DEMO_LABEL: Record<Exclude<DemoState, null>, string> = { loading: 'loading', error: 'load error', green: 'all green', empty: 'no data yet', 'log-error': 'log error' };

export function demoFromUrl(search: string): DemoState {
  const s = new URLSearchParams(search).get('state');
  return s === 'loading' || s === 'error' || s === 'green' || s === 'empty' || s === 'log-error' ? s : null;
}

export function App({ demo = demoFromUrl(window.location.search), runs }: { demo?: DemoState; runs?: Run[] }) {
  return (
    <ToastProvider>
      <Dashboard demo={demo} initialRuns={runs} />
    </ToastProvider>
  );
}

type Load = { kind: 'loading' } | { kind: 'error' } | { kind: 'ready'; runs: Run[] };

function demoRuns(demo: DemoState): Run[] {
  const runs = makeRuns();
  if (demo === 'green') return allGreen(runs);
  if (demo === 'empty') return runs.filter((r) => r.env !== 'preview');
  return runs;
}

function useRuns(demo: DemoState, initial?: Run[]) {
  // Mock data is local, so the normal views render ready on first paint (no skeleton flash, no layout shift).
  // ?state=loading and ?state=error preview the other states, and Retry goes through the loading state.
  const [load, setLoad] = useState<Load>(() => {
    if (initial) return { kind: 'ready', runs: initial };
    if (demo === 'loading' || demo === 'error') return { kind: 'loading' };
    return { kind: 'ready', runs: demoRuns(demo) };
  });
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    if (initial || demo === 'loading' || (attempt === 0 && demo !== 'error')) return;
    // Mock fetch: no backend in this prototype.
    const t = setTimeout(() => {
      if (demo === 'error' && attempt === 0) setLoad({ kind: 'error' });
      else setLoad({ kind: 'ready', runs: makeRuns() });
    }, 300);
    return () => clearTimeout(t);
  }, [demo, initial, attempt]);
  return { load, attempt, retry: () => { setLoad({ kind: 'loading' }); setAttempt((n) => n + 1); } };
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

function Header() {
  const [mode, toggle] = useMode();
  return (
    <>
    <header className="dd-top">
      <div className="dd-wrap dd-bar">
        <a className="dd-logo" href="#/">Dev dashboard <span className="dd-mono dd-muted">Ember UI · kinetic</span></a>
        <Button variant="secondary" className="dd-mode" onClick={toggle}>{mode === 'dark' ? 'Light mode' : 'Dark mode'}</Button>
      </div>
    </header>
    <Ticker />
    </>
  );
}

function Dashboard({ demo, initialRuns }: { demo: DemoState; initialRuns?: Run[] }) {
  const { load, attempt, retry } = useRuns(demo, initialRuns);
  const [filters, setFilters] = useFilters();
  const route = useRoute();
  const lastRun = useRef<string | null>(null);
  const [keysOpen, setKeysOpen] = useState(false);
  const [keysOn, setKeysOn, keysBlocked] = useShortcutSetting();
  const actions = useMemo<ShortcutActions>(() => ({
    // The target is whichever control advertises the key, so the aria-keyshortcuts and the behavior can't drift apart.
    '/': () => document.querySelector<HTMLElement>(`#main input[aria-keyshortcuts="${ariaFor('/')}"]`)?.focus(),
    f: () => document.querySelector<HTMLElement>(`#main select[aria-keyshortcuts="${ariaFor('f')}"]`)?.focus(),
    j: () => moveRow(1),
    k: () => moveRow(-1),
    '?': () => setKeysOpen(true),
  }), []);
  useShortcuts(keysOn, actions);
  const envLabel = ENVS.find((e) => e.id === filters.env)!.label;
  const runs = load.kind === 'ready' ? load.runs : [];
  const open = route.name === 'run' ? runs.find((r) => r.id === route.id) : undefined;

  // R-5: every route change updates the title; closing the log returns focus to the row it came from (or the h1).
  useEffect(() => {
    if (route.name === 'run') {
      lastRun.current = route.id;
      document.title = open ? `${open.service} run ${open.sha} · Run log · Deploys` : 'Run not found · Deploys';
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
    setFilters({ status: 'failed', service: run.service, branch: '', q: '' });
    openRun(run.id);
  };
  const closeKeys = () => { setKeysOpen(false); requestAnimationFrame(() => document.getElementById('dd-keysbtn')?.focus()); };

  return (
    <div className="dd-app">
      <a className="dd-skip" href="#main" onClick={(e) => { e.preventDefault(); document.getElementById('main')?.focus(); }}>Skip to content</a>
      <Header />
      <div className="dd-wrap">
        <aside className="dd-pnote" aria-label="About this prototype">
          {demo
            ? <p>Previewing the {DEMO_LABEL[demo]} state. <a href="./">Exit preview</a></p>
            : <p>Prototype with fictional services and runs. Nothing here is real data.</p>}
        </aside>
      </div>
      <main id="main" className="dd-wrap dd-main" tabIndex={-1}>
        <div className="dd-head">
          <div>
            <p className="dd-eyebrow dd-mono dd-muted">Dev dashboard</p>
            <h1 tabIndex={-1}>Deploys</h1>
          </div>
          <Button id="dd-keysbtn" variant="secondary" className="dd-keysbtn" aria-label="Keyboard shortcuts" aria-keyshortcuts={keysOn ? ariaFor('?') : undefined} onClick={() => setKeysOpen(true)}>
            <span className="dd-kq" aria-hidden="true">?</span><span className="dd-kl" aria-hidden="true">Keyboard shortcuts</span>
          </Button>
        </div>
        <EnvPanel load={load} attempt={attempt} retry={retry} filters={filters} setFilters={setFilters} keysOn={keysOn} onView={viewFailure} />
      </main>
      <footer className="dd-footer">
        <p className="dd-wrap">
          A UX case study prototype by John Dilig, built with <a href="/ux/design-system/">Ember UI</a>.{' '}
          <a href="/ux/">All UX case studies</a> · <a href="https://github.com/balbonits/devtool-dashboard">Source on GitHub</a>
        </p>
      </footer>
      {keysOpen && <ShortcutsDialog onClose={closeKeys} enabled={keysOn} setEnabled={setKeysOn} storageBlocked={keysBlocked} />}
      {route.name === 'run' && load.kind === 'ready' && <RunDialog run={open} onClose={closeRun} logFails={demo === 'log-error'} />}
    </div>
  );
}

/** Environment Tabs (H-3): our own tablist, automatic activation, Left/Right/Home/End, one tabindex="0" Tab. */
function EnvTabs({ env, onChange }: { env: Env; onChange: (env: Env) => void }) {
  const key = (e: KeyboardEvent<HTMLDivElement>) => {
    const i = ENVS.findIndex((x) => x.id === env);
    const n = e.key === 'ArrowRight' ? (i + 1) % ENVS.length : e.key === 'ArrowLeft' ? (i - 1 + ENVS.length) % ENVS.length : e.key === 'Home' ? 0 : e.key === 'End' ? ENVS.length - 1 : -1;
    if (n < 0) return;
    e.preventDefault();
    onChange(ENVS[n].id);
    document.getElementById(`env-${ENVS[n].id}`)?.focus();
  };
  return (
    <div role="tablist" aria-label="Environments" className="dd-tabs" onKeyDown={key}>
      {ENVS.map((x) => (
        <button key={x.id} id={`env-${x.id}`} role="tab" type="button" aria-selected={x.id === env} aria-controls="dd-panel" tabIndex={x.id === env ? 0 : -1} onClick={() => onChange(x.id)}>
          {x.label}
        </button>
      ))}
    </div>
  );
}

function EnvPanel({ load, attempt, retry, filters, setFilters, keysOn, onView }: { load: Load; attempt: number; retry: () => void; filters: Filters; setFilters: (p: Partial<Filters>) => void; keysOn: boolean; onView: (r: Run) => void }) {
  const all = useMemo(() => (load.kind === 'ready' ? load.runs : []), [load]);
  const envRuns = useMemo(() => all.filter((r) => r.env === filters.env), [all, filters.env]);
  const rows = useMemo(() => applyFilters(all, filters), [all, filters]);
  const envLabel = ENVS.find((e) => e.id === filters.env)!.label;
  const failures = useMemo(() => recentFailures(all, filters.env), [all, filters.env]);
  const healthy = load.kind === 'ready' && envRuns.length > 0 && !envRuns.some((r) => r.status === 'failed');
  const search = useRef<HTMLDivElement>(null);
  const region = useRef<HTMLDivElement>(null);
  const clear = () => {
    setFilters({ status: DEFAULT_FILTERS.status, service: '', branch: '', q: '' });
    search.current?.querySelector('input')?.focus();
  };
  const goTo: Env = filters.env === 'production' ? 'staging' : 'production';
  const goToLabel = ENVS.find((e) => e.id === goTo)!.label;

  // H-4: the count is one polite status; it waits 300ms while typing in search and updates at once otherwise.
  const count = `${rows.length} of ${envRuns.length} runs shown`;
  const [spoken, setSpoken] = useState(count);
  const lastQ = useRef(filters.q);
  useEffect(() => {
    const typing = lastQ.current !== filters.q;
    lastQ.current = filters.q;
    if (!typing) { setSpoken(count); return; }
    const t = setTimeout(() => setSpoken(count), 300);
    return () => clearTimeout(t);
  }, [count, filters.q]);

  // Retry: the error block stays with a disabled "Retrying…" while "Loading runs" plays; on success focus goes to the table.
  const [fromError, setFromError] = useState(false);
  const retrying = fromError && load.kind === 'loading';
  const showError = load.kind === 'error' || retrying;
  useEffect(() => {
    if (fromError && load.kind === 'ready') requestAnimationFrame(() => region.current?.focus());
  }, [load, fromError]);

  return (
    <>
      <div className="dd-envbar">
        <EnvTabs env={filters.env} onChange={(env) => setFilters({ env })} />
        <form role="search" className="dd-search" onSubmit={(e) => e.preventDefault()}>
          <div ref={search}><Input aria-keyshortcuts={keysOn ? ariaFor('/') : undefined} label="Search runs" hint="Service, commit, branch or author" type="search" autoComplete="off" value={filters.q} onChange={(e) => setFilters({ q: e.target.value })} /></div>
        </form>
      </div>
      <div id="dd-panel" role="tabpanel" aria-labelledby={`env-${filters.env}`} className="dd-panel">
        {load.kind === 'ready' && <FailuresBanner failures={failures} envLabel={envLabel} announce={attempt > 0} onView={onView} />}
        {healthy && <p className="dd-calm"><span className="dd-shape dd-shape--succeeded" aria-hidden="true" />All deploys healthy in {envLabel}.</p>}
        <div className="dd-filters" role="group" aria-label="Filters">
          <Select aria-keyshortcuts={keysOn ? ariaFor('f') : undefined} label="Status" value={filters.status} onChange={(e) => setFilters({ status: e.target.value as Filters['status'] })}>
            <option value="">All statuses</option>
            {STATUSES.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
          </Select>
          <Select label="Service" value={filters.service} onChange={(e) => setFilters({ service: e.target.value })}>
            <option value="">All services</option>
            {services(all).map((s) => <option key={s} value={s}>{s}</option>)}
          </Select>
          <Input label="Branch" autoComplete="off" value={filters.branch} onChange={(e) => setFilters({ branch: e.target.value })} />
          <div className="dd-clearf">
            <Button variant="secondary" onClick={clear} disabled={!hasFilters(filters)} aria-describedby={hasFilters(filters) ? undefined : 'dd-clearf-hint'}>Clear filters</Button>
            {!hasFilters(filters) && <p className="dd-hint" id="dd-clearf-hint">No filters to clear.</p>}
          </div>
        </div>
        {showError && (
          <div role="alert" className="dd-loaderr">
            <h2>Couldn't load deploys</h2>
            <p>Check your connection, then try again.</p>
            <Button variant="primary" disabled={retrying} onClick={() => { setFromError(true); retry(); }}>{retrying ? 'Retrying…' : 'Retry'}</Button>
          </div>
        )}
        {load.kind === 'loading' && <LoadingTable caption={`${envLabel} runs`} headers={HEADER_LABELS} />}
        {load.kind === 'ready' && envRuns.length === 0 && (
          <div className="dd-empty">
            <p><b>No runs in {envLabel} yet. Runs show up here after the first deploy to {envLabel}.</b></p>
            <Button variant="secondary" onClick={() => { setFilters({ env: goTo }); requestAnimationFrame(() => document.getElementById(`env-${goTo}`)?.focus()); }}>Go to {goToLabel}</Button>
          </div>
        )}
        {load.kind === 'ready' && envRuns.length > 0 && (
          <>
            <p className="dd-count" aria-hidden="true">{count}</p>
            <p className="sr-only" role="status">{spoken}</p>
            {rows.length === 0 ? (
              <div className="dd-empty">
                <p><b>No runs match these filters.</b></p>
                <Button variant="secondary" onClick={clear}>Clear filters</Button>
              </div>
            ) : (
              <RunsTable caption={`${envLabel} runs`} rows={rows} keysOn={keysOn} onOpen={(r) => openRun(r.id)} regionRef={region} />
            )}
          </>
        )}
      </div>
    </>
  );
}
