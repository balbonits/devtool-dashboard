# Target-size audit, 2026-11-10 (DASH-TARGETS)

The goal is for every standalone interactive control to be at least 44x44 CSS px. That's the project's `--target-min`, and it's well above WCAG 2.5.8 AA's 24 px. Inline links inside a sentence are exempt.

## How it was measured
- `node scripts/target-audit.mjs <url> 320,375,1280` (read-only, shared logic in `scripts/targets.mjs`): Chrome, reduced motion, 800 px tall viewport.
- **States:** the page, the run log (side drawer at 1280, modal dialog below the drawer breakpoint), the keyboard shortcuts dialog, the toast after "Copy link to this run", no results (`?q=no-such-run`) and load error (`?state=error`).
- **Controls:** buttons, inputs, selects, textareas, tabs, summaries and links. A link counts as inline when the text right beside it has letters. The skip link is measured while it's shown (after the first Tab).
- **Box:** the rendered border box.
- **Target:** the box plus any absolutely positioned `::before` that extends it. Ember uses one on its sort headers and small buttons. For an Ember checkbox, the target is the whole `.em-check` row, which its label's `::before` covers.
- **Hit test:** each target's centre and four corners are checked with `elementFromPoint`, so a pseudo-element that's covered or clipped fails.
- **Row grouping:** the nine "Open log" buttons share one row. States other than the page list only the controls that differ from the page.

## Findings
1. **Toast "Dismiss" button: 42x42, under 44 (fixed here).** Ember v0.2.2's small icon button is 36x36. Its `::before` is inset by -4px, but that offset starts inside the 1px border, so the real target is 42x42. It passes WCAG 2.5.8 (24 px) but not our 44.
   - Fix in `src/app.css`: `.ember .em-btn--sm::before { inset: min(-4px, calc((100% - var(--target-min, 44px)) / 2)); }`. It changes the hit area only, and screenshots of the toast state at 320 and 1280, in light and dark, are pixel-identical with and without it.
2. **Known issue, not fixed here (reported to CTE): the toast sits behind the run-log modal.** Below the drawer breakpoint, the run log is a modal `<dialog>`. Ember's toast viewport isn't in the top layer, so "Link copied" renders behind the dialog and its backdrop. Its Dismiss button is sized correctly but covered (the rest of the page is inert while the modal is open). The toast still closes on its own timer. Fixing it would change what's visible, which is outside this card.
3. **Everything else already met 44x44 on live.** The sort headers are 32 px tall boxes with a 44 px target from Ember's `::before`; their hit tests pass. The checkbox is 20x20, but its label row is the target.

## Live, before the fix (https://jdilig.me/ux/dev-dashboard/, 2026-11-10)
| State | Control | 320 px | 375 px | 1280 px | Note |
|---|---|---|---|---|---|
| page | a "Skip to content" | 136x44 | 136x44 | 136x44 |  |
| page | input[search] "Search runs" | 288x44 | 343x44 | 448x44 |  |
| page | button "Keyboard shortcuts" | 162x44 | 162x44 | 162x44 |  |
| page | button "View failing deploy" | 158x44 | 158x44 | 158x44 |  |
| page | button[role=tab] "Production" | 103x44 | 103x44 | 103x44 |  |
| page | button[role=tab] "Staging" | 83x44 | 83x44 | 83x44 |  |
| page | button[role=tab] "Preview" | 84x44 | 84x44 | 84x44 |  |
| page | select[select-one] "Status" | 288x44 | 166x44 | 303x44 |  |
| page | select[select-one] "Service" | 288x44 | 166x44 | 303x44 |  |
| page | input[text] "Branch" | 288x44 | 166x44 | 303x44 |  |
| page | button "Clear filters" | 288x44 | 166x44 | 303x44 |  |
| page | button "Status↕" | 64x32 (target 64x44) | 64x32 (target 64x44) | 64x32 (target 64x44) | target via ::before |
| page | button "Service↕" | 70x32 (target 70x44) | 70x32 (target 70x44) | 70x32 (target 70x44) | target via ::before |
| page | button "Branch↕" | 67x32 (target 67x44) | 67x32 (target 67x44) | 67x32 (target 67x44) | target via ::before |
| page | button "Author↕" | 65x32 (target 65x44) | 65x32 (target 65x44) | 65x32 (target 65x44) | target via ::before |
| page | button "Started▼" | 70x32 (target 70x44) | 70x32 (target 70x44) | 70x32 (target 70x44) | target via ::before |
| page | button "Duration↕" | 76x32 (target 76x44) | 76x32 (target 76x44) | 76x32 (target 76x44) | target via ::before |
| page | button "Open log for <service> <commit>" (x9) | 58x44 | 58x44 | 58x44 |  |
| page | a "Ember UI" | 51x44 | 51x44 | 51x44 | inline link in a sentence, exempt |
| page | a "All UX case studies" | 104x44 | 104x44 | 104x44 |  |
| page | a "Source on GitHub" | 96x44 | 96x44 | 96x44 |  |
| run log (drawer or dialog) | button "Close dialog" | 44x44 | 44x44 | not shown |  |
| run log (drawer or dialog) | button "Jump to first error" | 240x44 | 295x44 | 154x44 |  |
| run log (drawer or dialog) | button "Copy link to this run" | 240x44 | 295x44 | 166x44 |  |
| run log (drawer or dialog) | button "Close" | 71x44 | 71x44 | 71x44 |  |
| shortcuts dialog | button "Close dialog" | 44x44 | 44x44 | 44x44 |  |
| shortcuts dialog | input[checkbox] "Single-key shortcuts" | 20x20 (target 240x90) | 20x20 (target 295x90) | 20x20 (target 518x72) | target via its .em-check row (label ::before) |
| shortcuts dialog | button "Done" | 68x44 | 68x44 | 68x44 |  |
| toast | button "Dismiss: Link copied" | 36x36 (target 42x42) **behind the modal dialog, not reachable** | 36x36 (target 42x42) **behind the modal dialog, not reachable** | 36x36 (target 42x42) **FAIL** | target via ::before |
| no results | button "Clear filters" | 111x44 | 111x44 | 111x44 |  |
| load error | button "Retry" | 70x44 | 70x44 | 70x44 |  |

