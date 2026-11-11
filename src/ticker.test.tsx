import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Ticker, TICKER_SENTENCES, TICKER_TEXT } from './Ticker';

const realMatchMedia = window.matchMedia;
const mockReduce = (reduce: boolean) => {
  window.matchMedia = ((q: string) => ({
    matches: reduce && q.includes('reduce'), media: q, onchange: null,
    addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {}, dispatchEvent: () => false,
  }) as MediaQueryList);
};
afterEach(() => { window.matchMedia = realMatchMedia; });

describe('ticker (WCAG 2.2.2, Creatives 2026-11-10)', () => {
  it('is a labelled region whose moving copy is hidden, with a sentence version for screen readers', () => {
    mockReduce(false);
    const { container } = render(<Ticker />);
    const region = screen.getByRole('region', { name: 'Release notes' });
    const track = container.querySelector('.dd-ticker-track')!;
    expect(track).toHaveAttribute('aria-hidden', 'true');
    expect(track.textContent).toBe(TICKER_TEXT + TICKER_TEXT);
    expect(TICKER_TEXT).toBe('Accessible by default / Keyboard first / AA contrast in light and dark / Reduced motion respected / Mobile first /');
    expect(region).toHaveTextContent('Accessible by default. Keyboard first. AA contrast in light and dark. Reduced motion respected. Mobile first.');
  });

  it('runs by default and the visible button toggles Pause/Play', async () => {
    mockReduce(false);
    render(<Ticker />);
    const btn = screen.getByRole('button', { name: 'Pause release notes' });
    expect(btn).not.toHaveAttribute('aria-pressed');
    await userEvent.click(btn);
    expect(btn).toHaveAccessibleName('Play release notes');
    await userEvent.click(btn);
    expect(btn).toHaveAccessibleName('Pause release notes');
  });

  it('when paused, swaps the marquee for every note as static text, read once (CA 2026-11-10)', async () => {
    mockReduce(false);
    const { container } = render(<Ticker />);
    const region = screen.getByRole('region', { name: 'Release notes' });
    expect(region).toHaveAttribute('data-state', 'playing');
    expect(container.querySelector('.dd-ticker-static')).toBeNull();
    await userEvent.click(screen.getByRole('button', { name: 'Pause release notes' }));
    expect(region).toHaveAttribute('data-state', 'paused');
    expect(container.querySelector('.dd-ticker-clip')).not.toBeVisible();
    expect(container.querySelector('.dd-ticker-static')).toHaveTextContent(TICKER_SENTENCES);
    expect(container.querySelector('.sr-only')).toBeNull();
  });

  it('starts paused under reduced motion, with the static text showing', () => {
    mockReduce(true);
    const { container } = render(<Ticker />);
    expect(screen.getByRole('button', { name: 'Play release notes' })).toBeVisible();
    expect(container.querySelector('.dd-ticker-static')).toHaveTextContent(TICKER_SENTENCES);
  });
});
