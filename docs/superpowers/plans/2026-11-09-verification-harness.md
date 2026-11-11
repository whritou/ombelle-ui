# Verification Harness Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make silent styling and accessibility regressions in catalog components fail a check: a catalog style lint in the build, a recipe shadowing lint in unit tests, and a measured browser audit of every specimen in the foundation gate.

**Architecture:** Static checks run in `pnpm build:packages` (style lint) and `pnpm test:unit` (shadowing lint). `pnpm generate:preview` writes audit data that a new `/audit/<family>/<edition>/` preview page renders; a dedicated Playwright config runs pure measurement helpers over it, writes screenshots and `.artifacts/specimen-audit.json`, and the foundation `consumers` group validates that evidence.

**Tech Stack:** Node 24.19.0, pnpm 11.25.0, TypeScript ES modules, PostCSS 8.5.31 with postcss-selector-parser 7.1.6, @babel/parser 7.29.9, Vite preview app, Playwright 1.64.1 with @axe-core/playwright 4.14.0, Vitest.

**Spec:** `docs/superpowers/specs/2026-11-09-verification-harness-design.md`

## Global Constraints

- Node 24.19.0 and pnpm 11.25.0; run commands as `corepack pnpm …` when pnpm is not on PATH.
- Conventional Commits, no `codex` prefix. Branch: `test/specimen-audit-harness` (already created from `main` at 29c325d).
- Edit `schemas/` and catalog sources, never `packages/contracts/src/` generated copies or `packages/catalog/src/generated.ts`. Run `pnpm build:packages` after package source changes.
- Compiler output stays deterministic; the compiler gains no new runtime error.
- New root dev dependencies are pinned exactly: `postcss` 8.5.31, `postcss-selector-parser` 7.1.6, `@babel/parser` 7.29.9. Install with `pnpm install --ignore-scripts`.
- Checks fail only on measured defects; screenshots are evidence, never compared. No committed pixel baselines.
- Matrix: families flat, minimalist, neo-brutalism, ombelle, liquid-glass × editions radix, base × modes light, dark = 20 configurations, 29 specimens each. Forced-colors pass runs in light mode only.
- Radix pages: 28 recipe components (default `createCatalogDraft` draft, preset ref = family built-in, `builtin-liquid-glass` for glass) plus Button from the ordinary Radix edition. Base pages: 29 ordinary Base UI components with the same specimen content.
- Glass backdrop: `glassPresetBackdrop('builtin-liquid-glass', mode)`.
- No editor stage CSS and no `recipe-preview-trigger` class on audit pages.
- No release, deployment or push.

## Review Focus

- **Bare overlay triggers in installed recipes.** Dialog, Sheet, Popover, Tooltip, Dropdown Menu and Alert Dialog recipe triggers carry no catalog style, so they will fail target size or focus-visible on audit pages. Expected: Task 7 fixes this in catalog CSS. The checks are never weakened, and the editor class is never added to audit pages. Task 4's target-size self-test pins a bare 16px `<button>` as a finding.
- **Portalled overlay content.** Popover, Tooltip, Select, Dropdown Menu, Dialog, Sheet, Alert Dialog and Toast render outside the section. Expected: they are still measured. Task 5 asserts that each opened overlay's measured element count is greater than zero.
- **Toast auto-dismiss during measurement.** The toast could close before its checks finish. Expected: it stays open until Escape. Task 5 installs `page.clock` before opening the Toast and never advances it.
- **Glass focus rings on the backdrop.** Glass rings could be invisible on the scene. Expected: focus-visible measures pixels against the real backdrop, not computed styles. Task 4's self-test includes a ring whose colour equals the background (finding) next to a 3:1 ring (clean).
- **Partial or stale evidence.** An interrupted run could leave stale evidence. Expected: the gate rejects it. Task 6 tests that a file with 19 configurations, 28 specimens in one configuration, or `failures: 1` fails validation.

---

### Task 1: Catalog style lint in the build

