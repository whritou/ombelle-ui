# M3 Button Component Editor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the first `/editor/component/button` flow in `apps/www` so a user can edit, preview, recover, export, and install a Button recipe with compiler and render parity.

**Architecture:** Add a Next.js App Router product app. Keep recipe editing, history, and versioned local persistence in small client-side modules; compile through the shared compiler in a route-loaded web worker. Use a sandboxed iframe based on the reviewed generated Button module, and compare its rendered result with a CLI-installed recipe in the existing consumer fixtures.

**Tech Stack:** TypeScript, React, Next.js App Router, the existing contracts/catalog/compiler packages, esbuild for the browser worker bundle, Vitest, Playwright, and the existing Vite preview pipeline.

**Spec:** `docs/superpowers/specs/2026-10-26-button-component-editor-design.md`

## Global Constraints

- Use Node 24.19.0 and pnpm 11.25.0.
- Keep the recipe contract unchanged; support only built-in flat, minimalist, and neo-brutalism presets at catalog/compiler 0.1.0.
- Support light and dark preview modes; only recipe fields change exported recipe data.
- Keep drafts local, versioned, validated, and recoverable; do not add a publish endpoint or account flow.
- Do not execute generated TSX, arbitrary source, imports, or selectors in the browser.
- Use the shared compiler for preview artifacts, export, and CLI installation; do not duplicate installer logic.
- Keep the preview sandboxed and validate its message channel, payload schema, and request IDs.
- Preserve the CLI requirement for an initialized project and immutable recipe ID/revision behavior.
- Commit completed implementation tasks with Conventional Commit messages.

## Review Focus

- Corrupt or unsupported local storage must remain recoverable without being overwritten; test raw-byte recovery and that a new draft is not saved before recovery is offered.
- Out-of-order compiler worker responses must not replace current output; test two requests resolved in reverse order.
- Preview messages must be accepted only from the active iframe channel and valid schema; test malformed and replayed request messages.
- Family changes must update `recipe.presetRef`, while mode/viewport/forced interaction changes must not alter recipe bytes; test both boundaries.
- Preview and installed output must match for dark mode, overrides, loading/disabled state, and content; test the same recipe through the editor frame and CLI-installed consumer.

## File Map

- `apps/www/package.json`, `apps/www/next.config.ts`, `apps/www/tsconfig.json`, and `apps/www/src/app/`: product app configuration, root layout, and editor route.
- `apps/www/src/editor/model.ts`: default recipe draft, recipe updates, and recipe-versus-view state boundaries.
- `apps/www/src/editor/history.ts`: bounded undo/redo for meaningful draft edits.
- `apps/www/src/editor/storage.ts`: versioned local storage envelope, validation, and recovery export data.
- `apps/www/src/editor/compile-protocol.ts` and `compile.worker.ts`: typed worker messages and compiler adapter.
- `scripts/build-editor-worker.mjs`: bundle the browser worker into the Next public assets directory.
- `apps/www/src/editor/components/`: Button fields, responsive panels, output tabs, status messages, and frame host.
- `apps/preview/src/main.tsx` and new `apps/preview/src/editor-preview.tsx`: add the isolated editor preview entry using generated Button modules.
- `tests/e2e/editor.spec.ts`: browser-level editor interactions and installed-output parity.
- `playwright.config.ts`, `tsconfig.json`, `package.json`, and `scripts/foundation-evidence.mjs`: run and typecheck the app, include it in the browser gate, and declare its exact expected browser-test count.

## Task 1: Scaffold the product app

**Files:**
- Create: `apps/www/package.json`
- Create: `apps/www/next.config.ts`
- Create: `apps/www/tsconfig.json`
- Create: `apps/www/src/app/layout.tsx`
- Create: `apps/www/src/app/page.tsx`
- Create: `apps/www/src/app/editor/component/button/page.tsx`
- Create: `apps/www/src/app/globals.css`
- Modify: `package.json`
- Modify: `pnpm-lock.yaml`
- Modify: `tsconfig.json`
- Modify: `playwright.config.ts`
- Test: `tests/integration/www-route.test.ts`

**Interfaces:**
- Produces: workspace package `@ombelle/www`; root scripts `dev:www` and `build:www`; route `GET /editor/component/button`; Playwright starts the Next dev server on `127.0.0.1:3000`.
- The route initially renders an accessible page heading and editor shell; editor behavior is added in Task 5.

