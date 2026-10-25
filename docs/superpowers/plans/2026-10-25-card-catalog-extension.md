# Card Catalog Extension Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a deterministic, independently styled Card compound component to the local catalog and CLI, with default and dense states across the three supported style families.

**Architecture:** Follow the catalog/compiler/registry/CLI pipeline used by Badge. Card uses a colocated `card.css`, a `density` data attribute, and reviewed family CSS; the shared global family stylesheet remains byte-identical. Preview and consumer fixtures render the exact compiled artifacts, and the provided logo files remain untouched repository assets outside Card output.

**Tech Stack:** TypeScript, TSX, React 19, pnpm workspaces, deterministic compiler and generated catalog, Vitest, Playwright, existing npm/pnpm/Yarn/Bun consumer runners.

**Spec:** `docs/superpowers/specs/2026-10-25-card-design.md`

Execution was approved on 25 October 2026. This is the approved task checklist; measured outcomes and execution limitations are recorded in [Card verification evidence](../../evidence/card.md).

## Global Constraints

- Support only `flat`, `minimalist`, and `neo-brutalism`, in light and dark modes; liquid glass remains out of this slice.
- Card exposes root, header, title, description, content, and footer parts; root density is `default` by default or `dense`.
- Add no dependency versions, client boundary, interactive behavior, or runtime Ombelle dependency.
- Emit `components/ui/card.tsx`, colocated `components/ui/card.css`, and `examples/card.tsx`; generated component imports its CSS.
- Keep current component sources, `ui-style.css`, utility, project defaults, manager metadata, and lockfile ownership unchanged when Card installs.
- Preserve all three supplied PNG files under `assets/` byte-for-byte and do not reference them from Card or consumer artifacts.
- Preserve dry-run, no-op, stale-plan, transaction, and local-edit conflict safeguards; `--yes` does not bypass conflicts.
- Do not claim full-catalog stability or consumer-app accessibility certification.

## Review Focus

- **Missing optional composition slots:** render and type-check partial Card compositions without requiring every part.
- **Density forwarding:** verify default and dense root values, caller `data-*` attributes, refs, and custom classes survive generation.
- **Custom install paths:** verify component and CSS land in configured aliased paths while usage imports point to the configured alias.
- **Ownership conflicts:** verify edits to either Card TSX or CSS conflict even with `--yes`, while repeats are no-ops.
- **Style and mode combinations:** verify all three families in light/dark and both density states; ensure forced-colors removes reliance on decorative shadow and reduced-motion disables transitions.

---

### Task 1: Add Card to the reviewed catalog

**Files:**
- Modify: `packages/contracts/src/component-ids.ts`
- Create: `packages/catalog/src/templates/card.tsx`
- Create: `packages/catalog/src/styles/card/flat.css`
- Create: `packages/catalog/src/styles/card/minimalist.css`
- Create: `packages/catalog/src/styles/card/neo-brutalism.css`
- Modify: `scripts/sync-catalog.mjs`
- Modify: `packages/catalog/src/index.ts`
- Generated: `packages/catalog/src/generated.ts` (through `pnpm build:packages` only)
- Test: `packages/catalog/test/catalog.test.ts`

**Interfaces:**
- Produces `ComponentId` value `card` and `ComponentTemplate` entry with `styles: Record<StyleFamily, string>`.
- Component exports `Card`, `CardHeader`, `CardTitle`, `CardDescription`, `CardContent`, and `CardFooter`. `CardProps` extends `React.ComponentProps<'div'>` with `density?: 'default' | 'dense'`; Header/Content/Footer props extend native div props, Description extends native paragraph props, and Title extends native h3 props with `level?: 1 | 2 | 3 | 4 | 5 | 6` (default 3). `CardTitle` renders the requested h1–h6 element and keeps the same `data-slot="card-title"` marker and styling.