**Files:**
- Create: `packages/catalog/src/component-slots.ts` (move the `componentSlots` map out of `packages/catalog/src/index.ts:99`, unchanged, as `export const componentSlots`)
- Modify: `packages/catalog/src/index.ts` (import `componentSlots` from `./component-slots.js`)
- Create: `scripts/catalog-style-lint.ts`
- Modify: `scripts/sync-catalog.mjs` (call the lint before writing `generated.ts`)
- Modify: `package.json` (root devDependencies `postcss` 8.5.31, `postcss-selector-parser` 7.1.6), `pnpm-lock.yaml`
- Test: `packages/catalog/test/catalog-style-lint.test.ts`

**Interfaces:**
- Produces: `templateSlots(id: string, sources: readonly string[], declared?: readonly string[]): string[]`, which returns `declared ?? [id]` together with every `data-slot="x"` / `data-slot='x'` literal (regex `/data-slot=(["'])([a-z][a-z0-9-]*)\1/g`, as in `recipeTemplateSlots`), deduplicated.
- Produces: `lintCatalogStyles(input: { componentStyles: Record<string, Record<string, string>>; familyStyles: Record<string, string>; slots: Record<string, readonly string[]> }): string[]`, which returns one message per violating selector, sorted. An empty array means the catalog is clean.
- Message format: `` `${component}/${family}.css: "${selector}" names no ${component} slot or marker` ``, `` `${component}/${family}.css: "${selector}" names unknown slot "${slot}"` ``, `` `${family}.css: "${selector}" names no catalog slot` ``.

- [ ] **Step 1: Write failing tests** in `catalog-style-lint.test.ts`:
  - `lintCatalogStyles` on `{ componentStyles: { accordion: { ombelle: "[data-icon='plus']{display:none}" } }, familyStyles: {}, slots: { accordion: ['accordion'] } }` returns exactly `['accordion/ombelle.css: "[data-icon=\'plus\']" names no accordion slot or marker']`.
  - `[data-slot="acordion"]{}` → one `names unknown slot "acordion"` message.
  - `[data-accordion-icon="plus"]{}` and `[data-slot="accordion"] svg{}` → `[]`.
  - A `@keyframes spin { from {} to {} }` rule → `[]`.
  - A family sheet containing `body{}` → `['flat.css: "body" names no catalog slot']`.
  - Parity: for every id in `getCatalog('0.1.0').templates`, the union of `templateSlots(id, [radixContent, baseContent?], componentSlots[id])` equals the union of `recipeTemplateSlots(getTemplate(catalog, id, edition))` over both editions (import from `@ombelle/compiler`).
  - Real catalog: `lintCatalogStyles` over the real catalog sources (read like `sync-catalog.mjs` does) returns `[]`.
- [ ] **Step 2: Run** `pnpm exec vitest run packages/catalog/test/catalog-style-lint.test.ts`. Expected: FAIL, because the module `scripts/catalog-style-lint.ts` is not found.
- [ ] **Step 3: Move `componentSlots`** and add the dev dependencies (`pnpm add -Dw --ignore-scripts postcss@8.5.31 postcss-selector-parser@7.1.6`).
- [ ] **Step 4: Implement `scripts/catalog-style-lint.ts`.**
  - Walk rules with PostCSS, skipping any rule whose parent at-rule name ends with `keyframes`.
  - Split each rule into selectors with postcss-selector-parser.
  - Classify each selector:
    - **Component sheet:** a `data-slot` attribute whose value is not in the component's slots → unknown slot. No `data-slot` and no attribute starting with `data-<component>-` → "no slot or marker".
    - **Family sheet:** no `data-slot` naming a slot of any component → "no catalog slot".
- [ ] **Step 5: Wire the lint into `sync-catalog.mjs`.**
  - Build `slots` per supported id with `templateSlots(id, [templates[id], baseTemplates[id]].filter(Boolean), componentSlots[id])`.
  - `familyStyles` = `styles` plus `'liquid-glass-lab': glassLabStyle`.
  - When messages are returned, `throw new Error('Catalog style lint failed:\n' + messages.join('\n'))` before `writeFileAtomicSync`.
