import '@testing-library/jest-dom/vitest';

// jsdom has no matchMedia; default to the narrow (mobile) layout.
if (!window.matchMedia) {
  window.matchMedia = (q: string) => ({
    matches: false, media: q, onchange: null,
    addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {}, dispatchEvent: () => false,
  }) as MediaQueryList;
}
