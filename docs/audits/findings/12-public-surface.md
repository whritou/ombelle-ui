# 12 — Public surface, documentation and release readiness

- Date: 22 November 2026.
- Tree: `docs/1-0-audits-wave-3` at `9317458a`. This is 0.9.1 plus the wave 1 fixes (PR #189) and the liquid glass stable change (PR #190).
- Wave 2: the wave 2 fixes (PR #191, `feat/1-0-wave-2-findings-fce8bb`) are not in this tree. They will land before 1.0. I inventoried their public surface from `git diff docs/1-0-audits-wave-1 feat/1-0-wave-2-findings-fce8bb` and from that branch's CHANGELOG, and list it under "Public surface added by the three 1.0 PRs".

**Covered**
- The CLI: commands, flags, prompts, exit codes, `--json` shapes, environment variables, and the files it writes into projects. I compared it with `docs/05-cli-specification.md` in both directions.
- Schema versioning and compatibility.
- Diagnostic codes.
- The hosted API.
- Installed source: files, exports, `data-*` attributes and custom properties.
- What is published.
- Versioning and the CHANGELOG.
- What a migration guide must contain.
- Licences.
- Docs health.
- README and site support claims.
- The publishing pipeline.
- Contributor files.

**Not covered**
- The CLI was not run. The concurrent install and build had not produced `packages/cli/dist` or `.artifacts/wave3-ready` by the time this was written, so every CLI statement below rests on reading the code path end to end.
- No hosted endpoint was called.
- Liquid glass shipping as stable is the maintainer's decision. I do not re-open it; I only judge whether the public contract states it clearly.
- Owner decisions already recorded elsewhere (CMP-06, SEC-03, SEC-05, SEC-08, RL-03/06/07, CAT-17) appear in the contract outline as decisions to make. They are not re-audited.

Subagents did the wide reading: the CLI-versus-spec comparison, the diagnostic-code sweep, the docs link and anchor check, and the licence inventory. Before using any of it in a finding, I re-read every code location cited.

## Summary

The product is in better shape than its paperwork. The CLI is small and strict: three commands, a consistent exit-code map, immutable hosted codes and a careful transaction model.

The surface that 1.0 would freeze, however, is mostly undeclared:
- **CLI spec.** The normative CLI document still describes a "proposed" interface with commands that do not exist.
- **README and docs.** They make claims that are false today, in both directions.
- **Site prerequisites.** The "you need" list omits the exact React 19.3.1 pin, which refuses stock Vite and Next apps.
- **Upgrades.** Nothing gives an upgrade route for installed source whose catalog bytes changed. All three 1.0 PRs change such bytes, and the CLI refuses to refresh even an unedited managed file.
- **Compatibility.** The schema compatibility model is "reject anything unknown with `INVALID_DATA`", with no version bump when allowed values grow. Only the website knows which CLI version a document needs.

1.0 should not ship before it has:
- an accurate CLI specification and README;
- a migration route and a migration guide;
- complete prerequisites;
- a short public-contract page that says what is frozen and what is not.

The rest is should-fix documentation and naming debt. It is cheap to clear now and expensive after the freeze.

**Findings:** 4 blockers, 11 should-fix and 3 nice-to-have.

## Findings

### PUB-01 Installed source whose catalog bytes changed has no upgrade route and no migration guide
- Severity: blocker
- Where:
  - `packages/cli/src/plan/components.ts:256-275`: any managed file whose planned bytes differ becomes `conflict`, with "Existing source requires an explicit migration".
  - `packages/cli/src/plan/components.ts:183-202`: `--overwrite` and `--beside` are refused for files the lock manages.
  - `docs/05-cli-specification.md:68`: `update` is "Later explicit migration workflow".
  - `docs/foundation-local-usage.md:42-58`: the only migration section, for the native form controls. It uses delete and re-add.
  - `docs/components/liquid-glass.md:107`: "Upgrading from 0.4.x".
- What happens:
  - The 1.0 PRs change installed bytes widely:
    - Wave 2: template bytes in both editions for about 15 components; `data-slot` attribute order in every template; stable-family CSS for all seven families (`packages/compiler/test/fixtures/stable-family-hashes.json` changes 788 lines); and a new `@radix-ui/react-slot` dependency for the Radix Sidebar.
    - Glass PR: glass CSS, `ui-style.css` and `examples/data-table.tsx`.
  - On a 0.x project with the 1.0 CLI, `add` of an installed component whose template changed reports `FILE_CONFLICT` and exits 4, even if the user never edited the file. `--yes` cannot bypass the conflict, `--overwrite` is refused for managed files, and there is no `update` command.
  - The only working route is undocumented except for the one Dialog case: delete the managed file and `add` again, so the lock entry plans as a create.
  - An edited file has no route at all. There is no `diff` and no way to print the new bytes for a managed path.
  - No 0.x to 1.0 migration guide exists.
- How verified: read end to end (the conflict branch of `planComponents` and the resolution guard). Not reproduced, because the CLI was not built during the audit.
- Suggested change: before 1.0, either ship a minimal `update <id…>` that refreshes unedited managed files under the existing transaction safeguards and still conflicts on edits, or document delete-and-re-add as the supported route. Either way, write `docs/upgrading-to-1.0.md`; the "Migration guide contents" section below lists what it must cover.
- Effort: M for the documented route and guide, L for an `update` command.

### PUB-02 The normative CLI specification describes an interface that does not exist
- Severity: blocker
- Where: `docs/05-cli-specification.md` throughout, plus:
  - `docs/04-presets-and-contracts.md:105`;
  - `docs/10-installation-and-theme-merging.md:11,17-33`;
  - against the code at `packages/cli/src/main.ts:115-118`, which dispatches only `init`, `add` and `theme add`.

  The relevant lines in docs/05:

  | Line(s) | Doc says |
  | --- | --- |
  | `:5`, `:13` | "proposed public interface"; "## Proposed commands" |
  | `:17-49` | Examples use `@your-ui/cli@0.1.0`, `ps_brand@3` and `rc_primary-button@2` |
  | `:32-33`, `:45-49`, `:62-68` | Rows for `preset apply`, `preset show`, `info --json`, `doctor`, `diff` and `update` |
  | `:64` | `theme add` is an alias of `preset apply --only theme` |
  | `:70` | `--only` |
  | `:97` | "one `your-ui` binary" |
  | `:185` | "private local CLI"; a bare code needs `--snapshot-origin` and `--preset-hash` |
- What happens:
  - **Documented but not implemented.** Each exits 2 with the usage text (`main.ts:111`, `:115-116`):
    - `preset apply`, `preset show`, `info`, `doctor`, `diff`, `update` and `--only`;
    - preset selection in `init` (`--preset` is required, `main.ts:146-154`);
    - adoption of compatible existing components (`:105`; only shadcn `lib/utils.ts` is adopted);
    - before and after theme values (`:131`);
    - diff or manual-migration output (`:129`);
    - credential redaction (`:143`);
    - manager-specific recovery commands (`:139`);
    - a JS config or a config-path flag (`:103`).
  - **Implemented but missing from 05:**
    - `--help`, `--offline` and `--recipe-hash`;
    - the non-TTY rule that writes require `--yes` (`main.ts:362-367`);
    - the JSON statuses and the extra JSON fields (PUB-06);
    - every environment variable and every project file name (PUB-08);
    - the refusal to switch from one stable family to another (`packages/cli/src/plan/theme.ts:51-60`);
    - the CSS entry discovery order (`inspect.ts:177-186`);
    - the exact React pin (PUB-04).
  - **Wrong in 05:**
    - Line 9 says ordinary `add` supports 8 components; the code supports 63 (`packages/contracts/src/component-ids.ts`).
    - Line 95 says Radix only; Base UI ships.
    - Line 147 duplicates a sentence.
    - Line 198 omits that the prompt drops `[b]eside` for non-component files and is suppressed by `--json` and `--dry-run`.
  - After 1.0, this file is the contract people will hold the project to.
- How verified: read end to end; each command and flag traced through `runCli` (`main.ts:72-175`).
- Suggested change: rewrite 05 as "the 1.0 CLI", stating only what `main.ts` implements. Move `preset apply`, `info`, `doctor`, `diff` and `update` to a clearly labelled "Not in 1.0" section. Make the same edit in docs 04 and 10.
- Effort: M

### PUB-03 README and current-state docs make false claims, in both directions
- Severity: blocker
- Where:
  - **README.md:**
    - `:3-6`: CLI 0.9.0 "is not published yet". It is published: `apps/www/src/snapshots/install-command.ts:6`, `docs/cli-release.md:23` and `README.md:111` all say so.
    - `:44`: 12 components in four styles.
    - `:69`: "forty-five-component gallery" and "private local CLI".
    - `:111`: "twenty-nine in published CLI 0.7.2".
    - `:116-131`: "private built CLI"; "Remote and saved preset codes … remain pending"; "Remote recipe codes remain planned". All of these are accepted: `packages/cli/src/snapshots/input.ts:28-66`, `recipe-input.ts:137-175`.
    - `:136-142`: a duplicated section on component-scoped Button presets.
  - **docs/foundation-local-usage.md:**
    - `:34`: "No public package, hosted snapshot endpoint … is provided".
    - `:103`, `:119`, `:130`: codes are rejected, and three families only.
  - **docs/cli-release.md:**
    - `:138`: the published installer is 0.8.3.
    - `:217`: code pages use 0.7.7.
  - **Other docs:**
    - `docs/04-presets-and-contracts.md:137`: "Recipe snapshots are not implemented".
    - `docs/06-online-editor.md:91-102`: a "Proposed snapshot API" with endpoints that do not exist, `GET /r/{release}/{item}.json` and `GET /api/v1/catalog/{release}`.
    - `docs/02-system-architecture.md:29,39`: one Radix edition; object storage.
    - `docs/web-alpha-readiness.md:39,50`: four families; no components pages.
  - **Links into internal plans:** the README links its opening paragraphs and its reading list into `docs/superpowers/` agent plans (`README.md:7-8,18-42,104-105`).
- What happens: the README is a chronological log, not a description of the product. It understates what the CLI does today (codes are called "planned") and shows readers outdated scope. The common rules count a false public claim as a blocker.
- How verified: read end to end; each claim checked against the code cited.
- Suggested change:
  - Rewrite the README around the 1.0 product: what it is, prerequisites, the three commands, families and components with counts taken from code, the support statement, and links to the contract page and the docs.
  - Move the history into the CHANGELOG.
  - Fix or delete each stale sentence listed above.
- Effort: M

### PUB-04 Support claims omit the exact React pin, and no browser support is stated
- Severity: blocker
- Where:
  - `packages/cli/src/project/inspect.ts:110-117`: refuses unless `react` and `react-dom` are declared exactly `19.3.1`. Ranges get `UNSUPPORTED_PROJECT`, exit 3.
  - The site states the prerequisites without the pin:
    - `apps/www/src/site/home/journey.tsx:108`: "You need Node 24.19.0 or newer Node 24 and a Vite React TSX or Next.js App Router TSX app with Tailwind v4".
    - `apps/www/src/site/docs/guides.tsx:182`.
    - `apps/www/src/site/home/landing.tsx:66,111`.
  - The pin appears only in `docs/foundation-local-usage.md:38`.
  - Browser support: no statement anywhere. Evidence is Chromium-only (`README.md:86`). Refraction is "in Chromium browsers" (`main.ts:68`).
- What happens:
  - A user who follows the site with a stock `create-vite` or `create-next-app` project gets a caret-range React declaration and is refused before any write.
  - Frozen at 1.0, "React 19.3.1 exactly" would block every React patch release.
  - Users will assume evergreen browser support that has not been measured.
- How verified: read end to end; site strings found by grep.
- Suggested change: decide the React range for 1.0 (for example `>=19.2 <20`, tested at the pin) and state it on the site, in the README and in the contract. Publish a browser statement that matches the evidence at release.
- Effort: S to document, M to relax the pin with tests.

### PUB-05 Schema compatibility is signalled by validation failure, not by version, contrary to the documented rule
- Severity: should-fix
- Where:
  - Every schema in `schemas/` has `additionalProperties: false`.
  - `schemas/preset.schema.json`: `schemaVersion` enum `["1.0","1.1"]` under `$id` `preset-1.0.json`.
  - `packages/contracts/src/validate.ts:9-22`: any schema error becomes `INVALID_DATA`.
  - `packages/contracts/src/contract-release.ts:1-12`: the contract release is still `0.1.0`.
  - CHANGELOG 0.8.0 to 0.8.2: "gains `organic` in `styleFamily`, which older CLIs reject", with no version change.
  - `apps/www/src/snapshots/install-command.ts:6-60` and further: hand-written minimum-CLI tables per component, field and value.
  - `docs/04-presets-and-contracts.md:145-149`: "Increment the JSON schema version when data meaning or allowed structure breaks … Unknown major versions fail with a clear upgrade instruction."
- What happens:
  - Across 0.4 to 0.9, new enum values, components and recipe fields were added without a schema or contract version change.
  - An older CLI given a newer document fails with `INVALID_DATA`, an AJV message and a pointer such as `/styleFamily`. No CLI path ever says "needs CLI x.y": a grep for "newer" or "upgrade" across the CLI, compiler and contracts finds none.
  - Only the website knows which CLI a document needs. Third parties and the JSON-download path get no help.
  - The reverse direction works: newer CLIs accept older documents, and built-in presets are frozen per `id@revision`.
  - After 1.0, every new family, component or field repeats this silent break.
- How verified: read end to end (schemas, validator, contract release, website gating tables).
- Suggested change: write down the 1.0 rule for additive changes. Have the CLI map an unknown enum value, component or `schemaVersion` to `UNSUPPORTED_RELEASE`, with a "needs CLI ≥ x" `nextAction`, driven by a table in `@ombelle/contracts` instead of the website.
- Effort: M

### PUB-06 `--json` output has no version and carries untyped notices and whole files
- Severity: should-fix
- Where:
  - `packages/cli/src/format.ts:2-31` and `packages/contracts/src/types.ts:144-181`: the plan record.
  - `packages/cli/src/main.ts:404-415`: the error record.
  - `main.ts:54-74`: glass notices are free text.
  - CHANGELOG Unreleased: the glass notice text changed ("JSON `notices` change accordingly").
- What happens:
  - **No version.** The output has no `version` or schema field.
  - **Untyped text.** `notices` and `managerWarning` are prose, so tools can only match strings. The glass PR has already broken any consumer that matched `liquid-glass is experimental for …`.
  - **Whole files.** `changes[].afterContent` embeds the full bytes of every planned file, including the whole global CSS. Freezing that freezes output size and content.
  - **Odd `command` value.** When flag parsing fails, `command` is `args[0]`, which can be a flag (`main.ts:82`).
  - **Prompt despite `--json`.** On a TTY, the apply prompt still appears with `--json` (`main.ts:362-374`).
- How verified: read end to end.
- Suggested change:
  - Add `outputVersion: 1` to every JSON record.
  - Give each notice a stable `code` (for example `GLASS_ACCESSIBILITY_CAVEAT`, `GLASS_FILTER_MOUNT`, `DEPENDENCY_KEPT`) beside its message.
  - Decide whether `afterContent` is part of the contract.
  - Settle CLI-09 (deferred) together with this.
- Effort: M

### PUB-07 Diagnostic codes are an implicit, undocumented set
- Severity: should-fix
- Where:
  - `packages/contracts/src/diagnostics.ts:1-19`: `code: string`.
  - The exit map at `packages/cli/src/main.ts:38-48` is the only list of codes.
  - `apps/www/src/snapshots/server/errors.ts:1-18`: the HTTP codes.
  - `docs/05-cli-specification.md:143` promises "stable error codes", but none are listed anywhere.
- What happens:
  - Only four codes are documented by name: INVALID_DATA, FILE_CONFLICT, STYLE_UNAVAILABLE and UNKNOWN_COMPONENT.
  - These have no documentation by name:
    - UNSUPPORTED_PROJECT (only its edition cases are described);
    - UNSUPPORTED_RELEASE, RESOLUTION_FAILURE, DEPENDENCY_FAILURE and INTERNAL_ERROR;
    - INVALID_REFERENCE, which is missing from the exit map and so exits 1 instead of 2 (`contracts/src/snapshot.ts:58`, `recipe-snapshot.ts:46`, `main.ts:422`);
    - nine of the eleven HTTP-only codes. SNAPSHOT_NOT_FOUND and SNAPSHOT_SERVICE_UNAVAILABLE appear only in operator docs.
  - Nothing documented is never emitted.
  - The full table is in Appendix A.
- How verified: read end to end (a grep of every `FoundationError` and `SnapshotServiceError` construction, plus the exit map).
- Suggested change:
  - Make the code set a typed union in `@ombelle/contracts`.
  - Map INVALID_REFERENCE to exit 2.
  - Publish Appendix A in the CLI and API docs.
- Effort: S

### PUB-08 Project files, environment variables and the lock format have no published definition
- Severity: should-fix
- Where:
  - **Types without schemas:** `packages/contracts/src/types.ts:80-111` defines `ProjectLock` and `ProjectConfig`, and neither has a schema in `schemas/`.
  - **Validation:** `packages/cli/src/project/inspect.ts:118-138,194-206` checks only `configVersion === 1` and `lockVersion === 1`, plus the overall shape.
  - **File names:**
    - `packages/cli/src/plan/components.ts:118`: the config is always written as `ui-library.config.json`.
    - `packages/cli/src/apply/recovery.ts:9-31`: `.ombelle-operation.lock`, now a JSON owner record (PR #189).
    - `.ombelle-transactions/<uuid>/{plan.json,recovery.json,…}`.
  - **Environment variables:**
    - `OMBELLE_DEPENDENCY_TIMEOUT_SECONDS` (`apply/manager.ts:23-28`) and `OMBELLE_YARN_ENTRY` (`manager.ts:209`) are documented only in the CHANGELOG.
    - `OMBELLE_SNAPSHOT_CACHE_DIR` is documented only in `docs/snapshot-service-operations.md`.
    - `LOCALAPPDATA` is required on Windows (`snapshots/cache.ts:94-96`).
  - **Unused field:** `registryBase` is typed but never read.
  - **CLI version:** `docs/decisions/0009-snapshot-identity-and-contract-version.md:36` records that the lock does not store which CLI version wrote it.
- What happens:
  - **The lock grew without a version bump.** It gained `edition`, `placements`, `presetSource`, `componentPresetSources`, `componentPresets`, `recipes` and `recipeSources`, all under `lockVersion: 1`. Users commit this file.
  - **Mixed file naming.** The names mix generic `ui-library.*`, `ui-preset.json` and `styles/ui-style.css` with branded `.ombelle-*`, `ombelle-examples/` and `components/ui/ombelle/`. The generic names can collide with other tools.
  - **Late timeout check.** An invalid timeout value is checked only after the source files have been written. It surfaces as DEPENDENCY_FAILURE (exit 6) after a rollback (`manager.ts:23-28,84`).
- How verified: read end to end.
- Suggested change:
  - Publish JSON schemas for the config file and the lock.
  - Settle the file names before freezing them.
  - Drop `registryBase`, or document it.
  - Document every environment variable in one table, and validate them before planning.
  - If the lock is ever going to record the CLI version that wrote it (0009), 1.0 is the moment to add it.
- Effort: M

### PUB-09 Nothing declares which parts of installed source are public, and several internal names leak
- Severity: should-fix
- Where:
  - **Helper functions exported from component files:**
    - `packages/catalog/src/templates/code-block.tsx:109-442`
    - `color-picker.tsx:37-189` (11 colour helpers)
    - `data-table.tsx:12-70` (`useDataTable`, `selectColumn`, and from wave 2 `dataTableLabels`)
    - `number-input.tsx:8-24` and `slider.tsx:102`, which export two different `stepValue` functions
    - `liquid-glass-filter.tsx:30-109`
  - **`data-*` attributes:**
    - Doubled names `data-data-table-*` (`data-table.tsx:45,51,59`).
    - `data-mode` means different things in different components (`chip.tsx:38,50`, `meter.tsx:58`, `color-picker.tsx:404`).
  - **Unprefixed design tokens:** `--control-height`, `--border-width`, `--shadow-x`, `--shadow-y`, `--motion-duration` and `--font-family` (`packages/compiler/src/preview-styles.ts:46-56`). Yet `docs/03-components-styles-accessibility.md:178` says additional tokens use the `--ui-` prefix (`--ui-control-height` …).
  - **Terse family variables:** `--o-*` (13) and `--rf-*` (28), set on every `[data-slot]` (`styles/organic.css:131`, `styles/retro-futurism.css:131`).
  - **Unprefixed keyframes:** `progress-ring-spin`, `table-skeleton-pulse` and `toast-spinner-turn` (`styles/progress/flat.css:195`, `styles/table/flat.css:154`, `styles/toast/flat.css:200`).
  - **Global reduced-motion rules:** they apply `!important` to every `[data-slot]` (`styles/flat.css:23` and the other families).
  - **Edition leaks:**
    - Base UI templates use `--radix-*` names (`templates/base/accordion.tsx:191`).
    - Wave 2 gives `SidebarMenuButton` different props per edition: `asChild` in Radix, `render` in Base UI.
  - **`buttonVariants` is not exported:** CAT-17, deferred.
- What happens:
  - Users will import whatever is exported and target whatever attribute or variable they see. After 1.0, renaming any of these breaks someone.
  - The docs promise `--ui-control-height`, while the code writes `--control-height` into users' global CSS, where it can collide with variables from the app or other libraries.
- How verified: read end to end. Token names re-checked at `preview-styles.ts:51` against docs/03:178.
- Suggested change:
  - Declare the public installed surface on the contract page: component exports and documented props, `data-slot` values, the documented state attributes, and the token custom properties. Everything else is internal.
  - Before 1.0, rename the leaks (the doubled `data-data-table-*` names and the unprefixed keyframes).
  - Either adopt the `--ui-` prefix or correct docs/03.
- Effort: M

### PUB-10 Installed source carries no attribution, and one CLI notice names the wrong version
- Severity: should-fix
- Where:
  - `packages/catalog/src/templates/**` and `styles/**`: grep finds no licence, copyright, SPDX or shadcn mention.
  - `docs/08-decisions-risks-and-governance.md:43`: "Preserve applicable copyright and permission notices in redistributed source and maintain a dependency and asset inventory".
  - `docs/03-components-styles-accessibility.md:126`: components follow shadcn composition and names.
  - `scripts/pack-cli.mjs:59-62`: notices are taken from the catalog's resolved versions.
  - `packages/catalog/src/manifest.ts:40`: installs pin `lucide-react` 1.55.0, while `packages/catalog/package.json` has 1.72.0.
  - `docs/07-delivery-plan.md:65`: a licence inventory is listed as release work.
- What happens:
  - **shadcn/ui notice.** If any template is derived from shadcn/ui code, MIT requires its notice. Nothing copied into user projects carries it, and `THIRD_PARTY_NOTICES.txt` cannot carry it, because shadcn is not a dependency.
  - **Ombelle notice.** Installed files carry no Ombelle notice either.
  - **Wrong lucide-react version.** The CLI notices describe lucide-react 1.72.0, while users receive 1.55.0.
  - **Fonts are fine.** They are not copied; they arrive as OFL-1.1 Fontsource dependencies (`packages/compiler/src/typography.ts:91,97`).
- How verified: read end to end.
- Suggested change:
  - Decide whether templates derive from shadcn. If they do, add a one-line MIT attribution to each installed component file, or have the CLI write a `NOTICE` once.
  - Align the catalog `lucide-react` dependency with the install pin.
  - Write the licence inventory: installed runtime dependencies, bundled CLI dependencies and fonts.
- Effort: S

### PUB-11 The release pipeline depends on one maintainer's machine and memory
- Severity: should-fix
- Where:
  - `docs/cli-release.md:1-230`:
    - It is an append-only log.
    - It has three "Release 0.x in this order" blocks (0.5.0, 0.4.1, 0.4.0) and no generic procedure.
    - Lines 23, 138 and 217 name three different "current" installers.
  - `scripts/pack-cli.mjs:111-117`: a dirty working tree is recorded but not refused. The same doc records dirty packs for 0.3.0, 0.6.0, 0.7.1 and 0.7.2 to 0.7.5.
  - `scripts/pack-cli.mjs:91-99`: the generated manifest has no `repository`, `homepage` or `bugs`, and its description is "Guarded source installer for Ombelle presets and Button recipes".
  - `.github/workflows/`: no publish workflow. Provenance (SEC-03) is deferred.
  - `apps/www/src/snapshots/install-command.ts`: the website's gating tables are maintained by hand.
  - `docs/cli-release.md:154`: records the 0.4.1 release published out of order.
- What happens:
  - **Manual steps.** Publishing is a manual `npm publish` by the `ombelle` identity, then a manual `version:set --published` commit, then a deploy.
  - **Uncommitted sources.** A tarball can be packed from uncommitted sources; this is shown only by a flag in `release.json`.
  - **Hard to follow.** Nobody else can follow the doc without reading its whole history.
  - **Wrong deploy order.** Deploying the site before publishing the CLI emits codes that the advertised installer rejects. Only the cases someone remembered to gate are protected.
  - **Skipped gate.** `pnpm check:foundation` was not completed for several releases (`cli-release.md:186-192`).
- How verified: read end to end.
- Suggested change:
  - Split `cli-release.md` into a generic procedure (pack, verify, publish, `version:set --published`, deploy) and a dated history.
  - Make `pack:cli` refuse a dirty tree unless overridden.
  - Complete and correct the manifest fields.
  - Settle SEC-03 (CI publish with provenance).
- Effort: M

### PUB-12 Version sites agree, but VERSION.txt is stale and the CHANGELOG is not an upgrade document
- Severity: should-fix
- Where:
  - `VERSION.txt:1-3`: "Documentation version 0.2 / 19 October 2026". `scripts/set-version.mjs` does not manage this file.
  - `CHANGELOG.md:301,307,317`: legacy headings.
  - `CHANGELOG.md:25`: 0.9.1 is dated although it is unpublished (`docs/cli-release.md:12`).
- What happens:
  - **Version checks pass.** `set-version --check` reports 10 sites at 0.9.1, and `--check --published` reports 9 sites at 0.9.0. VERSION.txt contradicts them.
  - **Mixed CHANGELOG entries.** The CHANGELOG mixes website, docs and installed-source changes, with no Breaking or Upgrade markers.
  - **Hard-to-find byte changes.** Twenty-three entries mention changed bytes or installed output, and they are not separated from website polish.
  - **Versions not distinguished.** Workspace versions and published installer versions look the same.
  - **No upgrade path.** Someone upgrading from 0.x cannot find what changes in their project.
- How verified: ran `node scripts/set-version.mjs --check` and `--check --published`; read the CHANGELOG and VERSION.txt.
- Suggested change:
  - Delete VERSION.txt, or manage it with `set-version`.
  - From 1.0, group each release under Installed source, CLI, Contracts and Website, with explicit breaking and upgrade notes.
  - Mark which versions are published to npm.
- Effort: S

### PUB-13 Internal planning material, machine paths and infrastructure identifiers ship in the public docs
- Severity: should-fix
- Where:
  - **Internal material:**
    - `docs/superpowers/`: 96 files, 2.2 MB of agent plans with "REQUIRED SUB-SKILL" instructions.
    - `docs/evidence/`: 459 files, 31 MB, of which 29 MB is PNG.
    - `docs/07-delivery-plan.md`: staffing.
  - **Local machine paths:**
    - `docs/evidence/m2-components.md:9,25`
    - `docs/evidence/real-world-installations-2026-11-08.md:131`
    - about 19 local temporary paths in `docs/evidence/*.json`
  - **Neon identifiers** (SEC-08, deferred):
    - `docs/production-operations.md:3,33,77`
    - `docs/evidence/hosted-install-codes.md:13,49`
    - `scripts/restore-drill.sh:11`
    - `scripts/cleanup-neon-preview.sh:7`
  - **Personal Vercel team slug:**
    - `docs/hosted-deployment.md:3`
    - `docs/evidence/liquid-glass-140.md:28`
- What happens:
  - A reader cannot tell user docs from internal history.
  - The repository carries 31 MB of screenshots.
  - Infrastructure identifiers and a personal account slug are public. I found no secrets, tokens or credentials.
- How verified: read end to end. Sizes come from the file system; identifiers were found by grep.
- Suggested change:
  - Split `docs/` into user docs and `docs/internal/`, or archive superpowers and evidence off the default branch.
  - Stop linking internal plans from the README.
  - Take the SEC-08 decision.
- Effort: M

### PUB-14 The open-decision and readiness registers are stale
- Severity: should-fix
- Where:
  - `docs/08-decisions-risks-and-governance.md`:
    - `:5`: "proposed baseline … during M0".
    - `:37-39`: the open list still holds name, namespace, domain, edition, glass and licence, all of which are resolved.
    - D02, D03 and D07 are superseded: there is no JSX output, Base UI ships, and decision 0002 replaced upstream orchestration.
    - `:45`: "MIT is a reasonable candidate", while LICENSE is already MIT.
  - `docs/web-alpha-readiness.md`: written against CLI 0.2.1 with 12 components and 4 families. Status is in Appendix B.
- What happens: the documents that should tell a release manager what is undecided list mostly decided items. They miss what matters for 1.0: the React range, browser support, the compatibility window and file names.
- How verified: read end to end; each item checked against code.
- Suggested change: replace both with one current "1.0 decisions" list, seeded from section 3 of the outline below.
- Effort: S

### PUB-15 The hosted API is real but documented only for operators, beside a "proposed" table
- Severity: should-fix
- Where:
  - `apps/www/src/app/api/v1/{presets,recipes}/route.ts` (POST) and `/[id]/[revision]/route.ts` (GET, HEAD).
  - `apps/www/src/snapshots/server/{service,recipe-service,publication-http,body,quotas,errors,http,config}.ts`.
  - `docs/snapshot-service-operations.md:25-37`.
  - `docs/06-online-editor.md:91-102`.
  - `packages/contracts/src/snapshot.ts:10,51-62`.
- What happens:
  - **The API itself is sound:**
    - routes;
    - the error shape `{code,message,issues,requestId}`;
    - strong `ETag` with 304;
    - `Retry-After`;
    - 405 with `Allow`;
    - UUID-v4 idempotency keys;
    - immutability enforced by triggers in both stores.
  - **The only description is an operator page:**
    - It omits the 403, 405, 409, 410, 413, 415, 422 and 503 statuses.
    - It says the 65,536-byte limit applies to the "preset", but it applies to the whole body (`body.ts:45`).
  - **A stale proposal remains.** `docs/06` still presents a proposed API with endpoints that do not exist.
  - **Unstated rules:**
    - The code format fixes the revision at `@1` forever; ids are random. That is fine to freeze, but unstated.
    - A recipe 2.0 read returns 404 when catalog recipes are disabled (`recipe-service.ts:67-68`).
    - POST requires the site's own `Origin` (`config.ts:64-74`), so publication is not usable by third parties.
- How verified: read end to end.
- Suggested change:
  - Publish a short "Hosted API v1" page: routes, payloads, a full status table, headers, the code format, and immutability and withdrawal semantics.
  - State that POST is for the editors only.
  - Delete the proposed table from docs/06.
- Effort: S

### PUB-16 Small CLI argument-surface defects to settle before freezing
- Severity: nice-to-have
- Where: `packages/cli/src/main.ts:49-52`, `:84-87`, `:111`, `:146`
- What happens:
  - **`--preset` silently ignored.** `theme add a.json --preset b.json` is accepted, and `--preset` is ignored: `presetValue` comes from `positional[2]`, and nothing rejects `--preset` with `theme`.
  - **Misleading usage text.** The usage says `init --preset <local.json>` and `theme add <local.json>`, although both commands accept codes. It also starts with "Ombelle foundation:".
  - **No `--version`.**
  - **`--flag=value` rejected.** It is reported as an unknown flag.
  - **Single-dash tokens.** They are treated as component ids, so `add -y` gives UNKNOWN_COMPONENT.
- How verified: read end to end
- Suggested change:
  - Reject `--preset` with `theme add`.
  - Add `--version`.
  - Write `<file|code>` in the usage text for every preset input.
  - Decide whether `--flag=value` and `-h` are part of the 1.0 grammar.
- Effort: S

### PUB-17 The contributor basics exist, but the supported-versions statement is from the alpha
- Severity: nice-to-have
- Where: `SECURITY.md:17-19`, `CODE_OF_CONDUCT.md:26-28`, `CONTRIBUTING.md:8`, `SUPPORT.md`, `.github/ISSUE_TEMPLATE/`
- What happens:
  - **Alpha-era policy.** `SECURITY.md` says "Only the latest published release receives fixes. The project is in alpha."
  - **Conduct reports.** They go through the security-advisory form, which works but is surprising.
  - **Proposal warning.** `CONTRIBUTING.md:8` warns that the docs contain proposals.
  - **Licence field.** No workspace `package.json` declares `license`.
- How verified: read end to end
- Suggested change:
  - Write a 1.0 supported-versions statement: which majors get fixes, for how long, and the supported Node and React versions.
  - Give conduct reports their own route.
- Effort: S

### PUB-18 The CHANGELOG presents exports of unpublished workspace packages as public API
- Severity: nice-to-have
- Where:
  - CHANGELOG Unreleased: "`@ombelle/contracts` exports `familyAccessibilityCaveat` and `accessibilityCaveatLabel`".
  - Every `packages/*/package.json` is `private: true` with `types: ./src/index.ts`. Only `@ombelle-ui/cli` is published, and its manifest is generated by `scripts/pack-cli.mjs:91-99`.
- What happens: readers may assume `@ombelle/contracts`, `@ombelle/compiler` and `@ombelle/catalog` are installable APIs. They are not published.
- How verified: read end to end
- Suggested change: state on the contract page that the CLI binary is the only published package and that its JavaScript module is not an API. Word internal export changes as internal.
- Effort: S

## Public surface added by the three 1.0 PRs

This section is input for the migration guide and for the public contract.

**PR #189: wave 1 (in this tree)**
- **Operation lock file**
  - `.ombelle-operation.lock` changes from an empty file to `{pid,hostname,startedAt,transaction}`.
  - Empty locks older than 10 minutes are recovered.
- **Interruption and recovery**
  - An interrupted run is restored by the next apply, which then exits 4.
  - `recovery.json` gains `restoredPaths` and `interrupted`.
  - A signal received before dependency work starts exits 1.
- **Dependencies**
  - New environment variable `OMBELLE_DEPENDENCY_TIMEOUT_SECONDS`. The fixed 120-second limit is removed.
  - JSON `dependencyPlan[].current` and the human-readable "replaces" text are new.
  - Declared dependency versions are no longer re-pinned.
- **New refusals**
  - Directories that differ only in case.
  - A selector both inside and outside `@layer`.
  - Navigation Menu and Breadcrumb links that are not `https`, same-origin or `#`.
  - Unknown font ids, reported at the recipe pointers.
- **Other changes**
  - Errors about the dark selector now point at `/darkSelector`.
  - Theme merging works inside `@layer`.
  - Ownership checks tolerate CRLF.
  - Snapshots verify against their stored bytes (decision 0009).
- **HTTP changes**
  - New budgets per network and a reserve budget.
  - 429 responses carry `issues[].path` of `/rateLimit/<budget>`.
  - Security headers.
  - `noindex` on published pages.
  - CLI messages for 404, 410 and 429.

**PR #190: glass (in this tree)**
- Glass is stable for all 63 components, with "Accessibility not guaranteed".
- **Wording**
  - The CLI glass notice text changes.
  - `STYLE_UNAVAILABLE` wording changes.
- **Renames and new exports**
  - The specimen-audit field `experimentalFindings` is renamed `contrastAdvisoryFindings`.
  - Contracts export `familyAccessibilityCaveat` and `accessibilityCaveatLabel`.
- **Presets**
  - The eight material presets move to revision 2.
  - Revision 1 stays resolvable by `id@1` from `presets/retired/`.
- **Installed bytes**
  - Glass CSS changes for about 16 components.
  - `ui-style.css` changes.
  - `examples/data-table.tsx` changes in every family.

**PR #191: wave 2 (not in this tree)**
- **New props**
  - Combobox: `required` and `labels`.
  - Data Table: `labels`, `tableOptions`, the `dataTableLabels` export and `selectColumn({label})`.
  - Command: `search`, `onSearchChange` and `label`; CommandList: `label`.
  - Props for fixed English strings in Dialog, Sheet (`SheetHandle` `label` and `formatSnapPoint`), Field (`FormErrorSummary` `title`), Checkbox group (`CheckboxGroupCount` `format`), Tag Input, Password Field (`PasswordStrengthLabels`) and Carousel (`CarouselLabels`, `CarouselCounter` `format`).
  - `SidebarMenuButton`: `asChild` in Radix, `render` in Base UI.
- **Template changes**
  - `data-slot` is now set after the props spread in every template.
  - The Radix Sidebar gains `@radix-ui/react-slot`.
  - RSC part detection changes template bytes in both editions.
- **CSS:** stable-family CSS changes, including timing from `--motion-duration`.
- **No changes** to the schema, the contract release, CLI behaviour or the lock format.

## Unverified

- **What an older CLI does with a newer lock.** The shape check (`inspect.ts:200-206`) ignores unknown keys. A 0.9 CLI may therefore ignore `placements` or recipe rows written by a newer CLI, or drop them when it rewrites the lock. To settle: run `add` with 0.9.0 against a lock written by this tree.
- **Whether any template is derived from shadcn/ui source** rather than reimplemented against its API (PUB-10). To settle: ask the author, or diff Button, Dialog and Card against the shadcn registry.
- **CLI behaviour by execution.** The build was not ready. To settle: `node packages/cli/dist/main.js theme add a.json --preset b.json --dry-run --json` (PUB-16), and delete-and-re-add of a managed component after a template change (PUB-01).
- **The README "forty-five-component gallery".** Not checked against `apps/www`.

## Looked at and found sound

- **Exit codes.** The exit-code map is consistent and matches `docs/05-cli-specification.md:149-157`. The one exception is the unmapped INVALID_REFERENCE.
- **Hosted immutability.** SQLite `BEFORE UPDATE/DELETE` triggers and a Postgres `publications_immutable` trigger enforce it. Responses use strong ETags, and replays are idempotent.
- **CLI transport.** HTTPS only, no redirects, a 128 KiB limit and a 10 s deadline.
- **Version checks.** Both `set-version --check` and `set-version --check --published` pass.
- **Packing.** It checks tarball integrity, inventories the licences of bundled dependencies, and fails when a licence text is missing.
- **Fonts.** They are not copied into projects.
- **Docs links.** No broken relative links or anchors were found across 263 files and 749 links. The only dead links are the README's local `127.0.0.1` links.
- **Liquid glass.** The public statement is clear and consistent:
  - One source string, `familyAccessibilityCaveat` (`packages/contracts/src/style-families.ts:96-101`), is printed in every glass plan.
  - `docs/components/liquid-glass.md:3-5` leads with "Accessibility is not guaranteed" and the `transparency: "reduced"` way out.
  - The site guide (`apps/www/src/site/docs/guides.tsx:80-82`) and `README.md:111` say the same.
  - The one gap is that the notice is untyped text (PUB-06).
- **Contributor files.** These are present: SECURITY (a private route with response targets), CODE_OF_CONDUCT, CONTRIBUTING (DCO, no CLA), SUPPORT, issue templates including accessibility, and CODEOWNERS.
- **Secrets.** None found in the docs.

## Appendix A: Diagnostic codes

| Code | Exit / HTTP | Main emit sites | Documented |
| --- | --- | --- | --- |
| INVALID_DATA | 2 / 400 | contracts `validate.ts`, `snapshot.ts`, `recipe*.ts`; compiler `resolve.ts`, `recipe-styles.ts`; cli `main.ts`, `snapshots/input.ts`; www `body.ts`, `service.ts` | 05:196; local usage:218 |
| UNKNOWN_COMPONENT | 2 | cli `component-ids.ts:50` | 05:145 |
| STYLE_UNAVAILABLE | 2 | cli `plan/theme.ts:57,65,82`; contracts `style-support.ts:18` | 05:145,147; liquid-glass.md |
| UNSUPPORTED_PROJECT | 3 | cli `inspect.ts`, `edition.ts`, `theme.ts`, `workspace.ts`, `executable.ts`, `bun.ts` | 05:193 (edition cases only) |
| UNSUPPORTED_RELEASE | 3 / 422 | catalog `index.ts:141`; compiler `compile.ts:93`; cli `transport.ts:66-91`; www `service.ts:46-53` | no |
| FILE_CONFLICT | 4 | cli `plan/*.ts`, `apply/transaction.ts`, `recovery.ts:133` | 05:11,193,195; local usage:46 |
| RESOLUTION_FAILURE | 5 | cli `snapshots/input.ts:78,87`, `transport.ts:94` | exit table only |
| DEPENDENCY_FAILURE | 6 | cli `apply/manager.ts:113,121`, `bun.ts:58,68`, `transaction.ts:206` | exit table only |
| INTERNAL_ERROR | 1 | cli `main.ts:401`, `transaction.ts:88,209` | no |
| INVALID_REFERENCE | 1 (unmapped) / 400 | contracts `snapshot.ts:58`, `recipe-snapshot.ts:46`; www `publication-http.ts:31` | no |
| SNAPSHOT_NOT_FOUND | 404 | www stores, `recipe-service.ts:68` | hosted-deployment:17 |
| SNAPSHOT_WITHDRAWN | 410 | www stores | no |
| SNAPSHOT_SERVICE_UNAVAILABLE | 503 | www `errors.ts:46`, `config.ts:60` | hosted-deployment:17 |
| SNAPSHOT_CAPACITY_REACHED | 503 | www stores | no |
| PAYLOAD_TOO_LARGE | 413 | www `body.ts:46`, stores | limits only |
| RATE_LIMITED | 429 | www `quotas.ts:40` | no |
| IDEMPOTENCY_CONFLICT | 409 | www stores | no |
| INVALID_IDEMPOTENCY_KEY | 400 | www `service.ts:35` | no |
| ORIGIN_NOT_ALLOWED | 403 | www `config.ts:73` | no |
| UNSUPPORTED_MEDIA_TYPE | 415 | www `body.ts:28` | no |
| METHOD_NOT_ALLOWED | 405 | www `http.ts:11` | no |

The editor-only codes (COMPILE_FAILED, INVALID_MESSAGE, WORKER_FAILED and INVALID_PRESET) are client internals and stay out of the contract.

## Appendix B: Status of `docs/web-alpha-readiness.md`

| Item | Status now |
| --- | --- |
| PR1: offline build from the published package | Open |
| PR2: cross-browser | Open; Chromium only |
| PR3: real projects | Partly addressed (0.7.0 pnpm evidence) |
| PR4: re-render after `theme add` | Open |
| PR5: manual assistive-technology review | Open; the results table is empty (wave 2: 441 entries) |
| PR6: contract version | Met (decision 0009) |
| PR7: export beyond Button; runner forms | Resolved |
| PR8: human keyboard pass | Open |
| PR9: catalog surface and support matrix | Resolved |
| PR10: published-runner applied journeys; macOS | Open |
| PR11: shadcn fixes | Shipped in 0.3.0; the exact React decision is still open (PUB-04) |

## Migration guide contents

The 0.x to 1.0 guide must cover:

1. **Managed files.** How to refresh an unedited managed file, and how to reconcile an edited one (PUB-01).
2. **Shared stylesheet.** `theme add <presetFile>` refreshes a stale `ui-style.css`.
3. **Operation lock.** The new `.ombelle-operation.lock` format and how recovery works.
4. **Dependencies.** Declared versions are no longer re-pinned (CLI-01).
5. **Glass.**
   - Material presets are now revision 2, and re-applying one changes token values.
   - Existing codes and `id@1` still resolve.
   - The accessibility caveat replaces "experimental".
6. **Markup that CSS may target.**
   - Meter now uses `data-mode="circle"` (0.9.1).
   - Wave 2 changes `data-slot` ordering.
   - Wave 2 adds props.
7. **New Sidebar dependency:** `@radix-ui/react-slot` (Radix edition).
8. **Appearance changes in family CSS.** Timing from `--motion-duration`, scrims and fields.
9. **Minimum CLI versions.** The minimum CLI for each family, component and field, for people installing from JSON.
10. **Older routes still in force.**
    - The native form controls migration.
    - Glass "Upgrading from 0.4.x".
    - Neo-brutalism `shadowColor` codes and Flat Button recipe codes from before 4 November (decision 0009).

## Proposed "1.0 public contract" page outline

**1. What 1.0 promises to keep stable (changing it requires 2.0)**

- **CLI grammar**
  - The binary `ombelle` and the package `@ombelle-ui/cli`.
  - The commands `init`, `add`, `add button --preset`, `add --recipe` and `theme add`, with the flags listed in the rewritten docs/05.
  - Three safety rules:
    - `--yes` never bypasses conflicts.
    - `--dry-run` writes nothing.
    - Writes from a non-TTY session require `--yes`.
- **Exit codes and diagnostics**
  - Exit codes 0 to 6.
  - The diagnostic code names in Appendix A.
- **`--json` records, at `outputVersion: 1`**
  - Field names and `status` values are stable.
  - Fields may be added.
  - Notice codes are stable; notice text is not.
- **Input documents**
  - These versions:
    - preset `schemaVersion` 1.x;
    - recipe 1.0 and 2.0;
    - snapshot 1.0 and 2.0.
  - Every document valid under 1.0 installs with every 1.x CLI.
  - The hash and canonicalization rules are covered.
  - Built-in presets are frozen per `id@revision`.
- **Project files**
  - The names and formats of the config file, the preset file and the lock, with published schemas.
  - A 1.x CLI reads every 1.x lock and refuses newer locks with an upgrade message.
- **Hosted codes**
  - The formats `ps_<32 hex>@1` and `rc_<32 hex>@1`.
  - Published bytes never change, and a withdrawn code returns 410.
  - The GET routes `/api/v1/{presets,recipes}/{id}/{revision}`, with their response shape and status codes.
- **Installed source**
  - Component file names.
  - Exported components and their documented props.
  - `data-slot` values and the documented state attributes.
  - The token custom properties, after the naming decision, and the `@theme inline` mapping.
- **Liquid glass**
  - A stable family whose accessibility is explicitly not guaranteed, because text contrast depends on the app's backdrop.
  - `design.transparency: "reduced"` restores the opaque form with the contrast guarantee.
  - Removing the caveat later is not a breaking change. Removing the family, or the reduced-transparency route, is.
- **Support window**
  - Node 24 LTS (24.19 or later).
  - React and Tailwind v4 at the range decided under PUB-04.
  - Vite React TSX and Next.js App Router TSX.
  - npm, pnpm, Yarn 1 and 4, and Bun 1.4.3.
  - The browser statement decided under PUB-04.

**2. What 1.0 explicitly does not promise**

- **Installed bytes.** The exact bytes of installed source and CSS can change in minor releases; the upgrade route refreshes them.
- **Internal names in installed source.**
  - Internal helpers exported from component files.
  - Undocumented `data-*` attributes.
  - Family-private custom properties (`--glass-*` internals, `--o-*`, `--rf-*`, `--sidebar-*` and similar).
  - Keyframe names.
- **CLI wording.** Human-readable output, prompt wording and notice text.
- **CLI internal state.** The transaction directory, `.ombelle-operation.lock`, `plan.json` and `recovery.json`.
- **JavaScript APIs.** The CLI bundle's JavaScript API and the unpublished `@ombelle/*` packages.
- **Hosted service.**
  - The POST publication API, which is for the editors only and restricted by `Origin`.
  - Quotas and capacity.
  - Uptime, and any retention beyond immutability.
- **Website.** The website and editor URLs, apart from published code pages.
- **Unimplemented commands.** `preset apply`, `preset show`, `info`, `doctor`, `diff`, `update` (unless it ships under PUB-01) and `--only`.
- **Out-of-scope platforms.** React Native, accounts, workspaces and monorepos, and JS output instead of TSX.

**3. Decisions to make before writing the page**

- **Already recorded owner decisions**
  - CMP-06: the schema `$id` base URL and titles, including a preset `$id` that matches the 1.0/1.1 range.
  - CAT-17: whether to export `buttonVariants`, and whether to add a "Differences from shadcn" list.
  - SEC-03: CI publishing with provenance.
  - SEC-05: show hashes in official commands, or document trust on first use.
  - SEC-08: production identifiers in public docs.
  - RL-03, RL-06 and RL-07: the capacity runbook and retention, publishing only on an explicit action, and the shared-IPv4 budget.
- **Contract numbering and lock contents**
  - The 1.0 numbering of the contract release (`0.1.0`).
  - Whether the lock records the CLI version that wrote it (decision 0009, deferred).
- **Raised by this audit**
  - The React range and the browser statement (PUB-04).
  - Project file names, and the token prefix `--ui-` or none (PUB-08, PUB-09).
  - Whether `update` ships in 1.0 or delete-and-re-add is the documented route (PUB-01).
  - Whether templates derive from shadcn, and so need attribution (PUB-10).
  - The 1.x support window, and where internal planning docs live (PUB-13).
- **Outside 1.0 scope:** the remaining docs/08 items (team and budget, native variants, commercial model, mobile device matrix) should be marked out of scope for 1.0.
