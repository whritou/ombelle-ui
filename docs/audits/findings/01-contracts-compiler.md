# 01 — Contracts and compiler

Date: 21 November 2026. Commit `d162ab30586f57a2bd8b88dc8511e43fd5664bbf` (0.9.1), branch `docs/1-0-audits-wave-1`. Windows 11, Node 24.19.0. Probes ran against `packages/*/dist` built from that commit (`pnpm build:packages`, run once by the audit harness, not by this audit).

**Covered:** `schemas/` (8 schemas), `packages/contracts/src` (22 files), `packages/compiler/src` (21 files), `scripts/sync-schema.mjs`, the catalog entry points the compiler calls (`getCatalog`, `getTemplate`, `resolveRecipePreset`, the built-in presets), the snapshot verification callers in `apps/www/src/snapshots/server/` and `packages/cli/src/snapshots/`, CI's generation steps, and the context docs (`docs/02`, `docs/04`, `docs/10`, `docs/decisions/`, `docs/web-alpha-readiness.md`). Throwaway probes live outside the repository; the commands are listed with each finding. Two read-only `GET` requests went to the production snapshot API. Nothing was written there.

**Not covered:** the per-component CSS and specimen generators in detail (`recipe-specimen.ts`, `component-recipe-styles.ts`, `recipe-styles.ts`). They belong to the catalog-quality audits, and I read them only for determinism hazards. The glass contrast maths was checked for determinism, not for whether the model is correct (audit 09 covers that). I did not rerun the existing unit suites.

**Path changes since the prompt was drafted (0.7.8):** every path the prompt names still exists. The prompt says "component preset" and "component recipe". In code those are `compileButtonPreset` (`packages/compiler/src/component-preset.ts`) and the schema-2.0 recipes (`packages/compiler/src/component-recipe.ts`, `schemas/component-recipe.schema.json`, 62 components, every catalog component except Button). The style-support table is `styleSupport` in `packages/contracts/src/style-families.ts`. `style-support.ts` only adds helpers on top of it.

## Summary

Within one build, the compiler keeps its determinism promise. Key order, id order, duplicates, line endings, number spelling and formatting all produce the same bytes, and I found no machine-, locale- or time-dependent input. Validation is strict: unknown fields are rejected everywhere, and the same colour checks run in every path. The promise breaks *across* releases, and published codes are exactly the inputs that cross releases. Built-in presets and catalog defaults change in place while `catalogRelease`, `compilerVersion` and every built-in preset `revision` stay fixed at `0.1.0` / `1`. Snapshot verification recomputes against today's built-ins, so codes published before such a change stop verifying. The production smoke recipe `rc_b511…@1`, which the release evidence cites, now answers `503`. Nothing in the 1.0 contract can version a future change to defaults. Two blockers, both rooted in versioning, need a decision before 1.0. The other findings are diagnostic precision, a validation gap, and schema identity that becomes expensive to change after 1.0.

## Findings

### CMP-01 Published preset and recipe codes stop verifying when a built-in preset or catalog default changes

