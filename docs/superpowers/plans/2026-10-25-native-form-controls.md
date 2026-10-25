# Native Form Controls Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add shadcn-compatible Label, Textarea, and Native Select to the catalog and CLI, style Input's invalid state in every family, and move Dialog's close control to lucide's `XIcon`.

**Architecture:** The three new components follow the Badge and Card pipeline: a TSX template importing a colocated per-family stylesheet, flowing through catalog generation, deterministic compilation, the registry, and generic `planAdd`. Only `ui-style.css` (per family) and `dialog.tsx` change among existing artifacts, under catalog release `0.1.0`. A clearer conflict message plus the existing `theme add` path migrate earlier local installs.

**Tech Stack:** TypeScript, React 19.3.1 TSX, lucide-react 1.55.0, Tailwind v4, pnpm 11.25.0 workspaces, Vitest, Playwright, and npm/pnpm/Yarn/Bun consumer runners.

**Spec:** `docs/superpowers/specs/2026-10-25-native-form-controls-design.md`

## Global Constraints

- Support only `flat`, `minimalist`, and `neo-brutalism`, in light and dark modes. Liquid glass stays unavailable.
- New component IDs are exactly `label`, `native-select`, and `textarea`. Exports are exactly `Label`, `Textarea`, `NativeSelect`, `NativeSelectOption`, `NativeSelectOptGroup`, and `NativeSelectProps`.
- New templates spread native props first, then set `data-slot`, then `className={cn(className)}`. They import their colocated CSS and contain no `'use client'`.
- `lucide-react` is pinned to exactly `1.55.0` (ISC, peer `react ^19.0.0`, no install scripts). Only `dialog` and `native-select` declare it.
- Catalog release stays `0.1.0`. The only existing artifacts allowed to change bytes are `styles/ui-style.css` (each family) and `components/ui/dialog.tsx`. Button, Badge, Card, and Input TSX, their CSS, `lib/utils.ts`, and Button scoped-preset and recipe artifacts stay byte-identical.
- Dialog's close control keeps the accessible name "Close" and stays the last child of `dialog-content`.
- Do not add an update command, auto-replace stale managed files in `add`, or bump the catalog release. `--yes` never bypasses conflicts.
- Dependency installs keep lifecycle scripts disabled. Frozen consumer installs must not change any fixture lockfile.
- Edit catalog inputs in `packages/catalog/src/templates/` and `styles/`. `packages/catalog/src/generated.ts` and `apps/preview/src/generated/` change only through `pnpm build:packages` and `pnpm generate:preview`.
- Commit messages use Conventional Commits with scope `forms`, `dialog`, or `input` as listed. No `codex` prefix.

## Review Focus

- **Caller props on Native Select:** `className`, `id`, `ref`, `aria-invalid`, and `required` must reach the `<select>`, not the wrapper. `size="sm"` must not leak as the native `size` attribute, which would turn the select into a list box. Task 2 render test.
- **`multiple` selects:** a `<NativeSelect multiple>` renders as a list box, so the chevron would be misleading. Hide the icon with `select[multiple] + [data-slot='native-select-icon'] { display: none }`. Task 2 CSS assertion; Task 6 browser assertion.
- **Disabled through an ancestor `<fieldset disabled>`:** the select must dim even though it has no `disabled` attribute. `:has(select:disabled)` matches this. Task 6 fixture case and assertion.
- **Right-to-left layouts:** the select icon and the Dialog close control must mirror. Logical properties only (`inset-inline-end`). Task 2 and Task 3 CSS assertions; Task 6 RTL browser assertion for the icon.
- **Long label, option, and textarea text at 320 CSS pixels:** content wraps without horizontal page scroll. Task 6 fixture uses a long label and a long option; reflow assertion.

---

### Task 1: Pin lucide-react across the workspace and fixtures

**Files:**
- Modify: `packages/catalog/src/manifest.ts`, `packages/catalog/package.json`, `apps/preview/package.json`, `fixtures/vite/package.json`, `fixtures/next/package.json`
- Regenerate: `pnpm-lock.yaml`, `fixtures/vite/pnpm-lock.yaml`, `fixtures/next/pnpm-lock.yaml`, `fixtures/npm/{vite,next}/package-lock.json`, `fixtures/yarn/{classic-vite,modern-next,pnp-vite}/yarn.lock`, `fixtures/bun/{text-vite,text-next}/bun.lock`, `fixtures/bun/{binary-vite,binary-next}/bun.lockb`
- Test: `packages/catalog/test/catalog.test.ts`

