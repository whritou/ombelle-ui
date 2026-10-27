# Local Global Preset Editor Design

**Status:** Approved for implementation through the user's continuation on 2026-10-27; verification is in progress.
**Date:** 2026-10-27
**Baseline:** `403685d`, the M3 Button editor merge on `main`.

## Intent and milestone boundary

Give a developer a reusable project theme they can edit in the browser, inspect across the catalog, download, and apply through the existing local CLI. A later ordinary `add` in a new process must inherit that exact saved preset. This is the first increment of M4 in [the delivery plan](../../07-delivery-plan.md), building on the local Button editor rather than expanding component recipe editing.

The spec and plan were prepared from the preceding recommendation and existing product requirements. The user subsequently authorized continuing with implementation. The scope below covers the local editor increment described in that recommendation.

The complete M4 milestone also needs anonymous immutable snapshot publishing and saved-code resolution. This increment ends at local export and installation. It introduces no public API, storage service, deployment, account, publication action, or remote install command. A subsequent spec must define snapshot identity, revision allocation, retention, rate limits, idempotency, CLI caching, hash verification, and public-read semantics before adding that workflow.

## Goals and acceptance

1. `/editor/preset` edits the flat, minimalist, and neo-brutalism families at preset schema 1.0 and catalog/compiler 0.1.0.
2. A gallery renders all twelve catalog components from reviewed generated source using the selected preset's actual compiled CSS. Light/dark, 320 CSS pixel and wide layouts, interactive states, and an open Dialog are inspectable.
3. Refresh restores the local draft, including temporarily invalid input. Undo/redo, field reset, and family changes preserve the developer's intent.
4. JSON and CSS exports come from the current successful compiler result. Invalid or pending edits cannot export a previous result as current.
5. Downloaded JSON works with existing `init --preset <local.json>` and `theme add <local.json>` commands. A new-process component addition without `--preset` resolves the saved exported preset.
6. The ordinary Button recipe editor continues to use its existing independent draft, worker, and frame protocols.

Failure includes a hand-styled gallery that diverges from installed components, silent loss of explicit customization on family changes, a stale download, or generated commands that imply public CLI distribution or remote resolution already exists.

## Approaches

| Approach | Benefit | Cost or limitation |
| --- | --- | --- |
| Extend the recipe editor's model and messages with optional preset fields | Shares some UI plumbing | Mixes incompatible `RecipeCompileResult` and `CompileResult` semantics and expands the Button regression surface |
| **Dedicated preset feature using the shared compiler and an isolated generated gallery** | Preserves existing contracts, verifies generated source, and uses local installation today | Adds a preset worker, frame protocol, and fixture |
| Implement the whole M4 publish service alongside the editor | Produces remote share/install references immediately | Couples local editing to new public service and distribution decisions that need their own spec |

The author recommends the dedicated local feature. Reuse established patterns and small presentational helpers where they already fit; do not restructure the Button editor as a prerequisite.

## Constraints

- Node **24.19.0**, pnpm **11.25.0**, preset schema **1.0**, catalog release **0.1.0**, compiler version **0.1.0**.
- React web TSX and the existing Tailwind v4 Vite/Next.js consumer baseline. Existing npm/pnpm/Yarn/Bun support boundaries remain those of the CLI; new browser evidence is labelled by its actual matrix.
- No new dependencies, schema fields, catalog templates, compiler output behavior, public CLI flags, arbitrary CSS/TSX, font URLs, or liquid glass support.
- Edit generator inputs and scripts, never generated schemas or preview files by hand.
- Generation uses `compile({ preset, componentIds: supportedComponentIds, catalogRelease: '0.1.0', compilerVersion: '0.1.0' })` and produces `CompileResult`.
- Existing installer dry-run, ownership, conflict, and transaction behavior applies unchanged. `--yes` never authorizes replacing modified source.
- The Next.js instructions in `apps/www/AGENTS.md` apply when implementing the new route and components; consult the installed framework guides then.

## Editor experience

The page has a heading, style and identity controls, grouped token controls, a named preview frame, diagnostics, and export sections. At narrow widths these become an ordinary document flow with controls before preview and export. Controls and the frame remain reachable by keyboard; there is no drag-only layout.

