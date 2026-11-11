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

### 2026-11-10 - Prototype 2: log drawer, alert banner, run links
- Each row has a Log button. Its run opens at `#/run/<id>`, so a run is linkable, Back closes it, and a stale link shows "Run not found".
- At 1024 px and wider the log is a side panel and the list stays usable; below that it is Ember's modal dialog.
- The drawer shows the run facts, a numbered log, Jump to first error (moves focus to the first ERROR line) and Copy link to this run (toast on success or failure).
- R-5: opening a run sets the title to "{service} {sha} · Run log · Deploys" and moves focus to the panel heading (the dialog's first control on mobile). Closing with Close, Esc or Back restores the list title and returns focus to that run's Log button, falling back to the H1, with the list's scroll position kept.
- Alert banner: "{n} production deploys failed in the last hour" with View failing deploy, which switches to Production, filters to failed runs of that service and opens the newest. It is announced as an alert only the first time a given set of failures appears in a session.
- Checks: 21 unit and component tests; axe sweep now covers 11 states including the open drawer and a missing run (0 serious or critical, no overflow, all controls 44 px+); new browser e2e (`npm run test:e2e`) runs the R-5 and drawer checks on desktop and mobile.
- Secret scan: gitleaks 8.28.0 now runs in CI over the full history on every PR and push to main (`.github/workflows/gitleaks.yml`).
- Ember gap found: at 320 px a long modal title squeezed the dialog's close button to 42 px. Patched in this app's CSS and reported for Ember.

| Log drawer, desktop | Log dialog, mobile dark | Alert banner, mobile |
|---|---|---|
| ![Run log side panel next to the filtered list](docs/screenshots/2026-11-10-prototype-2-run-log-desktop.png) | ![Run log dialog on a 390 px phone in dark mode](docs/screenshots/2026-11-10-prototype-2-run-log-mobile-dark.png) | ![Failure alert banner on a 390 px phone](docs/screenshots/2026-11-10-prototype-2-alert-banner-mobile.png) |

### 2026-11-10 - Prototype 3: keyboard shortcuts with an off switch (R-7)
- `/` search, `f` filters, `j`/`k` next and previous run, Enter opens the focused run's log, Esc closes, `?` opens the shortcuts dialog. A visible Keyboard shortcuts button in the header opens the same dialog.
- WCAG 2.1.4: a "Single-key shortcuts" checkbox in the dialog turns the single keys off. It is on by default and saved in localStorage under a versioned key; if storage is blocked it falls back to on and keeps the choice for the session. Enter and Esc always work.
- Single keys never fire in an input, select, textarea or contenteditable, with Ctrl, Alt or Meta held, or while a dialog is open. The page has no `role=application`, and each control carries its key in `aria-keyshortcuts`; `/` and `f` find their target by that attribute, so the two can't drift.
- The dialog's list is rendered from the same key map the handler uses, and a test checks both. Uses Ember's Checkbox for now; it moves to Ember's Switch when v0.3.1 ships, as a follow-up.
- Checks: 26 unit and component tests; e2e adds the R-7 cases (typing j in search, j/k/Enter on rows, everything off after a reload, header button still works) and an axe run on the open dialog; the axe sweep is unchanged at 0 failing.

| Shortcuts dialog, desktop | Mobile, dark |
|---|---|
| ![Keyboard shortcuts dialog with the Single-key shortcuts checkbox](docs/screenshots/2026-11-10-prototype-3-shortcuts-desktop.png) | ![The same dialog on a 390 px phone in dark mode](docs/screenshots/2026-11-10-prototype-3-shortcuts-mobile-dark.png) |

### 2026-11-10 - Accessibility report and checks
- Added [docs/ACR.md](docs/ACR.md), a self-assessed VPAT 2.5 Rev 508 report covering WCAG 2.0, 2.1 and 2.2 A/AA. 302.1 Without Vision is Partially Supports until a screen-reader pass is done.
- New check: the axe script now also applies the WCAG 1.4.12 text-spacing styles at 640 px (1280 at 200% zoom) and 320 px and looks for overflow and clipped text (22 runs, 0 failing). The e2e now checks the skip link too.
- Fix: the normal and all-green views now render the mock data on first paint, rather than showing the skeleton for 300 ms. Lighthouse had measured a layout shift of 0.375 from the skeleton swap. The loading and error previews still use `?state=`.
- Lighthouse 13.6 on the local build, mobile and desktop: accessibility 100 and best practices 100 on the list, an open run log and the error state. Performance is 100 on the list and run log, and 99 to 100 on the error state.
- Keyboard pass: scripted in `scripts/e2e.mjs` (Chrome, Linux), all checks pass. **Screen reader: not run yet.** No screen reader is installed on the build machine, so no reader pass is claimed.

## Not done yet
Screen-reader pass, making the repo public, a release tag, BUILD.json and the sync into jdilig.me, and the case study.
ACR, keyboard and screen-reader pass, making the repo public, BUILD.json and the jdilig.me case study.
Keyboard shortcuts and their off switch (R-7), ACR, keyboard and screen-reader pass, making the repo public, BUILD.json and the jdilig.me case study.
Log drawer, alert banner, run links with title/focus/scroll handling (R-5), keyboard shortcuts and their off switch (R-7), ACR, keyboard and screen-reader pass, secret scan, BUILD.json and the jdilig.me case study.

## 2026-11-10 ~7:00 PM PT: review fixes (QA FAIL on 6a2cc73)
- Shape tokens now use only the locked R-2 names: `--radius-sm` (skip link) and `--radius-md` (calm note, banner). Ember v0.2.2 doesn't ship those yet, so corners stay square until v0.3.0. `--border-width` and `--target-min` keep a fallback until then.
- Loading now matches DASH-SPEC line 31: the table is in place with `aria-busy="true"`, its skeleton rows are `aria-hidden`, one polite status says "Loading runs", and nothing animates. The real table replaces it when data lands.
- token-lint also fails on retired token names (exact match, so `--focus-ring-color` still passes), with tests that plant each one.
- Checks: 26 unit tests (12 of them token-lint), token-lint clean, axe 80 runs with 0 failing.

## 2026-11-10 ~8:00 PM PT: Chief Architect follow-ups before the ACR
- The failure banner's alert region mounts with its text hidden and fills it in about 50 ms later, so screen readers notice the new text. The text keeps its space while hidden, so nothing shifts (Lighthouse layout shift stays 0.018).
- The "n of m runs shown" count changes on screen at once, but the status that screen readers hear waits until filtering has settled for about 500 ms.
- With single-key shortcuts off, no control advertises them in `aria-keyshortcuts` any more.
- e2e waits for the mobile log dialog to finish closing before pressing `?`; that race had made one run in three fail.
- Checks: 41 unit and component tests; token-lint clean; axe 110 runs and the text-spacing pass, 0 failing; e2e passed 3 runs in a row; Lighthouse on the list: accessibility, best practices and performance 100, layout shift 0.018.

## 2026-11-10 6:30 PM PT: sign-offs and follow-ups
- Chief Architect signed the ACR. At CA's request, 4.1.3 now says Partially Supports until a screen-reader pass, matching 302.1.
- QA nit fixed: shortcuts now ignore every editable element, `contenteditable="plaintext-only"` included (new unit test).
- Tracked follow-up (EMBER-030): the PR that adopts Ember v0.3.0 removes the `var(--border-width, 1px)` and `var(--target-min, 44px)` fallbacks and checks the now-rounded corners.
- At release, the ACR Version line names the deployed commit SHA.