**Interfaces:**
- Produces: `runtimeDependencies['lucide-react'] === '1.55.0'`, appended as the **last** key of `runtimeDependencies`. Later registry dependency lists therefore end with `lucide-react@1.55.0`.

- [ ] **Step 1: Write the failing test** in `catalog.test.ts`: `it('pins lucide-react exactly', ...)` importing `runtimeDependencies` from `../src/manifest.js` and asserting `expect(runtimeDependencies['lucide-react']).toBe('1.55.0')` and `expect(Object.keys(runtimeDependencies).at(-1)).toBe('lucide-react')`.
- [ ] **Step 2: Run** `pnpm exec vitest run packages/catalog/test/catalog.test.ts`. Expected: the new test FAILS.
- [ ] **Step 3: Add** `'lucide-react': '1.55.0'` as the last entry of `runtimeDependencies`. Add `"lucide-react": "1.55.0"` to the `dependencies` of `packages/catalog/package.json`, `apps/preview/package.json`, `fixtures/vite/package.json`, and `fixtures/next/package.json`.
- [ ] **Step 4: Update the workspace lock.** Run `pnpm install --ignore-scripts`, then confirm `git diff pnpm-lock.yaml` adds only `lucide-react@1.55.0` entries and importer references.
- [ ] **Step 5: Regenerate the 11 fixture lockfiles.**
  - In a scratch directory, recreate each fixture's package as its preparation helper does: `scripts/prepare-node-consumer.ts` for pnpm and npm, `tests/helpers/yarn-project.ts` for Yarn including `.yarnrc.yml` linker settings, and `tests/helpers/bun-project.ts` for Bun, which deletes `clsx` and sets `packageManager`. For Bun binary lockfiles, generate with a disposable `install.saveTextLockfile=false` setting that is not copied back.
  - Copy in the current lockfile and run the pinned manager's non-frozen install with scripts disabled: pnpm 11.25.0 `install --ignore-scripts --lockfile-only`; npm 11.19.0 `install --ignore-scripts --package-lock-only`; Yarn 1.22.22 `install --ignore-scripts`; Yarn 4.18.1 `install --mode=update-lockfile`; Bun 1.4.3 `install --ignore-scripts`.
  - Copy the lockfile back. Text-lockfile diffs must add only `lucide-react@1.55.0`.
- [ ] **Step 6: Verify frozen installs and the catalog test.**
  - Run `pnpm exec vitest run packages/catalog/test/catalog.test.ts`. Expected: PASS.
  - Run `pnpm build:packages` and `pnpm exec vitest run --config vitest.integration.config.ts tests/integration/npm.test.ts tests/integration/bun-consumers.test.ts tests/integration/yarn-consumers.test.ts`. Expected: PASS, with no "Frozen ... lock changed" error.
- [ ] **Step 7: Commit** all files above as `build(forms): pin lucide-react 1.55.0`.

### Task 2: Add Label, Textarea, and Native Select to the catalog

**Files:**
- Modify: `packages/contracts/src/component-ids.ts`, `packages/catalog/src/index.ts`
- Create: `packages/catalog/src/templates/{label,textarea,native-select}.tsx`
- Create: `packages/catalog/src/styles/{label,textarea,native-select}/{flat,minimalist,neo-brutalism}.css` (9 files)
- Generated: `packages/catalog/src/generated.ts`. `scripts/sync-catalog.mjs` already loads any `styles/<id>/` folder; do not modify it.
- Test: `packages/catalog/test/catalog.test.ts`

**Interfaces:**
- Consumes: `runtimeDependencies` with `lucide-react` (Task 1).
- Produces:
  - `supportedComponentIds = ['button','badge','card','dialog','input','label','native-select','textarea']`.
  - `ComponentTemplate.dependencies` per ID: base `react`, `clsx`, `tailwind-merge` for all; `button` adds `@radix-ui/react-slot` and `class-variance-authority`; `dialog` adds `@radix-ui/react-dialog` and `lucide-react`; `native-select` adds `lucide-react`. Manifest order is preserved.
  - `ComponentTemplate.slots`: `card` is unchanged; `native-select` is `['native-select-wrapper','native-select','native-select-icon','native-select-option','native-select-optgroup']`; every other ID is `[id]`.
  - Component signatures exactly as in the spec's Component contracts section.

