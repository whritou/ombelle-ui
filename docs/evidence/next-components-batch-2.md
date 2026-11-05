# Next components, batch 2: Popover, Avatar, Separator

5 November 2026. This records the second batch of the next ten catalog components. It does not award stable status to the catalog, run the full foundation gate, or certify consumer applications.

## Source and environment

Branch `feat/popover-avatar-separator`, cut from `main` after batch 1 merged (`03809b0`). Windows 11, Node v24.19.0, pnpm 11.25.0 (through corepack). The browser checks used Playwright 1.64.1 driving Microsoft Edge 156.0.4314.58 (Chromium) against the www dev server on port 3100, after `node scripts/build-hosted-preview.mjs`. The visual source is the canvas's four "next 10 components" sheets and the family UI kits.

## What ran

| Check | Result |
| --- | --- |
| `corepack pnpm typecheck` | passed |
| `corepack pnpm test:unit` (`VITEST_MAX_WORKERS=4`) | 111 files, 1054 tests passed |
| `tests/integration/preset-gallery-generation`, `preview-routing`, `hosted-preview-build`, `liquid-glass-cli`, `www-route` | 5 files, 36 tests passed |
| Playwright screenshots, four families plus glass Popover, light and dark, Popover open | 26 component captures and 3 scene captures, reviewed against the sheets |
| Playwright close probe: open the Popover, press Escape, check that it unmounts and focus returns, in all four families and both modes | 8/8 passed |

Not run: `pnpm check:foundation`, the rest of `test:integration` (CI runs it), and the browser e2e suite (`test:e2e`). The e2e suite does not run in CI or on this machine. The scene component lists in `tests/e2e/preset-editor.spec.ts` were updated but not executed. The consumer matrix does not install the new components yet.

## New tests

- Catalog contract, per component (`packages/catalog/test/{popover,avatar,separator}.test.ts`). Each checks:
  - slots, exact dependencies and exported parts;
  - state selectors and a forced-colors block in every family, with logical properties only;
  - glass availability.

  Static renders also check the Popover trigger's dialog popup state and the title's heading level, the Avatar's name, the decorative status and the labelled group, and the Separator's decorative and semantic roles, vertical orientation and label.
- Compiler artifacts, per component (`packages/compiler/test/{popover,avatar,separator}.test.ts`). Each checks:
  - deterministic standalone output in every stable family, plus glass for Popover;
  - the existing artifacts stay byte-identical;
  - forced colors: Popover on `Canvas` with `Highlight` focus, the Avatar status dot filled or hollow, and Separator rules in `CanvasText`;
  - the offset shadow in the preset shadow colour, for Ombelle and Neo-brutalism.

  Avatar and Separator are refused in glass.
- `stable-family-hashes.json` gains 36 entries (4 families × 3 components × TSX, CSS and example) and changes none.

## Visual review and fixes

- **Popover stayed mounted after closing.** The close check found a dismissed Popover kept mounted with `data-state="closed"`. Radix Presence waits for `animationend` while a closing element carries an animation name it never saw start. That happens with the 0ms enter animation of reduced-motion presets, or in a background frame. The enter animation now runs only on `[data-state='open']`. The same defect in batch 1's Select and Dropdown Menu is fixed separately in the `fix/overlay-close-animation` pull request, which also adds the contract check for it.
- **Dashboard reviewer stack.** It sat tight against the card description and now has a small top margin in the scene CSS.

## Screenshots

Images are in [images/next-batch-2](images/next-batch-2/), named `<component>-<family>-<mode>.png`. Scene captures are `scene-<page>-ombelle.png`.

## Limits

Agent-operated screenshot review is not a human accessibility or screen-reader audit. Native text zoom, NVDA, VoiceOver, other browsers, arbitrary preset overrides and consuming applications need their own checks. The published installer cannot add these components yet. The website lists them only from `minimumCli` 0.5.0.
