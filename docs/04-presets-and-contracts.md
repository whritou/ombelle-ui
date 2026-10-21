# Presets and Contracts

## Preset purpose

A preset is versioned design data, independent of the website. It selects a visual family and overrides reviewed design values. A checked-in project preset is the source of truth for later component installations. Remote snapshots are distribution conveniences, not runtime requirements.

Use [preset.schema.json](../schemas/preset.schema.json) and [preset.example.json](../examples/preset.example.json) as the initial version 1 shape. JSON Schema validation is only the first layer. The resolver must also validate catalog existence, compatible releases, semantic colors, supported component defaults, and design bounds.

## Preset fields

| Field               | Contract                                                                |
| ------------------- | ----------------------------------------------------------------------- |
| `schemaVersion`     | Version of the JSON shape, initially `1.0`                              |
| `id` and `name`     | User-readable identity metadata; not sufficient for reproducibility     |
| `revision`          | Immutable positive revision within an ID                                |
| `catalogRelease`    | Exact component and style catalog release                               |
| `compilerVersion`   | Exact generator release                                                 |
| `platform`          | Initially `react-web`; native will require a separate contract revision |
| `styleFamily`       | Flat, minimalist, neo brutalism, or liquid glass                        |
| `modes`             | Light and dark semantic token overrides                                 |
| `design`            | Portable bounded density, radius, border, font, and motion choices      |
| `componentDefaults` | Reviewed per-component default props; Button is the first schema entry  |

Color inputs in this initial schema accept six-digit hex or numeric OKLCH. They deliberately exclude arbitrary CSS expressions, URLs, and user-defined `var()` chains. A color parser must additionally reject invalid numbers, out-of-range values, unsupported gamut policy, or misleading syntax. Future syntax support must be versioned and tested.

Sparse preset inputs inherit the exact defaults from `catalogRelease`. For project initialization and snapshot publishing, the resolver materializes a complete normalized preset containing every token needed by selected components. Store that normalized data locally and hash it; never rely on mutable remote defaults.

The initial schema includes Button defaults only. Adding controls for another component requires corresponding schema, compiler, documentation, and test changes. A generic JSON bag is not an acceptable shortcut.

## Resolution algorithm

1. Validate the JSON shape, byte limits, and supported schema version.
2. Resolve exact catalog and compiler releases; reject an unknown release rather than silently choosing latest.
3. Read that catalog's complete style defaults.
4. Merge typed overrides in the order defined in the component specification.
5. Normalize colors and units through a pinned algorithm, and materialize missing token values.
6. Check component and platform compatibility and validate accessibility-relevant values.
7. Produce a canonical JSON representation with stable key ordering and normalized values.
8. Compute SHA-256 over the canonical bytes and generate source, CSS, and metadata.

The same sparse input plus the same pinned releases must resolve identically in browser and Node environments. Color conversion and formatting use one shared implementation.

## Project state

The project configuration points to the locally committed `ui-preset.json`. It also records target platform, language, component location, package manager policy, CSS merge target, optional style output, and registry base. Respect existing `components.json` and import aliases; do not duplicate or silently disagree with them.

Global palette and token declarations are merged directly into the configured stylesheet, normally `globals.css`, rather than replacing the stylesheet or moving its existing tokens to a separate generated theme file. Record provenance at the declaration and selector level so unrelated CSS edits do not block later theme changes.

The lockfile records a lock version, exact CLI and compiler releases, catalog release, normalized preset hash, dependency requirements, and installed artifact records. Each artifact record includes its original source identity, transformed content hash, relative destination, template version, and associated recipe when present. Dependency packages remain locked by the project's ordinary package manager lockfile.

An ordinary `add` operation reads the local preset and lockfile each time. It never chooses a new upstream default because the process restarted or a new release exists. The proposed `add <component> --preset <code-or-file>` explicitly selects a preset for that component installation only. It preserves the saved project preset and the defaults used by later ordinary `add` operations. Use `preset apply` or `theme add` to change project-wide defaults.

## Component-scoped preset selection

A preset describes design values; the command determines its scope. The same pinned preset can initialize a project, install a global theme, or style one component:

```sh
init --preset ps_brand@3
theme add ps_brand@3
add button --preset ps_brand@3
add button --preset ./brand.preset.json
```

These are proposed commands. The current private foundation accepts local preset files for `init` and `theme add`, but rejects `--preset` on `add`; remote codes and component-scoped installation are not implemented.

The public interface uses the named flag `--preset <code-or-file>`. A generated opaque code is a value, never a dynamically named flag such as `--random-string`. Published commands pin an immutable preset revision; if a friendly alias is accepted, show and lock its resolved revision and hash before installation. Local JSON is a permanent offline and version-control option, not a development-only substitute.

For the first component-scoped slice, support exactly one component per command, beginning with Button. Reject multiple component arguments and the combination of `--preset` with `--recipe` with actionable diagnostics. Wider component and portal support requires separate evidence.

Compile the selected component with the preset's complete light/dark tokens, design values, and applicable component defaults in an isolated scope. Shared utilities or base source may be reused only when compatible; otherwise report a conflict and migration guidance. A different preset must not silently restyle an existing shared Button or other installed components. Do not overwrite locally edited source, rewrite app usages, merge scoped values into root theme declarations, or replace the project-wide style pack. The installation plan must identify component/style/usage destinations and the scope consumers need to use; exact artifact naming belongs in the implementation design.