- [ ] **Step 1: Write the failing route render test.** Add `renders Button editor heading in the main landmark` to `tests/integration/www-route.test.ts`; render the default export of `apps/www/src/app/editor/component/button/page.tsx` with `renderToStaticMarkup` and assert a `main` element contains the `Button editor` heading.
- [ ] **Step 2: Run the focused route test and confirm it fails because the route module is missing.** Run: `pnpm exec vitest run tests/integration/www-route.test.ts`. Expected: FAIL because the Next.js app route does not exist.
- [ ] **Step 3: Scaffold the App Router workspace.** Add exact pinned Next.js, React, and React DOM dependencies compatible with the repository's Node/React pins; add `@ombelle/contracts`, `@ombelle/catalog`, and `@ombelle/compiler` workspace dependencies. Add `dev` and `build` app scripts, root `dev:www` and `build:www` scripts, Next config, global CSS, layout, landing page, and the Button route shell. Add `apps/www/src/**/*.ts(x)` to root typecheck coverage; add the Next dev server to Playwright on port 3000; update `pnpm-lock.yaml` with `pnpm install --lockfile-only`.
- [ ] **Step 4: Run app build and route test.** Run: `pnpm build:packages`; `pnpm build:www`; `pnpm exec vitest run tests/integration/www-route.test.ts`. Expected: build succeeds and the route render test passes.
- [ ] **Step 5: Commit the scaffold.** Commit as `feat(www): scaffold editor app and Button route`.

## Task 2: Implement recipe draft, history, and recovery storage

**Files:**
- Create: `apps/www/src/editor/model.ts`
- Create: `apps/www/src/editor/history.ts`
- Create: `apps/www/src/editor/storage.ts`
- Create: `apps/www/src/editor/model.test.ts`
- Create: `apps/www/src/editor/history.test.ts`
- Create: `apps/www/src/editor/storage.test.ts`
- Modify: `vitest.config.ts`

**Interfaces:**
- `EditorDraft = { storageVersion: 1; recipe: Recipe }`.
- `EditorView = { mode: 'light' | 'dark'; viewport: 'wide' | 'narrow'; panel: 'preview' | 'customize' | 'code'; forcedState: 'none' | 'focus' | 'hover' }`.
- `createEditorDraft(family: StyleFamily): EditorDraft` returns ID `button_recipe`, revision `1`, exact built-in preset reference, variant/size defaults, type `button`, false disabled/loading, content `Save changes`, and empty overrides.
- `EditorHistory = { past: EditorDraft[]; present: EditorDraft; future: EditorDraft[]; lastGroup?: { key: string; at: number } }`.
- `recordDraft(state: EditorHistory, recipe: Recipe, change: { groupKey: string; at: number }): EditorHistory`, `undo(state)`, and `redo(state)` keep at most 100 meaningful recipe snapshots; same-key edits within 500 ms coalesce; view-state updates do not enter history.
- `restoreDraft(raw: string | null): { draft?: EditorDraft; recoveryText?: string; status: 'empty' | 'restored' | 'recovery-required' }` validates before returning a draft and never writes storage.
- `serializeDraft(draft: EditorDraft): string` validates before serializing the v1 local-storage envelope.
- `serializeRecipe(draft: EditorDraft): string` validates and returns only the recipe JSON accepted by `add --recipe`.

- [ ] **Step 1: Write failing model tests.** Cover a valid draft for each supported family, exact `presetRef` changes on family change, recipe-schema validation, and that light/dark/viewport/forced-state changes do not mutate recipe data.
- [ ] **Step 2: Run model tests to verify failure.** Run: `pnpm exec vitest run apps/www/src/editor/model.test.ts`. Expected: FAIL because the editor model does not exist.
- [ ] **Step 3: Implement the draft model.** Define `EditorDraft`, `EditorView`, and `createEditorDraft`; validate recipe updates with `validateRecipe`; update family by resolving the exact built-in preset ID/revision from `getCatalog('0.1.0')`.
- [ ] **Step 4: Write and run failing history tests.** Test one-step undo/redo, new edit clearing redo, 100-entry bound, adjacent content edits grouping, and view-only changes creating no history entry. Run: `pnpm exec vitest run apps/www/src/editor/history.test.ts`. Expected before implementation: FAIL.
- [ ] **Step 5: Implement history.** Add `recordDraft`, `undo`, and `redo` with immutable recipe snapshots, `HISTORY_LIMIT = 100`, and a 500 ms same-field edit coalescing window.
- [ ] **Step 6: Write and run failing storage tests.** Test empty storage, valid v1 restore, malformed JSON, invalid recipe, unknown version, and recovery bytes being returned unchanged. Run: `pnpm exec vitest run apps/www/src/editor/storage.test.ts`. Expected before implementation: FAIL.
- [ ] **Step 7: Implement storage and export serialization.** Use key `ombelle.button-editor.draft`; persist the v1 envelope. Never write during restore; expose raw input as recovery data for malformed/unsupported content. Add `serializeRecipe` for the plain recipe JSON consumed by the CLI.
- [ ] **Step 8: Verify editor state tests and commit.** Run: `pnpm exec vitest run apps/www/src/editor/model.test.ts apps/www/src/editor/history.test.ts apps/www/src/editor/storage.test.ts`. Expected: PASS. Commit as `feat(editor): model Button recipe drafts and recovery`.

