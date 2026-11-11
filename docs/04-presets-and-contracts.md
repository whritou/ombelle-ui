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
| `styleFamily`       | Flat, minimalist, neo brutalism, ombelle, or liquid glass               |
| `modes`             | Light and dark semantic token overrides                                 |
| `design`            | Portable bounded density, radius, border, font, and motion choices      |
| `componentDefaults` | Reviewed per-component default props; Button is the first schema entry  |

Color inputs in this initial schema accept six-digit hex or numeric OKLCH. They deliberately exclude arbitrary CSS expressions, URLs, and user-defined `var()` chains. A color parser must additionally reject invalid numbers, out-of-range values, unsupported gamut policy, or misleading syntax. Future syntax support must be versioned and tested.

Sparse preset inputs inherit the exact defaults from `catalogRelease`. For project initialization and snapshot publishing, the resolver materializes a complete normalized preset containing every token needed by selected components. Store that normalized data locally and hash it; never rely on mutable remote defaults.

The initial schema includes Button defaults only. Adding controls for another component requires corresponding schema, compiler, documentation, and test changes. A generic JSON bag is not an acceptable shortcut.

### Liquid glass design fields

Eight `design` fields apply only when `styleFamily` is `liquid-glass`; the other families ignore them and their output does not change. The filter and sheen fields are preset-driven so a glass preset can tune its material, and the contrast bound below is computed from the values the preset sets:

| Field | Contract |
| --- | --- |
| `transparency` | `auto` (default) renders translucent surfaces; `reduced` renders every glass surface opaque with no blur, filter, or sheen |
| `glassBlurPx` | Backdrop blur radius from 0 to 40 pixels; default 12. The built-in glass preset uses 8 |
| `glassOpacity` | Surface opacity from 0.25 to 1: the share of the surface colour in an sRGB mix with the filtered backdrop; default 1. The built-in glass preset uses 0.57 |
| `glassSaturation` | `saturate()` amount from 1 to 2; default 1.4. Built-in 2 |
| `glassBackdropContrast` | `contrast()` amount from 0.3 to 1.6: below 1 it compresses the backdrop's channel range, above 1 it deepens it and adds a drop shadow of alpha `(c − 1) × 0.545`; default 1 (none). Built-in 0.45 |
| `glassBackdropTone` | From 0 to 0.6: the backdrop's `brightness()` is `1 + tone` in light mode and `1 − tone` in dark mode, pushing it toward the mode's surfaces; default 0. Built-in 0.4 |
| `glassSheen` | From 0 to 1: opacity of the white specular gradient at the top of each glass surface, scaled by 0.25 in dark mode; default 0. Built-in 0.25 |
| `glassRim` | From 0 to 1: strength of the white edge light; default 0.35. Built-in 0.6. Decorative only |
| `glassRefraction` | Optional, 0 to 1: rim refraction strength (`--glass-refraction-strength` = value ÷ 6.9). Chromium only. Off under `reduced` |
| `glassRefractionWidth` | Optional, 0 to 0.3: share of the surface the rim refraction reaches |
| `glassHalo` | Optional, 0 to 1: rim light near the pointer, lit by `LiquidGlassFilter`. Off under `reduced` |
| `glassDepth` | Optional, 0 to 1: relief within 3px of the rim and a layered drop shadow |
| `glassMotion` | Optional, 0 to 1: how far the shine follows the pointer and a Card's hover lift |
| `glassDispersion` | Optional, 0 to 1: colour fringe along the rim. Off under `reduced` |

The six optional material fields write their tokens only when set, so a preset without them compiles to the same tokens as before. When any of them is above 0, the material adds a white shine of `sheen × 0.6` that the contrast bound counts: the bound uses `1 − (1 − s)(1 − 0.6 s)` as the sheen.

