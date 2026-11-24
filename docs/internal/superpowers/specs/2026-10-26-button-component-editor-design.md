# M3 Button Component Editor Design

Date: 26 October 2026. Status: design draft for user review.

## Intent

Build the first product editor flow: a user customizes one Button, sees the result, recovers the draft after refresh, inspects the generated artifacts, and downloads an installable recipe. The exported recipe must compile and install through the existing local CLI with the same rendered result as the editor preview.

This is the first slice of M3, not the full editor or website roadmap. It establishes the app and reusable editor boundaries that later component routes can follow.

## Scope

- Create `apps/www` as the product app, using the Next.js web stack specified by the system architecture.
- Add `/editor/component/button` with the documented responsive editor layout.
- Support the three exact built-in preset families: flat, minimalist, and neo brutalism; support light and dark preview modes.
- Expose only fields accepted by the current Button recipe schema: exact built-in `presetRef`, recipe ID and revision, Button variant/size/type/disabled/loading, text content, and the bounded radius, border-width, minimum-height, and shadow-offset overrides.
- Persist a versioned local draft, support bounded undo and redo, and provide recovery export if stored data cannot be migrated.
- Display the recipe's generated usage TSX, component TSX, scoped CSS, dependencies, and local CLI command.
- Provide accessible copy actions for generated artifacts and the CLI command.
- Download validated recipe JSON. Explain that installation requires an initialized project and uses `add --recipe <local.json>`.
- Verify editor-preview parity against the generated recipe installed through the existing CLI.

## Out of scope

- The global preset editor, remote snapshot publishing/resolution, accounts, and server APIs.
- Editing arbitrary TSX, CSS, selectors, imports, package names, or remote font URLs.
- Expanding the public recipe schema to include color palettes or additional style controls.
- Editors for components beyond Button, or public `add --recipe <code>` resolution.
- Running generated TSX as executable input in the browser.

## Approaches considered

1. **Compile locally in the browser (selected).** Use the shared, pure compiler in a route-loaded worker. This keeps edits local and offline, preserves one compiler implementation for preview/export/CLI, and avoids network requests per change. The tradeoff is shipping compiler and formatter code to editor users; lazy loading and a worker keep the default page smaller and the UI responsive.
2. **Compile through a server endpoint.** This can reduce browser-side compiler code but adds a network dependency, request lifecycle and stale-response handling, and does not support offline editing. It is not needed for a bounded, validated recipe format.

## User flow and state

The editor opens with a valid built-in Button recipe draft. Users can choose one of the three pinned family presets; changing family updates the recipe's `presetRef`. Preview mode (light or dark), viewport, focused/hovered demonstration state, active panel, and other transient presentation settings are view state; they are not serialized into the recipe or its identity.

Keep the state records distinct:

- **Draft:** validated recipe input and schema version, including its preset reference, ID/revision, Button props, content, and overrides.
- **View:** light/dark mode, viewport, active panel, and transient interaction demonstration.
- **Resolution:** last successful normalized recipe, exact compiler result, diagnostics, and monotonically increasing request revision.
- **History:** bounded undo/redo entries for meaningful draft edits. Text entry should group adjacent keystrokes so undo does not require one step per character.

Persist the draft in versioned local storage. On startup, validate and migrate known versions before using them. If parsing, validation, or migration fails, preserve the stored bytes and offer a downloadable recovery copy; start a new valid draft only after making the recovery action visible. Draft state stays on the device and requires no account. Do not publish or send draft content to a service.

Recipe ID and revision are visible in the export area. The CLI treats an installed ID/revision as immutable, so show that changed content for an already installed recipe requires a revision bump. The editor may update drafts without changing the revision automatically; the user chooses when to create a new installable revision.

## Compilation and preview

Load the editor and compiler code only on the editor route. Compile the schema-valid recipe with the pinned `@ombelle/compiler` release in a web worker. Validate before compilation, debounce expensive work, attach a monotonically increasing request revision, and discard responses that do not match the latest draft. The worker must not use filesystem or network access.