- [ ] **Step 1: Write the failing tests** in `catalog.test.ts`:
  - `it('provides Label, Textarea and Native Select with three family styles each')`: each ID is in `supportedComponentIds`; `logicalPath` is `components/ui/<id>.tsx`; content includes `import './<id>.css'` and does not match `/['"]use client['"]/`; `Object.keys(styles)` equals `['flat','minimalist','neo-brutalism']`; and every family stylesheet contains `@media (forced-colors: active)`.
  - `it('declares per-component dependencies and slots')`: dependency names for `native-select` equal `['react','clsx','tailwind-merge','lucide-react']`; `dialog` equals `['react','@radix-ui/react-dialog','clsx','tailwind-merge','lucide-react']`; `label` and `textarea` equal `['react','clsx','tailwind-merge']`; `button` equals its current list; and `native-select` slots equal the five values above.
  - `it('styles control states in every family')`, for each family:
    - textarea CSS contains `[data-slot='textarea']`, `[aria-invalid='true']`, `var(--destructive)`, `field-sizing: content`, and `resize: vertical`;
    - native-select CSS contains `appearance: none`, `[data-size='sm']`, `:has(select:disabled)`, `pointer-events: none`, `inset-inline-end`, and `select[multiple] + [data-slot='native-select-icon']`;
    - label CSS contains `[data-slot='label'] > [aria-hidden='true']` and `var(--destructive)`;
    - none of the three contains `left:` or `right:`.
  - `it('forwards caller props to the native select')`: `renderToStaticMarkup(<NativeSelect id="s" className="custom" aria-invalid="true" required size="sm"><NativeSelectOption value="a">A</NativeSelectOption></NativeSelect>)`.
    - Assert that the markup matches `/^<div data-slot="native-select-wrapper"><select[^>]*>/`.
    - Assert that the `<select>` opening tag contains `id="s"`, `class="custom"`, `aria-invalid="true"`, `required`, `data-slot="native-select"`, and `data-size="sm"`, and does not match `/\ssize="/`.
    - Assert that the markup contains `data-slot="native-select-icon"` and `aria-hidden="true"`.
    - Also assert that `renderToStaticMarkup(<NativeSelect />)` gives `data-size="default"`.
- [ ] **Step 2: Run** `pnpm exec vitest run packages/catalog/test/catalog.test.ts`. Expected: the new tests FAIL.
- [ ] **Step 3: Add the three IDs** to `component-ids.ts` in the order above. Replace the inline dependency filter and the card-only slot ternary in `getCatalog` with two module-level maps: `extraDependencies: Partial<Record<ComponentId, readonly string[]>>` and `componentSlots: Partial<Record<ComponentId, readonly string[]>>`.
- [ ] **Step 4: Create the templates** following the spec's Component contracts. `native-select.tsx` imports `{ ChevronDownIcon } from 'lucide-react'`. `NativeSelectOption` and `NativeSelectOptGroup` set `data-slot` after spreading props, and pass `className={cn(className)}`.
- [ ] **Step 5: Create the nine stylesheets** using the spec's Styling section, with single-quoted attribute selectors as in Card's CSS. Pin these values:
  - Textarea and select padding `0.5rem 1rem`. Select `padding-inline-end: 2.5rem`. Icon `inline-size: 1rem; block-size: 1rem; inset-inline-end: 1rem; inset-block-start: 50%; translate: 0 -50%`.
  - Textarea `min-height: calc(var(--control-height) * 2)`.
  - Label `gap: 0.5rem; font-size: 0.875rem; line-height: 1.25`, `font-weight: 500`, or `700` in neo-brutalism.
  - Neo-brutalism textarea and select use `box-shadow: var(--shadow-x) var(--shadow-y) 0 var(--border)`. Forced colors removes the shadow and uses `border-style: double` for invalid.
  - The disabled wrapper uses `opacity: 0.5` with `cursor: not-allowed` on the select.
  - `select[multiple] + [data-slot='native-select-icon']` uses `display: none`.
