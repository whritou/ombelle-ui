# Responsive editors evidence

The preset editor and the component editors on phones (below 768px) and tablets (768–1199px). Design: `docs/superpowers/specs/2026-11-13-responsive-editors-design.md`. Plan: `docs/superpowers/plans/2026-11-13-responsive-editors.md`. Boards: the Editors page of the design canvas.

## Environment

Windows 11, Node 24.19.0, pnpm 11.25.0 through corepack, Playwright with its bundled Chromium, headless, reduced motion. Branch `fix/responsive-editors` from `feat/variants-076` (`3d332019`), on 13 November 2026. Browser tests ran with a local config against the snapshot website on 3000 (`scripts/serve-snapshot-www.ts`) and the preview on 4173, without the installed-consumer servers.

## Checks

| Check | Result |
| --- | --- |
| `pnpm typecheck` | Passes |
| `pnpm exec vitest run apps/www` | 654 passed, 22 skipped; `preview-protocol.test.ts` timed out in its `beforeAll` under the full run and passes alone (22/22), as recorded for 0.7.6 |
| `tests/e2e/editors-responsive.spec.ts` (new) | 25 passed: both editors fit 320, 375 and 768px without horizontal overflow or page scrolling, also in Liquid glass; compact phone top bar (≤ 100px) and More actions sheet with focus returned; long preset name at 320px; the component switcher at 1440 and 375px; the pinned specimen shows the Button inside its card; preset phone panes with the pinned preview, the tablet split with the Checks and export sheet, resizing with the drawer open; Get code, the family confirmation, ID & revision, a colour token and the Button colour picker open from the bottom at 375px; 44px steppers instead of sliders |
| Editor specs (`editor.spec.ts`, `preset-editor.spec.ts`, `editor-commands.spec.ts`, `catalog-editors.spec.ts`, `editors-matrix.spec.ts`, `editors-glass.spec.ts`, without installed-consumer cases) | 108 passed, 1 skipped, 11 failed. Eight failures are the recorded baseline: Ctrl+K choosing a component opens Alert Dialog; the keyboard walk's padding field outline; the dashboard, projects, settings and sign-in pages' axe contrast in flat, neo-brutalism and ombelle; the 0.5 and 0.55 radius cases ("restores raw draft and history after refresh", "edits numeric design values with a slider"); the 320 pixel reflow, which now passes its Undo and Redo steps and fails later at the family confirmation. "View mode does not change recipe hash" failed because the width toggle is hidden below 1200px by design; it now runs at 1280px and passes. The two `editors-glass` mirror cases compare slots on the preview app's audit page, which this branch does not change |

## Test changes

- The suite's default viewport, 1100px, is now the tablet structure. `preset-editor.spec.ts`, `liquid-glass.spec.ts` and `snapshot-presets.spec.ts` run at 1280px because they test the desktop review drawer; two `editor.spec.ts` cases that use the width toggle set 1280px; "opens the saved Button draft" checks the site header at 1280px and waits for the editor to hydrate and for the stored draft before navigating (it failed one run in three by typing before hydration).
- "mobile workspace tabs" became "the phone dock keeps the draft and preview mode across panes", plus a tablet case; "offers keyboard access to the catalog on mobile" goes through the component switcher; the Button editor route test checks the switcher and back link.

## Found on the way

After the last Undo on a phone, the editors moved focus to Redo, which is in the More actions sheet on phones, so focus was lost. Focus now moves to the More actions button (`focusHistoryTarget`), in all three editors.

## Not run

- Website First Load JS was not measured: it needs a full `next build`, skipped to keep the run short. The branch adds the catalog Sheet and Native Select to the editor routes.
- `pnpm check:foundation` and the installed-consumer browser cases need the registry and consumer servers.
- The browser pane used during development does not paint the cross-origin preview frame, so the pinned previews were checked by measuring, not by eye.
- Real devices and the on-screen keyboard were not tested.
