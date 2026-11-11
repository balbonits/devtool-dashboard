import { Button, Checkbox, Modal } from 'ember-ui';
import { SHORTCUTS } from './lib/shortcuts';

export function ShortcutsDialog({ open, onClose, enabled, setEnabled }: { open: boolean; onClose: () => void; enabled: boolean; setEnabled: (on: boolean) => void }) {
  return (
    <Modal open={open} onClose={onClose} title="Keyboard shortcuts" actions={<Button variant="secondary" onClick={onClose}>Done</Button>}>
      <Checkbox
        label="Single-key shortcuts"
        hint="Turn off if they clash with your screen reader, voice control or typing. Enter and Esc always work."
        checked={enabled}
        onChange={(e) => setEnabled(e.target.checked)}
      />
      <table className="dd-keys">
        <caption className="sr-only">Shortcuts</caption>
        <thead><tr><th scope="col">Key</th><th scope="col">Action</th></tr></thead>
        <tbody>
          {SHORTCUTS.map((s) => (
            <tr key={s.key} data-key={s.key}>
              <th scope="row"><kbd>{s.key}</kbd></th>
              <td>{s.label}{s.single && !enabled ? ' (off)' : ''}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </Modal>
  );
}
