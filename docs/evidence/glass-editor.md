# Liquid glass in the editors: evidence

5 November 2026, branch `feat/glass-editor`. Windows 11, Node 24.19.0, pnpm 11.25.0, Playwright with Microsoft Edge, www dev server (`next dev`) with the hosted preview built by `scripts/build-hosted-preview.mjs`.

## What changed

- **Preset editor, Glass material section:** the eight starting presets (Cristal is the default, and switching a draft to glass starts from it), four tint chips (Claire, Rosée, Fumée, White) and the material controls in the lab's order, each with a hint. Radius, font, density, shadow, border and every colour control are unchanged.
- **Preview backdrop picker:** Kit, Prisme, Trame, Nuit and Pêche. This is a preview setting and is never saved. Picking Relief switches to Pêche. Both previews mount `LiquidGlassFilter`, so the halo, the moving shine and the rim refraction are live.
- **Button editor:** for glass recipes, a Glass material section overrides opacity, blur, backdrop contrast, shine, rim light, pointer halo, relief, motion and dispersion on that Button. The overrides are scoped to its recipe and held to the contrast bound.

## Checks

| Check | Result |
| --- | --- |
| `corepack pnpm typecheck` | pass |
| `VITEST_MAX_WORKERS=4 corepack pnpm test:unit` | 1169 of 1169 |
| `preset-gallery-generation`, `preview-routing`, `hosted-preview-build`, `liquid-glass-cli`, `www-route`, `editor-recipe-cli` | 39 of 39 |

`test:e2e` was not run.

## Screenshots

The harness `.artifacts/shots/editor.mts` drives the real editor at 1440 × 900. For each starting preset it clicks the preset, waits for the preview to report ready, and captures the page. The halo shot moves the pointer to a Card's top-right corner.

| Step | Light | Dark |
| --- | --- | --- |
| Cristal | ![](images/glass-editor/cristal-light.png) | ![](images/glass-editor/cristal-dark.png) |
| Givré | ![](images/glass-editor/givre-light.png) | ![](images/glass-editor/givre-dark.png) |
| Fumé | ![](images/glass-editor/fume-light.png) | ![](images/glass-editor/fume-dark.png) |
| Relief (switches to Pêche) | ![](images/glass-editor/relief-light.png) | ![](images/glass-editor/relief-dark.png) |
| Prism | ![](images/glass-editor/prism-light.png) | ![](images/glass-editor/prism-dark.png) |
| Givré with the Claire tint | ![](images/glass-editor/tint-givre-claire-light.png) | ![](images/glass-editor/tint-givre-claire-dark.png) |
| Cristal on the Nuit backdrop | ![](images/glass-editor/backdrop-nuit-light.png) | ![](images/glass-editor/backdrop-nuit-dark.png) |
| Pointer halo on a Card | ![](images/glass-editor/halo-light.png) | ![](images/glass-editor/halo-dark.png) |
| Button editor: halo 0.9, relief 0.7, dispersion 0.6 | ![](images/glass-editor/button-editor-light.png) | ![](images/glass-editor/button-editor-dark.png) |

## Found while capturing

- **The backdrop picker did nothing.** The preview frame rebuilt the view from a fixed list of keys, which dropped `backdrop`, and did not re-send when the backdrop changed. `sentPresetView` in `preview-protocol.ts` now shapes the view, and the frame re-sends on a backdrop change. The test `the editor sends the glass backdrop with the view it renders` covers both.

- **Final review fixes.** The Fumée tint reset light `destructive` to the base `#7F1D1D` on its dark veil, so it failed the bound on every preset (`every tint chip keeps every starting preset inside the contrast bound`). Install commands are held back for material settings until the 0.5.0 installer is published (`holds back commands for glass material settings…`, `the Install tab explains why…`). Glass overrides are dropped when a recipe leaves glass (`leaving liquid glass drops the glass material overrides…`).

## Limits

- **The built-in browser pane** blocks the preview iframe (`net::ERR_BLOCKED_BY_CLIENT`), so these shots come from Edge through Playwright.
- **The Button editor's halo** lights only when the page preset also turns the halo or motion on. `LiquidGlassFilter` attaches its listener from the root tokens, and a recipe's tokens are scoped to its Button. This is listed under the limitations in `docs/components/liquid-glass.md`.
- **Empty Button material sliders** sit at their minimum while the field follows the preset, as the other recipe sliders already do.
- No human visual, keyboard or screen-reader review.
