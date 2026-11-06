# Catalog component editors and recipes

2026-11-06. Proposed for review.

## Release scope

Every one of the 23 catalog components has a dedicated editor, a live preview, and a recipe that installs through the CLI. Deliver them together in one public release. Implement and verify component groups incrementally on the feature branch.

Reuse the shared workspace, generated catalog modules, compiler, and snapshot service. Each editor exposes a reviewed set of component props and content fields. Users can choose a supported built-in style, inspect generated artifacts, download recipe JSON, or publish an immutable install code. The Preset editor remains the place to change project-wide tokens. Custom TSX, CSS, class names, URLs, callbacks, and arbitrary component composition are outside this release.

## Approaches

- **Shared workspace with component definitions.** One editor hosts navigation, draft lifecycle, preview, artifacts, and publishing. A definition for each component supplies its allowed fields and composition. This approach keeps controls specific to the component and gives preview, compiler, and CLI one data contract.
- **Independent editor and exporter per component.** Each component could design its flow in isolation. This would duplicate persistence, validation, snapshot handling, and accessibility behavior across the catalog.
- **Extend the gallery with a generic property editor.** The gallery already previews every component, but its examples represent preselected compositions. Supporting compound widgets through a generic property bag would make it harder to validate accessible structures and generate deterministic install artifacts.

Use the shared workspace with component definitions.

## Routes and workspace

- `/editor/component` opens Button. `/editor/component/[id]` resolves an exact catalog ID and returns 404 for unknown IDs. `/editor/component/button` remains the canonical URL for Button and restores its existing local draft.
- Every component documentation page links directly to its editor. The workspace provides a labelled component chooser with all 23 entries and a link to the catalog. The chooser shows the current component and works with keyboard and touch at mobile widths.
- The inspector edits content and props. The preview exposes light and dark modes and a narrow viewport. Interactive specimens retain their real keyboard behavior. Mode, viewport, active pane, and interactions during review are view state and stay out of the recipe.
- Store one versioned local draft per component and keep Button's existing storage and recovery keys. Reload restores the matching draft. Switching components reads that component's own saved draft and starts a new undo stack for the route. Reset is undoable. Preserve invalid saved bytes for recovery.
- Keep the last valid preview visible while compiling a new edit or reporting an error. Label it as stale and disable current-artifact copy, recipe download, and publication until the current valid draft compiles. Guard worker replies by request ID and component ID. A publication error leaves the valid draft and JSON download available.

## Component fields

All new editors offer supported built-in style families and the matching reviewed Liquid Glass starting presets where available. The four stable families use the catalog support table. Liquid Glass keeps its experimental label and existing fallback and advisory contrast behavior. Style selection changes the recipe's pinned preset reference. New editors leave theme tokens at the chosen preset's values.

The table defines the controls in this release. Interactive state names such as `initial selection` describe the installed starting state. Opening a menu or making a selection in the preview does not alter that configuration. Where a component needs a trigger, label, or other supporting element, the recipe builds a reviewed specimen with the required accessible structure.

| Component | Editable content and props |
| --- | --- |
| Button | Existing recipe fields and defaults |
| Accordion | Item headings and bodies, single or multiple expansion, collapsible in single mode, initially expanded items |
| Alert | Title, description, variant |
| Avatar | Fallback initials, accessible name, size, variant, online or offline indicator or no indicator |
| Badge | Label, variant |
| Card | Title, description, body, title level, density |
| Checkbox | Label, unchecked, checked or indeterminate starting state, disabled, required |
| Dialog | Trigger label, title, description |
| Dropdown Menu | Trigger label, labelled items, item variant and disabled state |
| Input | Label, placeholder, initial text, disabled, required, invalid |
| Label | Label text and whether its paired input is required |
| Native Select | Label, options, initial selection, size, disabled, required |
| Popover | Trigger label, title, description, side, alignment |
| Progress | Accessible label, value, maximum, indeterminate mode |
| Radio Group | Group label, options and descriptions, initial selection, orientation, disabled, required |
| Select | Label, placeholder, options and hints, initial selection, trigger size, content position, disabled, required |
| Separator | Orientation, decorative state, optional label when semantic |
| Skeleton | Shape and label for the loading region |
| Switch | Label, initial checked state, disabled |
| Table | Caption, column headers, numeric column designation, and cell text |
| Tabs | Tab labels and panel text, initially active tab, orientation |
| Textarea | Label, placeholder, initial text, disabled, required, invalid |
| Tooltip | Trigger label, tooltip text, side |

