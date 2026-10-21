# Local Button recipe installation

Date: 21 October 2026. Status: approved by the user on 21 October 2026. The user approved the separate recipe Button approach, this written design, and its implementation plan. Native implementation and verification are in progress on `codex/local-button-recipes`.

## Intent and boundaries

Implement `add --recipe ./button.recipe.json` for a supported, already initialized standalone Ombelle application. Restore one saved Button customization from a local JSON file, including its exact built-in preset, allowed props, text, and component overrides. Preview, exported artifacts, and installed output must agree in light and dark modes, including inside a differently themed project.

Preserve the saved project preset, global stylesheet, global style pack, ordinary Button, existing examples, and unrelated source. Later ordinary component additions continue using project defaults. Repeating an unchanged recipe installation is a no-op; edited or untracked destination files cause a conflict.

Support the existing three families, Vite and Next.js App Router TSX, and the declared npm, pnpm, Yarn, and Bun consumer environments. Retain existing runtime and workspace restrictions. No remote snapshots, accompanying preset bundles, editor UI, portal components, arbitrary CSS/JSX, or public publication are included. `add button --preset <code-or-file>` remains a separately planned command; this slice establishes reusable scoped compilation and provenance for it.

## Selected approach

Generate a separate `RecipeButton` from the reviewed Button template, rather than wrapping or replacing the app's ordinary Button. Its markup uses `data-slot="recipe-button"` and a deterministic `data-ombelle-recipe` scope value. Its source owns the same reviewed variants, sizes, native button semantics, class merging, and local utility dependency. Ordinary template bytes and compiled artifacts remain unchanged.

Wrapping the installed ordinary Button would couple recipe output to local modifications, compiled defaults, and globally applied family rules. Replacing that Button would change existing application usages. Separate source incurs a small source duplication cost while keeping ownership and visual isolation explicit.

Reuse an existing utility only when it is recorded, unmodified, and byte-compatible with the required reviewed utility. Otherwise stop with migration guidance. Do not adopt untracked utilities or overwrite edited ones. A recipe never requires installing or replacing the ordinary `components/ui/button.tsx`.

## CLI contract and validation

Accept exactly `add --recipe <local-json-path>` plus existing applicable flags: `--cwd`, `--package-manager`, `--dry-run`, `--json`, and `--yes`. The recipe supplies the component identity. Reject component positional arguments, repeated value flags, missing values, combining `--recipe` and `--preset`, or using `--recipe` on another command. Existing ordinary add behavior stays intact.

Resolve the supplied file relative to the invoking working directory, consistent with existing local preset arguments. Require a regular UTF-8 JSON file, enforce a 64 KiB limit on actual bytes read, and validate before generating a plan. Local paths may be outside the target app because input files are read-only; every output remains inside the target app. Treat JSON text as data and never evaluate it. Do not interpret an ID or URL as a remote recipe.

Use `schemas/recipe.schema.json` as the authoritative shape, generate its TypeScript schema binding alongside the preset binding, and expose a cloned validated recipe type. Reject unknown fields, invalid enums, non-finite numbers, unsafe integer revisions, excessive content, and overrides outside the schema's bounds. `presetRef.id` is an exact catalog identifier, not a path or URL.

Resolve the reference against built-ins in the specified catalog and require matching ID, revision, catalog release, and compiler version. Initially these are revision 1 of `builtin-flat`, `builtin-minimalist`, and `builtin-neo-brutalism`, with catalog/compiler 0.1.0. Unknown or mismatched references fail before mutation; never substitute a latest version or the project's preset.

Require a complete initialized project config, saved preset, and provenance lock, as ordinary `add` does. An uninitialized project receives guidance to run `init --preset <local.json>` first. Recipes do not implicitly initialize a global theme.

## Compiler boundary and deterministic identity

Add a pure `compileRecipe({ recipe, darkSelector })` entry point alongside ordinary `compile`. It validates and resolves locally, without filesystem or network access, and returns recipe artifacts, exact catalog dependencies, the normalized recipe and resolved preset, their hashes, scope identity, and pinned release provenance. Its result is distinct from a global-theme `CompileResult`, preventing accidental use with theme planning or project-preset persistence.

Normalize omitted recipe props from the pinned preset's Button defaults, then native defaults: variant/size from the preset, `type="button"`, `disabled=false`, and `loading=false`. Preserve content as text. Canonicalize the normalized recipe and resolved preset using the existing canonicalizer. Compute recipe and preset SHA-256 hashes; derive the full scope SHA-256 from both hashes and the exact compiler/catalog releases. Do not hash timestamps, machine paths, environment details, or operational IDs into artifacts.

The validated project dark selector affects generated CSS and artifact hashes, but not the recipe's portable identity or content hash. It is recorded as installation context. Only the established single-class selector form, including `.dark`, `.night`, and `.theme-dark`, is supported in this slice. Validate the whole selector against a conservative ASCII CSS class grammar and reject selector lists, combinators, pseudo-classes, escapes, and conditional constructs with guidance before writes. The standalone preview uses `.dark`.

