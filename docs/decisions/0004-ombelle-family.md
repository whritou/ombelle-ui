# Ombelle style family decision

4 November 2026. Ombelle is added as a stable style family beside flat, minimalist and neo-brutalism. Liquid glass stays experimental and is unchanged.

## Look

Ombelle is the product's own pink-and-ink look: pill-shaped buttons, badges, switches and tab lists; ink outlines on every control; hard offset shadows with no blur; key-press states where hover lifts a control and press seats it onto its shadow; a solid focus ring with an offset that is never clipped; and small uppercase, letter-spaced labels. Light and dark tokens live in `packages/catalog/src/presets/ombelle.json` (primary `oklch(55% 0.22 6)` in light, `oklch(68% 0.22 6)` in dark). The family stylesheet is `packages/catalog/src/styles/ombelle.css`, with one `ombelle.css` per component under `packages/catalog/src/styles/<component>/`.

## Contract changes

- `schemas/preset.schema.json` gains `ombelle` in the `styleFamily` enum; `packages/contracts/src/preset-schema.ts` is regenerated from it.
- `supportedStyleFamilies` is now `flat`, `minimalist`, `neo-brutalism`, `ombelle`; `styleFamilies` appends `liquid-glass`. `styleSupport` reports `stable` for every component in ombelle.
- Catalog and compiler compatibility versions stay 0.1.0 and schema 1.0. The change is additive: the three existing families produce the same bytes, and a preset or recipe that does not name ombelle is unaffected. `packages/compiler/test/fixtures/style-baseline.json` and `stable-family-hashes.json` record the new family's hashes.

## Where it is offered

- Both editors: the preset editor Style family picker and the Button editor family chip list Ombelle, with a sample of a pill with an ink outline and an offset ink shadow on a pink fill. It carries no Beta tag.
- Preview: the gallery generation iterates `supportedStyleFamilies`, so ombelle scenes are generated, and `apps/preview/src/main.tsx` routes `/ombelle/` to its generated entry.
- Documentation playground: the component pages list Ombelle beside the other families.
- Recipe and component-preset fixtures: `fixtures/shared/recipes.ts` derives its recipes from `supportedStyleFamilies`, so an `rc_ombelle_button` recipe fixture exists, and the recipe and component-preset fixture views import the ombelle installs. The recipe count checks in `scripts/recipe-evidence.ts` and `scripts/prepare-recipe-consumer.ts` follow that list instead of a literal `3`.
- Consumers: the matrix gains four stable rows (`vite-ombelle`, `next-ombelle`, `npm-vite-ombelle`, `npm-next-ombelle`), taking it from 36 to 40 rows (38 stable, two experimental glass).

Ombelle consumers are pnpm and npm with a Node CLI runtime only. Yarn and Bun rows are not added for it.

## Existing projects

Nothing rewrites installed files. A project adopts ombelle only by running `init --preset` or `theme add` with an ombelle preset, subject to the usual modified-file conflict checks. Switching an existing project from another stable family is the same operation as switching between the existing stable families.

## Verification status

Recorded on 4 November 2026 on Windows 11 with Node 24.19.0 and pnpm 11.25.0 through corepack. Run on this machine: `pnpm build:packages`, `pnpm generate:preview`, `pnpm typecheck`, the full unit suite (`pnpm test:unit`: 91 files and 931 tests passed on the final run; an earlier run had one `snapshot-cache` 60-second timeout while another job loaded the machine, which did not recur), the focused integration tests that this change touched (two `foundation-groups` tests failed here with ENOENT on a `calls.jsonl`; this early reading, that pnpm was not on PATH, is superseded by the release run below, which found the cause was a `.js` import specifier in `fixtures/shared/recipes.ts`, now fixed; the full `pnpm test:integration` was run in the release run), and the preset editor browser cases for ombelle (gallery rendering in light and dark, and the dashboard, settings and sign-in pages).

Not completed here: `pnpm prepare:consumers` prepared all pnpm and npm consumers, including the four ombelle ones, and the Yarn consumers, then stopped at the first Bun consumer because no native Bun executable is installed (`Cannot resolve a supported native bun executable`), so the matrix and its evidence were not written and `pnpm check:foundation` was not run. The browser cases that compare the downloaded ombelle preset with installed Vite and Next consumers pass on this machine, and the preset editor's ombelle page cases pass. Next's CSS pipeline lowers `oklch()` to `lab()`, so the parity helpers (`tests/helpers/color-compare.ts`) now compare computed colours as sRGB within one channel step and 0.01 alpha, and every other property exactly. The parity browser spec (`parity.spec.ts`), which needs the full set of prepared consumers, was not run for ombelle. No measured evidence file was regenerated, and nothing here supports a claim about ombelle consumers, real-browser forced-colors rendering, human keyboard or screen reader review, or contrast beyond the automated token-pair test. Rerun the gate on a machine with the full toolchain before extending the evidence documents.

### Release 0.5.0 run

Recorded on 4 November 2026 on the same machine. `pnpm version:set 0.5.0` and `--check` (10 sites at 0.5.0) pass, and `pnpm install --frozen-lockfile --ignore-scripts`, `pnpm build:packages`, `pnpm typecheck` and `pnpm test:unit` (91 files, 931 tests) pass.

`pnpm test:integration` ran in full: 30 failed, 510 passed, 13 skipped. All 30 failed tests are environmental: 28 are `FoundationError: Cannot resolve a supported native bun executable` (no native Bun installed), one is `tar (child): Cannot connect to D: resolve failed` (packed-cli tarball listing on a D: path), and one is `pnpm` not recognised on PATH (upstream registry-item install). Separately, the `manager-runtime` suite fails to load for the same Bun reason; vitest reports it as a failed suite, not a failed test, so it is not in the 30. The full run found one real defect, now fixed: `fixtures/shared/recipes.ts` imported `style-families.js`, which plain Node cannot resolve against the `.ts` source, so the foundation runner and group tests failed; it now imports `style-families.ts` like the other scripts.

`pnpm check:foundation` did not complete: it stopped at `test:integration` because of the environmental failures above. Not run: the 40-consumer matrix, the browser contract (534 cases) and the ombelle parity cases that need prepared consumers. No evidence file was regenerated, so no evidence document supports a claim about ombelle consumers; rerun the gate on a machine with Bun, a tar-compatible path, pnpm on PATH, registry access and browsers.
