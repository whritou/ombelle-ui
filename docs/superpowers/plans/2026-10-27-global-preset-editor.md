# Local Global Preset Editor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Edit and recover a global preset locally, inspect its compiled twelve-component gallery, export JSON/CSS, and prove later CLI additions reuse the downloaded preset.

**Architecture:** Add a separate `preset-editor` feature to the existing product app, using the shared compiler in a dedicated worker. A sandboxed preview recompiles and verifies each result against generated source before rendering a shared gallery fixture. Existing local CLI commands provide installation; snapshot services are a subsequent project.

**Tech Stack:** Existing React 19.3.1, Next.js 16.4.3 product app, Vite preview, TypeScript, Tailwind v4, Vitest, Playwright, and the local Ombelle packages. No added dependencies.

**Spec:** [Local Global Preset Editor Design](../specs/2026-10-27-global-preset-editor-design.md). Approved for execution through the user's continuation on 2026-10-27. Baseline: `403685d`; implementation and verification are recorded in [editor evidence](../../evidence/global-preset-editor.md).

## Global Constraints

- Node **24.19.0**, pnpm **11.25.0**, preset schema **1.0**, catalog release **0.1.0**, compiler version **0.1.0**.
- React web TSX and the existing Tailwind v4 Vite/Next.js consumer baseline. Existing npm/pnpm/Yarn/Bun support boundaries remain those of the CLI; new browser evidence is labelled by its actual matrix.
- No new dependencies, schema fields, catalog templates, compiler output behavior, public CLI flags, arbitrary CSS/TSX, font URLs, or liquid glass support.
- Edit generator inputs and scripts, never generated schemas or preview files by hand.
- Generation uses `compile({ preset, componentIds: supportedComponentIds, catalogRelease: '0.1.0', compilerVersion: '0.1.0' })` and produces `CompileResult`.
- Existing installer dry-run, ownership, conflict, and transaction behavior applies unchanged. `--yes` never authorizes replacing modified source.
- The Next.js instructions in `apps/www/AGENTS.md` apply when implementing the new route and components; consult the installed framework guides then.
- Implement on `feat/global-preset-editor`, or a user-selected isolated worktree based on this branch. Preserve the existing Button editor and all twelve catalog components.
- Spec constants apply everywhere: 100 history snapshots, 500 ms coalescing, 150 ms compile debounce, 256 KiB UTF-8 storage budget, and 1 MiB UTF-8 frame-message limit.
- Publishing, accounts, snapshot IDs, remote resolution, public package distribution, and other component editors remain outside this increment.

## Review Focus

- An explicitly edited value equal to its old base must survive a family change; value comparison cannot stand in for edit provenance (Tasks 1, 2, 6).
- An invalid edit or a late worker response during the debounce window must never enable an old download (Tasks 3, 6, 8).
- Invalid persisted input, unknown storage versions, and quota failures must preserve recoverable bytes and a usable in-memory draft (Tasks 2, 6, 8).
- Colocated styles, Tailwind mappings, and body-mounted Dialog portals must use the edited preset in the frame and the installed application (Tasks 4, 5, 8).
- A successful render acknowledgement requires matching current DOM/source/CSS; asynchronous verification and frame reconnection must not acknowledge an old session (Tasks 5, 8).

## File structure and execution order

`apps/www/src/preset-editor/` owns draft state, worker and frame protocols, controls, exports, and diagnostics. `scripts/generate-preset-gallery.ts` owns deterministic preview preparation; `fixtures/shared/preset-gallery.tsx` owns specimen markup used by preview and consumers. `apps/preview/src/preset-preview.tsx` owns the iframe runtime. Test helpers own temporary consumers, and integration/browser specs own the installation and UI evidence. Do not move existing recipe modules just to share abstractions.

Tasks 1–3 define editor data and compilation. Task 4 generates source and gallery inputs. Task 5 connects that gallery to the iframe. Task 6 assembles the usable editor. Tasks 7–9 prove installation, browser parity, and evidence completeness. Read the complete spec before starting; the task interfaces below are contracts between steps.

### Task 1: Draft intent and preset materialization

**Files:**
- Create: `apps/www/src/preset-editor/model.ts`, `model.test.ts`.
- Read: `schemas/preset.schema.json`, `packages/compiler/src/resolve.ts`, `packages/catalog/src/presets/*.json`.