For glass presets only, the compiler emits `--glass-blur`, `--glass-opacity`, `--glass-saturation`, `--glass-contrast`, `--glass-brightness`, `--glass-sheen`, `--glass-highlight`, `--glass-nested-opacity`, `--glass-primary-tint`, and `--glass-destructive-tint` in `ui-tokens.css`; brightness, sheen, highlight, nested opacity, and the two Button tint amounts also have dark values. With `reduced` the filter tokens are neutral, opacity is `1`, and sheen is `0`. Absent fields take the defaults above. Those defaults are neutral, so a preset written before these fields compiles to the same contrast bound as before.

The glass backdrop filter is `blur() saturate() contrast() brightness()`, in that order. Filter functions act per channel on gamma-encoded sRGB values and clamp after each step (Filter Effects 1, sections 5 and 13). Blur averages and saturate is clamped to 0..1, so every channel enters `contrast(c)` inside 0..1 whatever the backdrop's colour. `contrast(c)` maps a channel `v` to `c·v + (1 − c)/2` and `brightness(k)` maps it to `k·v`, clamped. Both are increasing, so every backdrop pixel leaves the filter with each channel inside `[low, high]`: the images of 0 and 1. Saturation cannot widen that range.

With `auto`, the contrast model evaluates a worst-case bound over that range. Each declared surface and text pair, in light and dark mode, must reach 4.5:1 against the surface mixed at `glassOpacity` with grey `low` and no sheen, and with grey `high` under the full sheen. The text luminance must not lie between those two. Because the painted luminance increases with every backdrop channel and with the sheen, the pair then reaches 4.5:1 over any backdrop the filter can produce. Each pair must also reach 4.5:1 on its opaque surface, which the fallbacks use. Glass nested inside a glass Card, Dialog, or Tooltip drops its own filter and sees an unfiltered backdrop, so the compiler emits `--glass-nested-opacity`: the smallest coverage, at least `glassOpacity`, at which every pair passes against raw black and white. The CLI reports a failing pair as a notice and preserves the chosen settings. Direct calls to `compile()` and `compileButtonPreset()` can use `glassContrast: "report"` to compile below the bound. With `reduced`, the compiler evaluates the same pairs at opacity 1. This is stricter than the stable families. The bound covers only the declared pairs, not other content placed on glass. [Liquid glass](components/liquid-glass.md#contrast-bound) lists the pairs and the bound's assumptions.

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

The current private foundation supports the local Button command `add button --preset <local.json>` and exact immutable snapshot references in the supported global and Button-scoped paths. It installs a separate scoped Button and preserves the saved project preset and defaults for later ordinary additions. The `ps_brand@3` examples above are illustrative proposed identifiers, not valid references in the current implementation. Component-scoped support beyond Button remains pending. See [local usage](foundation-local-usage.md#component-scoped-button-presets) and [snapshot operations](snapshot-service-operations.md) for the supported commands and boundaries.

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

The Button recipe's `overrides` cover shape and depth (`radiusRem`, `borderWidthPx`, `minHeightPx`, shadow offsets), padding and gap (`paddingXPx` 0–48, `paddingYPx` 0–24, `gapPx` 0–24, in px), typography (`fontWeight` 300–800 in steps of 100, `fontSizePx` 11–24, `letterSpacingEm` −0.05–0.2, `uppercase`), liquid glass material (`glassOpacity` 0.25–1, `glassBlurPx` 0–40, `glassBackdropContrast` 0.3–1.6, and `glassSheen`, `glassRim`, `glassHalo`, `glassDepth`, `glassMotion`, `glassDispersion` 0–1, applied only when the recipe's preset is liquid glass and checked for contrast warnings with the material overrides applied), and per-mode `colors`. Padding applies to the `sm`, `default` and `lg` sizes; the `icon` size and icon-only Buttons stay square. Each mode's `colors` takes the base `background`, `foreground` and `border` roles, which replace the preset tokens the selected variant reads, plus `hoverBackground`, `hoverForeground`, `hoverBorder`, `pressedBackground`, `pressedForeground` and `pressedBorder`. For the `outline` variant, `background` and `foreground` replace `card` and `cardForeground`, and the compiler paints them on the Button, so they apply in every family whether it draws outline Buttons on the card, on the page background or transparent. State colors are painted after the family's own hover and pressed (`:active`) rules for the selected variant, and only in their mode: a mode without a state color keeps the family's state color. All recipe colors pass the same color parser and OKLCH bounds as preset colors. An omitted field emits no CSS, so a recipe without the new fields compiles to the same bytes as before.

The optional `icon` object picks one of twelve reviewed lucide-react icons (`name`), its `position` (`start` or `end`, default `start`), and `iconOnly` (default `false`). The icon renders `aria-hidden`. In icon-only mode no text renders and `content` becomes the Button's default `aria-label`, so `content` must contain a non-whitespace label. A recipe with an icon adds the catalog's pinned `lucide-react` to the installer's dependency plan; dependency installs run with lifecycle scripts disabled, and a project that already has that exact version needs no install.

Recipes cannot contain event-handler source, arbitrary JSX, imports, raw selectors, or packages; icons are a closed list of names, not import paths. The editor renders its own reviewed interaction fixtures, such as an example loading toggle. User-provided content is rendered as text.

Installation writes the base component, scoped recipe CSS, and an example usage file. It does not replace the project's global preset. Resolve the recipe's pinned preset and materialize all tokens needed inside its scope so it retains the exported appearance even in a differently themed project. For composites with portals, the scope must reach the portal container; do not claim recipe support for a component until this is tested.

A local recipe JSON can reference a built-in preset available in the pinned catalog or an accompanying preset file using an explicitly supported bundle format. The initial example uses a built-in preset ID. A remotely published recipe resolves its preset revision by ID. No path or arbitrary URL is accepted through `presetRef.id`.

The local foundation implements the built-in-only Button path described in the [approved recipe design](superpowers/specs/2026-10-21-local-button-recipes-design.md). It generates a separate `RecipeButton` and self-contained CSS rather than replacing the app's ordinary Button. Recipe revisions are recorded separately from global preset provenance and survive ordinary additions and compatible theme changes. File bundles and remote resolution remain future work. See [local usage](foundation-local-usage.md#local-button-recipes) for commands and current limitations.

## Snapshot model

The private local snapshot service stores immutable preset snapshots. It stores the canonical normalized preset, content hash, revision, catalog release, compiler version, creation time, and validation status. The implemented identifier is `ps_` plus 32 lowercase hexadecimal characters with revision `1`; embedded preset identity remains unchanged. Every new intent creates a new identifier; only a matching idempotent retry within 24 hours reuses one. A schema-valid user snapshot remains a `draft`, not a verified or quality-reviewed preset. Recipe snapshots are not implemented.

Publishing returns an exact immutable reference. Reads and installer resolution require the reference and expected hash. Human-friendly aliases and revision updates are not implemented.

The private CLI syntax is `ps_<32 lowercase hex>@1`; it is not a shadcn feature. Exact references are publicly readable to anyone who has them and must not be labelled private. See [snapshot service operations](snapshot-service-operations.md) for the implemented API, operator controls, and limits, and [measured snapshot evidence](evidence/immutable-preset-snapshots.md) for verification status.

## Compatibility and migration

Schema version, catalog release, compiler version, artifact hashes, and verification status are separate concerns. Increment the JSON schema version when data meaning or allowed structure breaks. Use semantic versioning for published packages and catalog contracts, with extra caution during `0.x` releases.

Workspace packages are version 0.7.3. The published installer is version 0.7.2. Website commands follow the published version. The workspace CLI accepts recipe and recipe snapshot format 2.0 for the 28 additional catalog components. Button keeps recipe and snapshot format 1.0, including its existing generated bytes and hashes. Catalog and compiler compatibility remain 0.1.0.

Provide explicit migrations with before and after previews. Unknown major versions fail with a clear upgrade instruction. A migration cannot silently drop unsupported tokens, convert web effects into native code, or change a user's selected primitive implementation.

Preserve immutable old snapshot payloads. If a release is withdrawn for a serious defect, return a clear advisory for new resolutions and provide a corrected release; do not replace the old bytes under an existing hash.