Use the existing pinned formatter and sorted artifact order. Equivalent recipe property order and explicit versus omitted defaults produce identical normalized hashes and artifacts under the same dark selector. Existing global compiler fixtures and baseline hashes must remain unchanged.

## Generated files and usage

Use these deterministic destinations, with `ID` and `REVISION` taken from the validated recipe:

| Artifact                        | Destination                                             |
| ------------------------------- | ------------------------------------------------------- |
| Separate reviewed Button source | `<componentsDir>/recipes/ID/rREVISION/button.tsx`       |
| Self-contained scoped CSS       | `<componentsDir>/recipes/ID/rREVISION/button.css`       |
| Usage example                   | `<sourceDir>/ombelle-examples/recipes/ID/rREVISION.tsx` |
| Shared utility, only if missing | Existing configured utility destination                 |

The component imports its colocated CSS, so importing `RecipeButton` activates its styles without editing global CSS or application entry files. Apply the configured UI/utils aliases to TSX imports, including the nested recipe path; do not flatten filenames through the ordinary artifact transform. Reject an explicitly configured `paths.recipeOutput` in this first slice with guidance to use the default layout, rather than silently ignoring a custom output setting. Custom recipe roots can follow once their alias contract is specified.

Each component exports `RecipeButton` and its props type from its own module. The example imports it through the configured UI alias and shows the saved props and text. Recipe props and content are defaults for the generated component, so its ordinary use restores the customization. Consumers can override supported native props, variant, size, className, style, and children. `asChild` is excluded from this recipe API to keep loading/disabled behavior on a native button. The ordinary Button composition API is unaffected.

`loading` is a boolean prop. While true, expose `aria-busy="true"`, keep the visible text and accessible name, and disable activation using native disabled behavior. Effective disabled is `disabled || loading`. Forward native attributes, ref, and events consistently with the reviewed React template. Scope markers and effective busy/disabled attributes must not be overwritten by a spread of caller props. Since this recipe schema carries text rather than an icon asset, an icon-size recipe keeps that text visible and uses a minimum square footprint that can grow/wrap to accommodate it; do not produce a visually blank control or clipped label. No spinner, essential icon asset, network font, or new runtime service is needed.

Serialize saved content safely as a TSX string value; quotes, braces, markup-like strings, and newlines must remain literal text. Do not insert text into executable source syntax without escaping.

## Isolated style generation

Parse the reviewed family stylesheet and derive only rules relevant to Button, including shared Button declarations, size/variant states, focus, disabled, reduced motion, and forced colors. Use an AST-based selector transformation with pinned CSS/selector parser dependencies declared directly by the compiler; do not use whole-stylesheet string replacement. Drop unrelated Input/Dialog selectors and reject unexpected selector constructs instead of emitting unscoped rules. Keep media conditions and declaration order intact.

Every emitted visual rule targets both the distinct recipe slot and scope attribute on the actual button. Materialize all resolved semantic tokens and design variables on that element; do not rely on inheritance from the project theme or redefine `:root`, `@theme`, or global Tailwind mappings. Apply dark overrides when the button or its ancestor has the validated dark class. No container wrapper is required. Nested independently themed subtrees remain outside the foundation scope.

Because ordinary family CSS targets `data-slot="button"`, it cannot apply to the distinct recipe slot. Include the reviewed structural layout and relevant utility behavior in the generated component/CSS so the recipe does not need the project's family CSS. Verify remaining Tailwind class behavior with installed production builds. Arbitrary consumer rules or explicit prop/style overrides can still change appearance; parity claims cover the declared generated setup.

Apply recipe overrides after family and size rules. Radius, border width, and minimum height must affect the rendered control even when a size rule ordinarily uses a literal minimum height. Override tokens remain confined to the recipe element. `minHeightPx` is a minimum, not a fixed height; enlarged text must remain reachable. Shadow offsets affect recipes whose family uses shadows; flat/minimalist families retain their reviewed absence of shadows.

## Installation planning and persistence

Add a dedicated recipe planner that builds an ordinary transactional `InstallPlan` from a recipe result and existing project context. Reuse path containment, metadata preconditions, dependency planning, manager preparation, apply/rollback, and output formatting. Keep command-specific artifact mapping separate from ordinary component mapping. Do not call `appendState`, which rewrites the saved global preset, or use `baseLock` to substitute recipe releases/hash for project defaults.

Extend lock version 1 additively with an optional `recipes` map keyed by exact recipe ID and revision. Each record stores the full normalized recipe, resolved preset, recipe/preset hashes, scope, dark-selector context, pinned releases, and artifact destinations/hashes. Legacy locks without this field mean no recipes. Validate the new field's shape, supported metadata, hashes, and portable paths before trusting it.

Keep existing top-level global preset hash/releases, managed declarations, and ordinary artifact records. Register generated recipe files in normal artifact ownership records as well as recipe provenance. Every planner that rewrites the lock, including ordinary add and theme add, must preserve recipe records and hashes. Existing recipe source and its resolved styling remain pinned when the global theme changes.

