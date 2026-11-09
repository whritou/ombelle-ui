# Catalog expansion: forms, navigation, feedback and appearances

Implemented on `feat/forms-navigation-overlays`, starting at `40480dc`.
Work began on 8 November and verification continued on 9 November 2026.
The user requested workspace version 0.7.2; all six package manifests and release
references are aligned with that candidate. The published version remains 0.7.1.

## Scope

Six new components bring the local catalog to 29: Input Group, Sheet, Alert
Dialog, Breadcrumb, Pagination and Toast. All have reviewed source templates,
five-family styles, compiler examples, recipe definitions, editor controls and
documentation. Native presentation templates are shared between editions;
Sheet, Alert Dialog and Toast have Radix and Base UI sources. Base UI Toast
retains its native manager lifecycle and has its own generated example.

The batch also adds Tabs contained/underline appearances, Table compact density
and striped rows, Alert success/warning/info intents, Card outlined/subtle
surfaces, and Badge small size/decorative dot composition. New optional palette
pairs have reviewed fallbacks. Existing preset JSON files were not rewritten;
recipes omitting the new optional fields retain their normalized identities.

The published installer stays at 0.7.1. Website command gates require 0.7.2 for
the new APIs and semantic palette fields; local source and JSON exports remain
available. No package was published and no deployment was performed.

## Environment and verification

Windows, Node 24.19.0, pnpm 11.25.0, Bun 1.4.3, and Microsoft Edge
157.0.4341.42. The pinned Bun executable was installed under ignored
`.artifacts/toolchain` with lifecycle scripts disabled. Registry-backed tests
use Node's `--use-system-ca` option rather than disabling certificate checks.
The installer removes `NODE_OPTIONS` from child environments, so certificate
retries additionally use [`NODE_USE_SYSTEM_CA=1`](https://nodejs.org/api/cli.html#node_use_system_ca1),
which preserves system trust for package-manager children.

- Package/schema/catalog generation and package builds completed.
- The final production website build, including both compiler workers and the
  generated static preview, passed with Next.js 16.4.3.
- Root TypeScript checking completed without errors.
- The complete unit gate passed 1,628 tests across 152 files at two workers.
  A prior four-worker run hit the existing 60-second snapshot-cache stress
  timeout; its isolated 27-test file and the full two-worker run both passed.
- The focused compiler/recipe/glass regression group passed 129 tests.
- After the final customization fix, the complete compiler suite passed 487
  tests across 37 files. Root TypeScript and both version-alignment checks passed.
- The complete integration inventory (606 tests in 71 files) was exercised
  across two batches. The interrupted four-worker run completed 24 passing
  files (255 tests). Its remaining 47 files completed at two workers with 344
  passing tests and seven failures. All seven passed in isolated retries:
  the Vite/Next snapshot journeys and five existing recipe-install cases.
  The latter installed successfully but concurrent eviction in the populated
  shared cache emitted warnings that the JSON-only test helper rejected.
  Their retry used a fresh `OMBELLE_SNAPSHOT_CACHE_DIR`. The Next journey hit
  the existing 60-second limit under load and passed in 58.99 seconds alone.
  No production cache behavior or test timeout was changed. This is complete
  inventory coverage with retries, not a single uninterrupted green suite.
- The browser gate passed all 26 cases: five families by two editions by two
  color modes, plus stock/Cristal/Prism material checks in both modes.
- Twelve additional browser regression cases passed for explicit recipe colors,
  borders and spacing across Ombelle and liquid-glass appearances. All twelve
  failed before the compiler fix and passed afterward.
- Browser checks cover native form submission, disabled paging, tab selection
  and keyboard navigation, overlay trapping/dismissal/focus return, logical RTL
  placement, scrolling, Toast timer pausing and keyboard dismissal, forced
  colors, and scoped axe scans. Base UI's native default-horizontal ARIA and
  focusable-disabled-tab behavior are tested explicitly.

Commands and detailed logs live under `.artifacts/catalog-expansion-*`.
`playwright.catalog-expansion.config.ts` runs this preview-only browser gate on
port 4184; it is excluded from the separate foundation consumer inventory.

## Review fixes

The independent review identified missing material contrast plates for new
translucent surfaces and material-sheet rules overriding new Card/Tabs
appearances. Added surface-matched plates and forced-color resets, strengthened
the opt-in appearances, disabled their material pseudo-layers, and kept glass
underline tabs on an opaque bounded surface. The shared glass CSS additions
preserve the previous rules. Nested slot isolation remains enforced.

Explicit per-part recipe overrides now outrank the opt-in Card, Tabs and Table
defaults. Glass Cards, semantic Alerts and Toasts map custom colors to the
variables actually painted by their appearances, including semantic text.
Recipes without these new options keep their previous selector output.

Tests also caught and corrected Sheet `asChild` composition, legacy recipe
default normalization, and Input Group action reading order. Existing output
changes are recorded in `style-baseline.json`; the stable-family hash fixture
adds 72 new artifact entries and changes the 40 expected appearance artifacts.

## Captures and limits

Agent-operated screenshots show [Prism light](images/catalog-expansion/prism-light.png)
and [Prism dark](images/catalog-expansion/prism-dark.png). These illustrate the
preserved default surface beside outlined/subtle Cards, compact striped Tables
and Badge sizes over the kit backdrop.

This batch does not claim a new full 40-consumer foundation gate result.
The browser work uses one Chromium-based browser and does not replace human
screen-reader testing, native text-zoom review, or consuming-application checks.
Liquid glass remains experimental.

The serial integration attempt was stopped after identifying that its
`NODE_OPTIONS` certificate setting was removed from CLI child environments.
The replacement run used the verified `NODE_USE_SYSTEM_CA=1` setting against
version 0.7.2. It ended without a final report after 24 files; its log was used
to select the 47 remaining files for the completed two-worker batch above.
