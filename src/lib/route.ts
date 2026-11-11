import { useEffect, useState } from 'react';

export type Route = { name: 'list' } | { name: 'run'; id: string };

export function parseHash(hash: string): Route {
  const m = /^#\/run\/([\w-]+)$/.exec(hash);
  return m ? { name: 'run', id: m[1] } : { name: 'list' };
}

export const runHref = (id: string) => `#/run/${id}`;

/** Hash routing: each change is a history entry, so Back closes the log drawer. */
export function useRoute(): Route {
  const [route, setRoute] = useState(() => parseHash(window.location.hash));
  useEffect(() => {
    const on = () => setRoute(parseHash(window.location.hash));
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);
  return route;
}

export function closeRun() {
  // Go back when the drawer was opened from the list, so Back and Close agree; otherwise replace with the list.
  if (window.history.state?.ddFromList) {
    window.history.back();
    return;
  }
  window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}#/`);
  window.dispatchEvent(new HashChangeEvent('hashchange'));
}

export function openRun(id: string) {
  window.history.pushState({ ddFromList: true }, '', `${window.location.pathname}${window.location.search}${runHref(id)}`);
  window.dispatchEvent(new HashChangeEvent('hashchange'));
}

export function useWide(query = '(min-width: 1024px)'): boolean {
  const [wide, setWide] = useState(() => window.matchMedia(query).matches);
  useEffect(() => {
    const mq = window.matchMedia(query);
    const on = () => setWide(mq.matches);
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, [query]);
  return wide;
}
