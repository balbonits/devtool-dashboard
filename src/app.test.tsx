import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { App } from './App';
import { allGreen, makeRuns } from './lib/data';

beforeEach(() => window.history.replaceState(null, '', '/'));

describe('dashboard', () => {
  it('shows production runs with status as icon plus text and a sortable Started column', () => {
    render(<App demo={null} runs={makeRuns()} />);
    expect(screen.getByRole('heading', { level: 1, name: 'Deploys' })).toBeInTheDocument();
    const table = screen.getByRole('table', { name: 'Production runs' });
    expect(within(table).getAllByText('Failed').length).toBe(2);
    expect(within(table).getByRole('columnheader', { name: /Started/ })).toHaveAttribute('aria-sort', 'descending');
    expect(screen.getByText('9 of 9 runs shown', { selector: '.dd-count' })).toBeInTheDocument();
  });

  it('filters by status, writes the filter to the URL, and clears', async () => {
    const user = userEvent.setup();
    render(<App demo={null} runs={makeRuns()} />);
    await user.selectOptions(screen.getByLabelText('Status'), 'failed');
    expect(screen.getByText('2 of 9 runs shown', { selector: '.dd-count' })).toBeInTheDocument();
    expect(window.location.search).toBe('?status=failed');
    await user.click(screen.getByRole('button', { name: 'Clear filters' }));
    expect(screen.getByText('9 of 9 runs shown', { selector: '.dd-count' })).toBeInTheDocument();
    expect(window.location.search).toBe('');
  });

  it('speaks the count at once after a filter change, and once typing in search settles (H-4)', async () => {
    const user = userEvent.setup();
    render(<App demo={null} runs={makeRuns()} />);
    const spoken = screen.getAllByRole('status').find((el) => !el.classList.contains('em-toast-region'))!;
    expect(spoken).toHaveTextContent('9 of 9 runs shown');
    await user.selectOptions(screen.getByLabelText('Status'), 'failed');
    expect(spoken).toHaveTextContent('2 of 9 runs shown');
    await user.selectOptions(screen.getByLabelText('Status'), '');
    await user.type(screen.getByLabelText('Search runs'), 'checkout');
    expect(screen.getByText('2 of 9 runs shown', { selector: '.dd-count' })).toBeInTheDocument();
    expect(spoken).not.toHaveTextContent('2 of 9 runs shown');
    await waitFor(() => expect(spoken).toHaveTextContent('2 of 9 runs shown'));
  });

  it('shows the no-results state with its own Clear filters button', async () => {
    const user = userEvent.setup();
    render(<App demo={null} runs={makeRuns()} />);
    await user.type(screen.getByLabelText('Search runs'), 'no such thing');
    expect(screen.getByText('No runs match these filters.')).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: 'Clear filters' }).length).toBe(2);
  });

  it('switches environment with the tabs and keeps it in the URL', async () => {
    const user = userEvent.setup();
    render(<App demo={null} runs={makeRuns()} />);
    await user.click(screen.getByRole('tab', { name: 'Staging' }));
    expect(screen.getByRole('table', { name: 'Staging runs' })).toBeInTheDocument();
    expect(window.location.search).toBe('?env=staging');
    expect(document.title).toBe('Deploys · Staging · Dev dashboard prototype');
  });

  it('is calm when everything is green', () => {
    render(<App demo="green" runs={allGreen(makeRuns())} />);
    expect(screen.getByText(/All deploys healthy in Production\./)).toBeInTheDocument();
  });

  it('keeps the table in place while loading (DASH-SPEC line 31)', () => {
    const { container } = render(<App demo="loading" />);
    const table = screen.getByRole('table', { name: 'Production runs' });
    expect(table).toHaveAttribute('aria-busy', 'true');
    const skel = table.querySelectorAll('tbody tr');
    expect(skel.length).toBeGreaterThan(0);
    skel.forEach((tr) => expect(tr).toHaveAttribute('aria-hidden', 'true'));
    // The empty Ember toast region is also role=status; it stays silent, so leave it out.
    const statuses = screen.getAllByRole('status').filter((el) => !el.classList.contains('em-toast-region'));
    expect(statuses).toHaveLength(1);
    expect(statuses[0]).toHaveTextContent('Loading runs');
    expect(container.querySelector('[aria-busy]')).toBe(table);
  });

  it('drops aria-busy once data lands', () => {
    render(<App demo={null} runs={makeRuns()} />);
    expect(screen.getByRole('table', { name: 'Production runs' })).not.toHaveAttribute('aria-busy');
    expect(screen.queryByText('Loading runs')).not.toBeInTheDocument();
  });
});
