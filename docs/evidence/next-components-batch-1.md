# Next components, batch 1: Select, Radio Group, Dropdown Menu, Alert

5 November 2026. This records the first batch of the next ten catalog components. It does not award stable status to the catalog, run the full foundation gate, or certify consumer applications.

## Source and environment

Branch `feat/select-radio-dropdown-alert`, cut from `main` at `21a4b54`. Windows 11, Node v24.19.0, pnpm 11.25.0 (through corepack). The browser checks used Playwright 1.64.1 driving Microsoft Edge 156.0.4314.58 (Chromium) against the www dev server on port 3100, after `node scripts/build-hosted-preview.mjs`.

The visual source of truth is the design canvas's four "next 10 components" sheets (OmbelleNext, FlatNext, MinimalistNext, NeoBrutalismNext) and the four family UI kits. No artboard draws checkbox or radio menu items or an open submenu. Those parts reuse each family's kit Checkbox (box and check) and Radio Group (circle and dot) and the parent menu panel.

## What ran

| Check | Result |
| --- | --- |
| `corepack pnpm typecheck` | passed |
| `corepack pnpm test:unit` (`VITEST_MAX_WORKERS=4`) | 105 files, 1030 tests passed |
| `tests/integration/preset-gallery-generation`, `preview-routing`, `hosted-preview-build` | 3 files, 16 tests passed |
| `tests/integration/liquid-glass-cli`, `www-route` (after the first CI run flagged them) | 2 files, 20 tests passed |
| CI (`checks`, four `integration` shards) | see the pull request |
| Playwright screenshots, four families plus glass, light and dark, overlays open | 44 component captures and 3 scene captures, reviewed against the sheets |

With the default worker count, `packages/cli/test/snapshot-cache.test.ts` ("bounds valid entries to 100 and 16 MiB during writes") hit its 60-second timeout under full-suite load. It passes alone (27/27) and in the four-worker run above. It does not touch the catalog.

The first CI run failed two integration tests that still hard-coded the six glass ids and expected every catalog id on the website; both now cover the new components, and the glass CLI test installs Alert and Dropdown Menu through the real CLI. Not run locally: `pnpm check:foundation`, the rest of `test:integration` (CI runs it), and the browser e2e suite (`test:e2e`). The e2e suite does not run in CI or on this machine. The scene component lists in `tests/e2e/preset-editor.spec.ts` were updated but not executed. The consumer matrix does not install the new components yet.

## New tests

- Catalog contract, one file per component (`packages/catalog/test/{select,radio-group,dropdown-menu,alert}.test.ts`). Each checks:
  - slots, exact dependencies and the client boundary;
  - exported parts and the colocated CSS import;
  - the required state selectors and a forced-colors block in all four families, with no physical left or right properties;
  - glass availability.

  Static renders also check roles and states: combobox, radiogroup with checked and disabled radios, the menu trigger's popup state, and the Alert status and alert roles with the role override.
- Compiler artifacts, one file per component (`packages/compiler/test/{select,radio-group,dropdown-menu,alert}.test.ts`). Each checks:
  - every stable family (plus glass for Alert and Dropdown Menu) compiles deterministically;
  - the output has exactly the expected artifacts and dependencies;
  - the Button, Dialog and Input (Card for glass) artifacts stay byte-identical;
  - forced colors use `Highlight`, `GrayText`, `Field` and `CanvasText`.

  Radio hit targets are asserted to be at least 24px. Select and Radio Group are refused in glass. The glass menu drops its blur under reduced transparency.
- `stable-family-hashes.json` gains 48 entries (4 families × 4 components × component TSX, CSS and usage example) and changes none. No existing artifact byte changed, so `style-baseline.json` gains no `intentionalChanges` entry.

## Visual review and fixes

The screenshots render the generated component source and CSS inside the real preset editor preview (`/editor/preset?page=gallery`, then the Dashboard, Settings and Sign in pages). For each family and mode the script captures:

- the Select open with the second option highlighted;
- the Select trigger with keyboard focus;
- the Radio Group with focus on the checked option;
- the Dropdown Menu open with the second item highlighted;
- both Alerts.

The review found and fixed three issues:

- **Neo-brutalism dark radio dot.** The checked radio's dot used `--border`, which is near-white in dark mode, so it was nearly invisible on the yellow fill. It now uses `--primary-foreground`, as does the menu radio indicator.
- **Gallery alerts.** The alerts touched and had no icons. The gallery now spaces them and shows the info and warning icons from the sheet.
- **Capture script.** The script cropped overlays wrongly when menus flipped above their trigger. This was a harness bug, not a component defect.

Open note: in neo brutalism dark, the preset's near-white dashed focus ring has low contrast on the cyan checked card. This is the existing kit `ring` token, shared with Checkbox and the other controls, and is left for a family-level change.

## Screenshots

Images are in [images/next-batch-1](images/next-batch-1/), named `<component>-<family>-<mode>.png`. Scene captures are `scene-<page>-ombelle.png`.

## Limits

Agent-operated screenshot review is not a human accessibility or screen-reader audit. Native text zoom, NVDA, VoiceOver, browsers other than Edge/Chromium, arbitrary preset overrides and consuming applications still need their own checks. The published installer (`@ombelle-ui/cli@0.4.0`) cannot add these components. The website lists them only from `minimumCli` 0.5.0.
