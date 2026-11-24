# Snapshot identity and the contract version

21 November 2026, before 1.0. Answers audit findings CMP-01 and CMP-02 (`docs/audits/findings/01-contracts-compiler.md`).

## Problem

A published preset or recipe snapshot stores normalized data and its hash. Until now every read (the hosted service, the CLI, the CLI cache, the project lock) re-normalized that data against the *current* catalog and demanded an exact match:

- a preset snapshot was re-merged with today's family defaults, so a default key added later (neo-brutalism `shadowColor`) made older snapshots fail with "must already be normalized";
- a recipe snapshot's `preset` had to equal today's built-in preset at the same `id@revision`, so every recipe published against `builtin-flat@1` before the 2026-11-04 refresh failed, and the hosted service answered `503`;
- an installed recipe in `ui-library.lock.json` was recompiled from today's built-in and compared with the lock row, so the same change also made such projects refuse every command.

At the same time `catalogRelease` and `compilerVersion` stayed `0.1.0` while the catalog changed underneath them, so the labels did not identify anything.

## Decision

1. **A snapshot is identified by its stored bytes.** Verification is self-contained. A preset snapshot verifies when its envelope is schema-valid, its `preset` is in normal form (canonical colour spelling and explicit Button defaults, both checkable without the catalog), and `presetHash` is the SHA-256 of the canonical form of the stored `preset`. A recipe snapshot verifies when its envelope is schema-valid, `recipeHash` and `presetHash` are the hashes of the stored `recipe` and `preset`, and the stored preset is the one the recipe names (`id`, `revision` and the contract version of `presetRef`). Nothing is compared with today's built-ins or defaults, so a code published once verifies, and resolves to the same snapshot bytes, for as long as the contract version it names is supported. Every snapshot published so far (all labelled `0.1.0`, from several catalog states) verifies when its stored content is self-consistent.

2. **A recipe compiles against the preset its snapshot stored.** `compileInstallableRecipe` (and `compileRecipe`, `compileComponentRecipe`) take an optional pinned `preset`: resolved preset data whose `id` and `revision` match `presetRef`. The CLI passes the snapshot's preset when it installs a recipe code, the lock check passes the preset stored in the lock row, and the published recipe page passes the snapshot's preset. Without a pinned preset (local recipe files, the editors) the built-in is resolved from the catalog as before. Compiled bytes still depend on the installed CLI's templates and stylesheets (decision 0003 stands); what no longer drifts is the data a code stands for: its colours, design values and fonts.

3. **Installed recipes are checked against the preset their lock row stored.** The project lock re-derives each installed recipe's identity to detect edits; it now compiles with the preset stored in the row instead of today's built-in. The saved global preset and component-preset sources are still re-resolved against the catalog. That stays stable only because of point 5: built-in content, which supplies the family defaults, no longer changes in place.

4. **`catalogRelease` and `compilerVersion` name the contract version, not a build.** The value `0.1.0` names the input contract: the preset, recipe and snapshot schemas, the canonical JSON form, colour normalization, the materialization of family defaults into normalized data, and the scope-hash input. It does not identify catalog bytes, and it never did. The value is defined once (`contractRelease` in `@ombelle/contracts`) and every check accepts the set `supportedContractReleases` instead of a literal. A change that would make previously stored data read differently (a new hash input, a different canonical form) must introduce a new contract version and keep accepting the old one. Changes to templates, stylesheets and default values do not change the contract version; they are recorded per package release in `CHANGELOG.md`, as decision 0003 already does.

5. **A built-in preset's content is frozen per `id@revision`.** `packages/catalog/test/fixtures/builtin-preset-hashes.json` pins the hash of every built-in and starting preset. Changing one without bumping its `revision` fails the catalog tests. Local recipe files and the editors refer to built-ins by `id@revision`, so this makes that reference mean fixed content. Published codes do not depend on it (point 1). The first time a revision is bumped, the previous revision must stay resolvable for local recipe files; that history mechanism is not built yet, because no built-in has needed a bump since this rule.

## What does not change

- No snapshot, lock or artifact byte changes. Hashes, scope hashes and the snapshot schemas are unchanged; the `0.1.0` constants in the schemas keep their value and now mean the contract version.
- The hosted service still answers `503` if a stored row fails verification; after this change that only happens when the stored data is corrupt.
- Recipe prop defaults are still written into normalized recipe data (CMP-03). Adding or changing a default for an existing component would still change how older recipes normalize; `packages/compiler/test/component-recipe-defaults.test.ts` now fails when that happens, so it has to be handled as a contract change.

## Rejected

- **Bump `catalogRelease` with every package release.** It would make every release a contract break for every published code, or require shipping old catalogs to rebuild old output, which no user asked for.
- **Record the producing CLI version in the lock or provenance.** Provenance is part of the scope hash, so adding the package version there would change every installed recipe's bytes on every release. Putting it in the lock is a lock-format change that older CLIs reject. Left for a future lock version.
