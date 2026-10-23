# Product Requirements

## Product definition

Provide ready-made UI components that developers install as editable source and customize through a website or local code. A developer selects a visual style, sets a project preset, and receives future components in that same design system. Begin with components, then add composed blocks, then dedicated guidance and skills for AI agents.

The core product promise is consistency across design and implementation: the preview, exported files, installed component, and later additions agree on the same preset and component versions.

## Audience and problems

| Audience | Current problem | Desired outcome |
| --- | --- | --- |
| Product developers and small teams | Repeatedly restyling generic components across screens | Install usable components that already match the project |
| Designers who work in code | Tweaking tokens without seeing complete states or usable output | Edit visually and hand over exact code plus an install command |
| Agencies and design system owners | Maintaining several client styles through duplicated components | Reuse behavior while controlling tokens and visual recipes |
| Developers using coding agents | Agents invent APIs or ignore the existing design system | Retrieve real component contracts and respect the saved preset |

The first audience is React developers building web applications. Mobile developers become a supported audience when the native track passes separate release gates.

## Existing foundation and differentiation

shadcn already distributes editable component code, supports custom registries and preset commands, and provides a visual theme builder and agent skill. Those are foundations, not unique features of this project. See sources S1 through S7 and S12.

Our proposed differentiation is a maintained set of visibly different style families, per-component customization with export parity, persistent project defaults, documented style-specific accessibility, and a later native adapter. Validate that this saves users meaningful work before building a broad catalog.

Do not advertise every possible combination as accessible or supported. Publish a component by style by platform matrix, with stable, experimental, and unavailable statuses.

## Terminology

| Term | Definition |
| --- | --- |
| Component | One reusable UI building unit with a documented API |
| Style family | A visual language such as flat or neo brutalism |
| Variant | Component intent or size, such as destructive or small |
| Preset | Portable project design data selecting style and token values |
| Recipe | A saved component customization, including preset reference, allowed props, and local token overrides |
| Block | A composition such as a login form or settings section |
| Native HTML | Browser elements such as button, input, and select |
| React Native | Separate components rendered through React Native for mobile |

Keep these distinctions visible in the editor. A style family should not occupy the same control as a button's destructive variant.

## First release scope

The web alpha contains Button, Badge, Card, Input, Textarea, Label, Checkbox, Switch, Native Select, Dialog, Tabs, and Tooltip. Flat, minimalist, and neo brutalism receive stable support for all 12. Liquid glass starts with Button, Badge, Card, Dialog, Tabs, and Tooltip as experimental; other glass entries remain unavailable until reviewed.

The site includes a searchable catalog, component detail pages, style and state previews, a component editor, a global preset editor, and code plus CLI export. Users can download preset JSON and work without an account. Public immutable snapshots enable share links and install commands; publishing requires an explicit action.

The CLI initializes compatible projects, adds components, saves a project preset, installs a component recipe, previews changes, and reports configuration problems. npm, pnpm, Yarn and Bun support are required for the first release. It preserves the project's package manager, lockfile and source ownership.

The public preset-code workflow distinguishes project styling (`theme add <code>`) from one component (`add button --preset <code>`). A local preset JSON can be installed for one Button with `add button --preset <local.json>`. This creates a separate scoped Button and preserves project defaults and other components. Remote saved preset codes such as `ps_brand@3`, snapshot publishing, and component-scoped support beyond Button remain planned, not implemented by the current foundation. Codes, when supported, are values passed to a named argument, never generated flag names. Recipes additionally save component props, text, and overrides; selecting a preset for a component does not require creating a recipe.

For an already initialized shadcn project, a dedicated `theme add <preset>` command merges the palette and design tokens into its configured global stylesheet, normally `globals.css`. This path saves project defaults without rerunning shadcn initialization or reinstalling component source.

Web beta adds JSX output after the initial TSX implementation passes. All four package managers are alpha requirements. React Native, composed blocks, agent skills, custom code execution, private team libraries, and payment features follow separate milestones.

## Primary journeys

### Install a component

