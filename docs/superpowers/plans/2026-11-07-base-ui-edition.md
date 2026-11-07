# Base UI Edition Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let shadcn projects using a `base-*` style receive the full Ombelle theme and all 24 components (14 ported to `@base-ui/react`), and let any shadcn project adopt, overwrite, or install beside shadcn's own files.

**Architecture:** The CLI detects an `edition` (`radix` | `base`) from `components.json`, records it in the lock, and passes it to `compile`. The catalog holds a second template set in `templates/base/` that emits the same `data-slot` values plus Radix-compatible `data-state` attributes and `--radix-*` variables, so the existing stylesheets serve both editions unchanged. Unowned existing files become explicit overwrite/beside choices; beside components compile with `ombelle-` prefixed slots.

**Tech Stack:** TypeScript ES modules, React 19.3.1, `@base-ui/react` (exact pin), Tailwind v4, Vitest, Playwright, postcss, pnpm workspace.

**Spec:** `docs/superpowers/specs/2026-11-07-base-ui-edition-design.md`

## Global Constraints

- Node 24.19.0, pnpm 11.25.0; install with `pnpm install --frozen-lockfile --ignore-scripts` (after adding a dependency, update the lockfile with `pnpm install --ignore-scripts`).
- Consumer runtime stays exact `react` / `react-dom` 19.3.1. Range acceptance is out of scope; tests pin the Vite fixtures as `tests/integration/shadcn-theme-merge.test.ts:71-73` already does.
- `@base-ui/react` is pinned exactly in `packages/catalog/src/manifest.ts` `runtimeDependencies`. Use the latest stable version on the registry at Task 3 (1.9.0 when this plan was written).
- `shadcn` stays at 4.22.1. Catalog and compiler release strings stay `0.1.0`.
- Radix output bytes for every existing input must not change. Existing tests that pin hashes or bytes must pass untouched.
- Edit catalog inputs under `packages/catalog/src/templates/`, `styles/`; never `generated.ts`. Run `pnpm build:packages` after package changes.
- `--yes` never resolves an unowned or modified-file conflict. Dependency installs keep lifecycle scripts disabled. Planning stays separate from applying.
- Base templates: start with `'use client'`, import no `@radix-ui/*`, use `render` instead of `asChild`, share no runtime helper across templates.
- Conventional Commits; work on `feat/base-ui-edition`.
- **Scope decision not in the spec:** `add --recipe` and `add <c> --preset` (component presets) compile from the Radix Button. On a `base` project they fail with `UNSUPPORTED_PROJECT`: ``Recipes and component presets aren't available for Base UI yet``. Document this in Task 25.

## Review Focus

1. **Windows path spelling in resolution flags.** `--beside Components\UI\Button.tsx` must match the plan's `components/ui/button.tsx` (separators normalized, case-insensitive on win32). Test in Task 8.
2. **Resolution flags on the wrong file.** `--overwrite`/`--beside` naming a missing path, a non-conflicting path, or an Ombelle-owned file the user modified must be `INVALID_DATA`, never an overwrite. Test in Task 8.
3. **Beside file deleted later.** After `add button --beside`, deleting `components/ui/ombelle/button.tsx` and running `add button` again recreates it beside, and never touches shadcn's `button.tsx`. Test in Task 7.
4. **Edition switch after install.** Changing `components.json` from `base-nova` to `radix-nova` after Ombelle components were added yields an edition conflict on every command, not mixed sources. Test in Task 2.
5. **Custom utils alias.** With `aliases.utils` = `@/lib/cn`, the known shadcn utility is adopted at `lib/cn.ts`, not `lib/utils.ts`. Test in Task 6.

---

## Phase A: Edition machinery and Button

### Task 1: Edition type and detection

**Files:**
- Modify: `packages/contracts/src/types.ts` (add `Edition`; `ProjectContext.edition: Edition`; `ProjectLock.edition?: Edition`)
- Create: `packages/catalog/src/shadcn.ts`
- Modify: `packages/catalog/src/index.ts` (re-export)
- Create: `packages/cli/src/project/edition.ts`
- Test: `packages/cli/test/edition.test.ts`, `packages/catalog/test/shadcn.test.ts`