Preserve the project's `ui-preset.json` and global theme defaults. Record the component-scoped normalized preset, immutable reference when present, releases, scope identity, and artifact hashes in installation provenance so repeated installs are deterministic and identical requests are no-ops. Later `add input` still uses the saved project preset. Dry-run performs no writes or dependency operations; normal conflict, transaction, and package-manager preservation rules apply.

A recipe remains a separate optional artifact: it combines a pinned preset with one component's allowed props, text content, and local overrides. `add button --preset <code>` selects design data without requiring a recipe file; `add --recipe <code-or-file>` restores a richer saved customization and already identifies its component. Both use the same scoped compilation and ownership rules.

`theme add <preset>` is the existing-shadcn entry point and an alias of `preset apply <preset> --only theme`. It merges tokens and compatible reviewed CSS, commits the resolved preset, and leaves component source untouched. Source defaults inside that preset affect future generation; they do not rewrite the props or default behavior of already installed components. Report this distinction in the plan.

## Preset changes and existing components

| Change                                                    | Existing components                                | Future installs                                                                           | Required action                                   |
| --------------------------------------------------------- | -------------------------------------------------- | ----------------------------------------------------------------------------------------- | ------------------------------------------------- |
| Color, radius, density, font from the same token contract | Update through generated CSS if still using tokens | Use new preset                                                                            | Diff and apply theme files                        |
| Style family using compatible reviewed slots              | Update through selected recipe CSS                 | Use new style                                                                             | Check compatibility and preview; regenerate theme |
| Component default prop, such as Button size               | Existing JSX props do not change                   | Usage examples adopt default; shared source behavior changes only via reviewed generation | Report scope; never rewrite app usages silently   |
| New markup, different primitive family, or token contract | May require source migration                       | Use explicitly selected release                                                           | Plan a versioned migration and show conflicts     |
| Locally hardcoded visual value                            | May ignore changed tokens                          | New source follows preset                                                                 | Report that local edits can override the theme    |

Default props in a project preset affect the generated component's default for that project, so changing one may require regeneration of that component. The CLI must identify this explicitly. For alpha, offer such changes through a recipe or new installation; do not imply that theme CSS alone rewrites TSX defaults.

## Component recipe contract

A recipe saves one component's customization. [recipe.schema.json](../schemas/recipe.schema.json) defines the initial Button recipe. It contains a pinned preset reference, component ID, safe serializable props, text content, and allowlisted component token overrides.

Recipes cannot contain event-handler source, arbitrary JSX, imports, raw selectors, or packages. The editor renders its own reviewed interaction fixtures, such as an example loading toggle. User-provided content is rendered as text.

Installation writes the base component, scoped recipe CSS, and an example usage file. It does not replace the project's global preset. Resolve the recipe's pinned preset and materialize all tokens needed inside its scope so it retains the exported appearance even in a differently themed project. For composites with portals, the scope must reach the portal container; do not claim recipe support for a component until this is tested.

A local recipe JSON can reference a built-in preset available in the pinned catalog or an accompanying preset file using an explicitly supported bundle format. The initial example uses a built-in preset ID. A remotely published recipe resolves its preset revision by ID. No path or arbitrary URL is accepted through `presetRef.id`.

The local foundation implements the built-in-only Button path described in the [approved recipe design](superpowers/specs/2026-10-21-local-button-recipes-design.md). It generates a separate `RecipeButton` and self-contained CSS rather than replacing the app's ordinary Button. Recipe revisions are recorded separately from global preset provenance and survive ordinary additions and compatible theme changes. File bundles and remote resolution remain future work. See [local usage](foundation-local-usage.md#local-button-recipes) for commands and current limitations.

## Snapshot model

The server stores immutable preset snapshots and recipe snapshots. Store exact payload bytes or canonical normalized bytes, content hash, revision, catalog release, compiler version, creation time, and validation status separately. A status record includes test scope; a schema-valid user snapshot is a draft until verified through the relevant quality workflow.

Publishing returns a revisioned reference. Human-friendly aliases may point to the latest revision, but exported install commands pin the immutable revision. An alias resolution is displayed and locked before installation.

Proposed naming syntax is `presetId@revision` and `recipeId@revision`; this is our CLI contract, not a shadcn feature. A snapshot ID uses a conservative slug format and carries no secrets. Unlisted links are publicly readable to anyone holding the link and must not be labelled private.

## Compatibility and migration

Schema version, catalog release, compiler version, artifact hashes, and verification status are separate concerns. Increment the JSON schema version when data meaning or allowed structure breaks. Use semantic versioning for published packages and catalog contracts, with extra caution during `0.x` releases.

Provide explicit migrations with before and after previews. Unknown major versions fail with a clear upgrade instruction. A migration cannot silently drop unsupported tokens, convert web effects into native code, or change a user's selected primitive implementation.

Preserve immutable old snapshot payloads. If a release is withdrawn for a serious defect, return a clear advisory for new resolutions and provide a corrected release; do not replace the old bytes under an existing hash.