## Task 3: Add the browser compiler worker

**Files:**
- Create: `apps/www/src/editor/compile-protocol.ts`
- Create: `apps/www/src/editor/compile.worker.ts`
- Create: `apps/www/src/editor/use-compiler.ts`
- Create: `apps/www/src/editor/compile-protocol.test.ts`
- Create: `scripts/build-editor-worker.mjs`
- Modify: `apps/www/package.json`
- Modify: `package.json`
- Modify: `apps/www/src/app/editor/component/button/page.tsx`

**Interfaces:**
- `CompileRequest = { type: 'compile'; requestId: number; recipe: unknown }`.
- `CompileResponse` is either `{ type: 'compiled'; requestId: number; result: RecipeCompileResult }` or `{ type: 'invalid'; requestId: number; diagnostic: { code: string; message: string; path?: string; nextAction?: string } }`.
- `compileEditorRecipe(request: CompileRequest): Promise<CompileResponse>` validates through `validateRecipe`, calls `compileRecipe`, and converts `FoundationError` into serializable diagnostics.
- `handleCompileMessage(input: unknown): Promise<CompileResponse>` validates the runtime message discriminant/shape before dispatching; malformed or unknown message types return a serializable `invalid` response.
- Worker entry delegates to `handleCompileMessage` and posts a response with the same request ID. It has no filesystem or network access.

- [ ] **Step 1: Write failing worker adapter tests.** Assert a known recipe response equals direct `compileRecipe` artifact paths, bytes, hashes, and request ID; invalid recipe reports a path and does not return artifacts; unknown protocol type is rejected.
- [ ] **Step 2: Run worker tests to verify failure.** Run: `pnpm exec vitest run apps/www/src/editor/compile-protocol.test.ts`. Expected: FAIL because protocol and adapter do not exist.
- [ ] **Step 3: Implement the typed protocol and adapter.** Add the two response variants and `compileEditorRecipe`; keep the worker entry as a small `self.onmessage` adapter.
- [ ] **Step 4: Bundle the worker.** Add `scripts/build-editor-worker.mjs` using the existing esbuild dependency, browser platform, ESM output, target ES2023, and output `apps/www/public/editor-compiler.worker.js`. Add app `predev` and `prebuild` hooks so the asset exists before Next starts/builds.
- [ ] **Step 5: Wire latest-request handling.** Add `useCompiler` in `apps/www/src/editor/use-compiler.ts`; assign monotonically increasing request IDs, debounce compilation by 100 ms, and accept only the response matching the latest request ID. Keep last valid output marked stale while the draft is invalid.
- [ ] **Step 6: Verify and commit.** Run: `pnpm exec vitest run apps/www/src/editor/compile-protocol.test.ts`; `pnpm build:packages`; `pnpm build:www`. Expected: tests pass and Next production build emits/serves the worker asset. Commit as `feat(editor): compile recipes in a browser worker`.

## Task 4: Build the isolated editor preview frame

**Files:**
- Create: `apps/preview/src/editor-preview.tsx`
- Create: `apps/preview/src/editor-preview.css`
- Modify: `apps/preview/src/main.tsx`
- Modify: `scripts/generate-preview.ts`
- Modify: `apps/www/src/editor/components/preview-frame.tsx`
- Create: `apps/www/src/editor/preview-protocol.ts`
- Create: `apps/www/src/editor/preview-protocol.test.ts`
- Modify: `tests/e2e/editor.spec.ts`

