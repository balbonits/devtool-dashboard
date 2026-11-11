import { Button, Modal, useToast } from 'ember-ui';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { StatusBadge } from './components';
import { ago, duration } from './lib/format';
import { ENVS, type Run } from './lib/types';

/** Log drawer: a side panel on wide screens (non-modal, page stays usable) and a modal dialog on narrow ones. */
export function RunDrawer({ run, wide, onClose }: { run: Run | undefined; wide: boolean; onClose: () => void }) {
  const title = run ? `${run.service} ${run.sha}` : 'Run not found';
  const body = run ? <RunBody run={run} modal={!wide} /> : <p>This run isn't in the demo data. It may be from an older link.</p>;
  const close = <Button variant="secondary" onClick={onClose}>Close</Button>;

  if (!wide) return <Modal open onClose={onClose} title={title} actions={close}>{body}</Modal>;
  return <SidePanel title={title} onClose={onClose} actions={close}>{body}</SidePanel>;
}

function SidePanel({ title, onClose, actions, children }: { title: string; onClose: () => void; actions: ReactNode; children: ReactNode }) {
  const heading = useRef<HTMLHeadingElement>(null);
  const panel = useRef<HTMLElement>(null);
  useEffect(() => {
    // R-5: a route change moves focus to the new view's heading, and the view starts at its top.
    if (panel.current) panel.current.scrollTop = 0;
    heading.current?.focus();
  }, [title]);
  return (
    <aside
      ref={panel}
      className="dd-drawer"
      aria-labelledby="dd-drawer-title"
      onKeyDown={(e) => { if (e.key === 'Escape') { e.preventDefault(); onClose(); } }}
    >
      <div className="dd-drawer-head">
        <h2 id="dd-drawer-title" className="em-focus" tabIndex={-1} ref={heading}>{title}</h2>
      </div>
      <div className="dd-drawer-body">{children}</div>
      <div className="dd-drawer-foot">{actions}</div>
    </aside>
  );
}

/** Copy-link feedback while the run log is a modal dialog (DASH-MODAL-TOAST). The page toast renders outside the modal,
 *  where it's inert and may not be announced, so inside a modal the confirmation is a visible role=status line in the
 *  dialog (rendered empty on open, then filled, so it's announced) and the button label reads "Copied" for 2 s. The
 *  label swap is visual only: the button's name is always its visible text, and the status line is the announcement. */
const COPIED_MS = 2000;
const COPY_OK = 'Link copied';
const COPY_FAIL = "Couldn't copy link. Copy it from the address bar instead.";

function RunBody({ run, modal }: { run: Run; modal: boolean }) {
  const toast = useToast();
  const [copied, setCopied] = useState(false);
  const [status, setStatus] = useState('');
  const labelTimer = useRef<number | undefined>(undefined);
  const statusTimer = useRef<number | undefined>(undefined);
  useEffect(() => () => { window.clearTimeout(labelTimer.current); window.clearTimeout(statusTimer.current); }, []);
  const firstError = run.log.findIndex((l) => l.startsWith('ERROR'));
  const env = ENVS.find((e) => e.id === run.env)!.label;

  const jump = () => {
    const el = document.getElementById(`dd-log-${run.id}-${firstError + 1}`);
    el?.scrollIntoView({ block: 'center' });
    el?.focus();
  };
  const copy = async (button: HTMLElement) => {
    // The real state at click time: is this button inside an open modal dialog?
    const inModal = !!button.closest('dialog')?.matches(':modal');
    let ok = true;
    try {
      await navigator.clipboard.writeText(window.location.href);
    } catch {
      ok = false;
    }
    if (!inModal) {
      if (ok) toast({ tone: 'success', title: 'Link copied' });
      else toast({ tone: 'error', title: "Couldn't copy the link", message: ' Copy it from the address bar instead.' });
      return;
    }
    window.clearTimeout(labelTimer.current);
    setCopied(ok);
    if (ok) labelTimer.current = window.setTimeout(() => setCopied(false), COPIED_MS);
    // Clear, then set on a later task, so a repeat copy changes the text and is announced again.
    window.clearTimeout(statusTimer.current);
    setStatus('');
    statusTimer.current = window.setTimeout(() => setStatus(ok ? COPY_OK : COPY_FAIL), 100);
  };

  return (
    <div className="dd-run">
      <dl className="dd-facts">
        <div><dt>Status</dt><dd><StatusBadge status={run.status} /></dd></div>
        <div><dt>Environment</dt><dd>{env}</dd></div>
        <div><dt>Commit</dt><dd><code>{run.sha}</code> {run.message}</dd></div>
        <div><dt>Branch</dt><dd><code>{run.branch}</code></dd></div>
        <div><dt>Author</dt><dd>{run.author}</dd></div>
        <div><dt>Started</dt><dd><time dateTime={run.started}>{ago(run.started)}</time></dd></div>
        <div><dt>Duration</dt><dd>{duration(run.duration)}</dd></div>
      </dl>
      <div className="dd-run-actions">
        {firstError >= 0 && <Button variant="secondary" onClick={jump}>Jump to first error</Button>}
        <Button variant="secondary" onClick={(e) => void copy(e.currentTarget)}>
          <span className="dd-swap">
            <span className={copied ? 'dd-swap-off' : undefined} aria-hidden={copied || undefined}>Copy link to this run</span>
            <span className={copied ? undefined : 'dd-swap-off'} aria-hidden={copied ? undefined : true}>Copied</span>
          </span>
        </Button>
      </div>
      {modal && <p className="dd-copy-status" role="status">{status}</p>}
      <h3 className="dd-log-title" id={`dd-log-${run.id}`}>Log</h3>
      <ol className="dd-log" aria-labelledby={`dd-log-${run.id}`}>
        {run.log.map((line, i) => (
          <li key={i} id={`dd-log-${run.id}-${i + 1}`} tabIndex={line.startsWith('ERROR') ? -1 : undefined} className={line.startsWith('ERROR') ? 'dd-log-error em-focus' : undefined}>
            <span className="dd-ln" aria-hidden="true">{i + 1}</span>
            <code>{line}</code>
          </li>
        ))}
      </ol>
    </div>
  );
}