- [ ] Add catalog assertions that Card is a supported ID, its template exposes all six parts, and all three family styles are present.
- [ ] Run `pnpm exec vitest run packages/catalog/test/catalog.test.ts` and confirm the new assertions fail before implementation.
- [ ] Add the Card TSX template with native prop/ref forwarding, `data-slot` markers, a defaulted root `data-density`, the six exported parts, and no new dependency.
- [ ] Add flat, minimalist, and neo-brutalism Card slot CSS under `packages/catalog/src/styles/card/`; use semantic card tokens, implement dense spacing, and cover forced-colors/reduced-motion behavior where applicable.
- [ ] Generalize `scripts/sync-catalog.mjs` and `packages/catalog/src/index.ts` to load component styles for Badge and Card without changing existing style lookup behavior.
- [ ] Run `pnpm exec vitest run packages/catalog/test/catalog.test.ts` and confirm the catalog checks pass.
- [ ] Run `pnpm build:packages` and review generated `packages/catalog/src/generated.ts`; existing generated template/style entries must remain unchanged.
- [ ] Commit as `feat(card): add Card catalog template and styles`.

### Task 2: Compile and register Card artifacts

**Files:**
- Modify: `packages/compiler/src/compile.ts`
- Create: `packages/compiler/test/card.test.ts`
- Modify: `packages/cli/test/registry.test.ts`
- Modify: `packages/compiler/test/fixtures/style-baseline.json` only if a generated baseline is required; preserve all pre-existing entries.

**Interfaces:**
- Consumes the `card` catalog template and its family CSS from Task 1.
- Produces a compiler result with `components/ui/card.tsx`, `components/ui/card.css`, and `examples/card.tsx`, plus the existing shared artifacts.
- Registry output exposes a `card` item containing the exact component, utility, and colocated CSS bytes.

- [ ] Add compiler cases proving exact artifact paths, the generated CSS import, exported compound names, default/dense behavior, stable CSS selection by family, and no extra dependency versions.
- [ ] Add determinism assertions for duplicate Card IDs and reordered component ID inputs; confirm existing Button/Badge/Dialog/Input artifact bytes remain stable.
- [ ] Run `pnpm exec vitest run packages/compiler/test/card.test.ts` and confirm Card assertions fail before compiler changes.
- [ ] Add the Card usage example branch in `packages/compiler/src/compile.ts`; keep example source consistent with the six-part API and include a dense example without forcing an interactive card.
- [ ] Add a registry assertion that Card's TSX/CSS paths and bytes match the compiler artifacts.
- [ ] Run `pnpm exec vitest run packages/compiler/test/card.test.ts packages/cli/test/registry.test.ts` and confirm they pass.
- [ ] Run `pnpm build:packages` and review generated catalog plus package output for unrelated artifact changes.
- [ ] Commit as `feat(card): compile and register Card artifacts`.

### Task 3: Verify CLI planning and Card ownership

**Files:**
- Create: `tests/integration/card-cli.test.ts`
- Modify: `packages/cli/src/plan/components.ts` only if generic artifact planning does not already handle Card CSS.

**Interfaces:**
- Consumes compiler result from Task 2 and the existing `planAdd`/`applyPlan` CLI path.
- Produces an install plan and applied files for Card TSX, Card CSS, and usage example using configured project paths.

- [ ] Add built-CLI integration cases for `add card --dry-run --json`, apply, repeated add, custom component alias, and preserved project preset/manager/lockfile state.
- [ ] Assert a user edit to `card.tsx` and separately to `card.css` each yields `FILE_CONFLICT` with `--yes`; assert dry-run writes nothing and an unchanged repeat is a no-op.
- [ ] Run `pnpm exec vitest run tests/integration/card-cli.test.ts` and confirm failures expose only the missing Card path.
- [ ] Extend generic installer code only if required; do not add Card-specific conflict or transaction logic when generic artifact handling suffices.
- [ ] Run `pnpm exec vitest run tests/integration/card-cli.test.ts packages/cli/test/plan.test.ts packages/cli/test/transaction.test.ts` and confirm the Card and legacy installer cases pass.
- [ ] Commit as `test(card): cover CLI install ownership and conflicts` or `feat(card): support Card CLI installation` according to whether production code changed.