**Interfaces:**
- Consumes: `StyleFamily`, `Preset`, `validatePreset`, `getCatalog('0.1.0')`.
- Produces: `PresetEditablePath`, `PresetEditorDraft` exactly as specified; `createPresetDraft(family: StyleFamily): PresetEditorDraft`; `validateDraftEnvelope(input: unknown): PresetEditorDraft`; `materializePreset(draft: PresetEditorDraft): Preset`; `setPresetEdit(draft: PresetEditorDraft, path: PresetEditablePath, value: string): PresetEditorDraft`; `setPresetIdentity(draft: PresetEditorDraft, field: 'id' | 'name' | 'revision', value: string): PresetEditorDraft`; `resetPresetField(draft: PresetEditorDraft, path: PresetEditablePath): PresetEditorDraft`.
- Produces: `FamilyChange = { draft: PresetEditorDraft; changes: Array<{ path: PresetEditablePath; before: string; after: string }> }`; `planPresetFamilyChange(draft: PresetEditorDraft, family: StyleFamily): FamilyChange`; `resetPresetTokens(draft: PresetEditorDraft): PresetEditorDraft`. These return immutable values; confirmation belongs to UI.

- [x] **Step 1: Add failing model tests.** Assert `createPresetDraft('flat').identity` equals `{ id: 'project_preset', name: 'Project preset', revision: '1' }`. An explicit `/design/radiusRem` edit of `'0.5'` stays `0.5` after switching flat to neo-brutalism, while untouched fields equal that family's base; resetting that path uses the new base. Check both modes' nineteen keys, seven design controls, preserved identity, and no mutation of catalog data. Reject unknown envelope keys/paths, glass, 81-character values, 17-character revision text, and negative/unsafe revision materialization. For each numeric field test the schema's exact endpoints and just-outside values; empty, whitespace, `NaN`, and infinity fail without coercing to zero. Preserve invalid raw color text in the envelope; materialization reports its `/modes/...` pointer. Valid OKLCH uses existing semantic validation.
- [x] **Step 2: Run** `pnpm exec vitest run apps/www/src/preset-editor/model.test.ts`; expected failure is missing model exports.
- [x] **Step 3: Implement the model interfaces.** Enumerate the nineteen schema color keys and seven design paths explicitly; validate the editor envelope separately from preset semantics. Apply only present edit keys over a deep-cloned base and preserve base `componentDefaults` and unexposed design fields.
- [x] **Step 4: Repeat the focused command; expect all assertions to pass.**
- [x] **Step 5: Commit** the model and tests with `feat(editor): model global preset drafts`.

### Task 2: History and recoverable storage

**Files:**
- Create: `apps/www/src/preset-editor/history.ts`, `history.test.ts`, `storage.ts`, `storage.test.ts`.

**Interfaces:**
- Consumes: Task 1's draft type and envelope validator.
- Produces: `PresetHistory = { past: PresetEditorDraft[]; present: PresetEditorDraft; future: PresetEditorDraft[]; lastEdit: { key: string; at: number } | null }`; `createPresetHistory(draft: PresetEditorDraft): PresetHistory`; `recordPresetDraft(history: PresetHistory, draft: PresetEditorDraft, edit: { key: string; at: number; coalesce: boolean }): PresetHistory`; `undoPreset(history: PresetHistory): PresetHistory`; `redoPreset(history: PresetHistory): PresetHistory`.
- Produces: `PresetStorage = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>`; `loadPresetSession(storage: PresetStorage): { history: PresetHistory; recoveryRaw: string | null; warning: string | null }`; `savePresetSession(storage: PresetStorage, history: PresetHistory): { saved: boolean; warning: string | null }`. Default session is flat. `recoveryRaw !== null` means persistence is blocked until explicit reset, enforced by the UI caller.