**Identity:** start with ID `project_preset`, name `Project preset`, and revision `1`. These are editable and validated against the existing preset contract. Style changes preserve identity. Catalog/compiler versions and platform are fixed and shown as provenance.

**Colors:** edit each of the schema's nineteen color keys for light and dark independently. Each has a labelled text field, swatch, and reset action. Accept the exact existing hex/OKLCH syntax and semantic bounds through `validatePreset`. A native picker may accompany six-digit hex input; OKLCH remains editable as text without silent conversion to hex.

**Design:** `fontFamilyId` (`system-sans`, `system-serif`, `system-mono`), `radiusRem` (0..2), `density` (`comfortable`, `compact`), `borderWidthPx` (0..4), `shadowOffsetXPx` and `shadowOffsetYPx` (-16..16), and `motion` (`full`, `reduced`). Numeric fields retain incomplete text until it can be validated; sliders are optional paired conveniences. Fonts use the compiler's existing system stacks. Values retain exactly their current compiler semantics; the editor does not promise every component consumes every token.

`transparency`, glass fields, and `componentDefaults` are not controls in this increment. Exports retain the selected built-in's values/defaults. In particular, Button variant/size defaults remain the built-in defaults, allowing exact generated-source matching without runtime source compilation.

**Family changes:** all exposed token paths are compatible across the three offered families. Preserve every explicitly edited value, even if equal to the old family's default. Untouched values take the new family's defaults. Show a confirmation containing the names and old/new values of untouched fields that will change; cancellation changes nothing, confirmation records one history entry. Invalid explicit input also survives the switch and remains visibly invalid. No warning is needed if no values would change. Undo restores the complete prior family and edits. Resetting a field removes its explicit edit; resetting the whole draft to the selected family defaults requires confirmation and is undoable, with identity retained.

**View state:** light/dark mode, wide/narrow viewport, active control group, output section, and gallery interaction state. These are not preset data or history entries. The viewport choice sets a 320 CSS pixel or available-width frame; a page at 320 CSS pixels must itself reflow.

## Draft, validation, history, and recovery

Use a separate `apps/www/src/preset-editor/` feature. Its portable editor envelope is:

```ts
type PresetEditorDraft = {
  storageVersion: 1
  family: StyleFamily
  identity: { id: string; name: string; revision: string }
  edits: Partial<Record<PresetEditablePath, string>>
}
```

`PresetEditablePath` is the finite union of `/modes/{light|dark}/{colorKey}` and the seven exposed `/design/{key}` paths above. The edits map, rather than comparison to a default value, records explicit intent. Raw strings permit invalid and incomplete fields to survive recovery. The envelope rejects unknown properties, unsupported families, unknown paths, non-string values, identity strings over 80 characters, and edit strings over 80 characters. Revision text is at most 16 characters. It is safe to recover a structurally valid envelope whose preset values are invalid; compile diagnostics then identify the field.

`materializePreset(draft)` deep-clones the selected catalog base, overlays identity and explicit edits, fixes the release/platform fields, converts numeric strings only when nonempty and finite, and calls `validatePreset`. Revision must be a positive safe integer. Validation errors use the existing JSON-pointer paths. Empty numeric text must never become zero through `Number('')`.

History has at most 100 snapshots. Edits to the same field within 500 ms coalesce; distinct fields and family/reset/identity actions do not coalesce. Unchanged drafts add no history entry. Undo after an invalid edit restores the previous raw value; a new edit clears redo. The draft and bounded history are persisted separately under `ombelle:preset-editor:draft:v1` and `ombelle:preset-editor:history:v1`; the Button editor's keys are untouched. Validate restored history with the same envelope validator; discard only invalid history with a visible notice while retaining a valid draft. Keep the complete pair within a **256 KiB UTF-8** storage budget by dropping oldest history first; if necessary retain the draft alone. A draft alone exceeding the limit is rejected with recovery available.

Unknown versions or malformed stored drafts enter recovery: retain the original raw string, offer its download and an explicit reset, and do not overwrite it on mount or failed save. Storage denial or quota errors keep the in-memory editor usable and produce a persistent save warning. No cross-tab synchronization or migration from the recipe format is introduced.

## Compilation and export consistency