- [ ] **Step 6: Run** the test file, then `pnpm build:packages`. Expected: tests PASS, the build succeeds, and `git diff packages/catalog/src/generated.ts` is empty.
- [ ] **Step 7: Prove the build gate fails.** Temporarily add `[data-icon='x']{}` to `packages/catalog/src/styles/accordion/ombelle.css` and run `node scripts/sync-catalog.mjs`. Expected: a non-zero exit, with the accordion message printed. Then revert the CSS.
- [ ] **Step 8: Commit** with `git commit -m "build(catalog): fail the build on style rules with no slot or marker"`.

### Task 2: Recipe shadowing lint

**Files:**
- Create: `packages/compiler/test/recipe-shadowing.ts` (helper)
- Test: `packages/compiler/test/recipe-shadowing.test.ts`
- Modify: `package.json`, `pnpm-lock.yaml` (root devDependency `@babel/parser` 7.29.9)

**Interfaces:**
- Consumes: `compileComponentRecipe` from `../src/index.js`, and `componentRecipeComponents`, `componentRecipeFields`, `defaultRecipeFields`, `validateComponentRecipe` from `@ombelle/contracts`. Build each preset ref from `getCatalog('0.1.0').presets[family]`, or `startingPresets['builtin-liquid-glass']` for glass, picking `{ id, revision, catalogRelease, compilerVersion }`.
- Produces: `findShadowedNames(source: string): { name: string; line: number; reason: 'factory' | 'wrapper' }[]`.
  - `factory`: any binding declared inside `createScopedPrimitives`'s body or nested functions (parameter patterns including destructured and defaulted, variable declarators, function and class declarations) whose name equals one of that factory's parameter names or its top-level `const` names.
  - `wrapper`: any binding declared outside `createScopedPrimitives`, other than the wrapper's own top-level declarations, named `scope`, `instance` or `instanceId`.

- [ ] **Step 1: Write the failing tests.**
  - `findShadowedNames` on `"export function createScopedPrimitives(recipeScope: string, recipeInstance?: string) { function TableHead({ recipeScope = 'col' }) { return null } return { TableHead } }"` equals `[{ name: 'recipeScope', line: 1, reason: 'factory' }]`.
  - A clean twin, with the prop renamed `scope`, equals `[]`.
  - A wrapper case: `"const scope = 'a'\nexport function X() { const scope = 1; return null }"` gives a `wrapper` finding on line 2.
  - A `test.each` over the 28 `componentRecipeComponents` × 5 families. Compile the default recipe (`schemaVersion '2.0'`, id `audit_<component with - as _>`, revision 1, props `{}`, content `defaultRecipeFields(componentRecipeFields(c).content)`). Assert that `findShadowedNames` of the artifact whose `logicalPath` ends with `/${component}.tsx` is `[]`, using the message `` `${family}/${component}` ``.
- [ ] **Step 2: Run** `pnpm exec vitest run packages/compiler/test/recipe-shadowing.test.ts`. Expected: FAIL, because the helper is missing.
- [ ] **Step 3: Add `@babel/parser@7.29.9`** with `pnpm add -Dw --ignore-scripts @babel/parser@7.29.9`.
- [ ] **Step 4: Implement `findShadowedNames`.**
  - Parse with `parse(source, { sourceType: 'module', plugins: ['typescript', 'jsx'] })`.
  - Walk with a recursive visitor over node keys. No `@babel/traverse`.
  - Collect binding identifiers from patterns: Identifier, ObjectPattern properties' values, ArrayPattern elements, AssignmentPattern left, RestElement argument, and TSParameterProperty.
