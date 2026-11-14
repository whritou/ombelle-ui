# Font Pairs Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a preset choose a display, a body and a mono font from a curated list of self-hosted Fontsource fonts, with existing presets compiling to identical bytes.

**Architecture:** A font registry in `@ombelle/catalog` is the single source of font facts. `@ombelle/contracts` widens the preset schema and decides the schema version (`"1.0"` unless a preset uses extended typography, then `"1.1"`). The compiler resolves typography into extra CSS variables, a conditional rule block, a tokens `@import` and pinned dependencies, all emitted only when a preset opts in. The CLI needs no code change because it already plans from `result.dependencies`. The editor gets three pickers, and the preview app loads the selected fonts lazily from its own bundle.

**Tech Stack:** TypeScript ES modules, Ajv schemas in `schemas/`, vitest, Playwright, Vite and Next consumers, Fontsource packages, pnpm 11.25.0 on Node 24.19.0.

**Spec:** `docs/superpowers/specs/2026-11-14-font-pairs-design.md`

## Global Constraints

- Node 24.19.0, pnpm 11.25.0. Install with `pnpm install --frozen-lockfile --ignore-scripts` except where a task adds a dependency.
- Edit `schemas/preset.schema.json`, never `packages/contracts/src/preset-schema.ts`. Edit catalog inputs, never `packages/catalog/src/generated.ts`. Run `pnpm build:packages` after source changes.
- Relative TypeScript imports keep the `.js` specifier style.
- Compiler output stays deterministic. Planning stays separate from applying. Dependency installs disable lifecycle scripts, so fonts are plain package assets at exact pinned versions (no ranges).
- No request to a third-party font host at install, build or run time. Fonts are self-hosted through Fontsource only.
- Fonts are OFL-licensed; each licence is recorded in `docs/fonts.md`. A font that fails the licence or package check is not added: work stops and reports two replacement candidates.
- A preset that does not opt in compiles to byte-identical output. `packages/compiler/test/stable-families.test.ts` (the stable-hash fixture) must keep passing unchanged.
- Conventional Commits, branch `feat/font-pairs`. No `codex` prefix. Rerun only what changed.
- `apps/www` is a Next.js 16 app with breaking changes: before editing files there that Next owns, read the relevant guide in `apps/www/node_modules/next/dist/docs/`. Preset-editor files under `apps/www/src/preset-editor/` are plain React and tests.

## Review Focus

- A preset with `headingFontFamilyId` (or any registry id) but `schemaVersion: "1.0"` must be rejected with a path that names `/schemaVersion`, not an obscure schema error (Task 2).
- The same font chosen for body, heading and mono-eligible roles must produce one `@import` and one dependency, not duplicates (Task 3).
- `init` writes tokens with no components (`componentIds: []`): the `@import` and the font dependency must still be emitted (Task 3).
- The preview frame injects compiled CSS into a `<style>` where a bare `@import '@fontsource-variable/inter'` cannot resolve: it must be stripped, and the font loaded from the preview bundle (Task 7).
- Switching fonts on a later `theme add` rewrites `ui-tokens.css` with only the current imports and leaves the old font package installed (Task 4).

---

## Task 0: Spike for approach A (gate)

**Files:**
- Create: `docs/evidence/font-spike.md`

**Interfaces:**
- Produces: a written pass or fail per manager and framework. Later tasks assume a pass. On any fail, stop and report to the maintainer before Task 1.

- [ ] **Step 1: Create the branch**

Run: `git switch -c feat/font-pairs`
Expected: switched to a new branch.

- [ ] **Step 2: Build the Vite fixture with a font import under each manager**

For each of npm, pnpm, Yarn and Bun, copy `fixtures/vite` to a fresh temp directory outside the repo, install it, then run `<manager> add @fontsource-variable/inter@<latest exact version from npm view @fontsource-variable/inter version>` with scripts disabled. Add `@import '@fontsource-variable/inter';` as the first line of the CSS file that imports `ui-tokens.css` (find it with `grep -rn ui-tokens fixtures/vite/src`). Set `--font-family:'Inter Variable',sans-serif` on `:root` and run the fixture build.
Expected per manager: build exits 0, the built CSS contains `@font-face` with `Inter Variable`, and a `.woff2` file is in the output assets.

- [ ] **Step 3: Repeat for `fixtures/next`**