**Interfaces:**
- `PreviewFrameState = { recipe: Recipe; css: string; mode: 'light' | 'dark'; viewport: 'wide' | 'narrow'; forcedState: 'none' | 'focus' | 'hover'; requestId: number }`.
- The iframe posts a `ready` message after load; the host verifies `event.source === iframe.contentWindow` and the sandbox's opaque origin before transferring a `MessageChannel`. All render updates then travel over the port, where both sides validate message schema and monotonically increasing request IDs.
- The preview imports a generated built-in `Button` module from the exact catalog release. It sets `data-slot="recipe-button"`, the matching `data-ombelle-recipe` scope, and the real recipe props/content, and applies only the compiler-produced scoped CSS.

- [ ] **Step 1: Write failing protocol tests.** Test accepted render payload, rejected malformed recipe/mode/forced state, ignored duplicate/stale request IDs, and malformed ready messages rejected before a channel is transferred. Cover source-window validation in the browser case in Step 5.
- [ ] **Step 2: Run protocol tests to verify failure.** Run: `pnpm exec vitest run apps/www/src/editor/preview-protocol.test.ts`. Expected: FAIL because the protocol does not exist.
- [ ] **Step 3: Implement the preview protocol and host.** Establish a `MessageChannel` only from the expected iframe window; serialize recipe/view state and the exact compiled CSS artifact; keep output artifacts out of HTML/source evaluation.
- [ ] **Step 4: Add the preview frame entry.** Route `/editor-preview/` in `apps/preview/src/main.tsx`; extend preview generation so the frame can dynamically load the generated Button module for flat, minimalist, or neo-brutalism. Apply the scoped recipe CSS in the iframe document, use a `.dark` ancestor for dark mode, and set only recipe-derived DOM attributes/props.
- [ ] **Step 5: Add the preview browser case.** In `tests/e2e/editor.spec.ts`, assert the frame source is the expected preview app, recipe payload reaches the frame only over its established port, invalid/replayed messages do not update its rendered button, and valid data renders the scoped recipe.
- [ ] **Step 6: Run preview and protocol checks.** Run: `pnpm exec vitest run apps/www/src/editor/preview-protocol.test.ts`; `pnpm build:packages`; `pnpm generate:preview`; `pnpm build:preview`; `pnpm exec playwright test tests/e2e/editor.spec.ts --grep "sandboxed preview"`. Expected: protocol passes and the editor frame bundle builds/renders for all three families.
- [ ] **Step 7: Commit the frame.** Commit as `feat(preview): add isolated Button recipe frame`.

## Task 5: Implement the Button editor UI and local export

**Files:**
- Create: `apps/www/src/editor/components/button-editor.tsx`
- Create: `apps/www/src/editor/components/properties-panel.tsx`
- Create: `apps/www/src/editor/components/artifact-panel.tsx`
- Create: `apps/www/src/editor/components/editor-tabs.tsx`
- Create: `apps/www/src/editor/components/status-announcer.tsx`
- Create: `apps/www/src/editor/components/button-editor.module.css`
- Modify: `apps/www/src/app/editor/component/button/page.tsx`
- Modify: `apps/www/src/editor/storage.ts`
- Modify: `tests/e2e/editor.spec.ts`

**Interfaces:**
- `ButtonEditor` composes `EditorDraft`, `EditorView`, `EditorHistory`, the compiler worker hook, and `PreviewFrame`.
- Properties emit validated recipe updates; view controls update only `EditorView`.
- Artifact panel reads only the current `RecipeCompileResult` and provides usage/source/CSS/dependency/CLI tabs, copy actions, and recipe JSON download.

- [ ] **Step 1: Write failing accessible editor browser cases.** Add named cases for family/props/override editing, mode not changing recipe hash, draft restore after reload, undo/redo, accessible recovery download, artifact tabs/copy, and valid recipe JSON download.
- [ ] **Step 2: Run focused browser cases to verify failure.** Run: `pnpm exec playwright test tests/e2e/editor.spec.ts`. Expected: FAIL because the controls and output panels are absent.
- [ ] **Step 3: Implement the properties panel.** Add family selection; variant, size, type, content, disabled, and loading controls; bounded numeric controls for radius `[0,2]`, border width `[0,4]`, minimum height `[24,80]`, and shadow offsets `[-16,16]`. Label each field and display schema diagnostics next to it.
- [ ] **Step 4: Implement responsive editor layout and view controls.** Use a desktop preview/output center and properties panel; use semantic Preview/Customize/Code tabs on narrow screens. Keep mode, viewport, and forced focus/hover controls in view state only.
- [ ] **Step 5: Implement persistence and accessible recovery.** Restore after hydration, validate before writing, preserve invalid raw storage, show recovery action before starting/saving a new draft, and announce save/recovery status. Add `copy` and download result announcements.
- [ ] **Step 6: Implement artifact export.** Render all artifact tabs from the same successful compiler response. Copy each selected artifact/command; download the validated recipe JSON. Show the initialized-project requirement and `add --recipe <local.json>` command; show ID/revision immutability guidance.
- [ ] **Step 7: Run editor browser tests and commit.** Run: `pnpm exec playwright test tests/e2e/editor.spec.ts`; `pnpm build:www`. Expected: all editor interaction tests pass and production build succeeds. Commit as `feat(editor): add Button recipe editor and export`.