- [ ] **Step 6: Run** `pnpm build:packages`, then `pnpm exec vitest run packages/catalog/test/catalog.test.ts`. Expected: PASS. In `generated.ts`, existing template and style entries are unchanged and three `componentStyles` entries are added.
- [ ] **Step 7: Commit** as `feat(forms): add Label, Textarea and Native Select catalog templates`.

### Task 3: Restyle Input invalid and Dialog close (intentional shared changes)

**Files:**
- Modify: `packages/catalog/src/templates/dialog.tsx`, `packages/catalog/src/styles/{flat,minimalist,neo-brutalism}.css`, `packages/compiler/test/fixtures/style-baseline.json`
- Test: `packages/catalog/test/catalog.test.ts`, `packages/compiler/test/compile.test.ts`

**Interfaces:**
- Consumes: the `lucide-react` pin (Task 1).
- Produces: a `dialog.tsx` whose close control renders `<XIcon aria-hidden="true" /><span className="sr-only">Close</span>` inside `DialogPrimitive.Close data-slot="dialog-close" type="button"`. Task 6 relies on its accessible name being "Close".

- [ ] **Step 1: Write the failing tests.**
  - In `catalog.test.ts`, add `it('uses an icon close control and logical placement')`:
    - Dialog content contains `import { XIcon } from 'lucide-react'`, `<XIcon aria-hidden="true" />`, and `<span className="sr-only">Close</span>`.
    - For every family, `ui-style.css` contains `[data-slot="dialog-close"]` with `position:absolute`, `inset-inline-end`, `min-width:var(--control-height)` and `min-height:var(--control-height)`. Within the `dialog-close` rule blocks, there is no `width:var(--control-height)` without a `min-` prefix and no `margin-top:1rem`. Other rules, such as Button's icon size, are out of scope for this assertion.
    - Flat and neo-brutalism contain `[data-slot="input"][aria-invalid="true"]` with `var(--destructive)`.
    - Normalise whitespace before matching, because minimalist is pretty-printed while the others are minified.
  - In `compile.test.ts`, add `it('changes only ui-style.css and dialog.tsx among pre-existing artifacts')`. For flat and neo-brutalism, compile `['button','dialog','input']` and compare against `style-baseline.json`. Every artifact other than `components/ui/dialog.tsx` and `styles/ui-style.css` matches its baseline sha256, and those two match the updated baseline.
- [ ] **Step 2: Run** `pnpm exec vitest run packages/catalog/test/catalog.test.ts packages/compiler/test/compile.test.ts`. Expected: the new tests FAIL.
- [ ] **Step 3: Update `dialog.tsx`** as described under Interfaces. Nothing else in the file changes.
- [ ] **Step 4: Update the three family stylesheets.**
  - Flat and neo-brutalism append `[data-slot="input"][aria-invalid="true"]{border-color:var(--destructive);border-width:max(var(--border-width),2px)}` and `@media(forced-colors:active){[data-slot="input"][aria-invalid="true"]{border-style:double}}`.
  - In all three families, replace the `dialog-close` rule with: `position:absolute; inset-block-start:0.75rem; inset-inline-end:0.75rem; display:inline-flex; align-items:center; justify-content:center; min-width:var(--control-height); min-height:var(--control-height); padding:0 0.5rem; margin:0; cursor:pointer`.
  - Size the icon with `[data-slot="dialog-close"] svg{inline-size:1rem;block-size:1rem}`.
  - Add `padding-inline-end:calc(var(--control-height) + 1.5rem)` to `dialog-content`.
  - Flat and minimalist use `background:transparent; border-color:transparent; color:var(--foreground)`, with `:hover{background:var(--accent);color:var(--accent-foreground)}`. Neo-brutalism keeps `background:var(--secondary)` and its border, and adds `dialog-close` to its offset-shadow selector.
  - Keep each file's existing formatting style.