Same as Step 2 with the Next fixture, using the Next build script from its `package.json`.
Expected: build exits 0, the `.woff2` is emitted and referenced by the built CSS.

- [ ] **Step 4: Record the outcome**

Write `docs/evidence/font-spike.md` with a table of manager by framework showing pass or fail, the exact package version used, and the first line of CSS that worked. A fail in any cell blocks Task 1: stop and report.

- [ ] **Step 5: Commit**

```bash
git add docs/evidence/font-spike.md
git commit -m "docs(evidence): record the Fontsource import spike across managers"
```

---

## Task 1: Font registry and licence record

**Files:**
- Create: `packages/catalog/src/fonts.ts`
- Create: `packages/catalog/test/fonts.test.ts`
- Create: `docs/fonts.md`
- Modify: `packages/catalog/src/index.ts` (add `export * from './fonts.js'`)
- Modify: `packages/catalog/package.json` (exact-pinned devDependencies for every Fontsource package, used only by the registry test)

**Interfaces:**
- Produces:
```ts
export type FontRole = 'display' | 'body' | 'mono'
export interface FontEntry {
  id: string                      // kebab-case, the preset value, e.g. 'inter-tight'
  label: string                   // picker label, e.g. 'Inter Tight'
  stack: string                   // full CSS font-family value with fallbacks
  roles: readonly FontRole[]      // non-empty
  weights: readonly number[] | 'variable'
  license: 'OFL-1.1'
  fontsource: { package: string; version: string; imports: readonly string[] }
}
export const fontRegistry: readonly FontEntry[]
export function fontById(id: string): FontEntry | undefined   // registry ids only; system ids return undefined
```
System ids live in `@ombelle/contracts` (Task 2), not here.

The registry holds these entries (package names are the expected Fontsource packages; confirm each exists and is OFL in Step 1):

| id | label | roles | package | imports |
|---|---|---|---|---|
| `dm-sans` | DM Sans | display, body | `@fontsource-variable/dm-sans` | the package name |
| `geist` | Geist | display, body | `@fontsource-variable/geist` | the package name |
| `geist-mono` | Geist Mono | mono | `@fontsource-variable/geist-mono` | the package name |
| `space-grotesk` | Space Grotesk | display, body | `@fontsource-variable/space-grotesk` | the package name |
| `work-sans` | Work Sans | display, body | `@fontsource-variable/work-sans` | the package name |
| `space-mono` | Space Mono | mono | `@fontsource/space-mono` | `…/400.css`, `…/700.css` |
| `bricolage-grotesque` | Bricolage Grotesque | display | `@fontsource-variable/bricolage-grotesque` | the package name |
| `figtree` | Figtree | display, body | `@fontsource-variable/figtree` | the package name |
| `inter-tight` | Inter Tight | display, body | `@fontsource-variable/inter-tight` | the package name |
| `inter` | Inter | display, body | `@fontsource-variable/inter` | the package name |
| `jetbrains-mono` | JetBrains Mono | mono | `@fontsource-variable/jetbrains-mono` | the package name |
| `fraunces` | Fraunces | display, body | `@fontsource-variable/fraunces` | the package name |
| `instrument-sans` | Instrument Sans | display, body | `@fontsource-variable/instrument-sans` | the package name |
| `ibm-plex-mono` | IBM Plex Mono | mono | `@fontsource/ibm-plex-mono` | `…/400.css`, `…/600.css` |
| `young-serif` | Young Serif | display | `@fontsource/young-serif` | `…/400.css` |
| `nunito` | Nunito | display, body | `@fontsource-variable/nunito` | the package name |
| `michroma` | Michroma | display | `@fontsource/michroma` | `…/400.css` |
| `exo-2` | Exo 2 | display, body | `@fontsource-variable/exo-2` | the package name |
| `share-tech-mono` | Share Tech Mono | mono | `@fontsource/share-tech-mono` | `…/400.css` |

- [ ] **Step 1: Confirm packages, versions and licences**

For each package in the table run `pnpm view <package> version license`. Record the exact version and licence. Any package that does not exist or is not OFL is removed from the table and reported with two replacement candidates; stop for the maintainer's choice.

- [ ] **Step 2: Write the failing registry tests in `packages/catalog/test/fonts.test.ts`**