**Interfaces:**
- Produces: `type Edition = 'radix' | 'base'` (contracts); `shadcnBaseStyles: readonly string[]` and `shadcnRadixStyles = ['radix-nova', 'new-york'] as const` (catalog); `detectEdition(style: string | undefined): Edition | undefined` in `edition.ts`, returning `'radix'` for `undefined` and Radix styles, `'base'` for listed base styles, `undefined` for anything else.

- [ ] **Step 1: Find the base style list in the pinned shadcn.** Search `node_modules/shadcn/dist` for `base-nova` and identify the exported or embedded style registry for 4.22.1. Record every `base-*` id it lists.
- [ ] **Step 2: Write failing tests.**
  - `shadcn.test.ts` `'lists exactly the base styles of the pinned shadcn'`: parse the same source found in Step 1 and `expect([...shadcnBaseStyles].sort()).toEqual(parsed.sort())`; also `expect(shadcnBaseStyles).toContain('base-sera')`.
  - `edition.test.ts`: `detectEdition(undefined)` → `'radix'`; `'radix-nova'`, `'new-york'` → `'radix'`; every entry of `shadcnBaseStyles` → `'base'`; `'base-unknown'`, `'radix-lyra'`, `''` → `undefined`.
- [ ] **Step 3: Run** `pnpm exec vitest run packages/cli/test/edition.test.ts packages/catalog/test/shadcn.test.ts` — expect FAIL (modules missing).
- [ ] **Step 4: Implement** the types, `shadcn.ts` with the Step 1 list, and `detectEdition`.
- [ ] **Step 5: Run** the same command — expect PASS.
- [ ] **Step 6: Commit** `feat(cli): detect the shadcn component edition`.

### Task 2: Edition in inspect, plans, theme and lock

**Files:**
- Modify: `packages/contracts/src/types.ts` (`ProjectContext.upstreamStyleSupported: boolean`)
- Modify: `packages/cli/src/project/inspect.ts` (set `edition`, `upstreamStyleSupported`)
- Modify: `packages/cli/src/plan/components.ts:96-104`, `component-preset.ts:40-48`, `recipe.ts:31-39`, `theme.ts:191-193`; `baseLock` in `components.ts`
- Test: `packages/cli/test/inspect.test.ts`, `packages/cli/test/plan.test.ts`

**Interfaces:**
- Consumes: `detectEdition` (Task 1).
- Produces: `context.edition` always set for supported styles; `context.upstreamStyleSupported: boolean` (false for unknown styles; `theme add` uses it to stay palette-only). `baseLock` writes `edition: context.edition`. Helper `assertEdition(context): void` in `packages/cli/src/project/edition.ts` that throws the errors below; all plan functions call it first.

Errors (exact text):
- Unknown style, component commands: `UNSUPPORTED_PROJECT`, ``Style `<style>` isn't supported; Ombelle supports `radix-nova`, `new-york` and shadcn's `base-*` styles``, path `components.json`.
- Lock edition differs: `FILE_CONFLICT`, ``This project's components.json uses the <detected> edition but installed Ombelle components use <locked>; editions can't be mixed``, path = lock file. A lock without `edition` means `radix`.
- Recipe or component preset on `base`: `UNSUPPORTED_PROJECT`, ``Recipes and component presets aren't available for Base UI yet``.

- [ ] **Step 1: Write failing tests.**
  - inspect: a project whose `components.json` style is `base-sera` yields `edition: 'base'`; `radix-nova` → `'radix'`; no `components.json` → `'radix'`; `radix-lyra` → `upstreamStyleSupported: false`.
  - plan: `planAdd` on `base` succeeds for `badge` (no throw on edition); unknown style throws the exact message; lock `{edition:'base'}` + style `radix-nova` throws the mismatch (Review Focus 4); lock without `edition` + `base-nova` style throws the mismatch with `<locked>` = `radix`; `planTheme` on `base` includes a change for `context.styleFile` (full theme); on `radix-lyra` it does not (palette-only); the written lock contains `edition`.
  - recipe and component-preset planning on `base` throw the exact message.
