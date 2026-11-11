# Ember v0.3 migration note

Status: planning note only. Nothing here changes the app. The dashboard stays on Ember UI v0.2.2
(`github:balbonits/a11y-design-system#v0.2.2`) with two local patches and one allowlisted gap, until a dashboard
theme exists for v0.3 (decided by Chief of Technology & Engineering, 2026-11-10).

## Why we can't just bump

Ember's tab hit-area fix (HIT-PATCH, [a11y-design-system #36](https://github.com/balbonits/a11y-design-system/pull/36),
merged as `346ad360ccaffe0253f5760263e73bc6bec756a8`) only exists on Ember main, after v0.3.0. v0.3.0 is a breaking
release (`c8b1591 feat!: R-2 themes`, `6b6584f` theme registry, neo default). It ships one theme, **neo**
(`src/themes/registry.json` lists only `neo`), and the first registered theme is the default when `<html>` has no
`data-theme`. So bumping re-skins the whole dashboard as neo. A backport of HIT-PATCH to a v0.2.x branch was tried
and dropped: the patch depends on v0.3-only tokens (`--hit-min`, `--button-*`), so it would be a re-implementation,
not a cherry-pick.

## Tokens the dashboard uses (34)

Counted from `var(--*)` in `src/` and `index.html` (uses = occurrences). Ember v0.3 splits tokens into three layers
(`src/tokens.css`): 1 primitives (type and space ramps), 2 theme (palette, semantic colors, shape, type, motion; the
neo values live in `src/themes/neo.css`), 3 components (`tokens/components.css`, `var()` of layer 2 only; the
dashboard uses none directly). Values are computed on the running app (light, then dark where it differs), v0.2.2
(main) → Ember `346ad36`.