Tests and assertions:
- `ids are unique and kebab-case`: `new Set(ids).size === ids.length` and every id matches `/^[a-z0-9]+(-[a-z0-9]+)*$/`.
- `display-only fonts`: the fonts whose `roles` equals `['display']` are exactly `bricolage-grotesque`, `michroma`, `young-serif`.
- `mono fonts carry only the mono role`: every entry with `'mono'` in `roles` has `roles.length === 1`.
- `every body font is also display`: every entry with `'body'` also has `'display'`.
- `versions are exact`: every `fontsource.version` matches `/^\d+\.\d+\.\d+$/`.
- `stack names the installed family`: for each entry, read the first import's CSS from `node_modules/<package>` (index.css or the listed file) and assert it contains `font-family: '<first family of stack>'`.
- `fontById resolves registry ids and returns undefined for system ids and unknown ids`.
- `docs list every font`: `docs/fonts.md` contains each `id` and `license`.

- [ ] **Step 3: Run the tests to verify they fail**

Run: `pnpm exec vitest run packages/catalog/test/fonts.test.ts`
Expected: FAIL (module `fonts` not found).

- [ ] **Step 4: Implement the registry in `packages/catalog/src/fonts.ts`**

Hold the table above as a typed constant array, exports as in Interfaces. `stack` values use the family name Fontsource declares (variable packages declare `'<Name> Variable'`) followed by a sensible generic fallback: sans fonts end `system-ui, sans-serif`, serif fonts `Georgia, serif`, mono fonts `ui-monospace, monospace`. Add the pinned devDependencies to `packages/catalog/package.json` with `pnpm --filter @ombelle/catalog add -D --save-exact --ignore-scripts <packages>`. Write `docs/fonts.md` with one row per font: id, label, roles, licence, package and version.

- [ ] **Step 5: Run the tests and make sure they pass**

Run: `pnpm build:packages && pnpm exec vitest run packages/catalog/test/fonts.test.ts`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add packages/catalog docs/fonts.md pnpm-lock.yaml
git commit -m "feat(catalog): add the font registry and licence record"
```

---

## Task 2: Schema and version rule

**Files:**
- Modify: `schemas/preset.schema.json:9` (schemaVersion), `:30` (fontFamilyId), and the `design` properties
- Create: `packages/contracts/src/fonts.ts`
- Modify: `packages/contracts/src/index.ts` (export the new module)
- Modify: `packages/contracts/src/validate.ts` (version rule inside `validatePreset`)
- Test: `packages/contracts/test/validate.test.ts`, `packages/contracts/test/snapshot.test.ts`
- Test: `packages/catalog/test/fonts.test.ts` (schema enum equals registry)

**Interfaces:**
- Consumes: `fontRegistry` (Task 1) in the catalog test only. Contracts must not import the catalog.
- Produces:
```ts
export const systemFontIds: readonly ['system-sans', 'system-serif', 'system-mono']
export type PresetTypography = {
  fontFamilyId?: string
  headingFontFamilyId?: string
  monoFontFamilyId?: string
}
export function usesExtendedTypography(design: PresetTypography | undefined): boolean
export function presetSchemaVersion(design: PresetTypography | undefined): '1.0' | '1.1'
```
`usesExtendedTypography` is true when `headingFontFamilyId` or `monoFontFamilyId` is set, or `fontFamilyId` is set to anything outside `systemFontIds`.

- [ ] **Step 1: Write the failing tests**

In `validate.test.ts`:
- `a 1.0 preset with headingFontFamilyId is rejected`: error code `INVALID_DATA`, path `/schemaVersion`, message containing `1.1`.
- `a 1.0 preset with a registry fontFamilyId is rejected` (same path).
- `a 1.1 preset using heading, mono and a registry body font validates`.
- `a 1.1 preset that uses only system ids validates`.
- `a 1.0 preset with only system ids validates unchanged`.
- `presetSchemaVersion` returns `'1.0'` for `undefined`, `{}`, `{ fontFamilyId: 'system-serif' }` and `'1.1'` for `{ headingFontFamilyId: 'fraunces' }`, `{ monoFontFamilyId: 'geist-mono' }`, `{ fontFamilyId: 'inter' }`.
In `snapshot.test.ts`: `a snapshot containing a 1.1 preset validates` using the existing snapshot fixture helper with a font-bearing preset.
In `packages/catalog/test/fonts.test.ts`: `schema font enum equals system ids plus registry ids` and `heading and mono enums equal the registry ids carrying display and mono roles respectively`.

- [ ] **Step 2: Run to verify they fail**

Run: `pnpm exec vitest run packages/contracts/test/validate.test.ts packages/contracts/test/snapshot.test.ts packages/catalog/test/fonts.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement**