- [ ] **Step 5: Update `style-baseline.json`.** Run `pnpm build:packages`. Replace only the `sha256` values of `components/ui/dialog.tsx` and `styles/ui-style.css` for flat and neo-brutalism with the newly compiled hashes. Add a top-level `"intentionalChanges": [{"logicalPaths":["components/ui/dialog.tsx","styles/ui-style.css"],"spec":"docs/superpowers/specs/2026-10-25-native-form-controls-design.md","reason":"Input invalid styling and lucide XIcon Dialog close control"}]`.
- [ ] **Step 6: Run** `pnpm test:unit`. Expected: PASS. If an existing assertion pins Dialog's dependency list, `ui-style.css`, or `dialog.tsx` bytes, update only that pinned value to the new output, and mention each such edit in the commit body.
- [ ] **Step 7: Commit** as `feat(dialog): use lucide close icon and style invalid inputs`.

### Task 4: Compile and register form-control artifacts

**Files:**
- Modify: `packages/compiler/src/compile.ts`, `packages/cli/test/registry.test.ts`
- Create: `packages/compiler/test/label.test.ts`, `packages/compiler/test/textarea.test.ts`, `packages/compiler/test/native-select.test.ts`

**Interfaces:**
- Consumes: the Task 2 templates and Task 3 shared artifacts.
- Produces: for each `<id>` in `label`, `textarea`, `native-select`, the compile artifacts `components/ui/<id>.tsx`, `components/ui/<id>.css`, `examples/<id>.tsx`, and `lib/utils.ts`. The registry item `<id>` has files `[components/ui/<id>.tsx, lib/utils.ts, components/ui/<id>.css]`.

- [ ] **Step 1: Write the failing tests.** Model each file on `packages/compiler/test/card.test.ts`, for every family:
  - compiling `[id]` yields exactly the four artifacts above, together with `styles/ui-style.css` and `styles/ui-tokens.css`;
  - the component imports `./<id>.css`;
  - the CSS equals `getCatalog('0.1.0').templates[id].styles[family]` after formatting;
  - compiling `[id, id]` and a reordered multi-ID input gives byte-identical artifacts;
  - Button, Badge, Card, and Input artifacts compiled alongside keep their single-ID bytes.

  Usage assertions:
  - Label: the example contains `<span aria-hidden="true">*</span>` and `required`.
  - Textarea: the example contains `aria-invalid="true"` and `aria-describedby="summary-error"`.
  - Native Select: the example contains `NativeSelectOption`, `aria-invalid="true"`, `aria-describedby="region-error"`, and `size="sm"`. `result.dependencies` includes `{ name: 'lucide-react', version: '1.55.0' }`.

  In `registry.test.ts`, mirror the Card registry test for the three IDs, with these dependencies:
  - `label` and `textarea`: `['clsx@2.1.1','tailwind-merge@3.7.0']`;
  - `native-select`: `['clsx@2.1.1','tailwind-merge@3.7.0','lucide-react@1.55.0']`;
  - `dialog`: `['@radix-ui/react-dialog@1.3.1','clsx@2.1.1','tailwind-merge@3.7.0','lucide-react@1.55.0']`.
- [ ] **Step 2: Run** `pnpm exec vitest run packages/compiler/test/label.test.ts packages/compiler/test/textarea.test.ts packages/compiler/test/native-select.test.ts packages/cli/test/registry.test.ts`. Expected: FAIL, because the usage examples are missing.
- [ ] **Step 3: Add three usage branches** to the `usage` chain in `compile.ts`, before the Input fallback. Use this exact copy:
  - label: `import { Label } from '@/components/ui/label'\nexport function Example(){return <><Label htmlFor="project-name">Project name <span aria-hidden="true">*</span></Label><input id="project-name" required /></>}`
  - textarea: `import { Textarea } from '@/components/ui/textarea'\nexport function Example(){return <><label htmlFor="notes">Notes</label><Textarea id="notes" /><label htmlFor="summary">Summary</label><Textarea id="summary" aria-invalid="true" aria-describedby="summary-error" /><p id="summary-error">Enter a summary.</p></>}`
  - native-select: `import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select'\nexport function Example(){return <><label htmlFor="region">Region</label><NativeSelect id="region" defaultValue="eu"><NativeSelectOption value="eu">Europe</NativeSelectOption><NativeSelectOption value="us">United States</NativeSelectOption></NativeSelect><label htmlFor="size">Size</label><NativeSelect id="size" size="sm" aria-invalid="true" aria-describedby="region-error"><NativeSelectOption value="">Choose a size</NativeSelectOption></NativeSelect><p id="region-error">Choose a size.</p></>}`