- [ ] **Step 5: Run** the test. Expected: PASS for all 140 compiled cases and the 3 helper cases.
- [ ] **Step 6: Prove the lint catches the original bug.** Temporarily rename `recipeScope` back to `scope` in `scopeRecipeTemplate` (`packages/compiler/src/component-recipe-source.ts`), then re-run. Expected: `flat/table` (and others) FAIL with a `factory` finding. Revert the rename.
- [ ] **Step 7: Commit** with `git commit -m "test(compiler): fail when recipe primitives shadow the factory's names"`.

### Task 3: Audit page

**Files:**
- Create: `scripts/generate-audit.ts`, which exports `writeAuditPages(root: string): Promise<void>`, called from `scripts/generate-preview.ts` after `writeEdition` loops and `writeFamily('liquid-glass')`.
- Create: `apps/preview/src/render-specimen.ts`. Move `renderSpecimen` out of `catalog-recipe-preview.tsx` and add an `options?: { triggerClass?(tag: string): string | undefined }` parameter. The component editor passes its current trigger classes, so its behaviour is unchanged.
- Modify: `apps/preview/src/catalog-recipe-preview.tsx` (import `renderSpecimen`)
- Create: `apps/preview/src/audit-page.tsx`, which exports `mountAuditPage(root: HTMLElement, family: string, edition: 'radix' | 'base'): Promise<void>`.
- Modify: `apps/preview/src/main.tsx` (route `/^\/audit\/[^/]+\/(?:radix|base)\/?$/`)
- Test: `tests/integration/audit-page-generation.test.ts`

**Interfaces:**
- Produces generated files:
  - `apps/preview/src/generated/audit/<family>-radix.json`, an `AuditData`.
  - `apps/preview/src/generated/audit/<family>-base.json`, an `AuditData` whose `recipes` entries have `scope: null`, `css: null`.
  - `apps/preview/src/generated/audit/index.ts`, which exports `auditData: Record<string, () => Promise<{ default: AuditData }>>` keyed `<family>-<edition>`.
- `type AuditData = { family: StyleFamily; edition: 'radix' | 'base'; backdrop: { light: PresetBackdrop | null; dark: PresetBackdrop | null }; specimens: { component: ComponentId; scope: string | null; css: string | null; specimen: RecipeSpecimen }[] }`. It is sorted by component id, and Button's specimen is `{ tag: 'Button', props: {}, children: ['Save changes'] }` with `scope: null`.
- Page DOM contract, used by Tasks 5 and 7:
  - `main[data-audit-page][data-ready="true"]` once fonts are ready and every specimen has rendered.
  - One `section[data-audit="<component>"]` per specimen, each with an `h2` holding the component id, at `inline-size: min(100%, 40rem)`.
  - `document.documentElement.classList` has `dark` in dark mode.
- Styling:
  - Radix pages import `../generated/editions/<family>-radix/preview.css` and inject each recipe `css` in a `<style>`.
  - They render with `createScopedPrimitives(scope, instance)` from `generated/catalog-recipes`, plus `<LiquidGlassFilter>` for glass.
  - Button comes from the generated Radix edition module.
  - Base pages import `../generated/editions/<family>-base/preview.css` and render with the modules in `generated/editions/<family>-base/components/ui/`.

- [ ] **Step 1: Write `tests/integration/audit-page-generation.test.ts`.**
  - Run `writeAuditPages` into a temp directory.
  - Assert 10 JSON files plus `index.ts`.
  - Each file has 29 specimens with unique components.
  - Radix files have a `css` string for each of the 28 non-Button specimens, containing `` `[data-ombelle-recipe="${scope}"]` ``.
  - The glass radix file's backdrop equals `glassPresetBackdrop('builtin-liquid-glass', 'light' | 'dark')`.
  - Two runs produce byte-identical output.
- [ ] **Step 2: Run** `pnpm exec vitest run --config vitest.integration.config.ts tests/integration/audit-page-generation.test.ts`. Expected: FAIL, because the module is missing.
- [ ] **Step 3: Implement `writeAuditPages`.**
  - Compile each recipe via `compileComponentRecipe`.
  - `css` is the artifact whose `logicalPath` ends with `/<component>.css`.
  - `specimen` is `describeComponentRecipe(recipe)`.
  - Write with `JSON.stringify(data, null, 2) + '\n'`.
