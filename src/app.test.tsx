import { render, screen, within } from '@testing-library/react';
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
    expect(screen.getByText('9 of 9 runs shown')).toBeInTheDocument();
  });

  it('filters by status, writes the filter to the URL, and clears', async () => {
    const user = userEvent.setup();
    render(<App demo={null} runs={makeRuns()} />);
    await user.selectOptions(screen.getByLabelText('Status'), 'failed');
    expect(screen.getByText('2 of 9 runs shown')).toBeInTheDocument();
    expect(window.location.search).toBe('?status=failed');
    await user.click(screen.getByRole('button', { name: 'Clear filters' }));
    expect(screen.getByText('9 of 9 runs shown')).toBeInTheDocument();
    expect(window.location.search).toBe('');
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

  it('shows skeleton rows while loading', () => {
    render(<App demo="loading" />);
    expect(screen.getByText('Loading deploys')).toBeInTheDocument();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });
});