In `schemas/preset.schema.json`: `schemaVersion` becomes `{"enum": ["1.0", "1.1"]}`; `design.fontFamilyId` enum becomes the three system ids plus every registry id that has the `body` role; add `design.headingFontFamilyId` (enum: system ids plus registry ids with `display`) and `design.monoFontFamilyId` (enum: `system-mono` plus registry ids with `mono`). In `packages/contracts/src/fonts.ts` implement the three exports. In `validatePreset`, after schema validation and before the colour checks, throw `FoundationError('INVALID_DATA', 'Presets that use extended typography must declare schemaVersion 1.1', '/schemaVersion')` when `usesExtendedTypography(preset.design)` and `preset.schemaVersion === '1.0'`. A `"1.1"` preset that uses none is accepted. Run `pnpm build:packages` to regenerate the contract copy, then `pnpm typecheck` and fix any code that assumed the literal `'1.0'` type.

- [ ] **Step 4: Run to verify they pass**

Run: `pnpm build:packages && pnpm exec vitest run packages/contracts packages/catalog/test/fonts.test.ts && pnpm typecheck`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add schemas packages/contracts packages/catalog/test
git commit -m "feat(contracts): accept font pairs in presets under schema version 1.1"
```

---

## Task 3: Typography in the compiler

**Files:**
- Create: `packages/compiler/src/typography.ts`
- Modify: `packages/compiler/src/compile.ts:121-135` (font stack), `:158-164` (tokens content), `:165-172` (style content), `:174-210` (dependencies)
- Modify: `packages/compiler/src/recipe-styles.ts:231-236` (font stack)
- Modify: `packages/compiler/src/index.ts` (export `resolveTypography`)
- Test: `packages/compiler/test/typography.test.ts`
- Test: `packages/compiler/test/stable-families.test.ts` (unchanged, must still pass)

**Interfaces:**
- Consumes: `fontById`, `FontEntry` (Task 1); `usesExtendedTypography` (Task 2).
- Produces:
```ts
export type TypographyDesign = {
  fontFamilyId?: string
  headingFontFamilyId?: string
  monoFontFamilyId?: string
}
export type Typography = {
  family: string                       // value of --font-family
  heading?: string                     // value of --font-heading, set only when the preset sets headingFontFamilyId
  mono?: string                        // value of --font-mono, set only when the preset sets monoFontFamilyId
  imports: readonly string[]           // CSS lines, e.g. "@import '@fontsource-variable/inter';", deduplicated, sorted
  dependencies: readonly { name: string; version: string }[]  // deduplicated, sorted by name
}
export function resolveTypography(design: TypographyDesign): Typography
export function fontRuleBlock(typography: Typography): string  // '' unless heading or mono is set
export const headingSlots: readonly string[]
export const monoSlots: readonly string[]
```
Errors are `FoundationError('INVALID_DATA', <message>, '/design/fontFamilyId' | '/design/headingFontFamilyId' | '/design/monoFontFamilyId')`.

Rules:
- System ids map to exactly today's stacks: `system-sans` → `system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif`, `system-serif` → `Georgia, serif`, `system-mono` → `monospace`. Undefined `fontFamilyId` is `system-sans`.
- Body requires the `body` role, heading the `display` role, mono the `mono` role. An id that is not a system id or in the registry is rejected.
- `fontRuleBlock` returns `[data-slot="<s>"]{font-family:var(--font-heading)}` for every heading slot and `[data-slot="<s>"]{font-family:var(--font-mono)}` for every mono slot, each emitted only when the matching token is set.
- `headingSlots` is every `data-slot` value ending in `-title` found in `packages/catalog/src/templates` (run `grep -rhoE 'data-slot="[a-z-]+-title"' packages/catalog/src/templates | sort -u`); `monoSlots` is `code-block`, `kbd`, `input-otp-slot` and any `data-slot` whose component shows code or numeric figures found the same way. Both lists are written out explicitly in the file.

- [ ] **Step 1: Write the failing tests in `packages/compiler/test/typography.test.ts`**

- `defaults reproduce today's stacks`: `resolveTypography({})` equals `{ family: "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif", imports: [], dependencies: [] }`; `system-serif` gives `Georgia, serif`; `system-mono` gives `monospace`.
- `registry fonts resolve with imports and dependencies`: `{ fontFamilyId: 'inter', headingFontFamilyId: 'fraunces', monoFontFamilyId: 'jetbrains-mono' }` returns three `@import` lines and three pinned dependencies, sorted, and `heading` and `mono` set from the registry stacks.
- `one font used twice is imported once`: `{ fontFamilyId: 'geist', headingFontFamilyId: 'geist' }` yields exactly one import and one dependency.
- `role guard`: `{ fontFamilyId: 'young-serif' }` throws path `/design/fontFamilyId`; `{ monoFontFamilyId: 'inter' }` throws path `/design/monoFontFamilyId`; `{ headingFontFamilyId: 'jetbrains-mono' }` throws path `/design/headingFontFamilyId`; `{ fontFamilyId: 'not-a-font' }` throws.
- `fontRuleBlock is empty without heading or mono`, contains `[data-slot="card-title"]{font-family:var(--font-heading)}` with heading set, and contains `[data-slot="kbd"]{font-family:var(--font-mono)}` with mono set.
- `compile with fonts`: compile the ombelle catalog preset with `schemaVersion: '1.1'` and the three fonts above and `componentIds: ['card', 'kbd']`. `styles/ui-tokens.css` starts with `@import`, contains `--font-heading:` and `--font-mono:`; `styles/ui-style.css` contains the heading rule for `card-title`; `result.dependencies` contains the three Fontsource packages at their registry versions.
- `compile with fonts and no components`: with `componentIds: []` the tokens file still starts with the `@import` and `result.dependencies` still lists the fonts.
- `compile without fonts`: compiling each stable family preset yields no `@import`, no `--font-heading` or `--font-mono`, and no Fontsource dependency.
- `recipe path resolves registry stacks`: compile a component recipe from a preset using `fontFamilyId: 'inter'` and assert the recipe CSS carries the registry stack, not the system-sans stack, and contains no `@import`.

