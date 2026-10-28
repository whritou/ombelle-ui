# Online Editor

## Product structure

The website serves documentation and an interactive component catalog. Two editors share the same preset controls and compiler: a component editor for one reusable customization, and a global preset editor for a project-wide design system.

Begin with structured controls, not an unrestricted code playground. Users edit supported visual values, props, and text. The code panel is generated output that can be copied or downloaded. Free-form source editing is a later feature with a separate execution sandbox.

## Information architecture

| Route | Purpose |
| --- | --- |
| `/docs` | Installation, framework support, accessibility and customization guides |
| `/components` | Searchable catalog with style and platform filters |
| `/components/[slug]` | Component API, live states, dependencies and install options |
| `/editor/component/[slug]` | Customize one component and export a recipe |
| `/editor/preset` | Create a global preset and inspect a representative gallery |
| `/presets/[id]/[revision]` | Read an immutable shared preset |
| `/recipes/[id]/[revision]` | Read an immutable component customization |
| `/styles/[family]` | Style rules, examples and supported component matrix |

React Native examples get an explicit platform view when available. A browser preview is not proof of iOS or Android rendering.

## Component editor layout

On desktop, use a catalog navigation rail, a central preview and output area, and a labelled properties panel. On small screens, use Preview, Customize, and Code tabs while preserving the same draft. Do not shrink a three-column desktop layout into unusable mobile controls.

The properties panel groups controls into style family, component props, colors, shape, spacing, type, effects, and motion. Only show options supported by the selected component and style. Disable unavailable combinations with a reason rather than generating broken output.

Preview controls include light and dark mode, width presets, relevant interaction states, sample content, and background fixtures. Interaction state is distinct from exported props: forcing focus for a visual review should not emit a `focused` prop that does not exist.

The output area shows usage TSX or JSX, component source, generated CSS, dependencies, and the CLI command. Every tab refers to the same resolved artifact set. Include reset, undo, redo, copy, download, and publish actions with accessible status messages.

## Global preset editor

Offer style selection, paired light and dark colors, font choices, radius, density, border treatment, shadows where supported, and motion preference. Use reviewed font IDs initially; do not accept arbitrary remote font URLs. Export a system font stack or documented local font integration without an undisclosed network dependency.

The preview gallery should include a form, buttons, cards, tabs, and an open dialog. Include invalid, disabled, loading, selected, and keyboard-focus examples. Evaluate contrast pairs in both modes and show a visible draft or verified status.

Switching a style family preserves explicitly customized values only when compatible. Show which values will reset and permit undo. Changing families does not silently discard design data or remove an error indicator.

The main export paths are download preset JSON, copy generated theme CSS, and publish an immutable snapshot to obtain an install command. The command panel offers npm, pnpm, Yarn and Bun tabs, plus New setup and Already initialized shadcn paths. Persist the user's selected runner in website preferences without adding it to the portable preset hash.

For the existing-project path, show: “If you already initialized shadcn, add the styling to the project instead. This command merges the palette and tokens into your globals.css.” Generate `theme add <immutable-preset-reference>` for that path. The new-setup path uses `init --preset <reference>`. Component pages also provide `add <component>`. Each runner executes the same pinned CLI release and immutable preset revision.

Component pages offer an explicit choice between the saved project preset (`add button`) and a selected preset for this component (`add button --preset <immutable-preset-reference>`). Use the same preset reference that can be installed globally with `theme add`; the command determines scope. Explain that the component-specific command preserves project defaults and other installed components. Initially enable this export only for Button after scoped installation is implemented and verified. Saving props, text, or per-component overrides instead produces `add --recipe <immutable-recipe-reference>`. Downloaded JSON remains an offline export/install option for both presets and recipes. Never generate a flag whose name is the saved code.

The existing-project export explains that token-aware components inherit matching values, while complete style changes needing extra classes or markup require a separate explicit migration. It must not imply that a palette merge rewrites every existing component into the new visual family.

A public snapshot action must explain that its content is publicly readable. No account is required for local editing or downloads.

## Editor state model

Represent state as separate records:

- `draft`: preset input, component props, text, and allowed recipe overrides.
- `view`: active panel, preview mode, viewport, background fixture, and transient state demonstration.
- `resolution`: normalized preset, generated artifact set, provenance, diagnostics and revision number.
- `history`: bounded undo and redo entries for meaningful edits.
- `publication`: idle, validating, publishing, published or failed, with the last published immutable reference.