| Token | Uses | v0.3 layer | Value v0.2.2 → v0.3 (neo) |
|---|---|---|---|
| `--space-3` | 17 | 1, primitives (`tokens/primitives.css`) | same |
| `--space-2` | 12 | 1, primitives (`tokens/primitives.css`) | same |
| `--space-4` | 11 | 1, primitives (`tokens/primitives.css`) | same |
| `--text-muted` | 8 | 2, theme (`tokens/themes.css`; neo in `themes/neo.css`) | `#3b3f45` → `#3d3d3d`; dark `#cfcac0` → `#cfc8b0` |
| `--border-width` | 8 | 2, theme (`tokens/themes.css`; neo in `themes/neo.css`) | not defined → `2px` |
| `--text-xs` | 5 | 1, primitives (`tokens/primitives.css`) | same |
| `--surface` | 5 | 2, theme (`tokens/themes.css`; neo in `themes/neo.css`) | `#fffdf8` → `#ffffff`; dark `#1b1a17` → `#1c1c1c` |
| `--danger` | 5 | 2, theme (`tokens/themes.css`; neo in `themes/neo.css`) | `#b91c1c` → `#c4122f`; dark `#f87171` → `#ff7a8c` |
| `--border-subtle` | 5 | 2, theme (`tokens/themes.css`; neo in `themes/neo.css`) | `#d9d3c7` → `#6b6b6b`; dark `#26241f` → `#8c8c8c` |
| `--text` | 4 | 2, theme (`tokens/themes.css`; neo in `themes/neo.css`) | `#16181b` → `#111111`; dark `#f1ede4` → `#fdf8e9` |
| `--surface-muted` | 4 | 2, theme (`tokens/themes.css`; neo in `themes/neo.css`) | `#e9e4d8` → `#f3ecd2`; dark `#26241f` → `#272727` |
| `--radius-md` | 4 | 2, theme (`tokens/themes.css`; neo in `themes/neo.css`) | not defined → `12px` |
| `--font-mono` | 4 | 2, theme (`tokens/themes.css`; neo in `themes/neo.css`) | `"JetBrains Mono Variable", ui-monospace, "SF Mono", Menlo, Consolas, monospace` → `"JetBrains Mono", ui-monospace, monospace` |
| `--text-sm` | 3 | 1, primitives (`tokens/primitives.css`) | same |
| `--target-min` | 3 | 2, theme (`tokens/themes.css`; neo in `themes/neo.css`) | not defined → `44px` |
| `--space-5` | 3 | 1, primitives (`tokens/primitives.css`) | same |
| `--border` | 3 | 2, theme (`tokens/themes.css`; neo in `themes/neo.css`) | `#6b7077` → `#111111`; dark `#8a8479` → `#fdf8e9` |
| `--weight-medium` | 2 | 1, primitives (`tokens/primitives.css`) | same |
| `--radius-sm` | 2 | 2, theme (`tokens/themes.css`; neo in `themes/neo.css`) | not defined → `10px` |
| `--weight-semibold` | 1 | 1, primitives (`tokens/primitives.css`) | same |
| `--text-lg` | 1 | 1, primitives (`tokens/primitives.css`) | same |
| `--text-base` | 1 | 1, primitives (`tokens/primitives.css`) | same |
| `--text-2xl` | 1 | 1, primitives (`tokens/primitives.css`) | same |
| `--success` | 1 | 2, theme (`tokens/themes.css`; neo in `themes/neo.css`) | `#15803d` → `#17702a`; dark `#4ade80` → `#5ed27a` |
| `--space-16` | 1 | 1, primitives (`tokens/primitives.css`) | same |
| `--space-1` | 1 | 1, primitives (`tokens/primitives.css`) | same |
| `--shadow-raised` | 1 | 2, theme (`tokens/themes.css`; neo in `themes/neo.css`) | not defined → `4px 4px 0 #111111`; dark not defined → `4px 4px 0 #fdf8e9` |
| `--radius-full` | 1 | 2, theme (`tokens/themes.css`; neo in `themes/neo.css`) | `9999px` → `999px` |
| `--info` | 1 | 2, theme (`tokens/themes.css`; neo in `themes/neo.css`) | `#0369a1` → `#0b5cad`; dark `#38bdf8` → `#7fb6ff` |
| `--focus-ring-width` | 1 | 2, theme (`tokens/themes.css`; neo in `themes/neo.css`) | not defined → `3px` |
| `--focus-ring-offset` | 1 | 2, theme (`tokens/themes.css`; neo in `themes/neo.css`) | not defined → `3px` |
| `--focus-ring-color` | 1 | 2, theme (`tokens/themes.css`; neo in `themes/neo.css`) | not defined → `#e0217a` |
| `--color-bg` | 1 | 2, theme (`tokens/themes.css`; neo in `themes/neo.css`) | `#f4f1ea` → `#fdf8e9`; dark `#12110f` → `#111111` |
| `--border-width-strong` | 1 | 2, theme (`tokens/themes.css`; neo in `themes/neo.css`) | not defined → `2.5px` |

Notes on the table:
- All 34 names still exist in v0.3, so nothing breaks at build time; the change is visual.
- Eight tokens the dashboard references are **not defined in v0.2.2**, and that's harmless today:
  `--border-width`, `--border-width-strong` and `--target-min` have fallbacks in `src/app.css` (1px, 4px, 44px);
  `--radius-sm` and `--radius-md` resolve to 0 (`.dd-log` and `kbd` are square); `--shadow-raised` and
  `--focus-ring-*` appear only in `src/token-lint.test.ts`. On v0.3 neo defines all of them, so they change too (2px
  borders, 10/12px radii, a 4px offset shadow, a 3px pink focus ring).
- The 13 primitives (space, type size, weight) are identical.

## Fonts

| Font | v0.2.2 | Ember main (`346ad36`) | What the dashboard would have to do |
|---|---|---|---|
| Geist Variable (body; v0.3 `--font-body`) | Ember dependency `@fontsource-variable/geist` | Removed from Ember's dependencies | Already a dashboard dependency (`package.json`, imported in `src/main.tsx`). Keep it, and point the theme's `--font-body` at it. |
| JetBrains Mono Variable (`--font-mono`) | Ember dependency `@fontsource-variable/jetbrains-mono` | Removed; neo names `'JetBrains Mono'` (static) and only Ember's devDependencies have `@fontsource/jetbrains-mono` | Add `@fontsource-variable/jetbrains-mono` (or `@fontsource/jetbrains-mono`) to the dashboard and import it, or accept the fallback chain. |
| Instrument Serif | Ember dependency `@fontsource/instrument-serif` | Removed | Not used by the dashboard; nothing to add. |
| Archivo / Archivo Black (neo `--font-body` / `--font-display`) | n/a | Ember devDependencies only | Only needed if the dashboard adopted neo's type, which it shouldn't. A dashboard theme sets its own font tokens. |