- [x] **Step 1: Add failing history and storage tests.** Same-field edits at 0/499 ms coalesce; at 501 ms they do not. Family/reset/identity actions use `coalesce: false`. Assert unchanged drafts add no entries, oldest entries drop beyond 100, undo/redo retains raw invalid input, and divergent editing clears redo. Round-trip the exact two specified storage keys, retaining explicit edits/history and leaving recipe keys untouched. Test malformed JSON, unknown version, unsupported paths, invalid history with valid draft, 256 KiB UTF-8 budget trimming, non-ASCII byte accounting, storage access denial, and partial/quota write failure. Raw recovery bytes cannot be overwritten by load or a failed save.
- [x] **Step 2: Run** `pnpm exec vitest run apps/www/src/preset-editor/history.test.ts apps/www/src/preset-editor/storage.test.ts`; expect missing exports to fail.
- [x] **Step 3: Implement the interfaces.** Treat the draft key as authoritative, validate history's present against it, discard inconsistent history with a warning, write draft before history, and tolerate history write failure without losing the latest recoverable draft. Trim history before serializing within the combined budget. Expose reset as a deliberate UI action rather than mutating corrupt storage on load.
- [x] **Step 4: Repeat the focused tests; expect passes.**
- [x] **Step 5: Commit** with `feat(editor): recover preset drafts and history`.

### Task 3: Compiler worker and current-result exports

**Files:**
- Create: `apps/www/src/preset-editor/compile-protocol.ts`, `compile-protocol.test.ts`, `compile.worker.ts`, `use-preset-compiler.ts`, `use-preset-compiler.test.ts`, `export.ts`, `export.test.ts`.
- Modify: `scripts/build-editor-worker.mjs`.

**Interfaces:**
- Consumes: Task 1's materializer, shared `compile`, `canonicalize`, `CompileResult`, and existing diagnostic shape.
- Produces: `PresetCompileRequest = { type: 'compile-preset'; requestId: number; draft: PresetEditorDraft }`; `PresetCompileResponse = { type: 'preset-compiled'; requestId: number; result: CompileResult } | { type: 'preset-invalid'; requestId: number; diagnostic: { code: string; message: string; path?: string; nextAction?: string } }`; `handlePresetCompileMessage(input: unknown): Promise<PresetCompileResponse>`.
- Produces: `PresetCompilerState = { status: 'idle' | 'compiling' | 'compiled' | 'invalid'; result: CompileResult | null; draftKey: string | null; diagnostic: Extract<PresetCompileResponse, { type: 'preset-invalid' }>['diagnostic'] | null; stale: boolean }`; `usePresetCompiler(draft: PresetEditorDraft): PresetCompilerState`; `canExportPreset(state: PresetCompilerState, draft: PresetEditorDraft): boolean`; `serializePresetExport(state: PresetCompilerState, draft: PresetEditorDraft): string`; `presetCssExport(state: PresetCompilerState, draft: PresetEditorDraft, kind: 'tokens' | 'family'): string`.
- Worker output: `apps/www/public/preset-compiler.worker.js`, generated alongside the existing worker. `draftKey` is `canonicalize(draft)`, set only for the exact accepted request; serializer throws for a non-current result.

- [x] **Step 1: Add failing tests.** The worker result equals direct compilation for an edited preset containing both-mode changes. Malformed requests and unsupported releases produce structured failures. Fake timers prove 150 ms debounce; mark the state stale synchronously for changed input, reject a response for the preceding draft even during debounce, and ignore out-of-order/unknown responses. Termination reports a retryable diagnostic. JSON serialization equals `canonicalize(result.preset.data) + '\n'`; CSS exports equal the two named artifacts. Invalid, pending, or mismatched drafts throw; view-only changes retain the export/hash.
- [x] **Step 2: Run** `pnpm exec vitest run apps/www/src/preset-editor/compile-protocol.test.ts apps/www/src/preset-editor/use-preset-compiler.test.ts apps/www/src/preset-editor/export.test.ts`; expect missing interfaces to fail.
- [x] **Step 3: Implement the interfaces and worker bundle.** Keep pure request/state acceptance logic directly testable, validate response shape before acceptance, and terminate/recreate workers on retry. Use the existing browser esbuild configuration for the second entry; preserve the recipe bundle. The browser tests in Task 8 exercise the actual hook lifecycle.
- [x] **Step 4: Run the focused tests and** `pnpm build:editor-worker`; expect tests and both browser bundles to succeed without Node runtime imports.
- [x] **Step 5: Commit** with `feat(editor): compile and export current global presets`.

### Task 4: Shared generated gallery and source proof

**Files:**
- Create: `fixtures/shared/preset-gallery.tsx`, `fixtures/shared/preset-gallery.css`, `scripts/generate-preset-gallery.ts`, `tests/integration/preset-gallery-generation.test.ts`.
- Modify: `scripts/generate-preview.ts`.
- Generated only: `apps/preview/src/generated/preset-gallery/` (modules, fixture, Tailwind entry, and manifest).

