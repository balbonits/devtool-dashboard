import { Button, Modal, useToast } from 'ember-ui';
import { useEffect, useRef, type ReactNode } from 'react';
import { StatusBadge } from './components';
import { ago, duration } from './lib/format';
import { ENVS, type Run } from './lib/types';

/** Log drawer: a side panel on wide screens (non-modal, page stays usable) and a modal dialog on narrow ones. */
export function RunDrawer({ run, wide, onClose }: { run: Run | undefined; wide: boolean; onClose: () => void }) {
  const title = run ? `${run.service} ${run.sha}` : 'Run not found';
  const body = run ? <RunBody run={run} /> : <p>This run isn't in the demo data. It may be from an older link.</p>;
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

function RunBody({ run }: { run: Run }) {
  const toast = useToast();
  const firstError = run.log.findIndex((l) => l.startsWith('ERROR'));
  const env = ENVS.find((e) => e.id === run.env)!.label;

  const jump = () => {
    const el = document.getElementById(`dd-log-${run.id}-${firstError + 1}`);
    el?.scrollIntoView({ block: 'center' });
    el?.focus();
  };
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      toast({ tone: 'success', title: 'Link copied' });
    } catch {
      toast({ tone: 'error', title: "Couldn't copy the link", message: ' Copy it from the address bar instead.' });
    }
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
        <Button variant="secondary" onClick={copy}>Copy link to this run</Button>
      </div>
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