A dedicated browser worker accepts `{ type: 'compile-preset', requestId, draft }` and returns either `{ type: 'preset-compiled', requestId, result: CompileResult }` or a structured invalid response. Validate the envelope before materializing. Debounce generation by **150 ms**; mark output pending immediately on any draft edit. Request IDs increase monotonically and stale responses are ignored, including an old response arriving during the debounce window. A worker error/termination exposes retry and keeps the draft. Once the app and preview assets are loaded, edits require no network requests or remote font loads.

Track the exact canonical draft key associated with each accepted result. A result is exportable only when its key equals the current draft key, compilation succeeded, and no edit is pending. View-only changes do not invalidate it. A last successful preview may remain visible during an invalid/pending edit, clearly labelled **Previous valid preview**. Copy/download actions are disabled until the current draft compiles successfully. Frame failure is reported separately from compiler failure: valid local exports remain available if the preview server is unavailable, with a visible preview warning.

Export normalized preset JSON as `canonicalize(result.preset.data) + '\n'`, UTF-8, filename `project-preset.json`. The identity remains inside the payload; the fixed filename keeps local instructions pasteable. Display the preset hash and exact versions alongside the output. Copy theme CSS exports exactly the `styles/ui-tokens.css` artifact and labels it **Tailwind v4 token CSS**. Provide the compiled `styles/ui-style.css` as a separate read-only/copyable output, explaining that token CSS alone does not apply a complete visual family or replace the CLI's parsed merge. Dependency information derives from this result, never a second catalog list.

The install section explicitly describes the private local CLI. From the Ombelle repository, after `pnpm build:packages`, save the download there and use:

```powershell
pnpm exec node packages/cli/dist/main.js init --preset ./project-preset.json --cwd APP --dry-run --json
pnpm exec node packages/cli/dist/main.js theme add ./project-preset.json --cwd APP --dry-run --json
```

Offer **New setup** and **Already initialized shadcn** paths, with `APP` explained as the target project directory. The existing-project copy remains: “If you already initialized shadcn, add the styling to the project instead. This command merges the palette and tokens into your globals.css.” Explain reviewing the plan and replacing `--dry-run --json` with `--yes` to apply. The target project's existing manager is selected by the CLI. Public runner tabs and immutable references belong to the publishing/distribution follow-up. No install action executes on the user's machine from the website.

## Isolated gallery and artifact provenance

Add `/preset-preview/` to the existing preview app and a dedicated preset frame component in the product app. Keep the Button frame protocol separate. The preset frame has `sandbox="allow-scripts"`, a descriptive title, and the same explicit origin configuration pattern as the existing editor frame. It receives a transferred `MessagePort` only after validating ready/init messages, parent/frame window identities, expected origins, and protocol version. After initialization all payloads use that port. Reset request tracking when the frame reconnects; close old ports and reject responses from old sessions.

The render message contains an increasing request ID, a complete `CompileResult`, and the view mode/viewport. Enforce exact message keys, supported versions/family, all twelve component IDs via expected artifact inventory, artifact/path uniqueness, and a **1 MiB UTF-8 serialized message limit** before expensive verification. The receiver recompiles `result.preset.data` with the fixed twelve IDs and requires canonical equality with the supplied result. It also rechecks request ordering after asynchronous verification. CSS is taken only from this verified result and inserted through `style.textContent`. Arbitrary message CSS, URLs, HTML, or source are never executed.

`scripts/generate-preview.ts` additionally generates a release-specific static gallery module, canonical/transformed source manifest, Tailwind input, and fixture from `compile` outputs. Generate from the flat base, and require that component and utility source bytes match results for the other two bases; unsupported source divergence fails generation. The only allowed source transforms are documented import-alias rewrites and removal of known colocated CSS imports whose artifacts are applied dynamically. Record both hashes and validate actual transformed module bytes, not just manifest claims. Resolve static imports at build time; runtime TSX evaluation is prohibited.

At runtime verify that the current result's component/utility hashes equal this generated manifest. This is valid because the exposed editor fields do not alter generated source. A mismatch rejects the frame update and asks for regeneration, rather than showing a lookalike. The shared gallery fixture imports these generated modules in preview and installed components in consumers.

Only the preview runtime imports its generated manifest/modules. Pass the manifest into the protocol verifier; product-app modules and unit tests must remain importable before `generate:preview`, matching the foundation gate's build/unit/generation order.