1. Browse a component and choose an available style.
2. Inspect light and dark modes, keyboard focus, and relevant states.
3. Copy a standard registry command or the product CLI command.
4. Review the CLI plan, install source and required styles, then import locally.
5. Customize local code using familiar React, TSX, and Tailwind conventions.

### Create a reusable project preset

1. Open the global preset editor and choose a style family.
2. Set light and dark colors, typography, radius, density, borders, shadow, and motion.
3. Review a gallery of components, including errors, focus, disabled controls, and overlays.
4. Download the JSON or publish an immutable snapshot and copy the setup command.
5. Apply it to a project. Later `add` commands use the locally saved preset automatically.

### Customize one component

To use an existing preset without saving extra props or content, choose its immutable code and install with `add button --preset <code>`. The component receives isolated styling; later ordinary additions still use the project's saved preset. Begin with Button and expand only after scope and parity checks pass. For a richer saved customization, use the recipe journey below.

1. Open a component with the selected project preset.
2. Change allowed props and component-specific visual tokens.
3. Inspect preview, usage code, generated CSS, and dependencies.
4. Export a recipe and copy its pinned install command.
5. Install the recipe as a scoped customization. Existing global project defaults stay unchanged unless the user explicitly applies its preset.

### Add styling to an existing shadcn project

1. Choose the already initialized installation path and select npm, pnpm, Yarn or Bun.
2. Copy the generated `theme add` command for the chosen preset.
3. Let the CLI read `components.json` and locate the configured global CSS file.
4. Review the light and dark palette, token additions and replacements, and any required Tailwind mappings.
5. Merge those declarations while preserving unrelated CSS, imports, component source and upstream configuration. Save the preset locally so future library installations inherit it.

The website copy is: “If you already initialized shadcn, add the styling to the project instead. This command merges the palette and tokens into your globals.css.”

### Work through an AI agent

In the later skills phase, the agent reads project configuration, checks the catalog and versioned APIs, installs through the CLI, and composes existing components. Skill instructions must direct the agent to preserve local edits and use dry-run output before changing generated files.

## Acceptance criteria

| ID | Requirement | Evidence required |
| --- | --- | --- |
| PR1 | Source ownership | Installed source builds with registry services unavailable |
| PR2 | Preview parity | Same snapshot renders equivalent DOM, styles, and state in the editor and fixture app |
| PR3 | Persistent defaults | Add a second component in a new process with no preset flag and receive the saved style |
| PR4 | Safe customization | Token edits update supported existing components; edited source is not silently replaced |
| PR5 | Accessibility | Automated checks and documented manual behavior tests pass for each stable entry |
| PR6 | Reproducibility | Identical versioned inputs produce byte-identical generated artifacts before project formatting |
| PR7 | Useful export | Export includes every required file, dependency, import, and usage instruction |
| PR8 | Editor usability | Both editors are operable by keyboard and recover drafts after refresh |
| PR9 | Native honesty | Web native controls and React Native support are identified independently |
| PR10 | Four package managers | Fresh setup, component addition and theme merging pass with npm, pnpm, Yarn and Bun |
| PR11 | Existing project theme merge | Update the configured CSS tokens without reinitializing shadcn, duplicating declarations, replacing component source or changing the package manager |

## Initial measurement plan

Proposed pilot targets are five external developers, at least four completing preset setup and installation without assistance, median first working component within ten minutes in a supported starter, and no unexplained preview versus install differences. These are validation targets, not observed results.

Measure catalog-to-export conversion, successful installs in the pilot, preset reuse on a later installation, repeated customization, and accessibility regressions. Website analytics must be minimal and disclosed. CLI telemetry is off by default; tests and voluntary pilot logs provide early evidence.

## Explicit exclusions

The first release does not promise Vue, Svelte, Angular, universal web and mobile source, Tailwind v3, arbitrary CSS or TSX execution in the editor, automatic merging of all local modifications, a hosted application runtime, or a billing and marketplace platform. These boundaries protect the first release's consistency and quality.
