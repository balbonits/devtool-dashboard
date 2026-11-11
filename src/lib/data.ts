import type { Env, Run, Status } from './types';

// Fictional services, people and commits. Times are relative to page load so the demo always looks current.
type Seed = [Env, string, Status, string, string, string, string, number, number | null];
const SEEDS: Seed[] = [
  ['production', 'checkout-api', 'failed', '9f3c2a1', 'Retry card auth on gateway timeout', 'main', 'Ana Reyes', 12, 214],
  ['production', 'search-indexer', 'failed', '41be7d0', 'Bump analyzer to v3 tokenizer', 'main', 'Sam Okafor', 38, 402],
  ['production', 'web-storefront', 'succeeded', 'c07a9e4', 'Lazy-load product carousel images', 'main', 'Lee Park', 74, 288],
  ['production', 'auth-gateway', 'running', '5d21f8b', 'Rotate session signing key', 'main', 'Mira Chen', 3, null],
  ['production', 'notifications-worker', 'succeeded', 'e8a4410', 'Batch email sends by region', 'main', 'Jo Alvarez', 135, 176],
  ['production', 'billing-cron', 'succeeded', '2b9d6c3', 'Fix proration rounding for annual plans', 'main', 'Ana Reyes', 190, 95],
  ['production', 'checkout-api', 'succeeded', '7a1e0f2', 'Add idempotency key to refunds', 'main', 'Dev Patel', 260, 221],
  ['production', 'search-indexer', 'canceled', '0c4b8a9', 'Reindex synonyms nightly', 'main', 'Sam Okafor', 330, 61],
  ['production', 'web-storefront', 'succeeded', 'f61d2b7', 'Move promo banner behind flag', 'main', 'Lee Park', 410, 301],
  ['staging', 'checkout-api', 'succeeded', '9f3c2a1', 'Retry card auth on gateway timeout', 'main', 'Ana Reyes', 55, 209],
  ['staging', 'search-indexer', 'failed', '41be7d0', 'Bump analyzer to v3 tokenizer', 'main', 'Sam Okafor', 70, 388],
  ['staging', 'auth-gateway', 'succeeded', '5d21f8b', 'Rotate session signing key', 'main', 'Mira Chen', 22, 143],
  ['staging', 'web-storefront', 'running', 'aa30c5e', 'Try new checkout button copy', 'release/2026.11', 'Lee Park', 2, null],
  ['staging', 'notifications-worker', 'failed', 'd4f9e21', 'Drop legacy SMS provider', 'release/2026.11', 'Jo Alvarez', 96, 77],
  ['staging', 'billing-cron', 'succeeded', '2b9d6c3', 'Fix proration rounding for annual plans', 'main', 'Ana Reyes', 205, 92],
  ['staging', 'checkout-api', 'canceled', '3e8f1d6', 'Experiment: split tax service', 'exp/tax-split', 'Dev Patel', 280, 30],
  ['preview', 'web-storefront', 'succeeded', 'b7c2e90', 'Redesign order history page', 'feat/order-history', 'Kai Morgan', 18, 260],
  ['preview', 'web-storefront', 'failed', '6e1a4f3', 'Add dark mode to account menu', 'feat/account-dark', 'Lee Park', 41, 133],
  ['preview', 'checkout-api', 'succeeded', '8d0b5c7', 'Gift card balance endpoint', 'feat/gift-cards', 'Dev Patel', 63, 198],
  ['preview', 'auth-gateway', 'running', '1f7e3a2', 'Passkey sign-in prototype', 'feat/passkeys', 'Mira Chen', 6, null],
  ['preview', 'search-indexer', 'succeeded', '4a6c9b1', 'Typo tolerance for SKUs', 'feat/sku-typos', 'Sam Okafor', 150, 345],
  ['preview', 'notifications-worker', 'canceled', 'c3d8e05', 'Push notification quiet hours', 'feat/quiet-hours', 'Jo Alvarez', 175, 44],
  ['preview', 'billing-cron', 'failed', '9b2f7d4', 'Invoice PDF footer update', 'fix/invoice-footer', 'Kai Morgan', 240, 58],
  ['preview', 'web-storefront', 'succeeded', 'e5a1c68', 'Product page breadcrumbs', 'feat/breadcrumbs', 'Kai Morgan', 300, 247],
];

function logFor(service: string, status: Status, message: string): string[] {
  const lines = [
    `==> Cloning repository`,
    `==> Commit: ${message}`,
    `==> Installing dependencies`,
    `added 412 packages in 18s`,
    `==> Running tests`,
    `${service}: 128 tests passed`,
    `==> Building image ${service}`,
    `Step 7/12 : COPY dist/ /app/`,
  ];
  if (status === 'failed') {
    return [...lines, `==> Deploying ${service}`, `Waiting for health check on /healthz`, `ERROR health check failed: 3 of 3 instances returned 503`, `ERROR rolling back to previous release`, `==> Deploy failed`];
  }
  if (status === 'canceled') return [...lines, `==> Canceled by a newer run on the same branch`];
  if (status === 'running') return [...lines, `==> Deploying ${service}`, `Waiting for health check on /healthz`];
  return [...lines, `==> Deploying ${service}`, `Health check passed on 3 of 3 instances`, `==> Deploy succeeded`];
}

export function makeRuns(now = Date.now()): Run[] {
  return SEEDS.map(([env, service, status, sha, message, branch, author, minsAgo, duration], i) => ({
    id: `run-${String(i + 1).padStart(2, '0')}`,
    env, service, status, sha, message, branch, author,
    started: new Date(now - minsAgo * 60_000).toISOString(),
    duration,
    log: logFor(service, status, message),
  }));
}

/** The "all green" preview: same runs with every finished run marked succeeded. */
export function allGreen(runs: Run[]): Run[] {
  return runs.map((r) => (r.status === 'failed' || r.status === 'canceled' ? { ...r, status: 'succeeded', log: logFor(r.service, 'succeeded', r.message) } : r));
}