Build Tailwind utility rules ahead of time using the reviewed generated source, shared fixture, the fixed `@theme inline` variable mappings from the compiler, and the existing dark variant. Do not send Tailwind directives to the browser expecting runtime compilation. The frame applies the verified token declarations and remaining style artifacts in deterministic compiler artifact order after its structural/Tailwind stylesheet. Concrete built-in tokens must not override current edited values. Set dark mode on the frame document element so Radix portals mounted in that document inherit the same tokens. Document/body font uses `var(--font-family)`.

The gallery includes Button (default, disabled, loading), Badge, Card, Input/Label/Textarea/Native Select with an invalid field, Checkbox, Switch, Tabs with a selected panel, Tooltip, and an interactive Dialog. Dialog starts closed and has an **Open dialog** action; opening it supplies the required overlay inspection without trapping focus on every edit. Preserve/reopen it across token updates where possible; all portals stay in the iframe. Visible focus uses real keyboard focus, not a synthetic claim of keyboard coverage. Form examples cannot navigate or submit outside the frame.

A render acknowledgement is emitted after CSS and the corresponding generated module/DOM have committed, not after merely scheduling React state. Matching preset hash/request ID is available to browser tests. Outdated, malformed, rejected, and disconnected updates never appear as the current gallery.

## Diagnostics and accessibility

Show validation errors next to their controls and in a linked summary using JSON pointers. Preserve focus across errors, history, and exports. Label text fields and optional pickers separately; use restrained live announcements for saved/failed/exported states. Clipboard denial provides selectable text; download failure leaves the draft intact.

Report token contrast for foreground/background, cardForeground/card, popoverForeground/popover, primaryForeground/primary, secondaryForeground/secondary, mutedForeground/muted, accentForeground/accent, and destructiveForeground/destructive in **both** modes. Use opaque sRGB values from the browser's color conversion and the standard relative-luminance ratio, with **4.5:1** as the normal-text advisory threshold. Non-opaque or unconvertible pairs are **Not evaluated**, never a pass. Reuse the math pattern in `tests/helpers/contrast.ts`, but product code must live outside test helpers. These advisory warnings do not block exports of schema-valid presets.

Use the status **Draft — automated token contrast only**. There is no “verified” badge for arbitrary user colors, no blanket accessibility certification, and no claim that these eight pairs cover all states, focus, or non-text contrast. Diagnostics and preview failure remain visible after family changes.

## Evidence and completion boundary

Focused unit tests cover draft intent/materialization, numeric/color boundaries, family switch/reset/history, storage recovery, stale responses, export matching, protocol rejection, and contrast math. Integration tests pass actual editor export through the built CLI, check normalized saved preset/hash and parsed theme declarations, and add a second component in another CLI process without a preset argument. Test new Vite and Next.js setup plus existing-shadcn theme merge, dry-run, no-op, and edited-source preservation.

The current `test:unit` script and its independent evidence inventory select only `packages`. Expand both to include `apps/www/src`, with matching file/assertion validation, so app unit tests are measured rather than silently omitted. Keep generation-dependent checks in integration tests that prepare their own private outputs.

Browser cases cover each family in light/dark, all twelve gallery rows, keyboard/focus/Dialog portals, draft refresh/undo/recovery, valid and invalid export gating, narrow reflow, preview disconnection, and browser-to-CLI installed parity. The parity harness uses the actual downloaded JSON to install offline standalone npm Vite and npm Next.js consumers with preseeded declared dependencies. For all six family/mode combinations in both frameworks compare generated source hashes (accounting only for documented import transforms), normalized specimen DOM, computed styles, and representative pixels at matched viewport/state/fonts. Compare parsed managed declarations rather than whole global stylesheet bytes because the installer intentionally preserves unrelated CSS.

Add these cases to a separate browser spec and update strict foundation inventory and omission tests with its exact authored count. Retain current Button editor coverage. Record exact test commands, versions, environment, and failures; do not copy older green evidence into this increment. A full 34-consumer foundation pass remains a separate recorded outcome, not an implication of focused editor checks. Human/screen-reader review, native text zoom, other browser engines, publishing, and remote resolution remain unestablished unless independently measured.

## Implementation freedom

The implementer may choose control component boundaries, CSS layout details, and small internal helpers within the interfaces in the plan. Keep messages, data bounds, export semantics, generated-source checks, isolation, and acceptance criteria fixed. No unrelated Button editor refactor is required.
