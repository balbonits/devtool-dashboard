import { Button, ToastProvider, useToast } from 'ember-ui';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { StatusBadge } from './components';
import { ago, duration } from './lib/format';
import type { Run } from './lib/types';

/**
 * Native <dialog> opened with showModal() at every width (HANDOFF H-4, Known issue 6): a centered modal below 1024px,
 * a full-height right drawer from 1024px (CSS only). The h2 takes focus on open; Esc and Close close it, and the caller
 * returns focus to the row's "Open log". Toasts live inside it so they show in the top layer above the scrim.
 */
export function Dialog({ labelledBy, className, onClose, children }: { labelledBy: string; className?: string; onClose: () => void; children: ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (!d.open) {
      if (typeof d.showModal === 'function') d.showModal(); else d.setAttribute('open', '');
    }
    d.querySelector<HTMLElement>(`#${labelledBy}`)?.focus();
    return () => { if (d.open && typeof d.close === 'function') d.close(); };
  }, [labelledBy]);
  return (
    <dialog
      ref={ref}
      className={`dd-dialog ${className ?? ''}`}
      aria-labelledby={labelledBy}
      // The browser's own Esc handling would close the dialog without telling React; route it through onClose instead.
      onCancel={(e) => { e.preventDefault(); onClose(); }}
    >
      <ToastProvider>{children}</ToastProvider>
    </dialog>
  );
}

type LogLoad = 'loading' | 'error' | 'ready';

export function RunDialog({ run, onClose, logFails = false }: { run: Run | undefined; onClose: () => void; logFails?: boolean }) {
  const title = run ? `${run.service} run ${run.sha}` : 'Run not found';
  return (
    <Dialog labelledBy="dd-run-title" className="dd-run-dialog" onClose={onClose}>
      <div className="dd-dialog-head">
        <h2 id="dd-run-title" tabIndex={-1}>{title}</h2>
      </div>
      <div className="dd-dialog-body">
        {run ? <RunBody key={run.id} run={run} onClose={onClose} logFails={logFails} /> : (
          <>
            <p>This run isn't in the demo data. It may be from an older link.</p>
            <div className="dd-run-actions"><Button variant="secondary" onClick={onClose}>Close</Button></div>
          </>
        )}
      </div>
    </Dialog>
  );
}

function RunBody({ run, onClose, logFails }: { run: Run; onClose: () => void; logFails: boolean }) {
  const toast = useToast();
  const [log, setLog] = useState<LogLoad>('loading');
  const [failNext, setFailNext] = useState(logFails);
  useEffect(() => {
    if (log !== 'loading') return;
    // Mock log fetch (H-4: 400ms). ?state=log-error fails the first load so the error and Retry can be checked.
    const t = setTimeout(() => {
      if (failNext) { setFailNext(false); setLog('error'); } else setLog('ready');
    }, 400);
    return () => clearTimeout(t);
  }, [log, failNext]);

  const firstError = run.log.findIndex((l) => l.startsWith('ERROR'));
  const link = window.location.href;
  const jump = () => {
    const el = document.getElementById(`dd-log-${run.id}-${firstError + 1}`);
    el?.scrollIntoView({ block: 'center' });
    el?.focus();
  };
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(link);
      toast({ tone: 'success', title: 'Link copied' });
    } catch {
      toast({ tone: 'error', title: "Couldn't copy the link. Select it and copy it by hand." });
    }
  };
  const noErrors = log === 'ready' && firstError < 0;

  return (
    <div className="dd-run">
      <p className="dd-run-status">
        <StatusBadge status={run.status} />
        <span> · started <time dateTime={run.started}>{ago(run.started)}</time> · {duration(run.duration)}</span>
      </p>
      <p className="dd-run-commit"><code>{run.sha}</code> {run.message} <span className="dd-muted">on <code>{run.branch}</code> by {run.author}</span></p>
      <div className="dd-run-actions">
        <Button variant="secondary" onClick={onClose}>Close</Button>
        <span className="dd-with-hint">
          <Button variant="secondary" onClick={jump} disabled={log !== 'ready' || noErrors} aria-describedby={noErrors ? 'dd-jump-hint' : undefined}>Jump to first error</Button>
          {noErrors && <span className="dd-hint" id="dd-jump-hint">No errors in this log.</span>}
        </span>
        <Button variant="primary" onClick={copy}>Copy link to this run</Button>
      </div>
      <p className="dd-run-link"><span className="sr-only">Link to this run: </span>{link}</p>
      <div className="dd-log-region" role="region" aria-label="Log output" tabIndex={0} aria-busy={log === 'loading' || undefined}>
        {log === 'loading' && <p className="dd-muted" role="status">Loading log</p>}
        {log === 'error' && (
          <div className="dd-log-error-block">
            <p role="alert">Couldn't load this log.</p>
            <Button variant="secondary" onClick={() => setLog('loading')}>Retry</Button>
          </div>
        )}
        {log === 'ready' && (
          <ol className="dd-log">
            {run.log.map((line, i) => {
              const err = line.startsWith('ERROR');
              return (
                <li key={i} id={`dd-log-${run.id}-${i + 1}`} tabIndex={err ? -1 : undefined} className={err ? 'dd-log-error' : undefined}>
                  <code>{line}</code>
                </li>
              );
            })}
          </ol>
        )}
      </div>
    </div>
  );
}