- [ ] **Step 2: Run to verify they fail**

Run: `pnpm exec vitest run packages/compiler/test/typography.test.ts`
Expected: FAIL (module not found).

- [ ] **Step 3: Implement `typography.ts` and wire it in**

In `compile.ts`: replace the font ternary at lines 128-133 with `const typography = resolveTypography(d)` evaluated before the `Object.assign`, set `'--font-family': typography.family`, and set `--font-heading` and `--font-mono` on `theme.light` only when defined. Prepend `typography.imports.join('')` to the `ui-tokens.css` content. Append `fontRuleBlock(typography)` inside the string passed to `prefixSharedRules` for `ui-style.css`, so the rules get the same `ombelle-` prefixing as the family styles. Add every `typography.dependencies` entry to the `dependencies` map before the component loop, independent of `ids.length`. In `recipe-styles.ts`, replace the ternary at lines 231-236 with `resolveTypography(d).family` and do not read the other fields. Export `resolveTypography` from the compiler index.

- [ ] **Step 4: Run to verify they pass, including the byte-identity guard**

Run: `pnpm build:packages && pnpm exec vitest run packages/compiler`
Expected: PASS, including `stable family artifacts are byte-identical` with its fixture untouched.

- [ ] **Step 5: Commit**

```bash
git add packages/compiler
git commit -m "feat(compiler): resolve font pairs into tokens, rules and dependencies"
```

---

## Task 4: CLI planning and apply integration

**Files:**
- Create: `tests/integration/font-pairs-cli.test.ts`
- Modify: CLI source only if the test shows a gap (expected: none)

**Interfaces:**
- Consumes: the compiler result of Task 3 through the existing planners (`packages/cli/src/plan/components.ts:271` filters `result.dependencies` against `package.json`).

- [ ] **Step 1: Write the failing integration test**