- Severity: blocker
- Where:
  - `packages/compiler/src/snapshot.ts:65-77` (preset snapshot: re-resolve, then require canonical equality and an equal hash)
  - `packages/compiler/src/recipe-snapshot.ts:57-61` (recipe snapshot: `snapshot.preset` must equal today's resolved built-in)
  - `packages/compiler/src/resolve.ts:31-61` (`presetWithDefaults` merges today's family defaults)
  - `packages/catalog/src/recipe-preset.ts:3-21` (built-in looked up by `id` + `revision` only)
  - `packages/catalog/src/presets/*.json` (all at `revision: 1`)
  - callers that turn the failure into an outage or a refusal: `apps/www/src/snapshots/server/service.ts:18-21`, `apps/www/src/snapshots/server/recipe-service.ts:25-28` (any verification error becomes `503 SNAPSHOT_SERVICE_UNAVAILABLE`), `packages/cli/src/snapshots/input.ts:99`, `packages/cli/src/snapshots/cache.ts:28`
- What happens: a snapshot stores the normalized preset, plus for recipes the resolved built-in preset, and its hash. On every read the service and the CLI recompute that data with the current catalog and reject it if anything differs. Built-in presets have changed in place several times at `revision: 1` (`flat.json` on 2026-11-04 in 687c20cf, `neo-brutalism.json` gained `shadowColor`, `liquid-glass.json` changed in 7 commits). Decision 0003 accepted that bytes change. It did not cover the fact that stored snapshots then fail verification. Two cases follow:
  - Any Button recipe code published against `builtin-flat@1` before 2026-11-04 now fails with "Recipe snapshot preset must match its resolved built-in preset". The same holds for any recipe code whose built-in has changed since it was published.
  - A neo-brutalism preset code published from the built-in before `shadowColor` was added now fails with "Snapshot preset must already be normalized", because re-normalizing adds the new key.

  In production, `GET /api/v1/recipes/rc_b511c3b46cf3293bf58491e0839ddf48/1` returned `503 SNAPSHOT_SERVICE_UNAVAILABLE` on three requests. `GET /api/v1/presets/ps_7cca4bd460bbbd996abcf47cb07aa643/1` returned `200` in between, so the database was reachable. This is the smoke code that `docs/evidence/hosted-install-codes.md:40` and `docs/cli-release.md:174` cite as working. Any future edit to a built-in preset, or a new default key in any family, breaks every code published against it. A user sees "service unavailable" on the site and a refusal from the CLI. Neither says the code was invalidated.
- How verified: read end to end, then reproduced. `node probe.mjs` (scratchpad `audit-01/`) does the following:
  - It rebuilds the pre-refresh `flat.json` (`git show 687c20cf^:…`) and the 2026-11-02 `neo-brutalism.json` (`git show fc9ae399:…`), normalized as publication stored them.
  - Their hashes, `5ff15eb2…` and `d4408485…`, match the "before" column of decision 0003.
  - It calls `verifyRecipeSnapshot` and `verifyPresetSnapshot` on them. Both throw `INVALID_DATA` at `/preset`. The control recipe snapshot built from today's `builtin-flat` passes.

  The production `503` for `rc_b511…` fits this cause. Server logs would confirm it (see Unverified).
- Suggested change: make a published snapshot self-contained. Verify a snapshot's `preset` against its own stored canonical bytes and hash, not against today's built-in or defaults. Or freeze each built-in's content per `id@revision` and bump the revision on every change, with a test that fails when a built-in preset changes without a revision bump. Map integrity failures to a distinct, honest error rather than `503`.
- Effort: M

### CMP-02 `catalogRelease` and `compilerVersion` are constants, so the "versioned input gives identical bytes" contract has no version to pin

- Severity: blocker
- Where: `packages/compiler/src/compile.ts:90-95`, `packages/compiler/src/resolve.ts:68-73`, `packages/catalog/src/index.ts:135-141`, `packages/catalog/src/recipe-preset.ts:4`, `schemas/preset-snapshot.schema.json:15-16`, `schemas/component-recipe-snapshot.schema.json:16-17` (and the recipe snapshot schema), `apps/www/src/snapshots/server/service.ts:41`. Docs that promise otherwise:
  - `docs/02-system-architecture.md:113` ("Freeze token defaults and output order in each catalog release")
  - `docs/04-presets-and-contracts.md:26` ("Sparse preset inputs inherit the exact defaults from `catalogRelease`")
  - `docs/web-alpha-readiness.md:28` (PR6 "Reproducibility … Met")
- What happens: every accepted input must say `catalogRelease: "0.1.0"`, `compilerVersion: "0.1.0"`, and the snapshot schemas hard-code `const: "0.1.0"`. Yet the catalog behind that label has changed defaults, templates and CSS through 0.2–0.9.1 (decisions 0003 and 0004 record it). For example, the same sparse neo-brutalism input hashed `d4408485…` in 0.2 and hashes `4751cef6…` today. The lock and the compile provenance record the same `0.1.0/0.1.0` for different bytes, so they cannot tell which output a project holds. PR6's "identical versioned inputs give byte-identical artifacts" holds only within one package build, not for the versioned identifiers users actually pin. After 1.0, a defaults or template change has only two options: break CMP-01 style, or bump a version that four code paths and three schemas hard-code to a single value.
- How verified: read end to end (every check named above accepts only the literal `0.1.0`). The hash change was reproduced with `node probe.mjs` (`same sparse input, old hash d4408485… current hash 4751cef6…`). `git log` on `packages/catalog/src/presets/` shows the in-place edits.
- Suggested change: before 1.0, decide and document the versioning rule. Either the catalog release tracks the package release and the compiler accepts a set of supported releases, or `0.1.0` is redefined as "contract shape only" and the docs and PR6 stop claiming that it pins bytes. Also record the producing package version in provenance and the lock, so installed output can be traced to a build.
- Effort: M

### CMP-03 Component recipe prop defaults are written into the hashed, verified recipe data

- Severity: should-fix
- Where: `packages/contracts/src/component-recipe.ts:56` (`Object.assign(recipe, { props: { ...defaults, ...recipe.props } })`), `packages/compiler/src/component-recipe.ts:83` (hash over that data), `packages/compiler/src/recipe-snapshot.ts:57-59`
- What happens: `validateComponentRecipe` fills each schema `default` into `props` before hashing. Snapshots store the filled form, and verification refills defaults from the current schema and demands equality. If a later release adds a prop with a default to any of the 62 schema-2.0 components (the schema has had 20 commits since 2026-11-06), or changes a default value, every published snapshot of that component fails verification. A sparse local recipe file also changes its hash and scope. No default has been added or changed for an existing component yet (checked across every revision of `schemas/component-recipe.schema.json`), so this has not broken anything so far. It is the CMP-01 failure waiting for the first schema change.
- How verified: read end to end. `node probe.mjs` shows the defaults land in the normalized data (`spinner prop defaults filled into normalized data: {"size":"default"}`). Per-component default history was checked with a `git show` loop over the schema's revisions.
- Suggested change: hash and store the recipe as the author wrote it, applying defaults only at render time. Or treat adding a default as a schema-version change and enforce that with a test that compares defaults against the previous release.
- Effort: M

### CMP-04 Component recipes accept unknown heading and mono font ids when the component has no heading or code slot

- Severity: should-fix
- Where: `packages/compiler/src/component-recipe.ts:44-55` (drops `headingFontFamilyId` and `monoFontFamilyId` before the registry check when the role is absent), `schemas/component-recipe.schema.json` `appearance.fonts` (pattern only), `packages/contracts/src/component-recipe.ts:44-69` (no font check)
- What happens: `{ component: 'spinner', appearance: { fonts: { headingFontFamilyId: 'no-such-font' } } }` validates, compiles and gets a recipe hash. `normalizePublishedInstallableRecipe` accepts it, so it can be published as a code. The bogus id stays in the stored data. If a later catalog gives that component a heading or mono slot, which happens as components gain parts, the same code stops compiling with "Unknown font". This breaks "anything invalid is refused before any output exists".
- How verified: reproduced with `node probe.mjs`. Three variants, including `monoFontFamilyId: 'zzz'`, all compile, and the ids are kept in `recipe.data.appearance`.
- Suggested change: check every named font id against the registry and its role in `validateComponentRecipe`, whatever slots the component has. Then decide separately whether a font for an absent role is applied.
- Effort: S

### CMP-05 Several diagnostics point at the wrong JSON path, and recipe validation alone misses unknown fonts

- Severity: should-fix
- Where:
  - `packages/compiler/src/typography.ts:79-86` (hard-coded `/design/...` pointers)
  - reached from recipes through `packages/compiler/src/recipe.ts:114-116` and `packages/compiler/src/recipe-styles.ts:86-87`, and from component recipes through `packages/compiler/src/component-recipe.ts:76`
  - `packages/compiler/src/recipe-styles.ts:22-37` (dark-selector errors pass the raw selector as `path`)
  - `packages/contracts/src/recipe.ts:115-156` (`validateRecipe` does not check `overrides.fontFamilyId`)
  - the test that codifies the wrong pointer: `packages/compiler/test/recipe-fonts.test.ts:23-24`
- What happens:
  - A Button recipe with `overrides.fontFamilyId: 'no-such-font'` fails with path `/design/fontFamilyId`. That pointer does not exist in a recipe; it should be `/overrides/fontFamilyId`.
  - A component recipe with a bad or mono-only body font reports the same pointer instead of `/appearance/fonts/fontFamilyId`.
  - `compileRecipe({ darkSelector: '.dark .x' })` throws `UNSUPPORTED_PROJECT` with `path: ".dark .x"`. That is user input placed in the JSON-pointer field the CLI prints and serializes.
  - `validateRecipe`, which the editors call on their own (`apps/www/src/editor/preview-protocol.ts`, `demo-page.tsx`), accepts unknown font ids, so the error only appears at compile time.
- How verified: reproduced with `node probe.mjs` (the `FAIL … path=` lines for the four cases, and `validateRecipe accepts unknown font`).
- Suggested change: pass the caller's pointer prefix into `resolveTypography`, give the dark-selector errors a real pointer (or none) with the selector in the message, and run the font registry check in `validateRecipe`.
- Effort: S

### CMP-06 Schema identity is still placeholder text, and changing it after 1.0 is breaking

- Severity: should-fix
- Where:
  - `schemas/preset.schema.json:3-4` (`$id` `https://ui.example.com/schemas/preset-1.0.json`, title "Proposed UI Library Preset Version 1", while it accepts `schemaVersion` `1.0` and `1.1`)
  - `schemas/recipe.schema.json:3-4`
  - the six other schemas' `$id`s (all on `ui.example.com`)
  - `packages/contracts/src/snapshot.ts:14-22` and `recipe-snapshot.ts:16-20`, whose types are keyed by those `$id`s
  - `schemas/*-snapshot.schema.json`, which reference the preset by the `preset-1.0.json` `$id`
- What happens: the snapshot schemas resolve `$ref`s through these `$id`s, and the TypeScript types are built from them. Third parties who validate exported presets or snapshots will copy them. Renaming the host or the version suffix after 1.0 breaks external validators and the cross-schema refs. Today the `-1.0` suffix also contradicts the accepted `1.1` documents. Other parts of the 1.0 contract that are not versioned today:
  - the canonical form (`canonicalize` plus JavaScript number spelling)
  - the colour normalization spelling (`normalizeColor`: `oklch(0.50 0.10 200.0 / 100%)` becomes `oklch(0.5 0.1 200 / 1)`)
  - the materialization of `componentDefaults` and every family token into normalized data
  - the scope-hash input `{recipeHash, presetHash, catalogRelease, compilerVersion}`

  Changing any of them changes every hash.
- How verified: read end to end. The normalization spellings were reproduced with `node probe2.mjs`.
- Suggested change: before 1.0, settle a real `$id` base URL and titles, make the preset `$id` match the version range it accepts, and write down in `docs/04` that canonical form, colour normalization and default materialization are hash-affecting contract, versioned like the schema.
- Effort: S

### CMP-07 Contract docs state support that the code no longer matches

- Severity: nice-to-have
- Where: `docs/10-installation-and-theme-merging.md:48` vs `packages/compiler/src/component-preset.ts:52-59`; `docs/04-presets-and-contracts.md:147` vs `packages/contracts/src/component-recipe.ts:28`
- What happens:
  - `docs/10` says component presets (`add button --preset`) support "flat, minimalist, and neo-brutalism". `compileButtonPreset` accepts every family whose Button support is not `unavailable`: all seven stable families, plus liquid glass as experimental.
  - `docs/04` says schema-2.0 recipes cover "the 28 additional catalog components". The schema has 62 (every catalog component except Button).
- How verified: read end to end. The count came from `schemas/component-recipe.schema.json` `oneOf` branches with a `node -e` one-liner.
- Suggested change: take both statements from the code (or drop the count).
- Effort: S

### CMP-08 CI regenerates the schema copies but never fails when the committed copies are stale

- Severity: nice-to-have
- Where: `.github/workflows/ci.yml:32,36` (`pnpm build:packages`, `pnpm typecheck`, both run `scripts/sync-schema.mjs` first), `scripts/sync-schema.mjs:1-26`, the committed `packages/contracts/src/*-schema.ts`. The `styleFamily` enum in `schemas/preset.schema.json:16` duplicates `packages/contracts/src/style-families.ts:4-5` with no test that they agree (the font enums do have one, in `packages/catalog/test/fonts.test.ts`).
- What happens: if someone edits `schemas/*.json` and commits without building, CI silently regenerates the TypeScript copy and tests that instead. The checked-in copy stays stale, and anyone who runs tests or a type-check against source without building sees the old schema. The two copies match at this commit (byte comparison after JSON parse), so this is a guard gap, not a current defect. For the style-family enum, drift would surface at runtime as a confusing `INVALID_DATA` at `/styleFamily` (from `isStyleFamily` in `compile.ts:99`), not at build time.
- How verified: read end to end. The copies were compared with a `node -e` script over all eight schemas.
- Suggested change: add `git diff --exit-code packages/contracts/src packages/catalog/src/generated.ts` after the CI build step, plus a one-line test that the schema's `styleFamily` enum equals `styleFamilies`.
- Effort: S

## Unverified

- **Cause of the production `503` for `rc_b511…@1`.** It fits CMP-01 (preset reads on the same host returned `200`), but `recipe-service.ts` maps every failure to `503`. The server log for request id `5a195967-df00-4b7c-a6d0-e253557934c1` (or a local `verifyInstallableRecipeSnapshot` over the stored row) would settle it.
- **CLI behaviour for projects that installed a now-invalid code.** `packages/cli/src/snapshots/cache.ts:28` re-verifies cached snapshots. A project whose lock pins `rc_b511…` may be refused on a later `add` or `--offline` run. Audit 02 should run the built CLI against a lock with a pre-2026-11-04 recipe cache entry.
- **Glass contrast results across JavaScript engines.** `glass-contrast.ts` (lines 174-204) uses `**`, `Math.cos` and `Math.sin`. ECMAScript lets their last bits differ between engines (V8 in Node, JavaScriptCore in Bun and Safari). A pair sitting exactly on 4.5:1, or a `nested` step boundary, could flip pass/fail or change `--glass-nested-opacity` between the Node CLI, Bun, and the browser editor. That would break "same bytes on any machine" for liquid-glass output. Running the glass compile tests under Bun and in WebKit, and comparing `theme` output for the built-in and starting presets, would settle it.

## Looked at and found sound

- **Canonical hashing.** `canonicalize` sorts keys by UTF-16 code unit (locale-free; all keys are schema-limited ASCII), it is only called on schema-validated data, `-0` canonicalizes to `0`, and lone surrogates are escaped by `JSON.stringify`, so `x\uD800` and `x�` hash differently (probe). `sha256` uses WebCrypto over UTF-8. Every hash that is computed or compared goes through these two functions: preset hash, recipe hash, scope, artifact hashes, snapshot checks.
- **Determinism within a build.** `compile()` dedupes and sorts component ids. The order of `prefixedComponents` does not matter: the probe compiled `['card','button','input','button']` with prefixes `['input','button']`, and `['input','card','button']` with `['button','input','button']`, and got byte-identical results. Artifacts and dependencies are sorted. Prettier is pinned at 3.10.1 with `endOfLine: 'lf'`. `sync-catalog.mjs` strips CR from templates, and `.gitattributes` keeps the generated files LF. No `Date`, `Math.random`, `process`, `path` or locale API appears in `packages/compiler/src`. NaN and Infinity are rejected by the schema.
- **Unknown-field rejection.** `additionalProperties: false` on the preset, the recipe, every one of the 62 component-recipe `props` and `content` branches, `appearance`, and all four snapshot envelopes.
- **Colour validation.** The schema pattern plus `assertColorValue` run for preset modes, recipe colour overrides (all nine keys per mode) and component-recipe part colours. Malformed numbers such as `1.2.3` fail as non-finite. `color-syntax.ts` is used only for the Color Picker's content value and mirrors the template parser, which the comment says a catalog test keeps in agreement.
- **Style-support table.** One function, `styleSupport`, is read by the compiler (`assertStyleAvailable`, `compileButtonPreset`), the CLI (`main.ts`, `plan/theme.ts`) and the website and editors. I found no private copy. Every one of the 63 components is in `glassExperimental`, so `STYLE_UNAVAILABLE` is currently unreachable, as `docs/05-cli-specification.md:147` already says.
- **Merge precedence in `presetWithDefaults`.** Family defaults are overlaid by the preset at the top level, per key in `design`, per token in each mode, and per field in `componentDefaults.button` over `{variant:'default', size:'default'}`. Component-recipe glass and fonts are layered on the built-in preset before compile. Button recipe props default from the preset's Button defaults. This matches `docs/04` and `docs/10`.
- **Snapshot references.** `ps_`/`rc_` plus 128 random bits from the store, parsed strictly. The same identity cannot be issued to two inputs. Two distinct inputs always differ in `presetHash`, because `id`, `name` and `revision` are inside the hashed data.
- **Generated schema copies.** All eight match their `schemas/` sources at this commit.