**Interfaces:**
- Consumes: shared compiler output for all supported IDs and three built-in presets; generator filesystem root and catalog release.
- Produces: `writePresetGallery(root: string): Promise<void>` in the new generator; `PresetGallery` from the shared fixture with no editor draft dependency; stable `data-testid="preset-gallery"`, `data-component="<component-id>"`, and specimen IDs for each of the twelve rows. The same fixture accepts normal component imports rewritten to generated/installed aliases at preparation time.
- Produces generated manifest: `PresetSourceManifest = { catalogRelease: '0.1.0'; compilerVersion: '0.1.0'; sources: Record<string, { canonicalHash: string; transformedHash: string }> }`, covering every component and utility artifact. Export this type from the generator for type-only consumers; the generator module performs no writes on import. Generated module exports the shared fixture. Style files are applied dynamically rather than imported into the source module.

- [x] **Step 1: Add failing generator tests.** Two generations produce byte-identical files/manifest; all twelve rows and their declared component dependencies are present. Canonical source matches all three base compilations. Recompute transformed hashes from actual files, reject an unexpected CSS import/source divergence, and verify only known static stylesheet imports are removed. Assert the Tailwind input contains the fixed variable mappings and all specimen/source scan paths without baking a concrete family palette over runtime styles.
- [x] **Step 2: Run** `pnpm build:packages`, then `pnpm exec vitest run --config vitest.integration.config.ts tests/integration/preset-gallery-generation.test.ts`; expect the new generator import to fail.
- [x] **Step 3: Implement generation and the fixture.** Use existing module-specifier helpers or a static TypeScript import transform, never arbitrary text replacement across TSX contents. Render all states specified by the design, prevent form navigation, and give Dialog/Tooltip meaningful accessible labels. Generate stylesheet mappings from compiler data and structural CSS with token-driven body fonts. Call the generator from `generate-preview.ts` without changing existing family/recipe generation.
- [x] **Step 4: Run the focused test,** `pnpm generate:preview`, and `pnpm build:preview`; expect deterministic generation and a successful Vite build. Review generated diffs if tracked.
- [x] **Step 5: Commit** with `feat(preview): generate the global preset gallery`.

### Task 5: Verified sandbox frame

**Files:**
- Create: `apps/www/src/preset-editor/preview-protocol.ts`, `preview-protocol.test.ts`, `components/preset-preview-frame.tsx`, `apps/preview/src/preset-preview.tsx`, `apps/preview/src/preset-preview.css`.
- Modify: `apps/preview/src/main.tsx`.

**Interfaces:**
- Consumes: Task 4's generated module/manifest and Task 3's successful `CompileResult`.
- Produces: `PresetView = { mode: 'light' | 'dark'; viewport: 'wide' | 'narrow' }`; `PresetRender = { type: 'preset-render'; requestId: number; result: CompileResult; view: PresetView }`; `PresetAck = { type: 'preset-render-ack'; requestId: number; presetHash: string; status: 'applied' | 'rejected' }`; `verifyPresetRender(input: unknown, previousRequestId: number, manifest: PresetSourceManifest): Promise<PresetRender | null>`. Task 4's manifest type is imported with `import type`; only the preview runtime imports actual generated files. Protocol unit tests construct their own compiler-derived manifest and need no generated directory.
- Handshake: exact `{ type: 'ombelle-preset-preview-ready' | 'ombelle-preset-preview-init'; version: 1 }` shapes, one transferred port, and source/origin checks matching the spec's opaque sandbox model. Frame URL is the existing preview origin plus `/preset-preview/`.
- Produces: `PresetPreviewFrame({ result, view, stale, onStatus }: { result: CompileResult | null; view: PresetView; stale: boolean; onStatus: (status: 'connecting' | 'ready' | 'failed') => void })`; `mountPresetPreview(element: HTMLElement): void` in the preview runtime.