Model it on `tests/integration/liquid-glass-cli.test.ts`, using the same project helper, the same way of supplying a preset file to `theme add`, and the same fake dependency port. Tests and assertions:
- `a font preset plans pinned font dependencies`: planning `theme add` with an `inter`/`fraunces`/`jetbrains-mono` preset (schemaVersion `1.1`) puts all three Fontsource packages, at registry versions, in `dependencyPlan`; nothing is written in dry-run.
- `apply writes the import first`: after apply, `styles/ui-tokens.css` begins with the `@import` lines and `package.json` pins the exact versions.
- `a second add with the unchanged preset plans no font dependency`.
- `changing fonts rewrites imports and keeps the old package`: `theme add` with a preset using `figtree` instead of `inter` leaves `ui-tokens.css` importing only the current fonts, and the plan does not remove the `inter` package from `package.json`.
- `a preset without fonts plans no Fontsource dependency`.

- [ ] **Step 2: Run to verify the outcome**

Run: `pnpm build:packages && pnpm exec vitest run --config vitest.integration.config.ts tests/integration/font-pairs-cli.test.ts`
Expected: FAIL only if there is a CLI gap; otherwise PASS. If it fails, fix the CLI path the failure names, keeping dry-run and stale-plan safeguards intact.

- [ ] **Step 3: Commit**

```bash
git add tests/integration/font-pairs-cli.test.ts packages/cli
git commit -m "test(integration): cover font dependencies through init and theme add"
```

---

## Task 5: Hosted acceptance and rollout note

**Files:**
- Modify: `docs/snapshot-service-operations.md` (rollout order section)
- Modify: `docs/foundation-local-usage.md` (typography section)
- Test: `packages/contracts/test/snapshot.test.ts` (covered by Task 2)

**Interfaces:**
- Produces: documentation only.

- [ ] **Step 1: Document the rollout**

Add to `docs/snapshot-service-operations.md` a section stating the order: deploy a service that accepts `schemaVersion "1.1"`, then release the CLI, then expose the font pickers in the editor; and that a CLI older than the release rejects a 1.1 preset with a message naming `/schemaVersion`. Add to `docs/foundation-local-usage.md` a short typography section: fonts are opt-in, installed as pinned Fontsource packages, the three system ids stay the defaults, old installs do not change, and unused font packages are never removed.

- [ ] **Step 2: Verify the docs and the snapshot test**

Run: `pnpm exec vitest run packages/contracts/test/snapshot.test.ts`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add docs
git commit -m "docs: describe font pairs, their rollout order and ownership"
```

---

## Task 6: Editor model and pickers

**Files:**
- Modify: `apps/www/src/preset-editor/model.ts:34-45` (`designControls`), and wherever the model builds a `Preset` from a draft (find with `grep -n "validatePreset" apps/www/src/preset-editor/model.ts`)
- Modify: `apps/www/src/preset-editor/components/preset-controls.tsx:239-249` (`optionLabels`, `shapeKeys`)
- Test: `apps/www/src/preset-editor/model.test.ts`, `apps/www/src/preset-editor/components/preset-controls.test.tsx`

**Interfaces:**
- Consumes: `fontRegistry`, `fontById` (Task 1); `presetSchemaVersion` (Task 2).
- Produces:
```ts
export const fontControlOptions: {
  fontFamilyId: readonly string[]       // system ids plus registry ids with the body role
  headingFontFamilyId: readonly string[] // system ids plus registry ids with the display role
  monoFontFamilyId: readonly string[]    // 'system-mono' plus registry ids with the mono role
}
export function fontLabel(id: string): string   // 'Sans' | 'Serif' | 'Mono' for system ids, else the registry label
```
`designControls` gains `headingFontFamilyId` and `monoFontFamilyId` entries labelled `Display font` and `Code font`; `fontFamilyId` keeps its key and is relabelled `Body font`.

- [ ] **Step 1: Write the failing tests**

In `model.test.ts`:
- `font options respect roles`: `fontControlOptions.monoFontFamilyId` contains `jetbrains-mono` and `system-mono` and not `inter`; `headingFontFamilyId` contains `young-serif` and `fraunces`; `fontFamilyId` does not contain `young-serif` or `michroma`.
- `choosing a heading font writes schemaVersion 1.1`: editing `/design/headingFontFamilyId` to `fraunces` yields a valid preset with `schemaVersion === '1.1'`.
- `resetting the last extended font returns to 1.0`: clearing it again yields `schemaVersion === '1.0'`.
- `fontLabel('system-serif')` is `Serif` and `fontLabel('ibm-plex-mono')` is `IBM Plex Mono`.
In `preset-controls.test.tsx`: `renders Body font, Display font and Code font selects in the shape section` with the registry labels as options.

- [ ] **Step 2: Run to verify they fail**

Run: `pnpm exec vitest run apps/www/src/preset-editor/model.test.ts apps/www/src/preset-editor/components/preset-controls.test.tsx`
Expected: FAIL.

- [ ] **Step 3: Implement**

Add `fontControlOptions` and `fontLabel` to `model.ts`, derive `optionLabels` for font ids from `fontLabel`, add the two keys to `shapeKeys` in `preset-controls.tsx`, and set `schemaVersion: presetSchemaVersion(design)` wherever the model assembles a preset for validation, export or compile. A cleared optional font is removed from `design` rather than stored as `undefined`.

- [ ] **Step 4: Run to verify they pass**

Run: `pnpm exec vitest run apps/www/src/preset-editor && pnpm typecheck`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/www/src/preset-editor
git commit -m "feat(www): add display, body and code font pickers to the preset editor"
```