- [ ] **Step 2: Run** `pnpm exec vitest run packages/cli/test/inspect.test.ts packages/cli/test/plan.test.ts` — expect FAIL.
- [ ] **Step 3: Implement.** Replace the three inline style checks with `assertEdition`; replace `fullStyle` in `theme.ts` with `context.upstreamStyleSupported`.
- [ ] **Step 4: Run** the same tests, then `pnpm test:unit` — expect PASS with no other changes.
- [ ] **Step 5: Commit** `feat(cli): record the component edition and apply full themes to Base UI projects`.

### Task 3: Edition-aware catalog

**Files:**
- Modify: `scripts/sync-catalog.mjs` (read `templates/base/<id>.tsx` for every id where it exists into `catalogData.baseTemplates`)
- Modify: `packages/catalog/src/manifest.ts` (`'@base-ui/react': '<pinned>'`), `packages/catalog/src/index.ts`
- Modify: root and catalog `package.json` dev dependency `@base-ui/react` at the same exact version, `pnpm-lock.yaml`
- Test: `packages/catalog/test/catalog.test.ts`

**Interfaces:**
- Produces: `getTemplate(catalog, id, edition: Edition = 'radix'): ComponentTemplate`; `componentEditions(id: ComponentId): readonly Edition[]` (both editions when the component has no primitive import or a base template exists; otherwise `['radix']`); `Catalog.baseTemplates: Partial<Record<ComponentId, ComponentTemplate>>`. A base template has the same `logicalPath`, `slots` and `styles` as the Radix one; its `dependencies` are the base dependencies plus `extraDependencies` with every `@radix-ui/*` entry replaced by `@base-ui/react` (deduplicated). `getTemplate` for an id with no base template on `base` returns the shared template when the Radix template has no `@radix-ui/` import, else throws `UNSUPPORTED_PROJECT` ``Component `<id>` isn't available for Base UI yet; available: <comma-separated ids>``.

- [ ] **Step 1: Pin the dependency.** Run `npm view @base-ui/react version`, add that exact version to `runtimeDependencies` and as an exact dev dependency for type-checking, then `pnpm install --ignore-scripts`.
- [ ] **Step 2: Write failing tests** in `catalog.test.ts`:
  - `getTemplate(c,'badge','base')` returns the same content as `'radix'`.
  - `getTemplate(c,'button','base')` throws the exact unavailable message until Task 5 (mark this assertion to be flipped in Task 5).
  - For every component, `getTemplate(c,id,'radix')` returns bytes identical to today's (compare to `catalogData.templates[id]`).
  - Dependencies of a base template contain no `@radix-ui/` name.
- [ ] **Step 3: Run** `pnpm build:packages && pnpm exec vitest run packages/catalog/test/catalog.test.ts` — expect FAIL.
- [ ] **Step 4: Implement** the sync-script change and catalog functions.
- [ ] **Step 5: Run** the same command — expect PASS; `git diff packages/catalog/src/generated.ts` shows only an added empty `baseTemplates` object.
- [ ] **Step 6: Commit** `feat(catalog): load Base UI templates per edition`.

### Task 4: Compiler edition input

**Files:**
- Modify: `packages/compiler/src/compile.ts:70-80,157-189`
- Test: `packages/compiler/test/compile-edition.test.ts`

**Interfaces:**
- Consumes: `getTemplate(catalog, id, edition)` (Task 3).
- Produces: `compile({ ..., edition?: Edition })`, default `'radix'`. `CompileResult.provenance.edition` is **not** added (the preset hash and provenance stay edition-free); the CLI owns the edition.

- [ ] **Step 1: Write failing tests:** compiling every stable family with all 24 ids and no `edition` equals compiling with `edition: 'radix'` byte for byte; for every id where `componentEditions(id)` includes `'base'` and the Radix template has no `@radix-ui/` import, compiling with `'base'` equals `'radix'`; compiling every base-supported id twice with `'base'` yields identical artifact hashes (the id list is computed, so later ports are covered automatically); the preset hash is equal across editions.
- [ ] **Step 2: Run** `pnpm exec vitest run packages/compiler/test/compile-edition.test.ts` — expect FAIL.
- [ ] **Step 3: Implement:** thread `edition` to `getTemplate`.
- [ ] **Step 4: Run** it and `pnpm test:unit` — expect PASS.
- [ ] **Step 5: Wire the CLI:** pass `edition: context.edition` at `packages/cli/src/main.ts:217`. Run `pnpm typecheck`.
- [ ] **Step 6: Commit** `feat(compiler): compile components for the project's edition`.

