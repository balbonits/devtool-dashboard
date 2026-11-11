import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Ticker, TICKER_TEXT } from './Ticker';

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
    const region = screen.getByRole('region', { name: 'Release notes ticker' });
    const track = container.querySelector('.dd-ticker-track')!;
    expect(track).toHaveAttribute('aria-hidden', 'true');
    expect(track.textContent).toBe(TICKER_TEXT + TICKER_TEXT);
    expect(TICKER_TEXT).toBe('Accessible by default / Keyboard first / AA contrast in light and dark / Reduced motion respected / Mobile first /');
    expect(region).toHaveTextContent('Accessible by default. Keyboard first. AA contrast in light and dark. Reduced motion respected. Mobile first.');
  });

  it('runs by default and the visible button toggles Pause/Play', async () => {
    mockReduce(false);
    render(<Ticker />);
    const btn = screen.getByRole('button', { name: 'Pause ticker' });
    await userEvent.click(btn);
    expect(btn).toHaveAccessibleName('Play ticker');
    await userEvent.click(btn);
    expect(btn).toHaveAccessibleName('Pause ticker');
  });

  it('starts paused under reduced motion', () => {
    mockReduce(true);
    render(<Ticker />);
    expect(screen.getByRole('button', { name: 'Play ticker' })).toBeVisible();
  });
});
