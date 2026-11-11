// @ts-expect-error plain .mjs module without types
import { lintSource, RETIRED } from '../scripts/token-lint-core.mjs';

describe('token-lint', () => {
  it.each(RETIRED as string[])('fails on the retired name %s', (name) => {
    expect(lintSource('a.css', `.x { border-radius: var(${name}); }`).join()).toMatch(`retired token ${name}`);
  });
  it('passes the locked names that share a prefix', () => {
    const css = '.x { border-radius: var(--radius-md); outline-color: var(--focus-ring-color); outline-width: var(--focus-ring-width); outline-offset: var(--focus-ring-offset); box-shadow: var(--shadow-raised); }';
    expect(lintSource('a.css', css)).toEqual([]);
  });
  it('still fails raw shape values and literal colors', () => {
    expect(lintSource('a.css', '.x { border-radius: 4px; color: #fff; }')).toHaveLength(2);
  });
  it('catches a retired name in a .tsx file too', () => {
    expect(lintSource('a.tsx', `const s = { borderRadius: 'var(${RETIRED[0]})' };`)).toHaveLength(1);
  });
});