### Task 5: Base Button

**Files:**
- Create: `packages/catalog/src/templates/base/button.tsx`
- Modify: `packages/catalog/test/catalog.test.ts` (flip the Task 3 button assertion)
- Create: `packages/catalog/test/base-templates.test.ts`
- Modify: `docs/components/button.md`

**Interfaces:**
- Consumes: catalog loading (Task 3).
- Produces: `Button`, `buttonVariants`, `ButtonProps` with the same names as the Radix template. `ButtonProps` = `React.ComponentProps<typeof BaseButton>` (from `@base-ui/react/button`) & variants & `{ loading?: boolean }`; no `asChild`. Keep the literal text `variant = 'default'` and `size = 'default'` in the signature: `compile.ts:160-168` replaces them with preset defaults.

- [ ] **Step 1: Write failing tests** in `base-templates.test.ts`, parameterized over every file in `templates/base/` (so later ports are covered automatically):
  - starts with `'use client'`;
  - contains no `@radix-ui/` and no `asChild`;
  - every slot in `template.slots` for that id appears as `data-slot="<slot>"` or `data-slot='<slot>'` (same set as the Radix template);
  - imports from `@base-ui/react/` only subpaths that exist in the pinned package (`require.resolve`).
  - Button only: rendering `<Button loading>Save</Button>` with `react-dom/server` gives `aria-busy="true"`, `disabled`, `data-slot="button"`, `data-variant="default"`.
- [ ] **Step 2: Run** `pnpm build:packages && pnpm exec vitest run packages/catalog/test/base-templates.test.ts` — expect FAIL.
- [ ] **Step 3: Write the template** from `templates/button.tsx`, replacing `Slot`/`asChild` with Base UI Button and its `render` prop; keep `data-slot` after the spread as the Radix template does.
- [ ] **Step 4: Run** tests — expect PASS; `pnpm typecheck` passes.
- [ ] **Step 5: Docs:** add a "Base UI edition" section to `docs/components/button.md` (Base UI part, `render` instead of `asChild`, dependency `@base-ui/react` version).
- [ ] **Step 6: Commit** `feat(catalog): add the Base UI Button`.

### Task 6: Adopt the known shadcn utility

**Files:**
- Modify: `packages/catalog/src/shadcn.ts` (`knownShadcnUtilityHashes: readonly string[]`)
- Modify: `packages/cli/src/plan/components.ts:148-190`
- Test: `packages/cli/test/shadcn-files.test.ts`

**Interfaces:**
- Produces: in `planAdd`, a utility artifact whose existing file has no lock record and whose `beforeHash` is in `knownShadcnUtilityHashes` keeps action `update` (not `conflict`) and adds `plan.notices` entry ``adopt <utilsFile> (generated by shadcn)``.

- [ ] **Step 1: Record the hash.** Compute sha256 of `fixtures/shadcn/next/lib/utils.ts` and `fixtures/shadcn/vite/src/lib/utils.ts` with the same `sha256` helper `fileChange` uses; add the distinct values.
- [ ] **Step 2: Write failing tests:** with the shadcn utility at `lib/utils.ts`, `planAdd` for `badge` has no conflicts and the notice; one changed byte → conflict as today; custom alias `@/lib/cn` with the shadcn content at `lib/cn.ts` → adopted at `lib/cn.ts` (Review Focus 5); `components/ui/button.tsx` with any content is never adopted.
- [ ] **Step 3: Run** `pnpm exec vitest run packages/cli/test/shadcn-files.test.ts` — expect FAIL.
- [ ] **Step 4: Implement.**
- [ ] **Step 5: Run** — expect PASS. Update `tests/integration/shadcn-theme-merge.test.ts:147-163`: the `add input` dry run now has no conflicts and exits 0; remove the manual deletion step.
- [ ] **Step 6: Commit** `feat(cli): adopt shadcn's generated utility file`.

### Task 7: Overwrite and beside resolutions in planning