### Task 4: Add Card preview and consumer fixtures

**Files:**
- Create: `fixtures/shared/card-fixture.tsx`
- Modify: `fixtures/shared/scenario.tsx`
- Modify: `tests/helpers/scenario-fixture.ts`
- Modify: `scripts/generate-preview.ts`
- Modify: `scripts/prepare-node-consumer.ts`
- Modify: `scripts/prepare-bun-consumers.ts`
- Create: `tests/e2e/card.spec.ts`
- Create: `docs/evidence/card-run.json` (focused browser-run result; Task 5 expands it)
- Generated: `apps/preview/src/generated/` (through the documented generator only)

**Interfaces:**
- Consumes compiled Card artifacts from Task 2 and installed Card files from Task 3.
- Produces a shared Card scenario gated by `?cards=1`, with default/dense examples and stable selectors for preview and consumer assertions.

- [ ] Add a fixture helper case proving a consumer scenario can include or omit Card without broken imports.
- [ ] Add default and dense Card examples to the shared fixture; use semantic headings and a body/footer example, with no logo image references.
- [ ] Update `scripts/generate-preview.ts` to emit the compiled Card component/style/usage and its fixture from `fixtures/shared/card-fixture.tsx`.
- [ ] Extend Node and Bun consumer preparation to install Card after the existing components; preserve the current 34 descriptors and package-manager-specific ownership checks.
- [ ] Add Playwright checks over preview and npm/pnpm Vite/Next.js consumers for family, mode, density, DOM/source parity, computed styles, forced-colors behavior, and 320 CSS pixel wrapping.
- [ ] Run `pnpm build:packages`, then `pnpm generate:preview`, then focused fixture and E2E checks for Card.
- [ ] Preserve a machine-readable focused browser result with runner status, case counts, runtime/browser versions, and a hash for the 30 recorded measurements.
- [ ] Commit as `feat(card): add preview and consumer coverage`.

### Task 5: Document Card and record measured evidence

**Files:**
- Create: `docs/components/card.md`
- Create: `docs/evidence/card.md`
- Modify: `docs/evidence/card-run.json`
- Modify: `docs/07-delivery-plan.md`
- Include as project artifacts: `docs/superpowers/specs/2026-10-25-card-design.md` and `docs/superpowers/plans/2026-10-25-card-catalog-extension.md`
- Include unchanged: `assets/Ombelle_UI _ dark_logo.png`, `assets/Ombelle_UI_simple_logo.png`, `assets/Ombelle_UI_white_logo.png`

**Interfaces:**
- Consumes the exact public API, verified CLI behavior, and measured fixture results from Tasks 1–4.
- Produces user documentation and evidence that clearly separates measured foundation behavior from broader alpha requirements.

- [ ] Document composition, native props/refs, density, heading/landmark guidance, three style families, generated files, install command, file ownership, and liquid-glass exclusion.
- [ ] Update the delivery plan to mark Card as the next M2 catalog row and state only verified Card results.
- [ ] Run the complete `pnpm check:foundation` gate after focused checks; record actual runtime/browser versions, outcomes, skips, and limits in `card-run.json` and `card.md`.
- [ ] Verify the three supplied logo files retain their original working-tree bytes and remain outside all generated outputs.
- [ ] Commit the three supplied logos unchanged as `chore(assets): add Ombelle brand logos`.
- [ ] Commit the component docs, measured evidence, approved design, and implementation plan as `docs(card): record Card support and verification evidence`.

## Execution Notes

- Follow `docs/AGENTS.md` project instructions if present; keep generated files generated from their source inputs.
- Use the pinned Node 24.19.0 and pnpm 11.25.0 toolchain.
- Build packages before running tests against `dist` output.
- Run the full foundation gate only after targeted checks pass; it needs registry and browser toolchains and may take significant time.
- Do not commit the draft design or this plan until the user selects an execution approach and authorizes plan execution; include the already supplied logo files unchanged in the eventual feature work.
