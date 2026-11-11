# Dev dashboard (devtool-dashboard)

A deploy dashboard prototype for an on-call engineer, built with [Ember UI](https://github.com/balbonits/a11y-design-system) (pinned to Ember main `2d59d7b`, which includes the kinetic theme; no tag). It's UX case study #3 on [jdilig.me/ux](https://jdilig.me/ux/) and will live at `jdilig.me/ux/dev-dashboard/`.

All services, people, commits and logs are **fictional mock data**. There is no backend.

## What it does (so far)
- Environment tabs (Production, Staging, Preview) and a dense, sortable runs table (`aria-sort`, scrolls in its own focusable region).
- Search plus Status, Service and Branch filters, all kept in the URL so a view can be shared.
- Status is always an icon plus a word, never color alone.
- States: loading (skeleton rows, no shimmer), error with Retry, no results with Clear filters, and an all-green calm state. Preview them with `?state=loading`, `?state=error` or `?state=green`.

- Every run has a log at `#/run/<id>`: a side panel on wide screens, a dialog on phones, with Jump to first error and Copy link. Opening and closing a run updates the page title, moves focus and returns it to the row.
- A banner flags production deploys that failed in the last hour and jumps straight to the newest one.

- Keyboard shortcuts (`/` search, `f` filters, `j`/`k` rows, `?` help) that can be switched off in the shortcuts dialog (WCAG 2.1.4) and never fire while typing. See [PROGRESS.md](PROGRESS.md).

## Accessibility
Target: WCAG 2.2 AA (Section 508 via WCAG 2.0 AA). Self-assessed report: [docs/ACR.md](docs/ACR.md). It hasn't been checked with a screen reader yet.

## Theming
Every style reads Ember UI semantic tokens (color, spacing, radius, border, type). The dashboard's own theme comes later from the design team and registers on Ember UI; `npm run lint:tokens` fails on `@keyframes`, literal colors, or hardcoded radius, border-width, box-shadow or outline values.

## Run it
```
npm ci
npm run dev           # http://localhost:5173/ux/dev-dashboard/
npm run typecheck && npm run lint && npm test
npm run build && npm run preview
npm run test:a11y     # axe + overflow + 44px targets at 5 widths, light and dark (needs Chrome and a served build)
npm run test:e2e      # run links, focus, the log drawer, shortcuts and 44px targets in a real browser (same needs)
node scripts/target-audit.mjs <url>   # read-only table of every control's size and target (docs/audits/)
```

## License
MIT, see [LICENSE](LICENSE).
