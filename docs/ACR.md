# Accessibility Conformance Report: Dev tool dashboard prototype

Based on VPAT® 2.5 Rev 508 edition (Section 508). **Self-assessed** by the builder (Front End Developer bot for John Dilig). It isn't a third-party audit.

- **Product:** Deploys dashboard prototype, a UX case study with fictional data, at https://jdilig.me/ux/dev-dashboard/
- **Version:** [`v0.1.0`](https://github.com/balbonits/devtool-dashboard/releases/tag/v0.1.0), commit [`5f8c90c2f94b5bc9c32ed23b8aa1efd73213bfce`](https://github.com/balbonits/devtool-dashboard/commit/5f8c90c2f94b5bc9c32ed23b8aa1efd73213bfce), the build live at jdilig.me (its [`BUILD.json`](https://jdilig.me/ux/dev-dashboard/BUILD.json) names the same commit)
- **Report date:** 2026-11-10
- **Contact:** https://github.com/balbonits/devtool-dashboard/issues
- **Standards:** Revised Section 508 (36 CFR 1194), which incorporates WCAG 2.0 A/AA. This report also covers WCAG 2.1 and 2.2 A/AA.

## Evaluation methods
- **Automated (`scripts/a11y.mjs`):** axe-core on 11 states (Production, Staging, Preview, failed filter, no results, all green, loading, error, open run log, filtered run log, missing run) at 1280, 900, 414, 375 and 320 px, light and dark, reduced motion: 110 runs with 0 serious or critical violations. The same runs check for page-level horizontal scroll and for controls under 44x44 px. A second pass applies the WCAG 1.4.12 text-spacing styles at 640 px (1280 at 200% zoom) and 320 px and checks for overflow and clipped text: 22 runs, 0 failing.
- **Keyboard and focus (`scripts/e2e.mjs`):** scripted keyboard flows in Chrome at 1280 and 375 px: the skip link, opening a run with Enter, title and focus on open, Jump to first error, Esc and Back closing with focus returned to the row, deep links, the alert banner action, j and Enter on rows, ? for the shortcuts dialog, shortcuts ignored while typing, all five single keys doing nothing when switched off, the off switch surviving a reload, and an axe run on the open shortcuts dialog.
- **Unit and component tests (Vitest, Testing Library):** 41 tests, including roles and names, the loading table (`aria-busy`, hidden skeleton rows, one status), the alert region mounting with nothing readable before its text goes in, the debounced count status, `aria-keyshortcuts` dropping when shortcuts are off, the shortcut list matching the key map, and 12 token-lint tests.
- **Lighthouse 13.6 (local build):** accessibility 100 on the list, an open run log and the error state, mobile and desktop. The list scored accessibility 100 and layout shift 0.018 again after the latest changes.
- **Screen reader:** **not yet evaluated** with a screen reader. Until a reader pass is recorded in PROGRESS.md (naming the reader, browser and OS), items that depend on announcements rest on markup and automated checks only.

## Terms
Supports, Partially Supports, Does Not Support, Not Applicable (as defined by VPAT 2.5).

## WCAG 2.x Report (Section 508 Chapter 5, 501.1 and Chapter 6, 602.3)
WCAG 2.0 A/AA rows are the Section 508 baseline. Rows marked 2.1 or 2.2 are extra.

| Criteria | Level | Conformance | Remarks |
|---|---|---|---|
| 1.1.1 Non-text Content | A | Supports | No content images. Status glyphs (✕ ◔ ✓ –) are aria-hidden next to a text label; the dialog close button has an accessible name. Checked by axe and unit tests. |
| 1.2.1 Audio-only and Video-only (Prerecorded) | A | Not Applicable | No audio or video. |
| 1.2.2 Captions (Prerecorded) | A | Not Applicable | No audio or video. |
| 1.2.3 Audio Description or Media Alternative (Prerecorded) | A | Not Applicable | No audio or video. |
| 1.2.4 Captions (Live) | AA | Not Applicable | No live media. |
| 1.2.5 Audio Description (Prerecorded) | AA | Not Applicable | No video. |
| 1.3.1 Info and Relationships | A | Supports | Landmarks (main, aside, footer, search form), one H1, H2 for the run log, a data table with caption, column headers, row headers and `aria-sort`, a description list for run facts, an ordered list for log lines, and labelled fields. Checked by axe and unit tests. |
| 1.3.2 Meaningful Sequence | A | Supports | DOM order matches visual order at every width in the sweep. |
| 1.3.3 Sensory Characteristics | A | Supports | No instructions rely on shape, color, position or sound. |
| 1.3.4 Orientation (2.1) | AA | Supports | No orientation lock; layout reflows from 320 px up (sweep at 5 widths). |
| 1.3.5 Identify Input Purpose (2.1) | AA | Not Applicable | No fields collect the user's own personal data. |
| 1.4.1 Use of Color | A | Supports | Run status, failed log lines and the alert are shown in text and glyphs, not only color. |
| 1.4.2 Audio Control | A | Not Applicable | No audio. |
| 1.4.3 Contrast (Minimum) | AA | Supports | axe color-contrast passes in light and dark at 5 widths across 11 states. |
| 1.4.4 Resize Text | AA | Supports | rem-based type; the text-spacing pass at 640 px (200% zoom) finds no overflow or clipping. |
| 1.4.5 Images of Text | AA | Supports | No images of text. |
| 1.4.10 Reflow (2.1) | AA | Supports | No page-level horizontal scroll at 320 CSS px (automated). The runs table scrolls inside its own focusable region, which 1.4.10 allows for data tables. |
| 1.4.11 Non-text Contrast (2.1) | AA | Supports | Focus ring, control borders and boundaries use Ember UI tokens; axe passes in both color schemes. |
| 1.4.12 Text Spacing (2.1) | AA | Supports | Automated text-spacing pass at 640 and 320 px: 0 overflow, 0 clipped text. |
| 1.4.13 Content on Hover or Focus (2.1) | AA | Supports | No hover or focus pop-ups. The log and shortcuts dialog open only on a button press and stay until closed. |
| 2.1.1 Keyboard | A | Supports | Every function works by keyboard (scripts/e2e.mjs). |
| 2.1.2 No Keyboard Trap | A | Supports | The modal dialogs keep Tab inside while open and close on Esc; the desktop log panel is non-modal and closes on Esc (e2e). |
| 2.1.4 Character Key Shortcuts (2.1) | A | Supports | Single-key shortcuts (/ f j k ?) can be turned off with a persisted "Single-key shortcuts" checkbox, never fire in a field or with Ctrl, Alt or Meta held, and the dialog stays reachable from a visible header button. When they're off, no control advertises them in `aria-keyshortcuts` (unit tests and e2e). |
| 2.2.1 Timing Adjustable | A | Supports | No time limits. |
| 2.2.2 Pause, Stop, Hide | A | Supports | No moving, blinking or auto-updating content; the loading skeleton is static and the app defines no animations (token lint blocks `@keyframes`). |
| 2.3.1 Three Flashes or Below Threshold | A | Supports | Nothing flashes. |
| 2.4.1 Bypass Blocks | A | Supports | The first Tab stop is a skip link to main; the keyboard e2e checks it is the first stop, 44 px when shown, and moves focus to main. |
| 2.4.2 Page Titled | A | Supports | The title names the environment, or the open run, and changes with each route (unit tests and e2e). |
| 2.4.3 Focus Order | A | Supports | Opening a run moves focus to the log heading (the dialog's first control on phones); closing returns it to that run's Log button, or the H1 if the row is gone (e2e). |
| 2.4.4 Link Purpose (In Context) | A | Supports | Footer links and the per-row Log buttons are named for their target ("Open log for checkout-api 9f3c2a1"). |
| 2.4.5 Multiple Ways | AA | Not Applicable | A single-view prototype; runs are reached from the table, by search and by direct link. |
| 2.4.6 Headings and Labels | AA | Supports | Headings and labels are descriptive. |
| 2.4.7 Focus Visible | AA | Supports | Ember UI focus ring on every interactive element, including the log heading and error lines that receive focus. |
| 2.4.11 Focus Not Obscured (Minimum) (2.2) | AA | Supports | The desktop log panel narrows the page instead of covering it; no sticky bars overlap focused content (screenshots in PROGRESS.md). |
| 2.5.1 Pointer Gestures (2.1) | A | Supports | No multipoint or path gestures. |
| 2.5.2 Pointer Cancellation (2.1) | A | Supports | Native button activation on the up-event. |
| 2.5.3 Label in Name (2.1) | A | Supports | Accessible names contain the visible label ("Log" in "Open log for ..."). |
| 2.5.4 Motion Actuation (2.1) | A | Not Applicable | No motion input. |
| 2.5.7 Dragging Movements (2.2) | AA | Not Applicable | No dragging. |
| 2.5.8 Target Size (Minimum) (2.2) | AA | Supports | All targets meet WCAG 2.5.8 (24px). The project aims for 44px; the environment tabs are 43px effective due to an Ember v0.2.2 tablist clip, fixed upstream in a11y-design-system #36 and removed here by DASH-EMBER-BUMP. |
| 3.1.1 Language of Page | A | Supports | `lang="en"`. |
| 3.1.2 Language of Parts | AA | Not Applicable | No other-language passages. |
| 3.2.1 On Focus | A | Supports | Focus causes no context change. |
| 3.2.2 On Input | A | Supports | Filters update the table and the URL in place; there is no navigation or focus move on input. |
| 3.2.3 Consistent Navigation | AA | Not Applicable | A single view. |
| 3.2.4 Consistent Identification | AA | Supports | The same functions have the same labels everywhere (two Clear filters buttons do the same thing). |
| 3.2.6 Consistent Help (2.2) | A | Not Applicable | No help mechanism beyond the shortcuts dialog, which sits in the header on every state. |
| 3.3.1 Error Identification | A | Not Applicable | No input is validated; any search or filter is valid, and no results gives a text message with a way out. |
| 3.3.2 Labels or Instructions | A | Supports | Every field has a visible label. |
| 3.3.3 Error Suggestion | AA | Not Applicable | No input errors. |
| 3.3.4 Error Prevention (Legal, Financial, Data) | AA | Not Applicable | Read-only dashboard; no submissions. |
| 3.3.7 Redundant Entry (2.2) | A | Not Applicable | No multi-step entry. |
| 3.3.8 Accessible Authentication (Minimum) (2.2) | AA | Not Applicable | No sign-in. |
| 4.1.2 Name, Role, Value | A | Supports | Native controls, WAI-ARIA tabs and sortable table headers from Ember UI, native dialogs. axe passes. |
| 4.1.3 Status Messages (2.1) | AA | Partially Supports | While loading, one polite `role=status` says "Loading runs" and the table is `aria-busy`. The "n of m runs shown" count updates on screen at once, and its `role=status` copy speaks about 500 ms after filtering settles, so typing doesn't queue one message per key. The failure banner's `role=alert` text goes in just after the region mounts, and only for a new set of failures in the session. The load error uses `role=alert`, and toasts use Ember's live region (unit tests). Gap: below the drawer breakpoint the run log is a modal dialog and the toast renders outside it, so the "Copy link to this run" confirmation is inert and likely not announced while the modal is open, until DASH-MODAL-TOAST ships. Not yet verified with a screen reader; this moves to Supports after the screen-reader pass. |

## Revised Section 508 Chapter 3: Functional Performance Criteria
| Criteria | Conformance | Remarks |
|---|---|---|
| 302.1 Without Vision | Partially Supports | Semantic markup, labels, live regions and aria-keyshortcuts, checked with axe and tests. Not yet verified with a screen reader. |
| 302.2 With Limited Vision | Supports | Reflows at 320 px and 200% zoom, text spacing holds, AA contrast in light and dark. |
| 302.3 Without Perception of Color | Supports | Nothing relies on color alone. |
| 302.4 Without Hearing | Not Applicable | No audio. |
| 302.5 With Limited Hearing | Not Applicable | No audio. |
| 302.6 Without Speech | Not Applicable | No speech input. |
| 302.7 With Limited Manipulation | Supports | Fully keyboard operable, targets aim for 44px and all meet WCAG 2.5.8 (24px), no drag or timing; shortcuts can be turned off. |
| 302.8 With Limited Reach and Strength | Supports | Same as 302.7. |
| 302.9 With Limited Language, Cognitive, and Learning Abilities | Supports | Plain labels, a calm all-green state, clear empty and error states with one next step each. |

## Chapter 4 Hardware, Chapter 5 Software, Chapter 6 Support Documentation
- Chapter 4: Not Applicable (web content).
- Chapter 5 Software: Not Applicable. This is a web prototype, covered by the WCAG table above; it has no authoring tools.
- Chapter 6 Support Documentation: Not Applicable beyond the README and the on-page shortcuts dialog.

## Legal disclaimer
This is a self-assessment of a demo prototype that uses fictional data. It describes the build named above and doesn't promise future conformance.