Treat a recorded ID/revision as immutable: a changed normalized recipe or resolved preset at the same ID/revision conflicts even if some rendered bytes happen to match. A higher revision has its own directory and may coexist. Repeating identical input is a no-op only when all recorded outputs still match. Missing owned artifacts may be recreated using their recorded identity; edited or untracked occupied destinations conflict. A dark-selector change that changes existing recipe CSS requires an explicit migration rather than silent replacement.

Validate case-insensitive destination collisions, reserved Windows names, symlink escapes, traversal, and collisions with state/utility paths. Never silently rename IDs. Snapshot/read preconditions cover existing config, preset, lock, package metadata, relevant source, and shared utility; recheck through the existing transaction engine before writes. The external recipe is read once into a validated immutable snapshot; subsequent changes to its source file do not change the reviewed plan.

Dry-run writes nothing and never starts a manager. Real installs add only missing exact reviewed production dependencies through the existing selected manager adapter; preserve manager and lock format. A no-op with satisfied dependencies invokes no manager. Incompatible installed dependencies follow the existing adapter's diagnostics and recovery behavior.

## Output and failure behavior

Extend human/JSON plan output with recipe ID/revision/hash, recipe preset hash/releases, scope, dark selector, generated import path, and an explicit component-only scope indication. Preserve the existing top-level `presetHash` and releases as the project's global state; use separately named recipe provenance fields for the recipe. Do not report a recipe preset as the new project default. A success reports the usage example path and import instructions.

Use existing error classes and exits: invalid arguments/data 2, unsupported project/release 3, ownership/immutable identity/precondition conflict 4, unresolved built-in identity/revision 5, dependency/recovery failure 6. Include the affected file or JSON pointer and next action. `--yes` never bypasses conflicts.

Use the existing operation lock and transaction backups for recipe artifacts and provenance. Injected write failures restore touched files. Dependency failures retain the current explicit distinction between source restoration and uncertain package/cache state. Do not claim automatic crash recovery beyond the foundation's existing lock and transaction evidence.

## Verification and evidence

Add meaningful red/green regressions and run the full foundation gate after targeted checks pass. Keep existing style artifact baselines unchanged. Record actual runtime/browser versions, cases, parity results, and remaining manual-review limits.

| Area                | Required evidence                                                                                                                                                                                                                   |
| ------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Contracts           | Unknown fields, invalid ID/revision/props/bounds, oversized/malformed files, invalid dark selector, non-Button recipes, and exact built-in resolution                                                                               |
| Compiler            | Deterministic bytes/hashes across key order/default forms; all three built-ins; safe text; override precedence; scoped media rules; no unscoped tokens/selectors                                                                    |
| CLI                 | Built subprocesses; valid grammar; initialized project requirement; invocation-relative paths; dry-run non-mutation; repeat no-op; coexistence of revisions/recipes                                                                 |
| Ownership           | Edited/untracked generated or utility conflicts, changed immutable recipe, later ordinary add/theme preserving recipe records and ordinary files, path/symlink/case collisions, stale plans and concurrent operation lock           |
| Recovery            | Injected mid-write and dependency failures restore recipe artifacts/provenance with the foundation's documented recovery record                                                                                                     |
| Consumers           | npm/pnpm Vite and Next.js; Yarn Classic Vite and modern Next.js with node-modules plus modern PnP Vite; Bun Vite/Next.js with text/binary locks and Node/Bun CLI runtimes; audits, exact source parity, and Node production builds  |
| Browser parity      | Preview and npm/pnpm Vite/Next.js for each recipe family in both modes, installed into each different host family; compare canonical hashes, normalized DOM, computed style, and screenshots with explicit tolerances if needed     |
| State/accessibility | Native activation, disabled/loading, accessible text including icon-size, focus, variants/sizes, long/escaped text, override rendering, reduced motion, forced colors, axe, and synthetic enlargement/reflow using existing helpers |
| Isolation           | Ordinary Button, Input, Dialog, global CSS/preset/style files unchanged by recipe install; neighboring rendered controls unchanged; recipe retains its appearance after a compatible global theme change and with custom dark class |

Browser coverage is explicitly preview plus npm/pnpm. Yarn/Bun coverage is install/source/audit/build, matching the existing foundation boundary. Browser measurements do not claim human, NVDA, VoiceOver, native text zoom, or broader cross-browser acceptance. Existing Button state coverage may be shared, but recipe-specific loading, isolation, override precedence, and escaped-content cases must execute the actual generated recipe source.

## Implementation handoff

After written-spec approval, write an implementation plan covering contracts/catalog resolution, scoped compiler and loading behavior, lock/CLI planning, independent consumer fixtures, browser parity, and evidence/documentation. The implementation plan must preserve the existing ordinary compile/installation interfaces and explicitly assign preservation of recipe provenance in all lock-writing operations. Do not implement remote codes or the component `--preset` command as incidental extensions.
