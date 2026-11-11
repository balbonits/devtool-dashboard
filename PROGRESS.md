# Progress log: devtool-dashboard

UX project 3 of 3. Persona, tasks and flows come from the design spec (Chief of Creatives); the persona is an **assumption**, not research.

## Design log (Chief of Creatives)
- 2026-11-10 - Project picked as UX project 3 of 3.
- 2026-11-10 - Assumption persona: on-call engineer paged mid-task. Top 3 tasks: is anything failing, what changed, show me the logs.
- 2026-11-10 - Flows v1 incl. keyboard path (/ search, f filters, j/k rows, Enter log, Esc back with focus return).
- 2026-11-10 - Layout v1: env tabs, alert banner, filter bar, dense table, log drawer. Decision: status always icon + text, never color alone.
- 2026-11-10 - R-7 (WCAG 2.1.4): single-key shortcuts get an off switch in the shortcuts dialog, and never fire inside inputs.

## Build log
### 2026-11-10 - Wireframe
Low-fidelity wireframes for desktop and 320 px mobile, drawn from the spec ([source](docs/wireframes/wireframes.html)).

![Wireframes, desktop and mobile](docs/screenshots/2026-11-10-wireframe-wireframes.png)

### 2026-11-10 - Prototype 1: runs list
- Vite + React + TypeScript, Ember UI pinned to `github:balbonits/a11y-design-system#v0.2.2` (no source alias).
- 24 fictional runs across Production, Staging and Preview, including failures, a running deploy and cancellations.
- Environment tabs, search, Status/Service/Branch filters in the URL, sortable dense table, loading, error, no-results and all-green states.
- Styles use Ember tokens only; a token lint in CI blocks `@keyframes`, literal colors and hardcoded shape values.
- Checks: 13 unit and component tests; axe sweep of 8 states at 1280/900/414/375/320 px in light and dark with reduced motion: 0 serious or critical, no page-level horizontal overflow, every control at least 44 px.

| Desktop | Mobile, dark |
|---|---|
| ![Production runs on desktop](docs/screenshots/2026-11-10-prototype-production-desktop.png) | ![Production runs on a 390 px phone in dark mode](docs/screenshots/2026-11-10-prototype-production-mobile-dark.png) |

More: [failed filter](docs/screenshots/2026-11-10-prototype-failed-filter.png), [no results](docs/screenshots/2026-11-10-prototype-no-results.png), [all green](docs/screenshots/2026-11-10-prototype-all-green.png), [error on mobile](docs/screenshots/2026-11-10-prototype-error-mobile.png).

## Not done yet
Log drawer, alert banner, run links with title/focus/scroll handling (R-5), keyboard shortcuts and their off switch (R-7), ACR, keyboard and screen-reader pass, secret scan, BUILD.json and the jdilig.me case study.

## 2026-11-10 ~7:00 PM PT: review fixes (QA FAIL on 6a2cc73)
- Shape tokens now use only the locked R-2 names: `--radius-sm` (skip link) and `--radius-md` (calm note, banner). Ember v0.2.2 doesn't ship those yet, so corners stay square until v0.3.0. `--border-width` and `--target-min` keep a fallback until then.
- Loading now matches DASH-SPEC line 31: the table is in place with `aria-busy="true"`, its skeleton rows are `aria-hidden`, one polite status says "Loading runs", and nothing animates. The real table replaces it when data lands.
- token-lint also fails on retired token names (exact match, so `--focus-ring-color` still passes), with tests that plant each one.
- Checks: 28 unit tests, token-lint clean, axe 80 runs with 0 failing.