Require nonblank accessible labels and compound item labels. Limit individual text fields to 200 characters, body or initial text fields to 1,000, option and item lists to 12, and tables to 8 columns and 12 rows. Compound items have stable IDs, unique within a specimen. Validate references to selected items, rectangular tables, and determinate progress values in the range from zero to the positive maximum. Use explicit field defaults and catalog API enums. For native control fields that represent names or relationships, generate local identifiers and connect them with the platform's normal accessibility attributes. Keep all user text as data and escape it through React and the code generator.

## Recipe and artifact contracts

- Keep the Button 1.0 schema, normalization, hashes, stored snapshots, generated paths, and output bytes compatible. Button continues to export 1.0 recipes.
- Add a 2.0 recipe schema for the other 22 IDs. Discriminate on `component`. A recipe contains `schemaVersion`, `component`, `id`, `revision`, the exact `presetRef`, and component-specific `props` and `content` objects. Reject extra keys at each level. Reuse the existing recipe ID, safe revision, payload-size, and exact preset-reference rules. Resolve the pinned catalog and compiler releases through the existing preset resolver.
- Use one pure, exhaustive definition per component to normalize its fields and describe its specimen. The specimen contains reviewed catalog exports and approved supporting elements, literal props, and text. The recipe version selects the compile path. Bind the canonical recipe hash, resolved preset hash, and catalog and compiler provenance into the scope identity. Stable sort order and formatting produce identical artifact bytes for identical inputs.
- Generate the component module with a named recipe component, colocated CSS, a usage example, and exact dependencies from the reviewed modules the recipe uses. The saved specimen can render without additional props. Install modules at `recipes/<id>/r<revision>/<component>.tsx` under the configured component directory and usage examples through the existing recipe paths. Internal helper artifacts, including any required filter module, stay in the same revision directory. Reuse the shared utility only under its existing ownership rules.
- Assign private slot names and the recipe scope to the generated styled parts. Derive scoped selectors from the reviewed catalog styles and generate the resolved preset's token values under the same scope. Preserve compound selector relationships and primitive state attributes. Mark and theme portalled content where it mounts so it receives the same styles without changing portal placement, focus handling, or dismissal. Scope material and helper styles and isolate filter IDs so that two recipe revisions and ordinary host components can render together.

## Preview and export

Compile in the browser worker using the same compiler as the CLI. Use the normalized specimen to render prebuilt, reviewed catalog modules inside the sandbox and to generate the installed JSX. Send the preview the validated specimen data, scoped styles, provenance, and view state through the existing channel pattern. Check the message shape and active request before rendering. Preserve the isolated iframe boundary and render its portals inside it.

The code panel uses the current compile result for usage, source, CSS, and install information. JSON downloads contain the validated recipe. The existing Get code flow publishes on explicit user action and returns an exact `rc_<id>@1` reference. Extend the recipe snapshot validator and dispatcher with a 2.0 envelope for the new recipes. Existing 1.0 snapshots keep their stored bytes and references. Keep the existing publication limits, idempotency, withdrawal rules, and local and hosted storage behavior. The public read-only page shows the component name, matching preview, and install and download actions.

## CLI and release

Support both local JSON and published references through the existing `add --recipe` command. Resolve the entry module from verified compiler output and validate every artifact destination and alias. Keep the existing dry-run, immutable ID and revision checks, file ownership, stale-plan handling, and rollback. Installing the same recipe again is a no-op when its tracked bytes match. Installing a different component or content under an occupied recipe ID and revision reports a conflict. A recipe install leaves the saved project preset, global CSS, and ordinary component files intact.

Build Badge through the complete path first, including the CLI and snapshot service. Then implement simple display components and native and compound form controls. Finish with compound layouts and overlays, verifying portal and filter isolation before release. Keep new website install commands gated by the first verified published CLI release that supports recipe 2.0. In local development, exercise them against the built CLI or packed candidate. Enable all 23 editors in the same public rollout after the compatible CLI is available.

## Acceptance

- Open all 23 editor URLs and verify their documentation links and component chooser entries. For each editor, edit a component-specific field, reload its draft, and check that the generated output matches the preview. Exercise keyboard and mobile navigation and invalid draft recovery.
- Validate and compile representative recipes for every component and supported style family. Check deterministic output and reject unsupported inputs, invalid compositions, mismatched provenance, and forged paths. Retain byte-level regression coverage for Button 1.0 recipes, locks, and snapshots.
- Install each component's downloaded recipe and its reference from the local snapshot service in initialized consumer fixtures through the built CLI. Check dry-run, no-op repeat, conflict detection, and protection of project defaults. Compare rendered DOM and computed styles against the editor in light and dark with the same dark selector and viewport. Cover native and compound controls, a keyboard-operated portal, and coexisting recipes with ordinary host components. Run the repository foundation gate and record actual browser and manager coverage.

## Handoff

After review, turn the component groups into implementation milestones with explicit gates for schema compatibility, editor-to-CLI parity, and the coordinated CLI and website release.