3 measurements fail (toast Dismiss at all three widths).

## This branch, after the fix (local build)
| State | Control | 320 px | 375 px | 1280 px | Note |
|---|---|---|---|---|---|
| page | a "Skip to content" | 136x44 | 136x44 | 136x44 |  |
| page | input[search] "Search runs" | 288x44 | 343x44 | 448x44 |  |
| page | button "Keyboard shortcuts" | 162x44 | 162x44 | 162x44 |  |
| page | button "View failing deploy" | 158x44 | 158x44 | 158x44 |  |
| page | button[role=tab] "Production" | 103x44 | 103x44 | 103x44 |  |
| page | button[role=tab] "Staging" | 83x44 | 83x44 | 83x44 |  |
| page | button[role=tab] "Preview" | 84x44 | 84x44 | 84x44 |  |
| page | select[select-one] "Status" | 288x44 | 166x44 | 303x44 |  |
| page | select[select-one] "Service" | 288x44 | 166x44 | 303x44 |  |
| page | input[text] "Branch" | 288x44 | 166x44 | 303x44 |  |
| page | button "Clear filters" | 288x44 | 166x44 | 303x44 |  |
| page | button "Status↕" | 64x32 (target 64x44) | 64x32 (target 64x44) | 64x32 (target 64x44) | target via ::before |
| page | button "Service↕" | 70x32 (target 70x44) | 70x32 (target 70x44) | 70x32 (target 70x44) | target via ::before |
| page | button "Branch↕" | 67x32 (target 67x44) | 67x32 (target 67x44) | 67x32 (target 67x44) | target via ::before |
| page | button "Author↕" | 65x32 (target 65x44) | 65x32 (target 65x44) | 65x32 (target 65x44) | target via ::before |
| page | button "Started▼" | 70x32 (target 70x44) | 70x32 (target 70x44) | 70x32 (target 70x44) | target via ::before |
| page | button "Duration↕" | 76x32 (target 76x44) | 76x32 (target 76x44) | 76x32 (target 76x44) | target via ::before |
| page | button "Open log for <service> <commit>" (x9) | 58x44 | 58x44 | 58x44 |  |
| page | a "Ember UI" | 51x44 | 51x44 | 51x44 | inline link in a sentence, exempt |
| page | a "All UX case studies" | 104x44 | 104x44 | 104x44 |  |
| page | a "Source on GitHub" | 96x44 | 96x44 | 96x44 |  |
| run log (drawer or dialog) | button "Close dialog" | 44x44 | 44x44 | not shown |  |
| run log (drawer or dialog) | button "Jump to first error" | 240x44 | 295x44 | 154x44 |  |
| run log (drawer or dialog) | button "Copy link to this run" | 240x44 | 295x44 | 166x44 |  |
| run log (drawer or dialog) | button "Close" | 71x44 | 71x44 | 71x44 |  |
| shortcuts dialog | button "Close dialog" | 44x44 | 44x44 | 44x44 |  |
| shortcuts dialog | input[checkbox] "Single-key shortcuts" | 20x20 (target 240x90) | 20x20 (target 295x90) | 20x20 (target 518x72) | target via its .em-check row (label ::before) |
| shortcuts dialog | button "Done" | 68x44 | 68x44 | 68x44 |  |
| toast | button "Dismiss: Link copied" | 36x36 (target 44x44) **behind the modal dialog, not reachable** | 36x36 (target 44x44) **behind the modal dialog, not reachable** | 36x36 (target 44x44) | target via ::before |
| no results | button "Clear filters" | 111x44 | 111x44 | 111x44 |  |
| load error | button "Retry" | 70x44 | 70x44 | 70x44 |  |

2 measurements flagged: the toast behind the modal at 320 and 375 (finding 2). All targets are 44x44 or more.

In both tables, "behind the modal dialog" is finding 2 above. It's a sizing pass but a reachability issue.

## Regression guard
`npm run test:e2e` now measures every state at 320 and 1280 with the same code. It fails if any standalone control's target is under 44x44, or if any of its hit points miss. The toast behind the modal is checked for size only and logged as the known issue. With the CSS fix removed, the run fails on the toast Dismiss button (42x42) at both widths.