Listed only. Adding a package is John's call; nothing is installed by this note.

## Pixel-diff evidence (24 pairs)

Before = main on v0.2.2, after = the same commit with only the Ember pin changed to `346ad36`. Both are vite
preview builds at `/ux/dev-dashboard/`, full-page Chrome screenshots with a fixed clock and reduced motion, in four
states, at 320, 375 and 1280, light and dark. Every pair changed:

| State | Width | Mode | Page height v0.2.2 → v0.3 (px) | Pixels changed (in the overlapping area) |
|---|---|---|---|---|
| error | 320 | dark | 932 → 935 | 298,176 of 298,240 (100%) |
| error | 320 | light | 932 → 935 | 298,184 of 298,240 (100%) |
| error | 375 | dark | 821 → 803 | 301,122 of 301,125 (100%) |
| error | 375 | light | 821 → 803 | 301,125 of 301,125 (100%) |
| error | 1280 | dark | 800 → 800 | 1,023,969 of 1,024,000 (100%) |
| error | 1280 | light | 800 → 800 | 1,023,981 of 1,024,000 (100%) |
| loading | 320 | dark | 1141 → 1151 | 365,060 of 365,120 (100%) |
| loading | 320 | light | 1141 → 1151 | 365,064 of 365,120 (100%) |
| loading | 375 | dark | 1030 → 1019 | 382,112 of 382,125 (100%) |
| loading | 375 | light | 1030 → 1019 | 382,125 of 382,125 (100%) |
| loading | 1280 | dark | 800 → 800 | 1,023,972 of 1,024,000 (100%) |
| loading | 1280 | light | 800 → 800 | 1,023,981 of 1,024,000 (100%) |
| production | 320 | dark | 1505 → 1520 | 481,535 of 481,600 (100%) |
| production | 320 | light | 1505 → 1520 | 481,542 of 481,600 (100%) |
| production | 375 | dark | 1394 → 1409 | 522,687 of 522,750 (100%) |
| production | 375 | light | 1394 → 1409 | 522,692 of 522,750 (100%) |
| production | 1280 | dark | 1084 → 1099 | 1,387,486 of 1,387,520 (100%) |
| production | 1280 | light | 1084 → 1099 | 1,387,493 of 1,387,520 (100%) |
| run-log | 320 | dark | 1505 → 1520 | 481,596 of 481,600 (100%) |
| run-log | 320 | light | 1505 → 1520 | 481,597 of 481,600 (100%) |
| run-log | 375 | dark | 1394 → 1409 | 522,749 of 522,750 (100%) |
| run-log | 375 | light | 1394 → 1409 | 522,741 of 522,750 (100%) |
| run-log | 1280 | dark | 1140 → 1155 | 1,459,126 of 1,459,200 (100%) |
| run-log | 1280 | light | 1140 → 1155 | 1,459,160 of 1,459,200 (100%) |

Side-by-sides (left v0.2.2, right v0.3 neo):
[1280 light](shots/ember-v03/side-production-1280-light.png),
[1280 dark](shots/ember-v03/side-production-1280-dark.png),
[375 light](shots/ember-v03/side-production-375-light.png).
The raw 48 shots aren't committed. To regenerate: build `main` and a copy with the pin changed, serve both with
`vite preview`, and screenshot the states above.

What visibly changes: cream background instead of stone, near-black 2px borders on inputs, buttons and the table
card, rounded inputs, buttons and card (10–12px), 4px offset black shadows on buttons and the card, a pink 3px
focus ring instead of the 2px teal one, a blue (light) or lime (dark) accent instead of ember orange, different tab styling, and page heights change
(the main page is 15px taller at every width).

## What Creatives would need to define (a dashboard theme on v0.3)

