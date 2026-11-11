import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { App } from './App';
import { makeRuns } from './lib/data';
import { SHORTCUTS, SHORTCUTS_KEY } from './lib/shortcuts';

beforeEach(() => {
  window.history.replaceState(null, '', '/');
  localStorage.clear();
  sessionStorage.clear();
});

const logButtons = () => screen.getAllByRole('button', { name: /^Open log for / });

describe('keyboard shortcuts (R-7)', () => {
  it('the dialog lists exactly the key map, and every single key has a control advertising it', async () => {
    const user = userEvent.setup();
    render(<App demo={null} runs={makeRuns()} />);
    await user.keyboard('?');
    const dialog = screen.getByRole('dialog', { name: 'Keyboard shortcuts' });
    const keys = within(dialog).getAllByRole('rowheader').map((th) => th.textContent);
    expect(keys).toEqual(SHORTCUTS.map((s) => s.key));
    await user.click(within(dialog).getByRole('button', { name: 'Done' }));
    for (const s of SHORTCUTS.filter((x) => x.single)) {
      expect(document.querySelector(`[aria-keyshortcuts~="${s.aria}"]`), s.key).not.toBeNull();
    }
    expect(document.querySelector('[role="application"]')).toBeNull();
  });

  it('/ focuses search, f the Status filter, j and k move between rows', async () => {
    const user = userEvent.setup();
    render(<App demo={null} runs={makeRuns()} />);
    await user.keyboard('/');
    expect(screen.getByLabelText('Search runs')).toHaveFocus();
    await user.click(document.body);
    await user.keyboard('f');
    expect(screen.getByLabelText('Status')).toHaveFocus();
    await user.click(document.body);
    await user.keyboard('jj');
    expect(logButtons()[1]).toHaveFocus();
    await user.keyboard('k');
    expect(logButtons()[0]).toHaveFocus();
  });

  it('never fires in an input or with Ctrl, Alt or Meta held', async () => {
    const user = userEvent.setup();
    render(<App demo={null} runs={makeRuns()} />);
    const search = screen.getByLabelText('Search runs');
    await user.click(search);
    await user.keyboard('j');
    expect(search).toHaveFocus();
    expect(search).toHaveValue('j');
    await user.click(document.body);
    await user.keyboard('{Control>}j{/Control}{Alt>}k{/Alt}{Meta>}/{/Meta}');
    expect(document.body).toHaveFocus();
  });

  it('can be turned off, stays off after a reload, and the header button still opens the dialog', async () => {
    const user = userEvent.setup();
    const { unmount } = render(<App demo={null} runs={makeRuns()} />);
    await user.click(screen.getByRole('button', { name: 'Keyboard shortcuts' }));
    await user.click(screen.getByRole('checkbox', { name: /Single-key shortcuts/ }));
    expect(localStorage.getItem(SHORTCUTS_KEY)).toBe('off');
    await user.click(screen.getByRole('button', { name: 'Done' }));
    unmount();

    render(<App demo={null} runs={makeRuns()} />);
    await user.click(document.body);
    await user.keyboard('/fjk?');
    expect(document.body).toHaveFocus();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Keyboard shortcuts' }));
    expect(screen.getByRole('checkbox', { name: /Single-key shortcuts/ })).not.toBeChecked();
  });

  it('falls back to on, in memory, when storage is blocked', async () => {
    const user = userEvent.setup();
    const get = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('blocked'); });
    const set = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('blocked'); });
    render(<App demo={null} runs={makeRuns()} />);
    await user.keyboard('?');
    const box = screen.getByRole('checkbox', { name: /Single-key shortcuts/ });
    expect(box).toBeChecked();
    await user.click(box);
    expect(box).not.toBeChecked();
    get.mockRestore();
    set.mockRestore();
  });

  it('drops every aria-keyshortcuts when single-key shortcuts are off', () => {
    localStorage.setItem(SHORTCUTS_KEY, 'off');
    render(<App demo={null} runs={makeRuns()} />);
    for (const s of SHORTCUTS.filter((x) => x.single)) {
      expect(document.querySelector(`[aria-keyshortcuts~="${s.aria}"]`), s.key).toBeNull();
    }
  });

  it('ignores keys typed in any editable element, plaintext-only included', async () => {
    const user = userEvent.setup();
    render(<App demo={null} runs={makeRuns()} />);
    const ed = document.createElement('div');
    ed.setAttribute('contenteditable', 'plaintext-only');
    ed.tabIndex = 0;
    document.body.append(ed);
    ed.focus();
    await user.keyboard('/');
    expect(screen.getByLabelText('Search runs')).not.toHaveFocus();
    ed.remove();
  });
});