**Files:**
- Create: `packages/compiler/src/prefix-slots.ts`; export from `packages/compiler/src/index.ts`
- Modify: `packages/compiler/src/compile.ts` (input `prefixedComponents?: readonly ComponentId[]`)
- Modify: `packages/contracts/src/types.ts` (`ProjectLock.placements?: Partial<Record<ComponentId, 'beside'>>`)
- Modify: `packages/cli/src/plan/components.ts`, `packages/cli/src/plan/theme.ts`, `packages/cli/src/project/transform.ts`
- Test: `packages/compiler/test/prefix-slots.test.ts`, `packages/cli/test/resolutions.test.ts`

**Interfaces:**
- Produces:
  - `prefixSlots(source: string, kind: 'tsx' | 'css', slots: readonly string[], prefix = 'ombelle-'): string` — in TSX rewrites `data-slot` string literals for listed slots; in CSS rewrites `[data-slot='x']` / `[data-slot="x"]` selectors (postcss selector walk).
  - `compile` with `prefixedComponents`: those components' TSX and CSS pass through `prefixSlots`; in `styles/ui-style.css`, every rule whose selector references one of their slots is duplicated with the prefixed selector appended after the original (original kept for unprefixed components).
  - `type Resolution = 'overwrite' | 'beside'`; `planAdd(context, result, resolutions: Record<string, Resolution> = {})`, keys are normalized plan paths. Callers compile with `prefixedComponents` = components resolved `beside` plus `Object.keys(lock.placements)`.
  - `transformArtifact(context, artifact, placement?: 'beside')` maps beside component and component CSS to `<componentsDir>/ombelle/<file>` and rewrites the usage example import to `<uiAlias>/ombelle/<id>`.
  - Unowned conflicts get diagnostic message ``<path> exists and is not managed by Ombelle; rerun with --overwrite <path> or --beside <path>`` and a machine field `resolutions: ['overwrite','beside']` on the diagnostic.
  - `overwrite` turns that change into `update`; `beside` replaces the change with one at the beside path and sets `lock.placements[id] = 'beside'`.

- [ ] **Step 1: Write failing tests.**
  - `prefix-slots.test.ts`: TSX `data-slot="button"` → `data-slot="ombelle-button"`, unlisted slots unchanged; CSS `[data-slot='button']:hover` → `[data-slot='ombelle-button']:hover`; a selector list mixing slots rewrites only listed ones; output deterministic.
  - `compile`: with `prefixedComponents: ['button']`, `components/ui/button.tsx` has no `data-slot="button"`, and `ui-style.css` contains both the original and prefixed rule for each rule mentioning `button`; without the option, bytes equal today's.
  - `resolutions.test.ts` on a shadcn Radix project copy and a base project copy: `add button` without resolution → conflict with the new message; with `{ 'components/ui/button.tsx': 'overwrite' }` → `update`, lock records the path; with `'beside'` → create `components/ui/ombelle/button.tsx` and `button.css`, shadcn file untouched, `lock.placements.button === 'beside'`; a later `planAdd` for `button` with that lock and no resolutions targets the beside path; after deleting the beside file it is recreated there (Review Focus 3); `planTheme` with that lock refreshes the beside stylesheet path.
- [ ] **Step 2: Run** `pnpm exec vitest run packages/compiler/test/prefix-slots.test.ts packages/cli/test/resolutions.test.ts` — expect FAIL.
- [ ] **Step 3: Implement** compiler, transform, planning and lock changes.
- [ ] **Step 4: Run** them, then `pnpm test:unit` — expect PASS.
- [ ] **Step 5: Commit** `feat(cli): resolve unowned files by overwriting or installing beside`.

### Task 8: Resolution flags and interactive choice

**Files:**
- Modify: `packages/cli/src/main.ts:79-95` (flags), `:217-290` (prompt and re-plan); `packages/cli/src/format.ts` (help text)
- Test: `tests/integration/resolutions-cli.test.ts`

**Interfaces:**
- Consumes: `planAdd(context, result, resolutions)` (Task 7).
- Produces: repeatable `--overwrite <path>` and `--beside <path>` on `add`. Paths resolve against `--cwd`/cwd, are normalized to plan paths with `/` separators, and compared case-insensitively on win32. A flag whose path is not an unowned conflict in the unresolved plan (missing, non-conflicting, Ombelle-owned, or Ombelle-owned and modified) → `INVALID_DATA` ``--<flag> <path> doesn't match a file Ombelle can resolve; only existing files Ombelle doesn't manage can be overwritten or kept beside``. The same path in both flags → `INVALID_DATA`.
- Interactive: when stdin is a TTY, `--yes` is absent and the plan has unowned conflicts, ask per path ``<path> exists and is not managed by Ombelle: [o]verwrite, [b]eside, [c]ancel `` (stderr), re-plan with the answers, print the new plan, then the existing `Apply these changes? [y/N]`. `c` or anything else cancels with status `cancelled`, exit 0.