The preview runs in a sandboxed iframe. It loads a reviewed, prebuilt Button module for the exact catalog release, plus the scoped CSS emitted by `compileRecipe`. The host sends only validated recipe data and serializable view state over a validated message channel. The preview must not evaluate generated TSX, arbitrary source, or untrusted imports. The rendered preview uses the recipe's real content, props, and supported visual overrides; generated source remains visible as an artifact.

The properties panel edits recipe values only. A forced focus or hover demonstration is preview state and must not create fictitious component props. Disabled/loading and variant/size controls are real recipe props and therefore affect the exported recipe.

For each resolved revision, all output tabs read from the same `RecipeCompileResult`: generated usage, component, CSS, exact dependencies, recipe JSON, hashes/provenance, and CLI install command. A compile or validation failure reports field-level diagnostics and keeps the last valid preview and artifacts visible with a stale-result indication; it must not present old output as if it matched the invalid draft.

## App and module boundaries

- **`apps/www`:** Next.js routes, accessible editor UI, local draft storage, worker lifecycle, and preview iframe host.
- **Editor state module:** schema-aware draft updates, view-state separation, bounded history, and versioned storage migration. It has no compiler or DOM side effects.
- **Compiler worker adapter:** validates and compiles the recipe using the shared contracts/compiler packages; returns a serializable result or structured diagnostics.
- **Preview frame:** reviewed Button rendering module and scoped style application; accepts only validated messages with request IDs.
- **Shared compiler/contracts/catalog:** remain the source of truth for recipe validation, built-in preset resolution, generated artifact bytes, dependency metadata, and hashes.
- **CLI:** remains the install path. The editor does not duplicate installer logic or claim installation succeeded merely because JSON downloaded.

## Interaction and accessibility

Use the documented desktop arrangement: preview and output in the center, structured properties beside them. On small screens, provide Preview, Customize, and Code tabs that retain the same draft. Label every control, provide a numeric field alongside range sliders, retain visible keyboard focus, and announce save, recovery, copy, and download results with restrained status messages.

Use proper tab semantics or ordinary labelled sections. The iframe has an accessible title and clear entry point. Preserve focus after undo/redo, errors, panel changes, and copy/download actions. Respect reduced motion and forced-colors behavior already encoded by reviewed component styles.

## Failure handling

- Invalid input is rejected by the current recipe schema before compilation or export.
- Unsupported preset IDs/revisions and compiler/catalog versions are reported without substitution.
- Compiler failures retain the last valid render but clearly mark it as out of date relative to the draft.
- Stale worker messages are ignored by request revision.
- Storage migration failure offers recovery export without overwriting the original stored value.
- Download failure and clipboard failure are reported accessibly; neither changes the stored draft.
- The generated CLI command is advisory until the user runs it. Local CLI conflicts and initialized-project requirements remain owned by the CLI.

## Acceptance and verification

The slice is complete when:

1. A user can edit supported Button fields and see the corresponding recipe in the preview in both light and dark modes.
2. Refresh restores the latest valid draft; undo and redo restore meaningful draft states; view-only changes do not alter recipe bytes or hashes.
3. Downloaded JSON passes the existing recipe validator and compiles deterministically with the shared compiler.
4. Installing the downloaded recipe into an initialized fixture through the existing CLI produces the same normalized DOM and computed styles as the editor preview for the same family, mode, props, and overrides.
5. The editor preview does not execute generated TSX or accept unvalidated messages; stale compiler results cannot replace newer results.
6. Keyboard-only users can edit, inspect, undo/redo, switch panels, and download; validation, storage, and export status are announced.

Verification should include focused state/storage/worker tests, recipe schema/compiler tests, accessible browser interaction tests, and the installed-fixture browser parity comparison. Record exact runtime/browser and measured matrix coverage. Do not describe automated axe/browser checks as human assistive-technology review.

## Implementation handoff

After this written spec is approved, create an implementation plan. Keep the first implementation limited to the Button route, the new product app shell, the recipe editor state/worker boundary, isolated preview, local export, and installed-fixture parity. Preserve current recipe and CLI contracts; any discovered need to broaden them requires a separate design decision before implementation.