- [x] **Step 1: Add failing protocol tests.** Accept direct compiler output, reject unknown keys, UTF-8 payloads over 1 MiB, duplicate/missing/unexpected artifacts, modified CSS/hash/source/provenance, unsupported family/version, stale IDs, and a manifest/source mismatch. An older expensive verification completing last must be dropped. Test port replacement and applied acknowledgements through the browser case in Task 8.
- [x] **Step 2: Run** `pnpm exec vitest run apps/www/src/preset-editor/preview-protocol.test.ts`; expect missing interfaces to fail.
- [x] **Step 3: Implement protocol and frame runtime.** Recompile and compare canonical complete results before applying CSS; require the generated source hash set to match. Parse verified token CSS to apply ordinary declarations, using Task 4's prebuilt Tailwind mappings for directives. Apply token/family/component CSS in deterministic artifact order. Toggle `.dark` on the frame document element, keep portals inside it, and acknowledge in a layout effect after matching DOM/CSS commit. Fence verification and acknowledgements by current session/request; reconnect using a new port. A 10-second handshake/ack timeout reports failure; retry reloads the frame and replays the latest valid result.
- [x] **Step 4: Run the protocol test and** `pnpm build:preview`; expect success. The Task 8 browser tests supply the rendering/security proof.
- [x] **Step 5: Commit** with `feat(preview): verify global preset frame updates`.

### Task 6: Usable editor, diagnostics, and local instructions

**Files:**
- Create: `apps/www/src/app/editor/preset/page.tsx`; `apps/www/src/preset-editor/components/preset-editor.tsx`, `preset-controls.tsx`, `preset-export-panel.tsx`, `preset-editor.module.css`; `apps/www/src/preset-editor/contrast.ts`, `contrast.test.ts`.
- Modify: `apps/www/src/app/page.tsx`, `tests/integration/www-route.test.ts`.

**Interfaces:**
- Consumes: Tasks 1–5's state, worker, export, and frame interfaces.
- Produces: `PresetEditor()` default feature component; route page with main heading **Global preset editor**. Home links to this route and the Button editor.
- Produces: `TokenContrast = { mode: 'light' | 'dark'; foreground: string; background: string; ratio: number | null; status: 'pass' | 'warning' | 'not-evaluated' }`; `contrastRatio(foreground: readonly [number, number, number], background: readonly [number, number, number]): number`; `measurePresetContrast(preset: Preset, convert: (color: string) => readonly [number, number, number, number] | null): TokenContrast[]`. The UI supplies browser canvas conversion, retains alpha, and produces sixteen records for the eight pairs in both modes.

- [x] **Step 1: Add failing route and contrast assertions.** Route rendering exposes its heading/landmarks. Black/white yields 21, identical colors yield 1, and 4.5 is the inclusive pass boundary. Non-opaque/unconvertible colors yield `not-evaluated`; invalid sRGB channels are rejected by the math helper. Assert the exact sixteen pair identities and no “verified” claim. Browser tests own interactive/clipboard behavior.
- [x] **Step 2: Run** `pnpm exec vitest run apps/www/src/preset-editor/contrast.test.ts` and `pnpm exec vitest run --config vitest.integration.config.ts tests/integration/www-route.test.ts`; expect the new route/helper assertions to fail.
- [x] **Step 3: Read the relevant installed Next.js guides required by `apps/www/AGENTS.md`, then implement the route and controls.** Use explicit raw draft edits, confirm family/reset changes, make confirmations keyboard accessible, preserve focus and errors, and connect history/storage. Hydrate storage only on the client; block saves while recovery is unresolved. Show stale-preview and storage warnings. Export controls use Task 3's exact key gate and remain available after frame failure. Provide both CSS outputs, normalized JSON download, recovery download, clipboard text fallback, hashes, fixed versions, and the two exact private local commands from the spec. The text-only status is **Draft — automated token contrast only**.
- [x] **Step 4: Repeat the focused tests, then run** `pnpm build:editor-worker` and `pnpm build:www`; expect successful route compilation. Browser behavior is verified in Task 8.
- [x] **Step 5: Commit** with `feat(editor): add the local global preset editor`.

### Task 7: Export-to-CLI persistence and safety evidence

**Files:**
- Create: `tests/integration/editor-preset-cli.test.ts`.
- Read/reuse: `tests/helpers/projects.ts`, `tests/helpers/cli-runtime.ts`, `tests/helpers/tree.ts`, existing component/theme integration tests.

**Interfaces:**
- Consumes: actual Task 3 serializer, built CLI, existing fixture/project helpers; no production CLI interface changes.
- Produces: focused CLI evidence that editor JSON is portable and later `add` uses the saved preset; no claim of new manager support.

