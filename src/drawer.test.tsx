import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { App } from './App';
import { recentFailures } from './AlertBanner';
import { allGreen, makeRuns } from './lib/data';
import { parseHash } from './lib/route';

beforeEach(() => {
  window.history.replaceState(null, '', '/');
  sessionStorage.clear();
});

describe('routes', () => {
  it('parses run links and falls back to the list', () => {
    expect(parseHash('#/run/run-03')).toEqual({ name: 'run', id: 'run-03' });
    expect(parseHash('#/')).toEqual({ name: 'list' });
    expect(parseHash('#/run/')).toEqual({ name: 'list' });
  });
});

describe('failures banner', () => {
  it('counts one environment\'s failures from the last hour, newest first', () => {
    const runs = makeRuns();
    expect(recentFailures(runs, 'production').map((r) => r.service)).toEqual(['checkout-api', 'search-indexer']);
    expect(recentFailures(runs, 'staging')).toEqual([]);
    expect(recentFailures(allGreen(runs), 'production')).toEqual([]);
  });

  it('is a static section with the heading "Failed deploys" and no live role on load (CA ruling 3)', () => {
    render(<App demo={null} runs={makeRuns()} />);
    const banner = screen.getByRole('region', { name: 'Failed deploys' });
    expect(within(banner).getByText('2 Production deploys failed in the last hour.')).not.toHaveAttribute('role');
    expect(banner.querySelector('[role="alert"], [role="status"], [aria-live]')).toBeNull();
  });

  it('is absent when all green, which shows the calm line instead', () => {
    render(<App demo="green" runs={allGreen(makeRuns())} />);
    expect(screen.queryByText(/failed in the last hour/)).not.toBeInTheDocument();
    expect(screen.getByText('All deploys healthy in Production.')).toBeInTheDocument();
  });

  it('View failing deploy sets Status and Service, then opens the newest failing run', async () => {
    const user = userEvent.setup();
    render(<App demo={null} runs={makeRuns()} />);
    await user.click(screen.getByRole('button', { name: 'View failing deploy' }));
    expect(window.location.search).toContain('status=failed');
    expect(window.location.search).toContain('service=checkout-api');
    expect(window.location.hash).toMatch(/^#\/run\/run-\d+$/);
    expect(await screen.findByRole('heading', { level: 2, name: /^checkout-api run / })).toHaveFocus();
  });
});

describe('log drawer', () => {
  it('opens from a row, sets the title, jumps to the first error, and returns focus on close', async () => {
    const user = userEvent.setup();
    render(<App demo={null} runs={makeRuns()} />);
    const btn = screen.getAllByRole('button', { name: /^Open log for checkout-api / })[0];
    await user.click(btn);
    const heading = await screen.findByRole('heading', { level: 2, name: /^checkout-api run / });
    expect(heading).toHaveFocus();
    expect(document.title).toBe(`${heading.textContent} · Run log · Deploys`);
    expect(within(heading.closest('dialog')!).getByText('Loading log')).toHaveAttribute('role', 'status');
    const jump = screen.getByRole('button', { name: 'Jump to first error' });
    await waitFor(() => expect(jump).toBeEnabled());
    await user.click(jump);
    expect(document.activeElement?.textContent).toMatch(/ERROR/);
    await user.click(screen.getByRole('button', { name: 'Close' }));
    await waitFor(() => expect(window.location.hash).not.toMatch(/run/));
    await waitFor(() => expect(document.activeElement).toBe(document.getElementById(btn.id)));
    expect(document.title).toBe('Deploys · Production · Dev dashboard prototype');
  });

  it('handles a run link that is not in the data', async () => {
    window.history.replaceState(null, '', '/#/run/run-99');
    render(<App demo={null} runs={makeRuns()} />);
    expect(await screen.findByText(/isn't in the demo data/)).toBeInTheDocument();
    expect(document.title).toBe('Run not found · Deploys');
  });

  it('copies the link and confirms with a toast', async () => {
    const user = userEvent.setup();
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
    render(<App demo={null} runs={makeRuns()} />);
    await user.click(screen.getAllByRole('button', { name: /^Open log for / })[0]);
    await act(async () => { await user.click(screen.getByRole('button', { name: 'Copy link to this run' })); });
    expect(writeText).toHaveBeenCalledWith(expect.stringMatching(/#\/run\/run-\d+$/));
    expect(await screen.findByText('Link copied')).toBeInTheDocument();
  });

  it('disables Jump to first error with a visible reason when the log has no errors', async () => {
    const user = userEvent.setup();
    render(<App demo={null} runs={makeRuns()} />);
    await user.click(screen.getByRole('button', { name: /^Open log for web-storefront c07a9e4/ }));
    await waitFor(() => expect(screen.getByRole('button', { name: 'Jump to first error' })).toHaveAccessibleDescription('No errors in this log.'));
    expect(screen.getByRole('button', { name: 'Jump to first error' })).toBeDisabled();
  });

  it('shows the log error with Retry inside the dialog, then loads on Retry', async () => {
    const user = userEvent.setup();
    render(<App demo="log-error" runs={makeRuns()} />);
    await user.click(screen.getAllByRole('button', { name: /^Open log for / })[0]);
    const dialog = (await screen.findByRole('heading', { level: 2, name: /run/ })).closest('dialog')!;
    expect(await within(dialog).findByText("Couldn't load this log.", {}, { timeout: 2000 })).toHaveAttribute('role', 'alert');
    await user.click(within(dialog).getByRole('button', { name: 'Retry' }));
    const log = within(dialog).getByRole('region', { name: 'Log output' });
    await waitFor(() => expect(log.querySelector('ol')).not.toBeNull());
    expect(log).not.toHaveAttribute('aria-busy');
  });
});