- [ ] **Step 1: Write failing tests** (built CLI via `runBuiltCli`):
  - `add button --yes` on a shadcn copy → exit 4, output names both flags, tree unchanged;
  - `add button --overwrite components/ui/button.tsx --yes` → exit 0, file replaced;
  - `add button --beside Components\UI\Button.tsx --yes` on win32 / `components/ui/button.tsx` elsewhere → exit 0, beside files created (Review Focus 1);
  - `--overwrite components/ui/missing.tsx` → `INVALID_DATA`; `--overwrite` on an Ombelle-owned file that the user edited → `INVALID_DATA` and the file unchanged (Review Focus 2);
  - `--dry-run --json` with `--beside` shows the beside creates and exits 0;
  - interactive: spawn with a pseudo-TTY helper if one exists in `tests/helpers`; otherwise unit-test the prompt function by injecting `question`.
- [ ] **Step 2: Run** `pnpm build:packages && pnpm exec vitest run --config vitest.integration.config.ts tests/integration/resolutions-cli.test.ts` — expect FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run** — expect PASS; `pnpm test:integration` passes.
- [ ] **Step 5: Commit** `feat(cli): choose overwrite or beside from flags or a prompt`.

### Task 9: Base shadcn fixtures and theme-merge coverage

**Files:**
- Create: `fixtures/shadcn/vite-base/`, `fixtures/shadcn/next-base/`
- Modify: `fixtures/shadcn/README.md`, `.gitattributes` (if it lists fixture paths), `tests/helpers/shadcn-project.ts`, `tests/integration/shadcn-theme-merge.test.ts`

**Interfaces:**
- Produces: `shadcnFixtures['vite-base' | 'next-base']` with their CSS entry and source dir.

- [ ] **Step 1: Generate fixtures** outside the repository:
  ```bash
  pnpm exec shadcn init -t vite -b base -p nova -n shadcn-vite-base --no-monorepo -y -c <dir>
  ```
  ```bash
  pnpm exec shadcn init -t next -b base -p nova -n shadcn-next-base --no-monorepo -y -c <dir>
  ```
  Copy without `node_modules/` and `.git/`. Confirm `components.json` style is a `base-*` id from `shadcnBaseStyles`. Document commands, date, environment and template commit in the README as for the Radix fixtures.
- [ ] **Step 2: Extend the test** (parameterize over all four fixtures where behaviour is shared):
  - base: `theme add --yes` writes `styleFile` (full theme);
  - all: `add badge --yes` adopts the utility and exits 0;
  - all: `add button --yes` exits 4; `--overwrite` succeeds on one copy, `--beside` on another; then `theme add --yes` keeps the beside path and leaves shadcn's `button.tsx` bytes unchanged;
  - existing Radix byte expectations unchanged.
