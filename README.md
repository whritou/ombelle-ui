# Ombelle UI Library Development Documentation

Version 0.2 · 19 October 2026 · Proposed implementation baseline

Build a source-distributed React UI system on top of shadcn conventions, with several visual styles, accessible components, an online component editor, and a persistent project preset. The website preview, code export, and CLI installation must produce the same result.

This package is a development specification, not a working library. Product names, `@your-ui`, version `0.1.0`, snapshot IDs, and `ui.example.com` are placeholders. Commands attributed to the proposed CLI do not exist yet. Official shadcn capabilities are identified separately and linked in [sources](docs/09-sources.md).

## Start here

| Document | Purpose |
| --- | --- |
| [Product requirements](docs/01-product-requirements.md) | Audience, scope, journeys, measurable acceptance criteria |
| [System architecture](docs/02-system-architecture.md) | Repository, registry integration, compiler, installation flow |
| [Components styles and accessibility](docs/03-components-styles-accessibility.md) | Component contracts, four styles, native approach, release gates |
| [Presets and contracts](docs/04-presets-and-contracts.md) | Preset resolution, versioning, schemas, component recipes |
| [CLI specification](docs/05-cli-specification.md) | Commands, project detection, conflict handling, reproducibility |
| [Online editor](docs/06-online-editor.md) | Screens, editor state, API, preview security and parity |
| [Delivery plan](docs/07-delivery-plan.md) | Milestones, tickets, dependencies, validation and release gates |
| [Decisions risks and governance](docs/08-decisions-risks-and-governance.md) | Initial architecture decisions, ownership, licensing, open decisions |
| [Sources](docs/09-sources.md) | Verified primary references and their implications |
| [Installation and theme merging](docs/10-installation-and-theme-merging.md) | npm, pnpm, Yarn and Bun commands; styling an existing shadcn project |

The separate Word blueprint provides a compact planning overview. This Markdown package contains the more detailed engineering contracts.

## Proposed starting decisions

- Author components in React and TypeScript with TSX. Offer JSX output through a tested conversion pipeline before web beta.
- Distribute editable source through a shadcn-compatible registry. Reuse the upstream format and installer where practical; add a thin product CLI for project presets and editor recipes.
- Support npm, pnpm, Yarn and Bun from the first release. Detect the project's manager independently of the runner used to launch the CLI and preserve its lockfile.
- If shadcn is already initialized, offer `theme add <preset>` to merge the palette and tokens directly into the configured global stylesheet, usually `globals.css`, and save the preset for future installs. Do not rerun initialization or reinstall component source.
- Start with 12 web components and three stable style families: flat, minimalist, and neo brutalism. Develop liquid glass as a fourth family with explicit experimental support until its accessibility and performance gates pass.
- Use semantic HTML controls on web. Treat React Native for iOS and Android as a separate implementation track sharing portable tokens and metadata. Neither mobile support nor universal source compatibility is assumed.
- Keep accessible behavior stable across styles. Represent visual differences with semantic tokens and reviewed slot recipes.
- Make project presets local and versioned. Future additions read the saved preset automatically; compatible existing components react to token changes as well.
- Make the editor a structured customization tool first. Free-form TSX execution, community uploads, accounts, billing, and marketplace features are outside the first release.

## The first proof to build

Take Button and Dialog from a browser preview into a clean Vite app and a clean Next.js app. Save a neo brutalist project preset, install both, then install Input without specifying a preset again. Confirm the preview and installed result match, the saved preset is reused, and keyboard behavior survives the style change. Repeat with a locally edited file and verify the CLI refuses to overwrite it silently.

This vertical slice validates the project's hardest promises before expanding the catalog.

## Contract examples

- [Project preset](examples/preset.example.json) and [preset schema](schemas/preset.schema.json)
- [Component recipe](examples/recipe.example.json) and [recipe schema](schemas/recipe.schema.json)
- [Project configuration](examples/ui-library.config.json)
- [Registry configuration fragment](examples/components.fragment.json)
- [Standard registry item](examples/registry-item.example.json)
- [Standard registry theme](examples/registry-theme.example.json) and [CSS merge before](examples/globals.before.css) and [after](examples/globals.after.css)
- [Example component usage](examples/consumer-button.example.tsx)

Schemas are proposed version 1 contracts and validate the supplied examples. They intentionally cover the initial editor surface. They do not demonstrate a completed compiler, accessibility audit, package release, or upstream CLI integration.

## Decisions to confirm during discovery

Choose the final name and namespace, confirm whether native means React Native in addition to native HTML, and establish team capacity. This baseline allows implementation to start while those product choices remain open. See [decision log](docs/08-decisions-risks-and-governance.md).