- [x] **Step 1: Add integration tests for each family and both `vite`/`next` project kinds.** Edit foreground/background in both modes, typography, density, radius/border/shadows/motion; compile/export through editor interfaces. Preseed exactly declared dependencies as existing offline tests do. Run dry-run `init --preset`, assert `snapshotTree` is unchanged, then apply. Parse `ui-preset.json` and `ui-library.lock.json`: normalized data and preset hash equal compiler output. Invoke `add button` then `add input` in separate built-CLI processes without any preset flag; assert saved defaults/hash and transformed source hashes agree with direct compilation.
- [x] **Step 2: Add existing-shadcn theme tests for both project kinds.** Seed unrelated CSS, config, a locally edited existing Button, and the manager lock. Run `theme add` dry-run/apply/repeat with editor JSON; compare managed declarations using PostCSS, preserve unrelated bytes/source/config/manager, and require a repeat no-op. In an already owned Ombelle project, edited managed style/source conflicts still block replacement under `--yes`. Model exact expectations on current theme/component preservation tests rather than adding new installer behavior.
- [x] **Step 3: Run** `pnpm build:packages`, then `pnpm exec vitest run --config vitest.integration.config.ts tests/integration/editor-preset-cli.test.ts`. Expect passing existing CLI behavior; if it fails, distinguish a bad fixture/export from a real compatibility gap before changing scope.
- [x] **Step 4: Commit** with `test(editor): prove exported preset persistence through the CLI`.

### Task 8: Browser journey and installed gallery parity

**Files:**
- Create: `tests/e2e/preset-editor.spec.ts`, `tests/helpers/editor-preset-consumer.ts`.
- Reuse: prepared npm consumers, shared gallery fixture, existing browser source/style/DOM comparison helpers.

**Interfaces:**
- Consumes: browser `Download` bytes, Task 4's shared fixture, fixed compiled outputs, and prepared npm consumer roots from `.artifacts/consumers.json`.
- Produces: `withEditorPresetConsumer<T>(input: { framework: 'vite' | 'next'; family: StyleFamily; presetJson: string }, work: (consumer: { url: string; root: string; result: CompileResult }) => Promise<T>): Promise<T>`. Creates a private temporary copy of the matching prepared npm consumer, keeps all source inputs and its frozen lock, installs dependencies using pinned npm with `ci --offline --ignore-scripts`, applies downloaded JSON through built `theme add`, and runs a separate `add` process. Write the shared gallery route/entry with import transforms, build/serve on an allocated port, and clean up children/root in `finally`. Never modify prepared consumer roots or report an offline cache miss as a pass.

- [x] **Step 1: Author exactly 26 Playwright cases.** Six cases are the three families × two modes: all twelve rows, selected state/invalid/disabled/loading, real focus, Dialog containment, both-mode contrast status, generated hash/CSS equality, and no network requests during edits after initial assets load. Twelve cases are families × modes × frameworks: edit a non-default preset, download actual JSON, invoke the temporary consumer helper, and compare source hashes, normalized specimen DOM, computed colors/font/radius/border/height/shadows/motion, plus matched representative specimen pixels. Open Dialog in both documents and compare its inherited tokens and focus behavior. Use the existing platform pixel policy, record any tolerance, and never normalize away a real semantic/style difference. Give parity cases a 360-second limit and bounded install/build/server startup waits; always terminate children on timeout. These tests build private consumers and must not inherit the ordinary 60-second case timeout.
- [x] **Step 2: Author the remaining eight cases**, with these exact distinct titles:
  1. `restores raw draft and history after refresh` — include incomplete numeric input, undo/redo/coalescing, and field/full reset.
  2. `preserves explicit edits through confirmed and cancelled family changes` — explicitly equal-to-base values, invalid values, identity, cancellation, and undo.
  3. `downloads corrupt and unknown-version recovery before reset` — original bytes retained, no automatic overwrite, explicit reset.
  4. `keeps in-memory edits after storage and clipboard denial` — persistent warning and selectable export fallback.
  5. `blocks stale exports during invalid edits and delayed compilation` — race responses inside and outside the 150 ms window.
  6. `rejects tampered frame updates and reconnects without stale acknowledgements` — wrong source/shape/CSS/hash, late verification, dropped handshake, frame reload, and current DOM before acknowledgement.
  7. `supports keyboard editing and 320 pixel reflow` — every control group/output, confirmation focus, labelled frame, numeric alternatives, real focus, and axe in editor and frame.
  8. `exports the current preset while preview is unavailable` — warning, retry, and valid current JSON/CSS.
