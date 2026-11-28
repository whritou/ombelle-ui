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
| `/editor/component` | Open the component editor workspace at Button |
| `/editor/component/[slug]` | Customize one component and export a recipe |
| `/editor/preset` | Create a global preset and inspect a representative gallery |
| `/presets/[id]/[revision]` | Read an immutable shared preset |
| `/recipes/[id]/[revision]` | Read an immutable component customization |
| `/styles/[family]` | Style rules, examples and supported component matrix |

React Native examples get an explicit platform view when available. A browser preview is not proof of iOS or Android rendering.

## Component editor layout

The navigation above the workspace lists the available editors and links to the full catalog. Each enabled component has a Customize link from its documentation page and a separate draft at `/editor/component/[slug]`. Button keeps its existing draft, recovery, and recipe formats.

The editor supports all 23 catalog components. The 22 additional editors export component recipes 2.0 and use the chosen preset's theme tokens. The public routes and install commands require CLI 0.6.0 or later. To run locally, build packages with `pnpm build:packages` and start the site with `pnpm dev:www`. Publishing locally requires an [initialized snapshot store](snapshot-service-operations.md). Use the built CLI to install downloaded JSON or an exact snapshot reference with its local origin and hash.

On desktop, the labelled properties panel sits beside the preview and output area. On small screens, Preview, Customize, and Code tabs share the same draft.

In the additional editors, Appearance targets the selected part, such as a Card surface, title, or body. Choose light and dark colors separately, and adjust spacing, borders, shape, and typography where the part supports them. The Liquid Glass material section appears for that family. Until a number field is edited, its placeholder and slider show the value the preset renders: part dimensions are measured from the live preview, and material settings come from the selected glass preset. These edits are saved in the recipe and included in its preview and installed styles.

The properties panel groups controls into style family, component props, colors, shape, spacing, type, effects, and motion. Only show options supported by the selected component and style. Disable unavailable combinations with a reason rather than generating broken output.

The Button editor's inspector has Style family, Content, Variant, Size & behavior, Icon, Padding & gap, Typography, Colors and Shape & depth sections. Number fields are bounded to the recipe schema's ranges, report out-of-range or off-step text instead of applying it, and show a reset once edited. Colors switch between Base, Hover and Pressed; empty hover and pressed fields keep the style family's state colors. Choosing icon-only relabels the content field as the accessible label. Every control writes a recipe field, so the preview, the generated files and `add --recipe` install the same result.

Preview controls include light and dark mode, width presets, relevant interaction states, sample content, and background fixtures. Interaction state is distinct from exported props: forcing focus for a visual review should not emit a `focused` prop that does not exist.

The output area shows usage TSX or JSX, component source, generated CSS, dependencies, and the CLI command. Every tab refers to the same resolved artifact set. Include reset, undo, redo, copy, download, and publish actions with accessible status messages.

## Global preset editor

Offer style selection, paired light and dark colors, font choices, radius, density, border treatment, shadows where supported, and motion preference. Use reviewed font IDs initially; do not accept arbitrary remote font URLs. Export a system font stack or documented local font integration without an undisclosed network dependency.

The preview gallery should include a form, buttons, cards, tabs, and an open dialog. Include invalid, disabled, loading, selected, and keyboard-focus examples. Evaluate contrast pairs in both modes and show a visible draft or verified status.

Switching a style family preserves explicitly customized values only when compatible. Show which values will reset and permit undo. Changing families does not silently discard design data or remove an error indicator.

The main export path is **Get code**: opening it publishes an immutable snapshot of the current draft and shows its install command at once. Downloading preset JSON and copying generated theme CSS are secondary paths. The command panel offers npm, pnpm, Yarn and Bun tabs, plus New setup and Already initialized shadcn paths. Persist the user's selected runner in website preferences without adding it to the portable preset hash.

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

The service is deployed at `https://ombelle-ui.vercel.app` with PostgreSQL (SQLite for local development). It provides `POST /api/v1/presets` and `POST /api/v1/recipes` (used by the editors, restricted by `Origin`), exact `GET` and `HEAD` reads at `/api/v1/{presets,recipes}/{id}/{revision}`, explicit withdrawal and unwithdrawal operator commands, and immutable resolution by the published CLI. The public pages are read-only; publication requires an explicit confirmation. Payloads are publicly readable by exact reference and remain drafts. No account, alias or public listing exists. The routes, payloads and status codes are specified in [Hosted API v1](hosted-api-v1.md). See [snapshot service operations](snapshot-service-operations.md) for exact request, environment, and operational contracts and [measured evidence](evidence/immutable-preset-snapshots.md) for verification limits.

The proposals below that are not in the table are not implemented interfaces.

## Snapshot API

The implemented routes, limits, headers and error shape are in [Hosted API v1](hosted-api-v1.md). Implemented: the agent catalog, `GET /api/v1/catalog` (see Hosted API v1). Not implemented and not planned for 1.0: standard registry item routes (`/r/{release}/{item}.json`), a per-release catalog route (`/api/v1/catalog/{release}`), accounts, aliases and listings. Draft publishing is not a verification service.

Opaque ID generation prevents accidental collisions. Content-addressed deduplication is optional and should not reveal whether another person published identical content. Snapshot public-read semantics and retention must be documented before public launch.

## Website accessibility

Every control has a programmatic label and keyboard route. Use numeric inputs alongside sliders and text values alongside color pickers. Pair color with text in status indicators. Preserve focus after undo, errors, panel changes and copying. Announce save and export results through restrained live-region messages.

The code panel must support keyboard selection, visible focus and high contrast. Use actual tabs with correct semantics or ordinary labelled sections. Keep the preview in a clearly named region or iframe so a screen-reader user can choose when to enter it.

## Initial performance budgets

These are proposed budgets to measure on an agreed mid-range laptop and a representative mobile device: simple visual token feedback within 100 ms, stable generated output within 500 ms for a single component, and no network request per edit. Load code formatting and large editor tools on demand. The static catalog should remain usable while editor code loads.

Measure initial route payload, editor interaction latency, preview errors, export failures, and snapshot resolution failures. Do not add Monaco or arbitrary runtime compilation before a demonstrated user need justifies their complexity.

The bundle budget is enforced since 1.0. `scripts/www-budget.json` sets a brotli size limit for the JavaScript each route loads at first paint, for the largest chunk, for each compiler worker and for the preview frame's first load. CI's `www-budget` job builds the site and runs `pnpm check:www-budget`, which fails when a limit is exceeded. Raise a limit only on purpose and in the same change that needs it. `pnpm measure:www-vitals <origin>` measures FCP, LCP, CLS and blocking time on a throttled phone profile; it is not a CI gate because those numbers depend on the machine. The measurements behind the budget are in [the 1.0 site performance evidence](evidence/www-performance-1-0.md); the block routes added in 1.1 are in [the blocks site evidence](evidence/www-blocks-1-1.md). The interaction budgets above (100 ms token feedback, 500 ms single-component output) are still unmeasured.
