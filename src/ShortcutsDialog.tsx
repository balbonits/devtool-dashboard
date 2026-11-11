import { Button, Checkbox, useToast } from 'ember-ui';
import { Dialog } from './RunDialog';
import { SHORTCUTS } from './lib/shortcuts';

export function ShortcutsDialog({ onClose, enabled, setEnabled, storageBlocked }: { onClose: () => void; enabled: boolean; setEnabled: (on: boolean) => void; storageBlocked: boolean }) {
  return (
    <Dialog labelledBy="dd-keys-title" className="dd-keys-dialog" onClose={onClose}>
      <div className="dd-dialog-head"><h2 id="dd-keys-title" tabIndex={-1}>Keyboard shortcuts</h2></div>
      <div className="dd-dialog-body">
        <Toggle enabled={enabled} setEnabled={setEnabled} storageBlocked={storageBlocked} />
        <dl className="dd-keys">
          {SHORTCUTS.map((s) => (
            <div key={s.key} data-key={s.key}>
              <dt><kbd>{s.key}</kbd></dt>
              <dd>{s.label}{s.single && !enabled ? ' (off)' : ''}</dd>
            </div>
          ))}
        </dl>
        <div className="dd-run-actions"><Button variant="secondary" onClick={onClose}>Close</Button></div>
      </div>
    </Dialog>
  );
}

function Toggle({ enabled, setEnabled, storageBlocked }: { enabled: boolean; setEnabled: (on: boolean) => void; storageBlocked: boolean }) {
  const toast = useToast();
  return (
    <>
      <Checkbox
        label="Single-key shortcuts"
        hint="Turn off if they clash with your screen reader or speech input. Enter and Esc always work."
        checked={enabled}
        onChange={(e) => {
          setEnabled(e.target.checked);
          toast({ tone: 'info', title: e.target.checked ? 'Single-key shortcuts on' : 'Single-key shortcuts off' });
        }}
      />
      {storageBlocked && <p className="dd-hint">This setting won't be saved on this device.</p>}
    </>
  );
}