- [ ] **Step 4: Run** the Step 2 command. Expected: PASS. Then run `pnpm build:packages`; generated output must have no unrelated changes.
- [ ] **Step 5: Commit** as `feat(forms): compile and register form control artifacts`.

### Task 5: CLI installation, stale-stylesheet guidance, and migration

**Files:**
- Modify: `packages/cli/src/plan/components.ts`
- Create: `tests/integration/form-controls-cli.test.ts`

**Interfaces:**
- Consumes: the compiled artifacts (Task 4) and `planAdd(context, result)`.
- Produces: when a planned artifact has `logicalPath === 'styles/ui-style.css'`, its lock record hash equals `beforeHash`, and `action === 'update'`, the `FILE_CONFLICT` diagnostic message is exactly `` 'Shared style rules changed in this catalog; run theme add ' + (context.config?.presetFile ?? './ui-preset.json') + ' to refresh them' ``. All other conflicts keep `'Existing source requires an explicit migration'`.

- [ ] **Step 1: Write the failing integration tests**, modelled on `tests/integration/card-cli.test.ts` (its `createProject`, `runBuiltCli`, offline `package.json` dependency seeding, and `snapshotTree`).
  - **Installation, for Vite and Next × the three families × the three IDs:**
    - a dry run writes nothing (`snapshotTree` unchanged);
    - `dependencyPlan` lists `lucide-react@1.55.0` only for `native-select` when it is absent from `package.json`;
    - after seeding all catalog dependencies, apply creates `<ui>/<id>.tsx`, `<ui>/<id>.css`, and `src/ombelle-examples/<id>.tsx` with compiler bytes and lock hashes;
    - a repeat run is a no-op;
    - a custom `aliases.ui` is honoured (Next.js);
    - editing the TSX, and separately the CSS, each yields `FILE_CONFLICT` with `--yes`, with the file unchanged;
    - `package.json` `packageManager` and the lockfile are unchanged.
  - **`it('names theme add when the shared stylesheet is stale but unedited')`:**
    1. init the flat Vite project and add `input`;
    2. replace `src/styles/ui-style.css` with its content minus the `[data-slot="input"][aria-invalid="true"]` rule, and rewrite that file's `sha256` in `ui-library.lock.json` to match;
    3. `add textarea --yes` exits 4 with a diagnostic whose message contains `run theme add` and the saved preset path;
    4. `theme add <saved preset path> --yes` exits 0 and restores the compiled `ui-style.css`;
    5. `add textarea --yes` then exits 0.
  - **`it('keeps edited shared stylesheets as conflicts')`:** append a comment to an up-to-date `ui-style.css` without updating the lock. `add textarea --yes` exits 4 with the message `Existing source requires an explicit migration`, and the file is unchanged.
  - **`it('migrates a legacy text-close Dialog by deleting it')`:**
    1. add `dialog`;
    2. replace the close children with the text `Close`, and record that hash in the lock;
    3. `add dialog --yes` exits 4;
    4. delete `dialog.tsx`;
    5. `add dialog --yes` exits 0, and the file contains `XIcon`.
- [ ] **Step 2: Run** `pnpm build:packages && pnpm exec vitest run --config vitest.integration.config.ts tests/integration/form-controls-cli.test.ts`. Expected: only the stale-stylesheet message assertion FAILS.
- [ ] **Step 3: Implement** the message selection in `planAdd`'s conflict branch as described under Interfaces. Do not change the conflict decision itself.
- [ ] **Step 4: Run** the Step 2 command plus `pnpm exec vitest run packages/cli/test`. Expected: PASS.
- [ ] **Step 5: Commit** as `feat(forms): guide stale shared stylesheet migration`.

### Task 6: Preview, consumers, and browser coverage

**Files:**
- Create: `fixtures/shared/forms-fixture.tsx`, `tests/e2e/forms.spec.ts`
- Modify: `fixtures/shared/scenario.tsx`, `tests/helpers/scenario-fixture.ts`, `tests/integration/scenario-fixture.test.ts`, `scripts/generate-preview.ts`, `scripts/prepare-node-consumer.ts`, `scripts/prepare-bun-consumers.ts`, `scripts/foundation-evidence.mjs`, `tests/integration/foundation-groups.test.ts`, `tests/e2e/keyboard.spec.ts`
- Generated: `apps/preview/src/generated/` through `pnpm generate:preview`