- [ ] **Step 4: Implement `render-specimen.ts`, `audit-page.tsx` and the route.**
  - Read the mode from `?mode=` (default `light`).
  - Set the glass backdrop with `setGlassBackdrop(document.documentElement, backdrop[mode] ?? undefined)` and `<GlassBackdropArt>`.
- [ ] **Step 5: Run** the integration test, `pnpm generate:preview` and `pnpm typecheck`. Expected: all PASS.
- [ ] **Step 6: Smoke-check two pages.** With `pnpm dev:preview` running, open `/audit/ombelle/radix/?mode=light` and `/audit/liquid-glass/base/?mode=dark` in the browser pane. Expected: 29 headed sections, `data-ready="true"`, no console errors.
- [ ] **Step 7: Check the editor is unchanged.** Run `pnpm exec vitest run apps/www/src` and `pnpm test:integration -- tests/integration/hosted-preview-build.test.ts`. Expected: PASS.
- [ ] **Step 8: Commit** with `git commit -m "feat(preview): add generated specimen audit pages"`.

### Task 4: Measurement helpers and their self-tests

**Files:**
- Create: `tests/helpers/specimen-audit.ts`
- Create: `tests/e2e/specimen-audit-checks.spec.ts`
- Create: `playwright.specimen-audit.config.ts`. Copy `playwright.catalog-expansion.config.ts` and change these settings:
  - `testMatch: ['specimen-audit-checks.spec.ts', 'specimen-audit.spec.ts']`
  - `use.deviceScaleFactor: 1`
  - `use.channel: process.env.OMBELLE_BROWSER_CHANNEL || undefined`
  - port 4185
  - `workers: 4`
- Modify: `playwright.config.ts` (`testIgnore` adds both spec files)
- Modify: `package.json` (script `"test:specimen-audit": "playwright test -c playwright.specimen-audit.config.ts"`)

**Interfaces:**
- Produces: `type AuditCheck = 'overflow' | 'clipping' | 'focus-visible' | 'target-size' | 'forced-colors' | 'axe'` and `type Finding = { check: AuditCheck; target: string; detail: string }`. `target` is a short CSS path built from the element's tag, `data-slot` and role.
- Produces (`roots` is the section plus any portalled overlay roots opened for it):
  - `findOverflow(roots: Locator[]): Promise<Finding[]>`. A finding when an element's `scrollWidth > clientWidth + 1` or `scrollHeight > clientHeight + 1` with `overflow` visible or hidden, or when a text node's range rect extends more than 1px past its parent element's border box. Elements whose computed `text-overflow` is `ellipsis` are exempt.
  - `findClipping(roots: Locator[], stop: Locator): Promise<Finding[]>`. The painted box is the border box plus, for each non-inset shadow, `max(0, |offset| + blur + spread)` per side, plus `outlineWidth + outlineOffset` when `outline-style` is not `none`. It walks ancestors up to `stop`. An ancestor clips when its `overflow-x` or `overflow-y` is not `visible`, `clip-path` is not `none`, or `contain` includes `paint`. A finding is reported when the painted box exceeds that ancestor's padding box by more than 1px.
  - `findTargetSize(roots: Locator[]): Promise<Finding[]>`. It covers `button, a[href], input:not([type=hidden]), select, textarea, [role=button], [role=tab], [role=checkbox], [role=switch], [role=radio], [role=menuitem], [role=option], [role=combobox], [tabindex]:not([tabindex="-1"])` that are visible and enabled. The border box must be at least 24×24. An `a` whose parent `p` contains other text nodes is exempt.
  - `checkFocusVisible(page: Page, target: Locator): Promise<Finding[]>`. This is the pixel algorithm below.
  - `findForcedColors(roots: Locator[], focused: Locator[]): Promise<Finding[]>`. With `forced-colors: active`:
    - each focused element must have `outline-style` not `none` and `outline-width` at least 1px;
    - each element whose unforced border width was above 0 must keep `border-style` not `none` and a width at least 1px;
    - `backdrop-filter` must be `none`;
    - computed `color` alpha must be above 0 on every element with direct text.
  - `runAxe(page: Page, include: string[]): Promise<Finding[]>`. Uses `new AxeBuilder({ page }).include(...).withTags(['wcag2a','wcag2aa','wcag21a','wcag21aa','wcag22aa'])`, one finding per violation node.