Persist drafts to versioned local storage with an export route if a migration fails. Keep transient panel state out of preset hashes. Apply a short debounce to expensive generation, but reflect simple token changes immediately. Discard stale compiler responses using request revision numbers.

URL state contains compact identifiers and non-sensitive view settings. Large drafts belong in local state or a deliberately published snapshot. Do not publish on every keystroke.

## Preview and code parity

The compiler returns a deterministic artifact set and a rendering model derived from the exact generated source. For built-ins, compile reviewed component templates ahead of time and load the matching module version. Runtime visual data changes through generated, scoped CSS variables and recipe rules.

If a template change would alter source, the editor must load the corresponding generated module rather than a hand-maintained lookalike. In CI, compare exported artifacts rendered in a fixture app with the editor preview at the same viewport, mode, state and fonts. Exact files and computed styles are stronger parity evidence than screenshot similarity alone.

Scope previews through an isolated iframe with the same generated CSS and fonts as export. Allow only the capabilities required for reviewed built-in interactions. Use a distinct preview origin when possible; permit scripts for those reviewed modules, but omit same-origin sandbox privilege, top navigation, forms and popups unless explicitly necessary. Validate `postMessage` source, payload schema, request ID, and origin or an opaque-origin channel token as appropriate.

Portals must mount inside the preview document and inherit the intended tokens. A dialog that opens into the site's document can hide both style and accessibility defects and must fail parity tests.

## Implemented snapshot subset and remaining proposal

The local private implementation provides `POST /api/v1/presets`, exact `GET` and `HEAD` reads at `/api/v1/presets/{id}/{revision}`, explicit withdrawal and unwithdrawal operator commands, and immutable preset resolution by the private CLI. It uses SQLite under Node with explicit initialization and persistent-volume requirements. The public page is read-only; publication requires an explicit confirmation. Payloads are publicly readable by exact reference and remain drafts. No hosted endpoint, account, alias, public listing, recipe snapshot, or public CLI distribution is configured. See [snapshot service operations](snapshot-service-operations.md) for exact request, environment, and operational contracts and [measured evidence](evidence/immutable-preset-snapshots.md) for verification limits.

The remaining public release, hosting, and account/alias proposals below are not implemented interfaces.

## Proposed snapshot API

| Endpoint | Input | Result |
| --- | --- | --- |
| `POST /api/v1/presets` | Validated preset draft | Immutable ID, revision, hash, status and resolved version metadata |
| `GET /api/v1/presets/{id}/{revision}` | Exact reference | Canonical normalized preset and provenance |
| `POST /api/v1/recipes` | Validated recipe and resolvable preset reference | Immutable recipe reference and content hash |
| `GET /api/v1/recipes/{id}/{revision}` | Exact reference | Canonical recipe and pinned preset reference |
| `GET /r/{release}/{item}.json` | Versioned standard registry item | Upstream-compatible registry JSON |
| `GET /api/v1/catalog/{release}` | Exact catalog release | Component metadata, supported controls and style matrix |

Use explicit content types, a proposed 64 KiB maximum JSON body, bounded string and nesting limits, anonymous publish rate limits, and idempotency keys for retries. Reject unknown fields. GET responses use ETags and immutable caching where appropriate. Draft publishing is not a verification service.

An error response contains a stable code, a human message, structured issues with JSON pointers, and a request ID. Use validation errors for malformed payloads, a distinct unsupported-version error, and rate-limit responses with a retry hint. A failed publish leaves the local draft and download actions usable.

Opaque ID generation prevents accidental collisions. Content-addressed deduplication is optional and should not reveal whether another person published identical content. Snapshot public-read semantics and retention must be documented before public launch.

## Website accessibility

Every control has a programmatic label and keyboard route. Use numeric inputs alongside sliders and text values alongside color pickers. Pair color with text in status indicators. Preserve focus after undo, errors, panel changes and copying. Announce save and export results through restrained live-region messages.

The code panel must support keyboard selection, visible focus and high contrast. Use actual tabs with correct semantics or ordinary labelled sections. Keep the preview in a clearly named region or iframe so a screen-reader user can choose when to enter it.

## Initial performance budgets

These are proposed budgets to measure on an agreed mid-range laptop and a representative mobile device: simple visual token feedback within 100 ms, stable generated output within 500 ms for a single component, and no network request per edit. Load code formatting and large editor tools on demand. The static catalog should remain usable while editor code loads.

Measure initial route payload, editor interaction latency, preview errors, export failures, and snapshot resolution failures. Establish concrete bundle and device budgets in M0. Do not add Monaco or arbitrary runtime compilation before a demonstrated user need justifies their complexity.