**Interfaces:**
- Consumes: the installed components (Tasks 2–5) and the Dialog close control (Task 3).
- Produces:
  - `writeScenarioFixture(root, family, recipes?, componentPresets?, badges?, cards?, forms = false)`.
  - A `?forms=1` gate rendering `<FormsFixture />` with root `data-testid="forms-fixture"`.
  - `browserSpecCounts['forms.spec.ts'] = 30`, for a total of 178 browser cases.

- [ ] **Step 1: Write the failing fixture-helper test.** In `scenario-fixture.test.ts`, add `it.each([false, true])('writes an optional forms fixture without dangling imports (forms=%s)')`, mirroring the Card case:
  - the import is `import { FormsFixture } from './forms-fixture'`;
  - the render line is `{forms && <FormsFixture />}`;
  - the scenario matches `get('forms') === '1'`;
  - when enabled, the fixture imports from `@/components/ui/label`, `@/components/ui/textarea`, and `@/components/ui/native-select`.

  Run `pnpm exec vitest run --config vitest.integration.config.ts tests/integration/scenario-fixture.test.ts`. Expected: FAIL.
- [ ] **Step 2: Create `forms-fixture.tsx`.** Wrap it in `<section data-testid="forms-fixture" aria-label="Form control examples">`. Use these test IDs:
  - `forms-label-required` — "Project name" with an `aria-hidden` `*`, for a required `Input`;
  - `forms-long-label` — a 120-character label;
  - `forms-input-invalid`;
  - `forms-textarea-empty`, `forms-textarea-filled`, and `forms-textarea-invalid` (with the error `forms-textarea-error`);
  - `forms-textarea-disabled`;
  - `forms-select-default` (selected `eu`), `forms-select-sm`, `forms-select-invalid` (with the error `forms-select-error`), and `forms-select-disabled`;
  - `forms-select-optgroup`, which includes a 90-character option;
  - `forms-select-multiple`;
  - `forms-select-fieldset`, inside `<fieldset disabled>`.

  Every control has a `Label` with `htmlFor`. Then:
  - update `scenario.tsx` (state plus the URL gate) and `scenario-fixture.ts` (the `forms` parameter, import removal, and copying the fixture file);
  - make `generate-preview.ts` write `forms-fixture.tsx` with `@/components/ui` rewritten to `./components/ui`;
  - append `['add', 'label', 'textarea', 'native-select']` to the add sequences in `prepare-node-consumer.ts` and `prepare-bun-consumers.ts`, passing `forms = true` to `writeScenarioFixture`.

  Rerun the Step 1 command. Expected: PASS.
- [ ] **Step 3: Add `forms.spec.ts`**, structured like `card.spec.ts`: the same 3 families × `light`/`dark` × `preview`/`vite`/`next`/`npm-vite`/`npm-next` loop, the browser reference cache, and source and DOM parity against `apps/preview/src/generated/<family>`. Title: `` `Forms ${family}/${mode}/${app}: source and DOM parity, control states, forced colors and reflow` ``. Each test asserts:
  - computed `borderTopWidth`, `borderRadius`, and the `:focus-visible` outline of `forms-textarea-filled` and `forms-select-default` equal those of the valid required `Input` labelled by `forms-label-required`;
  - invalid textarea, select, and `forms-input-invalid` have border color equal to the computed `--destructive` and border width ≥ 2px;
  - clicking each label focuses its control;
  - focusing `forms-select-default` and pressing `ArrowDown` changes its value;
  - `elementFromPoint` at the icon centre returns the `<select>`;
  - the icon is hidden for `forms-select-multiple`;
  - `forms-select-fieldset` and `forms-select-disabled` wrappers have opacity 0.5;
  - with `document.documentElement.dir = 'rtl'`, the icon's x position is less than the select's centre;
  - with forced colors, invalid borders are `double` and neo-brutalism shadows are `none`;
  - at a 320 × 800 viewport, `document.documentElement.scrollWidth <= 320`;
  - required marker and error text contrast is ≥ 4.5 via `tests/helpers/contrast.ts`.
