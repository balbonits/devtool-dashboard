import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { App } from './App';
import { recentProdFailures } from './AlertBanner';
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

describe('alert banner', () => {
  it('counts production failures from the last hour, newest first', () => {
    const runs = makeRuns();
    const f = recentProdFailures(runs);
    expect(f.map((r) => r.service)).toEqual(['checkout-api', 'search-indexer']);
    expect(recentProdFailures(allGreen(runs))).toEqual([]);
  });

  it('announces a new set of failures once per session, into an alert that mounted empty', async () => {
    const { unmount } = render(<App demo={null} runs={makeRuns()} />);
    const live = document.getElementById('dd-alert-text')!;
    expect(live).toHaveAttribute('role', 'alert');
    // Nothing readable at mount: the text is visibility:hidden (.dd-pending) until it is filled in.
    expect(live.firstElementChild).toHaveClass('dd-pending');
    await waitFor(() => expect(live.firstElementChild).not.toHaveClass('dd-pending'));
    expect(live).toHaveTextContent(/2 production deploys failed in the last hour/);
    unmount();
    render(<App demo={null} runs={makeRuns()} />);
    expect(screen.getByText(/2 production deploys failed/)).toBeInTheDocument();
    expect(document.getElementById('dd-alert-text')).not.toHaveAttribute('role');
  });

  it('is absent when all green', () => {
    render(<App demo="green" runs={allGreen(makeRuns())} />);
    expect(screen.queryByText(/failed in the last hour/)).not.toBeInTheDocument();
  });

  it('View failing deploy filters to it and opens its log', async () => {
    const user = userEvent.setup();
    window.history.replaceState(null, '', '/?env=staging');
    render(<App demo={null} runs={makeRuns()} />);
    await user.click(screen.getByRole('button', { name: 'View failing deploy' }));
    expect(screen.getByRole('tab', { name: 'Production' })).toHaveAttribute('aria-selected', 'true');
    expect(window.location.search).toContain('status=failed');
    expect(window.location.search).toContain('service=checkout-api');
    expect(window.location.hash).toMatch(/^#\/run\/run-\d+$/);
    expect(await screen.findByRole('heading', { level: 2, name: /^checkout-api / })).toBeInTheDocument();
  });
});

describe('log drawer', () => {
  it('opens from a row, sets the title, jumps to the first error, and returns focus on close', async () => {
    const user = userEvent.setup();
    render(<App demo={null} runs={makeRuns()} />);
    const btn = screen.getAllByRole('button', { name: /^Open log for checkout-api / })[0];
    await user.click(btn);
    const heading = await screen.findByRole('heading', { level: 2, name: /^checkout-api / });
    expect(document.title).toBe(`${heading.textContent} · Run log · Deploys`);
    await user.click(screen.getByRole('button', { name: 'Jump to first error' }));
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
});