---

## Task 7: Preview loads the selected fonts

**Files:**
- Create: `apps/preview/src/preset-fonts.ts`
- Modify: `apps/preview/src/preset-preview.tsx` (strip imports from the injected styles; call the loader when the preset changes)
- Modify: `apps/preview/package.json` (exact-pinned Fontsource dependencies for every registry font)
- Test: `tests/integration/preview-fonts.test.ts`

**Interfaces:**
- Consumes: `fontRegistry` (Task 1); the compiled CSS from Task 3.
- Produces:
```ts
export function stripFontImports(css: string): string          // removes every @import of a registry Fontsource specifier, keeps all other CSS
export function presetFontIds(design: { fontFamilyId?: string; headingFontFamilyId?: string; monoFontFamilyId?: string }): string[]  // registry ids in use, deduplicated
export function loadPresetFonts(ids: readonly string[]): Promise<void>  // dynamic import() of each font's CSS from the preview bundle, once per id
```
`preset-fonts.ts` holds an explicit map from font id to a loader function (`() => import('@fontsource-variable/inter')` and so on) because Vite needs literal specifiers.

- [ ] **Step 1: Write the failing tests in `tests/integration/preview-fonts.test.ts`**

- `loader map covers exactly the registry`: the keys of the map in `preset-fonts.ts` (exported as `fontLoaders`) equal the registry ids.
- `stripFontImports removes registry imports only`: input `@import '@fontsource-variable/inter';@import "@fontsource/space-mono/400.css";:root{--a:1}@import url('keep.css');` returns a string that no longer contains `@fontsource` and still contains `:root{--a:1}` and `keep.css`.
- `presetFontIds ignores system ids and dedupes`: `{ fontFamilyId: 'system-sans', headingFontFamilyId: 'geist', monoFontFamilyId: 'geist' }` returns `['geist']`.

- [ ] **Step 2: Run to verify they fail**

Run: `pnpm exec vitest run --config vitest.integration.config.ts tests/integration/preview-fonts.test.ts`
Expected: FAIL (module not found).

- [ ] **Step 3: Implement**

Create `preset-fonts.ts` with the three exports and the exported `fontLoaders` map. Add the Fontsource packages to `apps/preview/package.json` with `pnpm --filter ./apps/preview add --save-exact --ignore-scripts <packages>` at the versions in the registry. In `preset-preview.tsx` wrap `presetRuntimeStyles(current.message.result)` with `stripFontImports(...)`, and add an effect that calls `loadPresetFonts(presetFontIds(design))` when the preset changes. Fonts load lazily, so only the selected ones are fetched.

- [ ] **Step 4: Run to verify they pass and the preview builds**

Run: `pnpm exec vitest run --config vitest.integration.config.ts tests/integration/preview-fonts.test.ts && pnpm build:preview`
Expected: PASS, and the build emits separate `.woff2` assets per font with no error.

- [ ] **Step 5: Commit**

```bash
git add apps/preview tests/integration/preview-fonts.test.ts pnpm-lock.yaml
git commit -m "feat(preview): load the selected preset fonts lazily from the bundle"
```

---

## Task 8: Consumer rows, specimen audit and evidence