- [ ] **Step 4: Extend `keyboard.spec.ts`'s existing Dialog test bodies**, adding no new tests so the case count stays 30:
  - the close button is found by `getByRole('button', { name: 'Close', exact: true })` and contains `svg[aria-hidden="true"]`;
  - its bounding box is ≥ 24 × 24;
  - at a 320 px viewport, the dialog heading's bounding box does not intersect it;
  - existing focus-return assertions are unchanged.
- [ ] **Step 5: Update the evidence contract.** In `scripts/foundation-evidence.mjs`, add `'forms.spec.ts': 30` to `browserSpecCounts` and update its comment to eight specs. In `foundation-groups.test.ts`, add `forms.spec.ts: 30` to `browserResults()`, change 148 to 178, and add `test('rejects omitted Forms browser cases even when reporter totals are adjusted')`, filtering out `forms.spec.ts` with `expected = 148`.
- [ ] **Step 6: Run the focused verification.**
  1. `pnpm build:packages`
  2. `pnpm generate:preview`
  3. `pnpm exec vitest run --config vitest.integration.config.ts tests/integration/scenario-fixture.test.ts tests/integration/foundation-groups.test.ts`
  4. `pnpm prepare:consumers`
  5. `pnpm build:consumers`
  6. `pnpm build:preview`
  7. `pnpm exec playwright test tests/e2e/forms.spec.ts tests/e2e/keyboard.spec.ts tests/e2e/card.spec.ts tests/e2e/badge.spec.ts`

  Expected: all pass, with 30 Forms cases and no skips. If the standard `tsx` launcher fails with `os.userInfo` ENOMEM on Windows, use the local loader workaround recorded in `docs/evidence/card.md`.
- [ ] **Step 7: Commit** as `feat(forms): add preview, consumer and browser coverage`.

### Task 7: Documentation, migration notes, and measured evidence

**Files:**
- Create: `docs/components/label.md`, `docs/components/textarea.md`, `docs/components/native-select.md`, `docs/evidence/form-controls.md`, `docs/evidence/form-controls-run.json`
- Modify: `docs/07-delivery-plan.md`, `docs/03-components-styles-accessibility.md`, `docs/05-cli-specification.md`, `docs/foundation-local-usage.md`
- Include: this plan and the spec

**Interfaces:**
- Consumes: the verified behavior from Tasks 1–6.

- [ ] **Step 1: Write the three component documents** following the section structure of `docs/components/card.md`. Cover:
  - composition and native props;
  - Label's required-indication pattern and its rationale;
  - Textarea states;
  - Native Select's `size`, its shadcn mapping, and its full-width wrapper difference;
  - family behavior;
  - generated files and install commands;
  - ownership and conflicts;
  - the glass exclusion.
- [ ] **Step 2: Update the other docs.**
  - In `03` (the line 62 component list), `05` (line 9 "Ordinary local additions support…"), and `foundation-local-usage.md`, list Button, Badge, Card, Dialog, Input, Label, Native Select, and Textarea.
  - Add a "Migrating installs created before native form controls" section to `foundation-local-usage.md`, covering the `theme add <saved preset>` refresh, the edited-stylesheet conflict, and the Dialog delete-and-re-add route, together with the mixed-state note.
  - Add a delivery-plan paragraph after Card's, stating only verified results and the remaining four M2 rows.
- [ ] **Step 3: Run the full gate** with `pnpm check:foundation`, or the documented loader workaround on this Windows machine. Expected: all ten stages pass, with 178 browser cases, 34 consumers, and no skips.
- [ ] **Step 4: Record the evidence.** Write `form-controls-run.json` and `form-controls.md` in the style of `card-run.json` and `card.md`. Include:
  - the source commit, Node and pnpm versions, stage outcomes, and unit, integration, browser, and consumer counts;
  - raw result hashes;
  - `lucide-react` 1.55.0 (ISC);
  - the intentional `ui-style.css` and `dialog.tsx` byte changes;
  - the limits: no manual assistive-technology review, no application certification, browser-rendered option popups, and glass unavailable.
- [ ] **Step 5: Commit** the docs, evidence, spec, and plan as `docs(forms): record form controls support and verification evidence`.