## Task 6: Verify CLI-installed parity and include the editor in the foundation gate

**Files:**
- Modify: `tests/e2e/editor.spec.ts`
- Create: `tests/integration/editor-recipe-cli.test.ts`
- Modify: `playwright.config.ts`
- Modify: `scripts/foundation-evidence.mjs`
- Modify: `README.md`
- Modify: `docs/07-delivery-plan.md`

**Interfaces:**
- Browser E2E seeds the editor with a known `recipeFixtures()` entry through the v1 local-storage envelope and compares it with the same recipe already installed in an initialized npm/pnpm consumer fixture and shown in the generated preview frame.
- The editor-to-CLI integration test serializes an edited draft with the production storage/export function, initializes a temporary Vite project with its exact built-in preset, runs the built CLI on that JSON, and checks installed component/CSS bytes against direct `compileRecipe` output.
- `scripts/foundation-evidence.mjs` declares the exact number of tests in `editor.spec.ts`; aggregate verification continues rejecting missing, skipped, failed, retried, or duplicate browser cases.

- [ ] **Step 1: Write the failing editor-to-install parity case.** `editor and CLI-installed Button recipe have matching DOM and computed styles` loads the same recipe draft in the editor and initialized fixture, then compares normalized button attributes, dimensions, colors, typography, focus/disabled/loading styles, and dark-mode output.
- [ ] **Step 2: Run parity case and confirm it detects any current mismatch.** Run: `pnpm exec playwright test tests/e2e/editor.spec.ts --grep "CLI-installed Button recipe"`. Expected before final wiring: FAIL if the editor frame or artifact data is missing/mismatched.
- [ ] **Step 3: Wire the test inventory.** Keep both servers configured: `apps/www` on `127.0.0.1:3000` and the existing preview server on `127.0.0.1:4173`. Add exactly nine editor cases (seven UI cases, one sandbox case, and one install-parity case) to `browserSpecCounts`; update its comment from twelve to thirteen evidence-owning specs; keep every existing spec count unchanged.
- [ ] **Step 4: Verify the real export-to-CLI path.** Add `tests/integration/editor-recipe-cli.test.ts` using `createEditorDraft`, `serializeRecipe`, `createProject('vite')`, `runBuiltCli`, and `compileRecipe`. Assert that plain exported recipe JSON is accepted by the CLI, the installed recipe lock has the same recipe hash, and installed TSX/CSS contents match compiled artifact bytes after the existing alias transform.
- [ ] **Step 5: Complete browser parity assertions.** Compare light and dark modes, all three families, default and overridden dimensions, long/escaped content, and disabled/loading cases. Compare worker artifact hashes with direct `compileRecipe` output and iframe computed styles with the CLI-installed fixture.
- [ ] **Step 6: Update product docs.** Document `pnpm dev:www` and the preview server prerequisite, local-only draft behavior, supported controls, recipe JSON download, immutable revision guidance, and the fact that installation is performed separately by the existing CLI. Update the delivery plan to identify the implemented first M3 slice only after its evidence passes.
- [ ] **Step 7: Run focused and full verification.** Run: `pnpm exec vitest run tests/integration/editor-recipe-cli.test.ts`; `pnpm exec playwright test tests/e2e/editor.spec.ts`; `pnpm typecheck`; `pnpm build:www`; `pnpm check:foundation`. Expected: focused editor cases and the complete foundation gate pass with existing consumer counts retained and the editor browser cases added to the declared matrix.
- [ ] **Step 8: Commit verification and docs.** Commit as `test(editor): verify Button recipe install parity`.

## Execution Notes

- Start with `pnpm build:packages`; worker and preview generation consume built/generated catalog artifacts.
- Do not add schema fields, server endpoints, remote references, or arbitrary CSS/TSX to make editor implementation easier.
- If the generated Button module cannot render scoped recipes without changing its public contract, stop and report the gap; do not hand-build a visually similar preview component.
- A task is complete only when its named focused checks pass; the final task requires the full foundation gate before recording M3 evidence.