**Files:**
- Modify: `scripts/consumer-matrix.ts` (optional `fonts` flag and two appended rows)
- Modify: `tests/integration/consumer-matrix.test.ts`, `tests/integration/foundation-groups.test.ts`, `tests/integration/foundation-browser-inventory.test.ts` (counts that follow the matrix)
- Modify: `scripts/generate-audit.ts` and `apps/preview/src/audit-page.tsx` (environment-selected fonts)
- Create: `docs/evidence/font-pairs.md`

**Interfaces:**
- Consumes: Task 3 output and the preview loader of Task 7.
- Produces:
```ts
// scripts/consumer-matrix.ts
export type ConsumerCase = { /* existing fields */ fonts?: true }
// two rows appended after the liquid-glass rows, so existing ids and ports are unchanged:
// { id: 'vite-fonts', family: 'ombelle', framework: 'vite', manager: 'pnpm', cliRuntime: 'node', fonts: true }
// { id: 'next-fonts', family: 'ombelle', framework: 'next', manager: 'pnpm', cliRuntime: 'node', fonts: true }
```
`generate-audit.ts` reads `OMBELLE_AUDIT_FONTS` as `<body>,<heading>,<mono>` (registry ids) and applies them to the compiled preset design before writing the audit data.

- [ ] **Step 1: Write the failing matrix test**

In `tests/integration/consumer-matrix.test.ts` assert `vite-fonts` and `next-fonts` exist, come after the glass rows, have unique ports, and that every pre-existing id keeps its previous port.

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm exec vitest run --config vitest.integration.config.ts tests/integration/consumer-matrix.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement the rows and follow the counts**

Add the `fonts` flag and the two rows. Teach the consumer input preparation (find how the glass rows pick their preset in `scripts/consumer-inputs.ts`) to use an `inter` body, `fraunces` display and `jetbrains-mono` code preset with `schemaVersion '1.1'` for rows with `fonts: true`. Update the count assertions in the two foundation tests that follow the matrix size. Add the `OMBELLE_AUDIT_FONTS` handling in `generate-audit.ts` and make `audit-page.tsx` call `loadPresetFonts` for those ids.

- [ ] **Step 4: Run to verify the tests pass**

Run: `pnpm exec vitest run --config vitest.integration.config.ts tests/integration/consumer-matrix.test.ts tests/integration/foundation-groups.test.ts tests/integration/foundation-browser-inventory.test.ts`
Expected: PASS.

- [ ] **Step 5: Build the font consumers**

Run: `pnpm build:packages && pnpm build:consumers` limited to the `vite-fonts` and `next-fonts` rows using the script's existing row filter.
Expected: both consumers build and their output carries the `.woff2` assets.

- [ ] **Step 6: Run the specimen audit for each intended pairing**

For each of these pairings run `OMBELLE_AUDIT_FONTS=<body>,<heading>,<mono> pnpm generate:preview && pnpm test:specimen-audit`, using the family that ships it as the family under audit: `dm-sans,dm-sans,geist-mono` (flat), `geist,geist,geist-mono` (minimalist), `work-sans,space-grotesk,space-mono` (neo-brutalism), `figtree,bricolage-grotesque,geist-mono` (ombelle), `inter,inter-tight,jetbrains-mono` (liquid-glass), `instrument-sans,fraunces,ibm-plex-mono`, `nunito,young-serif,geist-mono`, `exo-2,michroma,share-tech-mono`, plus the neutral `inter,inter,jetbrains-mono`. A failing font gets a font-scoped adjustment inside `fontRuleBlock`, never in a family base style; if that is not enough, the failure is recorded as a documented exception or the font is dropped.
Expected: audit green per pairing, or each failure recorded in the evidence file with its reason.

- [ ] **Step 7: Run the full verification and write the evidence**

Run: `pnpm build:packages && pnpm typecheck && pnpm test:unit && pnpm test:integration`
Expected: all green. Write `docs/evidence/font-pairs.md` recording the environment (OS, Node, pnpm, browser channel), each command run and its result, the audit outcome per pairing, and what was not run (for example the Yarn and Bun consumer rows if only the spike covered them).

- [ ] **Step 8: Commit**

```bash
git add scripts apps/preview tests docs/evidence/font-pairs.md
git commit -m "test: add font consumer rows, audit pairings and evidence"
```
