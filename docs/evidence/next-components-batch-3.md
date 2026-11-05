# Next components, batch 3: Table and Accordion

5 November 2026. This records the third batch of the next ten catalog components. It does not award stable status to the catalog, run the full foundation gate, or certify consumer applications.

## Source and environment

Branch `feat/table-accordion`, cut from `main` after batch 2 merged (`3a856e7`). Windows 11, Node v24.19.0, pnpm 11.25.0 (through corepack). The browser checks used Playwright 1.64.1 driving Microsoft Edge 156.0.4314.58 (Chromium) against the www dev server on port 3100, after `node scripts/build-hosted-preview.mjs`. The visual source is the canvas's four "next 10 components" sheets and the family UI kits.

## What ran

| Check | Result |
| --- | --- |
| `corepack pnpm typecheck` | passed |
| `corepack pnpm test:unit` (`VITEST_MAX_WORKERS=4`) | 115 files, 1074 tests passed |
| `tests/integration/preset-gallery-generation`, `preview-routing`, `hosted-preview-build`, `liquid-glass-cli`, `www-route` | 5 files, 36 tests passed |
| Playwright screenshots, four families, light and dark: the Table with a selected row, and the Accordion with its first item open and keyboard focus on the second trigger | 16 component captures and 2 scene captures, reviewed against the sheets |

Not run: `pnpm check:foundation`, the rest of `test:integration` (CI runs it), and the browser e2e suite (`test:e2e`). The e2e suite does not run in CI or on this machine. The scene component lists in `tests/e2e/preset-editor.spec.ts` were updated but not executed. The consumer matrix does not install the new components yet.

## New tests

- Catalog contract, per component (`packages/catalog/test/{table,accordion}.test.ts`). Each checks:
  - slots, exact dependencies (Table adds none) and the client boundary (Table has none);
  - state selectors and forced colors in every family, with logical properties only;
  - glass unavailability;
  - the shared check that any animation runs only while open.

  Static renders also check:
  - the Table's scroll container, caption, `scope="col"` default, numeric cells and selected row;
  - the Accordion's heading levels, `aria-expanded`, the open `region` and both icons.
- Compiler artifacts, per component (`packages/compiler/test/{table,accordion}.test.ts`). Each checks:
  - deterministic standalone output in every stable family;
  - the existing artifacts stay byte-identical;
  - forced colors: `Highlight` for the selected row, and a `Highlight` focus ring and `GrayText` disabled triggers on the Accordion;
  - each family shows exactly one Accordion icon, the plus in minimalist.

  Both components are refused in glass.
- `stable-family-hashes.json` gains 24 entries (4 families × 2 components × TSX, CSS and example) and changes none.

## Visual review and fixes

Compared with the sheets, the selected Table row in ombelle and flat also recoloured its text. The sheets change only the background, so the text colour is now kept. Neo brutalism keeps its explicit secondary ink, because its dark-mode foreground would be light on cyan. The Ombelle and Neo-brutalism Accordion containers clip their corners, so their focus rings are drawn inside the trigger. The captures show the rings fully visible.

## Screenshots

Images are in [images/next-batch-3](images/next-batch-3/), named `<component>-<family>-<mode>.png`. The scene captures are the dashboard Activity tab and the settings Billing tab, in ombelle.

## Limits

Agent-operated screenshot review is not a human accessibility or screen-reader audit. Native text zoom, NVDA, VoiceOver, other browsers, arbitrary preset overrides and consuming applications need their own checks. The published installer cannot add these components yet. The website lists them only from `minimumCli` 0.5.0.