- [ ] **Step 3: Run** `pnpm build:packages && pnpm exec vitest run --config vitest.integration.config.ts tests/integration/shadcn-theme-merge.test.ts` — expect PASS (the behaviour exists from Tasks 1-8; any failure is a bug to fix in the owning task's code).
- [ ] **Step 4: Commit** `test(cli): cover Base UI shadcn projects and file resolutions`.

### Task 10: Edition parity harness

**Files:**
- Modify: `scripts/generate-preview.ts` (also write `apps/preview/src/generated/<family>-base/` for stable families with `edition: 'base'`)
- Create: `fixtures/shared/scenario-base.tsx` (copy of `scenario.tsx` with `asChild` replaced by `render`)
- Modify: `apps/preview/src/main.tsx` (route `/<family>-base/`)
- Create: `tests/e2e/edition-parity.spec.ts`, `tests/helpers/edition-parity.ts`

**Interfaces:**
- Produces: `portedComponents: readonly { id: ComponentId; states: readonly ParityState[] }[]` in `tests/helpers/edition-parity.ts`, where `ParityState = { name: string; act?: (page: Page, root: Locator) => Promise<void> }`. `compareSlotStyles(page, radixUrl, baseUrl, id, state): Promise<string[]>` returns differing `slot:property` pairs over every `[data-slot]` element within the component's scenario section, comparing `getComputedStyle` for a fixed property list (color, background-color, border-*-width/color/style, border-radius, box-shadow, padding, height, width, font-*, opacity, transform, outline-*). Allowed differences live in a per-component `allowedDifferences` map with a reason string; the spec fails on anything else.

- [ ] **Step 1: Write the spec** with `portedComponents = [{ id: 'button', states: [default, hover, focus-visible, disabled, loading] }]`; for each stable family × light/dark × component × state, expect `compareSlotStyles(...)` to equal `[]`. Also run axe on the base page, and parameterize `tests/e2e/keyboard.spec.ts` over the Radix and `-base` routes so every keyboard check runs on both editions for components in `portedComponents`.
- [ ] **Step 2: Implement** generation, scenario and route.
- [ ] **Step 3: Run** `pnpm build:packages && pnpm generate:preview && pnpm exec playwright test tests/e2e/edition-parity.spec.ts` — expect PASS for Button.
- [ ] **Step 4: Commit** `test(preview): compare Radix and Base UI components in the browser`.

## Phase B: Ports

**Port procedure (applies to Tasks 11-23).** For component `<id>`:

1. Read `packages/catalog/src/templates/<id>.tsx` and every selector in `packages/catalog/src/styles/<id>/*.css` and the family CSS that targets its slots. List each `data-state` value, `data-placeholder`, and `--radix-*` variable used.
2. Create `packages/catalog/src/templates/base/<id>.tsx` on the Base UI parts named in the task. Same exports, part names, props and `data-slot` values. For each listed state, emit the Radix attribute from Base UI state using the part's `render` prop or state-aware `className`/`style` (no shared helper). Map listed `--radix-*` variables in `style` from the Base UI variables given in the spec's variable bridge. Where Base UI adds a part Radix lacks (Portal, Positioner, Backdrop), put the `data-slot` on the element that corresponds to the Radix element the CSS targets.
3. Add the component and its states to `portedComponents` (Task 10) and to `fixtures/shared/scenario-base.tsx`.
4. Run `pnpm build:packages && pnpm exec vitest run packages/catalog/test/base-templates.test.ts && pnpm generate:preview && pnpm exec playwright test tests/e2e/edition-parity.spec.ts -g <id>`; fix the template until both pass. Add an `allowedDifferences` entry only with a reason that the spec permits (documented in the component doc).
5. Add a "Base UI edition" section to `docs/components/<id>.md`: Base UI parts, `render` instead of `asChild`, the per-part state bridge actually emitted, dependency versions, allowed differences.
6. Commit `feat(catalog): add the Base UI <Component>`.

| Task | Component | Base UI parts | Parity states | Bridges |
| --- | --- | --- | --- | --- |
| 11 | separator | Separator | horizontal, vertical, with label | `data-orientation` (native) |
| 12 | progress | Progress Root, Track, Indicator | value 64, complete, indeterminate | `data-state` complete/loading/indeterminate |
| 13 | avatar | Avatar Root, Image, Fallback | image loaded, fallback | none expected; verify |
| 14 | switch | Switch Root, Thumb | unchecked, checked, disabled, focus-visible | `data-state` checked/unchecked |
| 15 | checkbox | Checkbox Root, Indicator | unchecked, checked, indeterminate, disabled, invalid | `data-state` incl. indeterminate |
| 16 | radio-group | Radio Group, Radio Root, Indicator | selected, unselected, disabled, focus-visible | `data-state` checked/unchecked |
| 17 | tabs | Tabs Root, List, Tab, Panel, Indicator if used | active, inactive, disabled, both orientations | `data-state` active/inactive, `data-orientation` |
| 18 | accordion | Accordion Root, Item, Header, Trigger, Panel | closed, open, disabled | `data-state` open/closed; `--radix-accordion-content-height` ← `--accordion-panel-height` |
| 19 | tooltip | Tooltip Provider, Root, Trigger, Portal, Positioner, Popup, Arrow | open | `data-state` open/closed; `--radix-tooltip-content-available-width` ← `--available-width` |
| 20 | popover | Popover Root, Trigger, Portal, Positioner, Popup, Title, Description | open | `data-state`; available height/width variables |
| 21 | dialog | Dialog Root, Trigger, Portal, Backdrop, Popup, Title, Description, Close | open | `data-state` open/closed on overlay and content |
| 22 | dropdown-menu | Menu Root, Trigger, Portal, Positioner, Popup, Group, GroupLabel, Item, CheckboxItem, RadioGroup, RadioItem, indicators, Separator, SubmenuRoot, SubmenuTrigger | open, highlighted item, checked items, destructive item, submenu open | `data-state` open/closed and checked/unchecked; `data-highlighted` (native); `--radix-dropdown-menu-content-available-height` |
| 23 | select | Select Root, Trigger, Value, Icon, Portal, Positioner, Popup, ScrollUp/DownArrow, List, Group, GroupLabel, Item, ItemText, ItemIndicator, Separator | closed with placeholder, closed with value, open, highlighted, selected, disabled item | `data-state` open/closed and item checked/unchecked; `data-placeholder`; `--radix-select-trigger-width` ← `--anchor-width`; available height |

## Phase C: Evidence, docs, release

### Task 24: Base consumers in the foundation matrix

**Files:**
- Modify: `scripts/consumer-matrix.ts` (append rows last so existing IDs and ports keep their values), `scripts/prepare-consumers.ts` (or the preparer it dispatches to), `scripts/consumer-evidence.ts`
- Create: `tests/e2e/base-consumers.spec.ts`
- Test: `tests/integration/consumer-inputs.test.ts`

**Interfaces:**
- Produces: `ConsumerCase.edition?: Edition`; rows `npm-vite-base` and `npm-next-base` (family `flat`, manager `npm`, `cliRuntime: 'node'`, `edition: 'base'`) prepared from `fixtures/shadcn/{vite,next}-base`, with React pinned to 19.3.1, then `theme add` the flat preset, `add` all 24 components with `--beside components/ui/button.tsx`, built and served like other npm rows.

- [ ] **Step 1: Write failing tests:** `consumerCases()` ends with the two base rows and every previous row keeps its id and port; `base-consumers.spec.ts` loads each consumer, finds one element per slot of all 24 components, and asserts that shadcn's Button (`[data-slot='button']`) computed `border-width` and `box-shadow` equal those of a reference shadcn Button rendered from an untouched fixture copy, while `[data-slot='ombelle-button']` matches the preview's Button.
- [ ] **Step 2: Implement** matrix, preparation and evidence rows (browser-tested, separate from build-only rows).
- [ ] **Step 3: Run** `pnpm exec vitest run --config vitest.integration.config.ts tests/integration/consumer-inputs.test.ts`, then the documented `pnpm check:foundation` in an environment with registry and browser access — expect PASS. Record the environment in the evidence output.
- [ ] **Step 4: Commit** `test(consumers): verify Base UI consumers in the browser`.

### Task 25: Documentation, decision record and release

**Files:**
- Create: `docs/decisions/0005-base-ui-edition.md`
- Modify: `docs/decisions/0002-registry-adapter.md` (pointer to 0005), `docs/05-cli-specification.md`, `docs/foundation-local-usage.md:19,27,85`, `docs/10-installation-and-theme-merging.md:48`
- Modify: CLI version via `node scripts/set-version.mjs 0.7.0` (check its usage first)

- [ ] **Step 1: Write the decision record:** context (Base UI shadcn presets blocked), decision (per-edition templates with Radix-compatible state bridge; adopt/overwrite/beside), alternatives rejected, consequences (13 duplicated component sources; bridge must follow CSS changes; recipes and component presets remain Radix-only).
- [ ] **Step 2: Update docs:** supported styles, edition detection and lock field, `--overwrite`/`--beside`, the prompt, known shadcn utility adoption, the recipe/component-preset limitation, measured Base consumer evidence.
- [ ] **Step 3: Set the version** to 0.7.0 and run `pnpm build:packages && pnpm typecheck && pnpm test:unit && pnpm test:integration` — expect PASS.
- [ ] **Step 4: Commit** `docs: document the Base UI edition` and `chore(cli): release 0.7.0` separately.
