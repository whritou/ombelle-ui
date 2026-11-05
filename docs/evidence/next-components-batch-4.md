# Next components, batch 4: Progress and Skeleton

5 November 2026. This records the fourth and last batch of the next ten catalog components. It does not award stable status to the catalog, run the full foundation gate, or certify consumer applications.

## Source and environment

Branch `feat/progress-skeleton`, cut from `main` at `3a856e7` (after batch 2) and merged with `main` after batch 3 landed; the checks below ran on the merged tree (23 components). Windows 11, Node v24.19.0, pnpm 11.25.0 (through corepack). The browser checks used Playwright 1.64.1 driving Microsoft Edge 156.0.4314.58 (Chromium) against the www dev server on port 3100, after `node scripts/build-hosted-preview.mjs`. The visual source is the canvas's four "next 10 components" sheets and the family UI kits.

## What ran

| Check | Result |
| --- | --- |
| `corepack pnpm typecheck` | passed |
| `corepack pnpm test:unit` (`VITEST_MAX_WORKERS=4`) | 119 files, 1090 tests passed |
| `tests/integration/preset-gallery-generation`, `preview-routing`, `hosted-preview-build`, `liquid-glass-cli`, `www-route` | 5 files, 36 tests passed |
| Playwright screenshots, four families, light and dark: Progress at 64%, complete and indeterminate, and Skeleton lines, circle and block | 16 component captures and 2 scene captures, reviewed against the sheets |

Not run: `pnpm check:foundation`, the rest of `test:integration` (CI runs it), and the browser e2e suite (`test:e2e`). The e2e suite does not run in CI or on this machine. The scene component lists in `tests/e2e/preset-editor.spec.ts` were updated but not executed. The consumer matrix does not install the new components yet.

## New tests

- Catalog contract, per component (`packages/catalog/test/{progress,skeleton}.test.ts`). Each checks:
  - slots, exact dependencies (Skeleton adds none) and the client boundary (Skeleton has none);
  - state selectors, forced colors and reduced motion in every family, with logical properties only;
  - glass unavailability.

  Static renders also check:
  - Progress: the `progressbar` role, value attributes, the indicator width clamped to `value / max`, and the `complete` and `indeterminate` states;
  - Skeleton: it is `aria-hidden` and records its shape.
- Compiler artifacts, per component (`packages/compiler/test/{progress,skeleton}.test.ts`). Each checks:
  - deterministic standalone output in every stable family;
  - the existing artifacts stay byte-identical;
  - forced colors: a `Highlight` fill on a `Canvas` track for Progress, and `GrayText` outlines for Skeleton;
  - looping animations whose duration follows the preset's motion setting;
  - Progress uses no physical positioning or transforms.

  Both components are refused in glass.
- The shared contract check from #66 now applies only to mounted overlay content (`*-content` slots), so looping indicators such as the skeleton pulse can animate.
- `stable-family-hashes.json` gains 24 entries and changes none.

## Visual review and fixes

With a reduced-motion preset, the indeterminate bar rested as a 40% segment at the start, which read like a determinate 40%. The sweep now lives in the keyframes, and the resting state is a faded full-width fill. That is what flat, minimalist and neo brutalism (all reduced-motion presets) show; ombelle shows the moving segment.

## Screenshots

Images are in [images/next-batch-4](images/next-batch-4/), named `<component>-<family>-<mode>.png`. The scene captures are the dashboard and the settings Members tab, in ombelle.

## Limits

Agent-operated screenshot review is not a human accessibility or screen-reader audit. Live-region announcement of progress, native text zoom, NVDA, VoiceOver, other browsers, arbitrary preset overrides and consuming applications need their own checks. The published installer cannot add these components yet. The website lists them only from `minimumCli` 0.5.0.