A theme registered the v0.3 way (a `[data-theme="…"]` block with light and dark modes, set on `<html>`). Per PROC-2 it
is the dashboard's own identity, distinct from the job tracker's (which is also on v0.2.2 today). Today's values below
are a starting point, not a copy-forward. A registered theme must define **every locked v0.3 token**, not only the
ones the dashboard uses today.

What the dashboard uses today (v0.2.2 values):

- **Background and surfaces:** `--color-bg` `#f4f1ea` / dark `#12110f`; `--surface` `#fffdf8` / `#1b1a17`;
  `--surface-muted` `#e9e4d8` / `#26241f`.
- **Text and accent:** `--text` `#16181b` / `#f1ede4`; `--text-muted` `#3b3f45` / `#cfcac0`; `--accent` `#b93d0b` /
  `#ff8a4c`; status colors `--danger`, `--success`, `--info` as in the table above.
- **Borders:** 1px, `--border` `#6b7077` / `#8a8479`, `--border-subtle` `#d9d3c7` / `#26241f`; `--border-width` 1px,
  `--border-width-strong` 4px (today's fallback).
- **Radii:** Ember v0.2.2 `--radius` is 2px (near-square); `--radius-sm` and `--radius-md` are 0 today.
- **Shadows:** none today (`--shadow-raised`).
- **Focus ring:** 2px solid teal (`#0f5f73` light, `#8fd3e0` dark), offset 2px.
- **Tabs:** a 1px tablist rule with a 2px accent underline on the selected tab, muted unselected text and a
  surface-muted hover, plus forced-colors behaviour (HIT-PATCH `390b652`).
- **Type:** `--font-body` Geist Variable, `--font-mono` JetBrains Mono Variable for code and status glyphs (see Fonts).

Also required by the v0.3 contract (Chief Architect, 2026-11-10):

- **Shapes** (ARCH-REVIEW Addendum 5): `--radius-sm`, `--radius-md`, `--radius-lg`, `--radius-xl`, `--radius-full`.
- **Shadows and motion:** `--shadow-raised`, `--shadow-press`, `--press-offset` (Addendum 8: a length ≥ 0),
  `--tilt`, `--lift`.
- **Focus ring:** `--focus-ring-width`, `--focus-ring-offset`, `--focus-ring-style`, `--focus-ring-color` per mode.
- **Controls:** `--control-height`, `--control-padding-x`, `--control-gap`.
- **Decoration:** `--divider-shape`, `--highlight`, `--highlight-contrast`.
- **Scrim:** `--scrim` per mode (Addendum 7: composite gates ≥3:1).
- **Not a theme choice:** `--target-min` stays 44px.

Gates:

- The focus ring is ≥3:1 against `--color-bg`, `--surface`, `--surface-muted` and `--tabs-track`, in both modes.
- `--border-subtle` is decorative only: in dark today it equals `--surface-muted` (`#26241f`), 1:1. Every component
  boundary uses `--border` at ≥3:1.
- Every text/surface pair ≥4.5:1 and non-text ≥3:1, in both modes. Ember's `npm run contrast` and `lint:colors` can
  check a registered theme.

Every value goes through Chief Architect for token naming and Creatives for identity. Nothing is guessed in code.

## Cards afterwards

1. **DASH-THEME** (Creatives, then CA): the theme spec above as a dev-ready handoff, mobile-first, with annotated
   shots.
2. **DASH-EMBER-V03** (Front End; on the board, blocked on DASH-THEME): bump `ember-ui` to a tag that contains #36
   (a v0.3.x tag is John's call; until then pin `346ad36`), register and apply the dashboard theme, and add any font
   packages John approves. In the same card, remove the `KNOWN_GAPS` `.em-tab` entry in `scripts/targets.mjs` and the
   `.ember .em-btn--sm::before` override in `src/app.css`; confirm the tabs and the toast Dismiss are ≥44 effective at
   320/375/1280, light and dark; set ACR 2.5.8 to "All targets meet WCAG 2.5.8 (24px), and every standalone control
   meets the project's 44px goal." Done means the build matches the approved DASH-THEME spec, with a
   before/after pixel diff in the PR.
3. **Re-gate:** lint, typecheck, vitest, build, e2e, a11y (axe 0), target-audit, then QA, then CA.