- [x] **Step 3: Prepare prerequisites and run the new spec.** Use the README's pinned npm/Yarn/Bun/browser setup; run `pnpm build:packages`, `pnpm generate:preview`, and `pnpm prepare:consumers`. Then `pnpm exec playwright test tests/e2e/preset-editor.spec.ts`; expect 26 passed with no skip/retry. Run `pnpm exec playwright test tests/e2e/editor.spec.ts` once for the existing Button regression surface. Record environment failures explicitly; do not weaken parity or treat missing toolchains/caches as success.
- [x] **Step 4: Commit** with `test(editor): verify preset editing and installed gallery parity`.

### Task 9: Make the evidence gate include the new tests

**Files:**
- Modify: `package.json`, `scripts/foundation-evidence.mjs`, `tests/integration/foundation-groups.test.ts`, `README.md`, `docs/07-delivery-plan.md`, `docs/foundation-local-usage.md`.
- Create: `docs/evidence/global-preset-editor.md`.

**Interfaces:**
- Consumes: existing strict source-derived Vitest inventory and browser-spec count contract.
- Produces: unit selection `packages apps/www/src` consistently in `test:unit` and independent inventory collection; both `packages/**/*.test.{ts,tsx}` and `apps/www/src/**/*.test.{ts,tsx}` are required. Preserve integration selection. Require `'preset-editor.spec.ts': 26` alongside every existing browser spec/count.

- [x] **Step 1: Extend evidence regression tests first.** A report missing one app unit file/assertion or the new browser suite must fail even when headline totals are adjusted. Preserve duplicate/skipped/retry rejection and Windows path normalization for both unit prefixes. Update structural fixture generation in `foundation-groups.test.ts` to collect the exact same expanded unit selection. These fixtures remain synthetic data, not measured evidence.
- [x] **Step 2: Implement inventory/script changes.** `validateTestResults` must classify absolute Windows/Unix paths against both allowed unit roots, glob both, and reject unexpected suites. Keep the source-derived count/name checks. Do not merely broaden the command while leaving the evidence validator on `packages/`.
- [x] **Step 3: Run the changed gate regression test and normal quality commands.** After `pnpm build:packages` and `pnpm generate:preview`, run `pnpm exec vitest run --config vitest.integration.config.ts tests/integration/foundation-groups.test.ts`, `pnpm test:unit`, `pnpm test:integration`, `pnpm typecheck`, `pnpm build:preview`, and `pnpm build:www`. New failures in the now-included existing app unit tests must be investigated; they cannot be silently excluded. These are execution instructions, not checks performed while authoring this plan.
- [x] **Step 4: Run `pnpm check:foundation` once in the documented complete toolchain when available.** Record the actual exit/status and original outputs. A focused successful run can be reported separately if the full gate is unavailable; mark the complete gate pending and name the exact failing/missing prerequisite. Do not use old M2/M3 evidence to assert a new full pass.
- [x] **Step 5: Document the route, token/family CSS distinction, local CLI commands, recovery, and measured support.** Record local-only M4 progress without marking snapshot publishing or remote resolution complete. Link the evidence document from README and the delivery plan, including exact environment, browser/framework matrix, command results, and human-review limits.
- [x] **Step 6: Commit** with `docs(editor): record global preset editor scope and evidence`, including the gate/script changes or a separate `test(evidence): require preset editor coverage` commit if independently reviewable.

## Self-review and handoff

- All spec journeys map to Tasks 1–8; strict inclusion/evidence reporting belongs to Task 9.
- The five review risks map to named tests above. Worker state, draft identity, export signatures, frame messages, generated artifacts, and consumer helper inputs use the same types throughout.
- The fixture and source manifest land before the frame; the serializer lands before CLI/browser installation. No task depends on an unbuilt service or a new public CLI command.
- Builder review of the accompanying spec found nothing important left unanswered. Minor layout/helper choices remain with the implementer as stated in the spec.
- Review the spec and plan before product implementation. Native execution is the author's recommendation for these dependent tasks; use `superpowers:executing-plans` if selected. Subagent execution remains available through `superpowers:subagent-driven-development` if explicitly chosen.