- Focus-visible algorithm (the signature doesn't determine it):

  ```text
  box = target bounding box inflated by 8px, clamped to the viewport
  before = page.screenshot({ clip: box, animations: 'disabled' })   // target blurred
  focus target via keyboard (page.keyboard.press('Tab') until document.activeElement === target, max 60 presses)
  after  = page.screenshot({ clip: box, animations: 'disabled' })
  decode both in page (createImageBitmap → OffscreenCanvas → getImageData)
  changed = pixels where any RGB channel differs by > 8
  strong  = changed pixels where contrast(luminance(before), luminance(after)) >= 3
  finding unless strong >= 2 * (targetWidth + targetHeight)   // 1 CSS px perimeter at deviceScaleFactor 1
  ```

- [ ] **Step 1: Write `specimen-audit-checks.spec.ts`.** Each case uses `page.setContent` with a planted defect next to a clean twin, both with `data-case="defect"` and `data-case="clean"`, and asserts the helper returns at least one finding for the defect and `[]` for the clean twin. The cases:
  - **overflow:** `<button style="inline-size:2rem;white-space:nowrap;overflow:hidden">Dismiss</button>` vs the same button with `aria-label="Dismiss"` holding `×`.
  - **clipping:** a child with `box-shadow: 0 0 24px #000` inside `overflow:auto` with no padding, vs `padding: 32px`.
  - **focus-visible:** a button with `outline:none` on focus, vs `outline: 2px solid #1a56db` on a white background. Also a ring the same colour as its background (finding).
  - **target-size:** a bare 16×16 `<button>` vs a 24×24 one.
  - **forced-colors:** a bordered div with `@media (forced-colors: active) { border: none }` vs one with no such rule.
  - **axe:** `<button></button>` vs `<button>Save</button>`.
- [ ] **Step 2: Run** `pnpm test:specimen-audit -- specimen-audit-checks.spec.ts`. Expected: FAIL, because the helpers are missing.
- [ ] **Step 3: Implement** the helpers in `tests/helpers/specimen-audit.ts`.
- [ ] **Step 4: Re-run.** Expected: all 6 self-tests PASS.
- [ ] **Step 5: Run** `pnpm exec playwright test --list` with the default config. Expected: neither audit spec is listed.
- [ ] **Step 6: Commit** with `git commit -m "test(e2e): add specimen audit measurements with planted-defect self-tests"`.

### Task 5: Specimen audit suite and evidence file

**Files:**
- Create: `tests/e2e/specimen-audit.spec.ts`

**Interfaces:**
- Consumes: the Task 3 page DOM contract and the Task 4 helpers.
- Produces: `.artifacts/specimen-audit.json`, shaped `{ schemaVersion: 1, node: string, browser: { engine: 'chromium', version: string, channel: string }, configurations: { family: string; edition: 'radix' | 'base'; mode: 'light' | 'dark'; specimens: number; checks: Record<AuditCheck, number> }[], failures: number }`. Each configuration is written by its own test into `.artifacts/specimen-audit/parts/<family>-<edition>-<mode>.json`, and `test.afterAll` merges the parts sorted by family, edition and mode.
- Produces screenshots: `.artifacts/specimen-audit/<family>/<edition>/<mode>/<component>.png`, plus `<component>-open.png` for overlays.
- Overlay openers, keyed by component (the trigger is the first `button` in the section, or the first `[role=combobox]` for Select):
  - Dialog, Alert Dialog, Sheet, Popover, Dropdown Menu, Select: click the trigger, then wait for `[role=dialog], [role=alertdialog], [role=menu], [role=listbox]`, or `[data-slot$="popover-content"]` for Popover.
  - Tooltip: `trigger.focus()`, then wait for `[role=tooltip]`.
  - Toast: call `page.clock.install()` before the click, then wait for `[data-slot$="toast"]`.
  - Accordion: click the first trigger.
  - After measuring: press Escape and `expect(trigger).toBeFocused()`. Accordion and Toast are exempt from the focus-return check.

- [ ] **Step 1: Write the suite.**
  - Loop the 20 configurations.
  - Each test calls `page.goto('/audit/<family>/<edition>/?mode=<mode>')` and waits for `data-ready`.
  - For each section: screenshot it, open its overlay if it has one, and collect the opened roots.
  - Assert `opened.length > 0` for overlay components. This is the portal guard.
  - Then run `findOverflow`, `findClipping(stop = section)`, `findTargetSize`, `checkFocusVisible` for each focusable element in the section and its overlay roots, and `runAxe` on the section selector.
  - Close the overlay.
  - In light mode, `page.emulateMedia({ forcedColors: 'active' })`, run `findForcedColors` over each section, then reset.
  - Write the part file.
  - Fail with `expect(findings, JSON.stringify(findings, null, 2)).toEqual([])` after writing the part, so the evidence records the counts.
- [ ] **Step 2: Run** `pnpm test:specimen-audit -- specimen-audit.spec.ts -g "ombelle/radix/light"`. Expected: the run completes. It either passes or fails only with Finding lists. 29 screenshots exist, and the part file lists `specimens: 29`.
- [ ] **Step 3: Run all 20 configurations** with `pnpm test:specimen-audit`. Record the failing findings for Task 7. Failures are expected at this point.
- [ ] **Step 4: Commit** with `git commit -m "test(e2e): audit every catalog specimen per family, edition and mode"`.

### Task 6: Foundation gate integration

**Files:**
- Modify: `scripts/foundation-evidence.mjs`:
  - In `foundationSteps.consumers`, insert `'test:specimen-audit'` right after `'build:preview'`. In `all`, insert it after `'build:consumers'`.
  - Add `'specimen-audit.json'` to `evidenceFiles.consumers`.
  - Add `export function validateSpecimenAudit(result)`, called in `validateGroupEvidence` for `consumers`, and return its result as `specimenAudit`.
- Modify: `tests/integration/foundation-groups.test.ts` (fixture `'specimen-audit.json': specimenAudit()`, plus rejection cases)

**Interfaces:**
- Produces: `validateSpecimenAudit(result): { configurations: number; specimens: number }`. It throws with `fail('Incomplete specimen audit')` unless all of these hold:
  - `schemaVersion === 1`;
  - `browser.engine === 'chromium'`, with a non-empty version;
  - exactly the 20 family × edition × mode combinations, each once;
  - every `specimens === 29`;
  - every `checks` key present with a count of at least 1, except `forced-colors` in dark mode, which is 0;
  - `failures === 0`.

- [ ] **Step 1: Write the failing integration tests.**
  - A valid fixture passes and returns `{ configurations: 20, specimens: 580 }`.
  - Each of these throws `Incomplete specimen audit`: 19 configurations; one configuration with 28 specimens; `failures: 1`; a duplicated configuration.
- [ ] **Step 2: Run** `pnpm exec vitest run --config vitest.integration.config.ts tests/integration/foundation-groups.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement** the validator and the step and file changes.
- [ ] **Step 4: Re-run.** Expected: PASS. Then run the whole integration suite with `pnpm test:integration`. Expected: PASS, apart from the two known local-only failures (`transaction.test.ts`, `snapshot-cache.test.ts`), which must be reported as such.
- [ ] **Step 5: Commit** with `git commit -m "ci: require specimen audit evidence in the foundation consumers group"`.

### Task 7: Fix the defects the audit finds

**Files:**
- Modify: affected `packages/catalog/src/styles/<component>/<family>.css` or `styles/<family>.css`.
- Modify when output changes: `packages/compiler/test/fixtures/stable-family-hashes.json`, `packages/compiler/test/fixtures/style-baseline.json`, `CHANGELOG.md` (Unreleased).

**Interfaces:**
- Consumes: the Task 5 findings.

For each distinct defect (one root cause can produce findings across families, modes or editions):

- [ ] **Step 1: Pin the defect with a test.** Write or extend a focused catalog or compiler test that asserts the fixed style, for example that `dialog-trigger` has a `min-block-size` of at least 24px in every family. Run it. Expected: FAIL.
- [ ] **Step 2: Fix the family CSS.** Overlay triggers follow the same visual as the editor's trigger: each family's outline button for neutral triggers, and its destructive button for the Alert Dialog trigger. Then run `pnpm build:packages` and the focused test. Expected: PASS.
- [ ] **Step 3: Re-run the affected configurations.** Use `pnpm test:specimen-audit -- -g "<family>"` after `pnpm generate:preview`. Expected: that defect's findings are gone.
- [ ] **Step 4: Update the compiler fixtures if needed.** If `pnpm exec vitest run packages/compiler` reports hash or baseline changes, update the fixtures, confirm the diff only touches the fixed components, and add a CHANGELOG line naming the fix.
- [ ] **Step 5: Commit** with `git commit -m "fix(catalog): <what> in <component> (<families>)"`.

Finish with these checks:

- [ ] **Step 6: Run the full audit** with `pnpm test:specimen-audit`. Expected: 6 self-tests and 20 configurations PASS, with `.artifacts/specimen-audit.json` reporting `failures: 0` and 580 specimens.
- [ ] **Step 7: Run the full static gate:** `pnpm build:packages`, `pnpm typecheck`, `pnpm test:unit`. Expected: PASS.

### Task 8: Documentation

**Files:**
- Create: `docs/evidence/specimen-audit.md`
- Modify:
  - `docs/accessibility-review.md`: add a new "Automated checks" section after "Setup".
  - `docs/03-components-styles-accessibility.md`: in "Component definition of done", add "the specimen audit and catalog style lint pass".
  - `README.md` and `docs/foundation-local-usage.md`: add the command and its prerequisites (`pnpm build:packages`, `pnpm generate:preview`, a Chromium channel).
  - `AGENTS.md`: add a command-list bullet for `pnpm test:specimen-audit`.
  - `CHANGELOG.md` (Unreleased): add the harness.
  - `apps/www/src/site/docs/guides.tsx`: add one sentence after the existing "Check light and dark rendering…" sentence, at line 35.

**Interfaces:**
- Evidence doc sections:
  - Environment: OS, Node, browser and channel, taken from `.artifacts/specimen-audit.json`.
  - Matrix.
  - Checks, with these WCAG mappings: overflow is 1.4.10/1.4.12, clipping and focus are 2.4.7/1.4.11, target size is 2.5.8, forced colors is 1.4.11 under forced colors, axe covers the tagged rules.
  - Defects found and fixed, with the commits from Task 7.
  - Limits, copied from the spec: no NVDA or VoiceOver, no native 200 percent text zoom, Chromium only, built-in presets only, and no consuming application.
- Website sentence (exact copy): `The catalog's specimens for each built-in preset are checked automatically in Chromium for focus visibility, target size, forced colors and axe rules; your app still needs its own checks with your content and backdrop.`

- [ ] **Step 1: Write the docs.** Claim only the environment recorded in the run's evidence file.
- [ ] **Step 2: Check the docs.** Run `pnpm exec vitest run apps/www/src` and `pnpm test:integration -- tests/integration/www-route.test.ts`, plus any docs link test that exists (`grep -rl "docs/" tests/integration`). Expected: PASS.
- [ ] **Step 3: Commit** with `git commit -m "docs: document the specimen audit and catalog style lint"`.
