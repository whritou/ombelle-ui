# Editor and Style Family Refresh Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the redesigned preset and Button editors, refresh the Flat, Minimalist and Neo brutalism style families, add the new Ombelle family, and release each change with automated, aligned versioning.

**Architecture:** Five phases, each on its own branch and PR. Phases 1–3 change only `apps/www` (plus the preview app for scenes and forced states) and reuse one new editor-shell module. Phase 4 adds a version tool, then changes catalog presets and family CSS in place under catalog release 0.1.0 and records each byte change as an intentional change in the compiler style baseline. Phase 5 adds `ombelle` as a fourth stable family through the source schema, contracts, catalog, consumer matrix and editors. Package versions are bumped by script and released as 0.4.0 (end of phase 4) and 0.5.0 (end of phase 5).

**Tech Stack:** TypeScript ES modules, React 19, Next.js (`apps/www`), Vite (`apps/preview`), Vitest 5, Playwright 1.64 with axe, pnpm 11.25.0, Node 24.19.0.

**Spec:** Design canvas "Preset & Button Editors", https://claude.ai/artifact/1FMRGWoyJSwht9wATT838U. It has these boards:
- `Main.dc.html`: preset editor
- `ButtonEditor.dc.html`: Button editor
- `Patterns.dc.html`: shared editor patterns
- `OmbelleKit.dc.html`, `FlatKit.dc.html`, `MinimalistKit.dc.html`, `NeoBrutalismKit.dc.html`: one kit per style family

The phase order and decisions come from the 2026-11-04 design session. Exact values the canvas fixes are copied into this plan.

## Global Constraints

- Node 24.19.0 and pnpm 11.25.0. Install with `pnpm install --frozen-lockfile --ignore-scripts`. Run `pnpm build:packages` before testing built CLI or consumer behavior.
- Edit `schemas/*.schema.json`, never `packages/contracts/src/*-schema.ts`. Edit `packages/catalog/src/{templates,styles,presets}`, never `packages/catalog/src/generated.ts`. Review the regenerated files with their sources.
- Compiler output stays deterministic. Every intended change to stable-family output bytes is listed in `packages/compiler/test/fixtures/style-baseline.json` under `intentionalChanges`, following the 0.3.0 precedent.
- Catalog/compiler compatibility stays **0.1.0** and JSON schemas stay **1.0**. Only workspace package versions change: 0.4.0 after phase 4, 0.5.0 after phase 5.
- Liquid glass presets, CSS and bounds do not change. Its tests must stay byte-identical.
- Keep planning separate from applying in the CLI. `--yes` never bypasses schema, compatibility or modified-file conflicts. Dependency installs keep lifecycle scripts disabled.
- Contrast: every preset keeps its 8 text token pairs at 4.5:1 or more in both modes. Control boundaries (input, checkbox, switch track) reach 3:1 against their surface.
- The editors must keep their existing behavior: undo/redo focus handoff, recovery downloads, stale-export blocking, the frame verification protocol, keyboard operation and 320 px reflow. Restyling does not relax any existing e2e assertion. Only selectors and labels change.
- Interactive controls are real `<button>`, `<input>`, `<select>` or `<a>` elements. Icon-only buttons need an `aria-label`. Segmented controls are `role="group"` with `aria-pressed` buttons, and tabs keep `role="tablist"`/`tab`/`tabpanel`.
- Fonts stay on preset `fontFamilyId` values (`system-sans`, `system-serif`, `system-mono`). Ombelle ships on `system-sans`. Archivo is out of scope.
- Branches: `feat/editor-shell`, `feat/preset-editor-refresh`, `feat/button-editor-refresh`, `feat/style-family-refresh`, `feat/ombelle-style-family`. Use Conventional Commits with no `codex` prefix.
- Never disable TLS verification. On this machine `git fetch` fails on OpenSSL. Use a one-off `git -c http.sslBackend=schannel fetch` or let the user fetch.
- Publishing to npm is the user's step. It needs the `ombelle` npm identity and follows `docs/cli-release.md`. Website commands switch to a new CLI version only after that version is published.

## Review Focus

1. **A saved draft from the old editor UI loads into the new UI.** Drafts with a family, edits and history survive a reload after the restyle, because storage formats don't change. Pinned in Task 2 by a storage round-trip test that uses a fixture saved by the current editor.
2. **A preset with a token warning, with the review drawer closed.** The rail still shows the warning count, and "Edit token" opens the right popover. Pinned in Task 3.
3. **An existing installed project rerunning `theme add` after 0.4.0.** The plan shows the changed family CSS as an update, and modified component files still raise conflicts. Pinned in Task 9 by an integration test on a 0.3.0-installed fixture.
4. **The installer at 0.4.0 or older receiving an `ombelle` preset or code.** It fails with a clear schema or compatibility error before any write. Pinned in Task 11.
5. **Flat with `borderWidthPx: 0` plus a user-edited border width.** If a user raises the border width, outline buttons and cards draw it; the field bottom rule stays 2px. Pinned in Task 8.

---

## File Structure

| Path | Responsibility |
| --- | --- |
| `apps/www/src/editor-shell/top-bar.tsx` | `EditorTopBar`: breadcrumb, inline name, revision tag, save status, undo/redo, overflow, primary action |
| `apps/www/src/editor-shell/overflow-menu.tsx` | `OverflowMenu`: a popover menu of secondary actions |
| `apps/www/src/editor-shell/inspector.tsx` | `InspectorSection`, `ControlRow`, `SliderRow`, `SegmentedControl` |
| `apps/www/src/editor-shell/review-drawer.tsx` | `ReviewDrawer`: tabbed side drawer that collapses to an icon rail with badges |
| `apps/www/src/editor-shell/use-drawer-state.ts` | Drawer open state, persisted per editor in `localStorage` with a fallback |
| `apps/www/src/editor-shell/editor-shell.module.css` | Shared shell styles, using the site tokens from `app/globals.css` |
| `apps/www/src/editor-shell/*.test.tsx` | Static-markup tests (the `renderToStaticMarkup` pattern from `glass-panel.test.tsx`) |
| `apps/www/src/preset-editor/components/*` | Preset editor rebuilt on the shell; review drawer content |
| `apps/www/src/preset-editor/preview-protocol.ts` | `PresetView.scene` |
| `apps/preview/src/scenes/{dashboard,settings,sign-in}.tsx` | Reviewed preview pages built only from catalog components |
| `apps/www/src/editor/components/*` | Button editor rebuilt on the shell |
| `scripts/set-version.mjs` | Aligns versions across packages, docs, the changelog and the published installer |
| `packages/catalog/src/presets/*.json`, `styles/**` | Family refresh and the new Ombelle family |

---

## Phase 1 — Editor shell

### Task 1: Shared editor shell components

**Files:**
- Create: everything under `apps/www/src/editor-shell/` (see File Structure)
- Test: `apps/www/src/editor-shell/inspector.test.tsx`, `review-drawer.test.tsx`, `top-bar.test.tsx`, `use-drawer-state.test.ts`

**Interfaces:**
- Produces:
  - `type OverflowItem = { id: string; label: string; onSelect: () => void; destructive?: boolean; disabled?: boolean }`
  - `OverflowMenu(props: { id: string; label: string; items: readonly OverflowItem[] })`: a trigger `button[aria-label=label][popovertarget=id]` and a `div[popover][role=menu]` of `role="menuitem"` buttons. Destructive items come last, after a separator.
  - `EditorTopBar(props: { crumbs: readonly string[]; nameField: { id: string; label: string; value: string; maxLength: number; invalid?: boolean; onChange(value: string): void }; revision: string; status: string; undo: { disabled: boolean; onClick(): void; buttonRef: Ref<HTMLButtonElement> }; redo: same shape; menu: { label: string; items: readonly OverflowItem[] }; primary: ReactNode; extra?: ReactNode })`: renders a `header` element. `status` goes in a `role="status"` element.
  - `InspectorSection(props: { id: string; title: string; meta?: ReactNode; children: ReactNode })` → `<section aria-labelledby={id}>` with an `h2`.
  - `ControlRow(props: { label: ReactNode; htmlFor?: string; edited?: boolean; children: ReactNode })`
  - `SliderRow(props: { id: string; label: string; value: string; min: number; max: number; step: number; unit: string; edited: boolean; invalid?: boolean; describedBy?: string; onChange(value: string): void; onReset(): void })`: label, number input and reset sit on line 1; the range input spans line 2. Reset renders only when `edited` is true.
  - `SegmentedControl<T extends string>(props: { label: string; value: T; options: readonly { value: T; label: string; icon?: ReactNode }[]; onChange(value: T): void })`
  - `type DrawerTab = { id: string; label: string; icon: ReactNode; badge?: number; content: ReactNode }`
  - `ReviewDrawer(props: { label: string; open: boolean; onOpenChange(open: boolean): void; tabs: readonly DrawerTab[]; activeTab: string; onTabChange(id: string): void })`
  - `useDrawerState(storageKey: string, initialOpen?: boolean): [boolean, (open: boolean) => void]`

- [ ] **Step 1: Write the failing tests**

```tsx
it('SliderRow puts the range on its own line and shows reset only when edited', () => {
  const html = renderToStaticMarkup(<SliderRow id="r" label="Corner radius" value="0.75" min={0} max={2} step={0.05} unit="rem" edited onChange={noop} onReset={noop} />)
  expect(html).toContain('data-row="slider"')
  expect(html).toContain('aria-label="Reset corner radius"')
  expect(renderToStaticMarkup(<SliderRow {...same} edited={false} />)).not.toContain('Reset corner radius')
})
it('SegmentedControl exposes one pressed option in a labelled group', () => {
  const html = renderToStaticMarkup(<SegmentedControl label="Preview mode" value="dark" options={[{value:'light',label:'Light'},{value:'dark',label:'Dark'}]} onChange={noop} />)
  expect(html).toContain('role="group" aria-label="Preview mode"')
  expect(html.match(/aria-pressed="true"/g)).toHaveLength(1)
})
it('closed ReviewDrawer renders a rail whose button names the badge count', () => {
  const html = renderToStaticMarkup(<ReviewDrawer label="Review" open={false} onOpenChange={noop} activeTab="checks" onTabChange={noop}
    tabs={[{ id: 'checks', label: 'Checks', icon: null, badge: 1, content: 'x' }, { id: 'export', label: 'Export', icon: null, content: 'y' }]} />)
  expect(html).toContain('aria-label="Open checks: 1 warning"')
  expect(html).toContain('aria-expanded="false"')
  expect(html).not.toContain('role="tabpanel"')
})
it('open ReviewDrawer renders tabs and a close button', () => { /* role="tablist", aria-selected on checks, aria-label="Close review" */ })
it('EditorTopBar renders the name field, status and one primary action', () => { /* label[for], role="status", menu trigger aria-label */ })
it('useDrawerState falls back to memory when storage throws', () => { /* stub localStorage getter that throws; hook returns initialOpen and setter works */ })
```

- [ ] **Step 2: Run them and confirm they fail**

Run: `pnpm exec vitest run apps/www/src/editor-shell`
Expected: FAIL with the modules not found.

- [ ] **Step 3: Implement the shell components** at the signatures above. Styles in `editor-shell.module.css` use the site tokens (`--ink`, `--primary`, `--muted`, `--border`, `--control`, `--warning`, `--warning-soft`) and follow these canvas values:
  - Slider row: grid columns `minmax(0,1fr) 72px 24px`, areas `"l n r" "s s s"`.
  - Segmented buttons: at least 32 px tall, `white-space: nowrap`, `min-width: 0`.
  - Rail: 60 px wide; the badge is 16 px round on `--warning`.
  - Open drawer: `flex: 1 1 280px; max-width: 340px`.
  - `useDrawerState` wraps every storage access in try/catch.

- [ ] **Step 4: Run the tests and confirm they pass**

Run: `pnpm exec vitest run apps/www/src/editor-shell` and `pnpm typecheck`
Expected: PASS, with no type errors.

- [ ] **Step 5: Commit**

```bash
git add apps/www/src/editor-shell
git commit -m "feat(www): add shared editor shell components"
```

---

## Phase 2 — Preset editor

### Task 2: Preset editor top bar and inspector

**Files:**
- Modify: `apps/www/src/preset-editor/components/preset-editor.tsx`, `preset-controls.tsx`, `preset-editor.module.css`
- Test: `apps/www/src/preset-editor/components/preset-controls.test.tsx` (new), `apps/www/src/preset-editor/storage.test.ts`, `tests/e2e/preset-editor.spec.ts`

**Interfaces:**
- Consumes: Task 1 `EditorTopBar`, `OverflowMenu`, `InspectorSection`, `SliderRow`, `SegmentedControl`.
- Produces:
  - `FamilyPicker(props: { value: StyleFamily; onChange(family: StyleFamily): void })`: one `aria-pressed` button per entry of `styleFamilies`, showing a mini sample. `liquid-glass` carries a "Beta" tag.
  - `TokenList(props: ControlProps & { warnings: ReadonlySet<string> })`: replaces `ColorControls`. It shows `background`, `foreground`, `primary`, `mutedForeground` and `border`, plus every edited or warned token, and a "Show all 19 tokens" toggle. It keeps `colorPanelId` popovers, and `revealPresetField` expands the list before opening a popover.

Layout changes:
- Top bar items:
  - breadcrumb "Presets"
  - name field `preset-name` (identity name)
  - revision tag
  - status: the existing notice text
  - undo/redo
  - an overflow menu with "Download JSON", "ID & revision…" and "Reset all tokens…"
  - Get code as the primary action
- Inspector sections, in order: Style family, Colors (Accent/Base swatches, then `TokenList`), Typography & shape, Depth & motion.
- Controls:
  - `fontFamilyId`, `density`, `motion` and `transparency` use `SegmentedControl`. Their labels are Sans/Serif/Mono, Comfortable/Compact, Full/Reduced and Auto/Reduced.
  - Numeric controls use `SliderRow`.
  - Shadow X/Y become two number fields in one row.
- "ID & revision…" opens a `<dialog>` holding the id and revision fields. They keep the ids `fieldId('/id')` and `fieldId('/revision')`, so diagnostics links still work.

- [ ] **Step 1: Write the failing tests**
  - `preset-controls.test.tsx`:
    - `FamilyPicker` marks the current family pressed.
    - `TokenList` with no edits renders 5 rows and the "Show all 19 tokens" button.
    - `TokenList` with `warnings = {'mutedForeground'}` renders that row with `data-warning`.
    - `DesignControls` renders `role="group" aria-label="Density"`.
  - `storage.test.ts`: `loadPresetSession` on fixture `apps/www/src/preset-editor/fixtures/session-0.3.0.json` returns the same `history.present` it was saved with. Capture the fixture from the current editor before changing any UI.
  - `preset-editor.spec.ts`: update selectors, not assertions:
    - Preview mode and width become segmented buttons.
    - Family becomes the `FamilyPicker` buttons.
    - Undo/Redo become icon buttons with the same accessible names.
    - "Reset all tokens" moves to the overflow menu.

- [ ] **Step 2: Run them and confirm they fail**

Run: `pnpm exec vitest run apps/www/src/preset-editor`
Expected: FAIL with `FamilyPicker`/`TokenList` not exported.

- [ ] **Step 3: Implement** the layout above in `preset-editor.tsx` and `preset-controls.tsx`. Keep every model, history, storage and compiler call as it is.

- [ ] **Step 4: Verify**

Run: `pnpm exec vitest run apps/www/src/preset-editor`, then `pnpm build:packages`, then `pnpm exec playwright test tests/e2e/preset-editor.spec.ts`
Expected: all PASS, including `supports keyboard editing and 320 pixel reflow` and the axe checks.

- [ ] **Step 5: Commit**

```bash
git add apps/www/src/preset-editor tests/e2e/preset-editor.spec.ts
git commit -m "feat(www): rebuild preset editor top bar and inspector on the editor shell"
```

### Task 3: Review drawer (Checks and Export)

**Files:**
- Create: `apps/www/src/preset-editor/components/preset-checks.tsx`
- Modify: `preset-editor.tsx`, `preset-export-panel.tsx`
- Test: `apps/www/src/preset-editor/components/preset-checks.test.tsx`, `tests/e2e/preset-editor.spec.ts`

**Interfaces:**
- Consumes: Task 1 `ReviewDrawer` and `useDrawerState`; `TokenContrast` from `../contrast`; `revealPresetField`.
- Produces:
  - `PresetChecks(props: { contrast: readonly TokenContrast[]; glassReport: GlassContrastReport | null; onEditToken(path: PresetEditablePath): void })`. It shows:
    - per-mode pass counts ("7 / 8 pass")
    - one card per warning: the pair, its ratio, and an "Edit <token> token" link
    - the remaining passing pairs, behind a "Show" toggle
    - the existing caveat text
  - `presetWarningCount(contrast, glassReport): number`: warnings, plus 1 when the glass bound fails.
- The drawer:
  - storage key `ombelle.preset-editor.drawer`, closed by default
  - tabs `checks` (badge = `presetWarningCount`) and `export` (the existing `PresetExportPanel` content, without its `<details>` wrapper)
  - the old contrast chip and popover are removed

- [ ] **Step 1: Write the failing tests**
  - `PresetChecks` with one warning renders `Muted foreground on muted`, its ratio and an "Edit muted foreground token" button.
  - `presetWarningCount` returns 2 for one contrast warning plus a failing glass report.
  - e2e:
    - With the drawer closed, the rail button is named `Open checks: N warning(s)`.
    - Clicking "Edit … token" opens the matching color popover and focuses `fieldId('/modes/light/mutedForeground')`.
    - The export tab still blocks stale exports (move the existing `blocks stale exports…` test onto the drawer).

- [ ] **Step 2: Run them and confirm they fail.** Run: `pnpm exec vitest run apps/www/src/preset-editor/components/preset-checks.test.tsx`. Expected: FAIL.
- [ ] **Step 3: Implement** `PresetChecks` and `presetWarningCount`, and wire the drawer into `preset-editor.tsx`.
- [ ] **Step 4: Verify.** Run the unit file, then `pnpm exec playwright test tests/e2e/preset-editor.spec.ts`. Expected: PASS.
- [ ] **Step 5: Commit** `feat(www): move preset checks and export into a review drawer`

### Task 4: Real-page preview scenes

**Files:**
- Create: `apps/preview/src/scenes/dashboard.tsx`, `settings.tsx`, `sign-in.tsx`
- Modify:
  - `apps/www/src/preset-editor/preview-protocol.ts`
  - `apps/preview/src/preset-preview.tsx`
  - `scripts/generate-preset-gallery.ts` (register the scene sources the way gallery sources are registered, so `verifyGallerySources` covers them)
  - `preset-editor.tsx` (scene toggle)
- Test: `apps/www/src/preset-editor/preview-protocol.test.ts`, `tests/e2e/preset-editor.spec.ts`

**Interfaces:**
- Produces:
  - `type PresetScene = 'gallery' | 'dashboard' | 'settings' | 'sign-in'`
  - `PresetView` gains `scene?: PresetScene`. A missing scene means `'gallery'`, so old messages stay valid.
  - `verifyPresetRender` accepts an exact key set of `mode, viewport`, `mode, viewport, focus` or `mode, viewport, scene`, and rejects unknown scenes.
- Scene content (from canvas `Main.dc.html`). Scenes use catalog components only; a family lacking a component (glass form controls) shows the gallery's labelled placeholder instead.

| Scene | Content | Components |
| --- | --- | --- |
| Dashboard | "Overview", 3 stat cards, a project list with a switch and a tooltip-on-archive | Tabs, Card, Badge, Button, Switch, Tooltip |
| Settings | Profile form, Notifications card, delete card | Tabs, Card, Label, Input, NativeSelect, Textarea, Checkbox, Switch, Button |
| Sign in | Centered card with email/password, "Keep me signed in", Sign in and SSO buttons | Card, Label, Input, Checkbox, Button |

- The preview toolbar gains `SegmentedControl label="Preview page"` with Gallery, Dashboard, Settings and Sign in. A line under the frame lists the components the current scene uses.

- [ ] **Step 1: Write the failing tests**
  - `verifyPresetRender` accepts `{mode:'light',viewport:'wide',scene:'settings'}` and rejects `scene:'billing'`.
  - e2e: for each stable family × scene, the frame acknowledges, the scene's landmark heading is visible ("Overview", "Settings", "Sign in to Acme") and axe has no violations.
- [ ] **Step 2: Run them and confirm they fail.** Run: `pnpm exec vitest run apps/www/src/preset-editor/preview-protocol.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement** the scenes, registration, protocol change and toolbar control.
- [ ] **Step 4: Verify.** Run: `pnpm build:packages && pnpm generate:preview && pnpm exec playwright test tests/e2e/preset-editor.spec.ts`. Expected: PASS.
- [ ] **Step 5: Commit** `feat(preview): add dashboard, settings and sign-in preset preview scenes`

---

## Phase 3 — Button editor

### Task 5: Button editor top bar, inspector and forced states

**Files:**
- Modify:
  - `apps/www/src/editor/components/button-editor.tsx`, `properties-panel.tsx`, `button-editor.module.css`
  - `apps/www/src/editor/model.ts`, `apps/www/src/editor/preview-protocol.ts`
  - `apps/preview/src/editor-preview.tsx`, plus wherever `editor-force-hover` is defined in the preview styles
- Test: `apps/www/src/editor/model.test.ts`, `preview-protocol.test.ts`, `apps/www/src/editor/components/properties-panel.test.tsx` (new), `tests/e2e/editor.spec.ts`

**Interfaces:**
- Consumes: Task 1 shell.
- Produces:
  - `EditorView.forcedState: 'none' | 'hover' | 'focus' | 'active'`. Add `'active'`, mapped to the class `editor-force-active` the same way `'hover'` maps to `editor-force-hover`.
  - `VariantPicker(props: { value: RecipeButtonVariant; onChange(v: RecipeButtonVariant): void })` (type from `@ombelle/contracts`): 6 `aria-pressed` buttons with a mini rendered sample each.

Layout changes (canvas `ButtonEditor.dc.html`):
- Top bar items:
  - crumbs "Components / Button"
  - name field = recipe id
  - revision `r{revision}`
  - a family chip button that opens the family picker
  - status
  - undo/redo
  - an overflow menu with "Download recipe JSON" and the recovery downloads
  - Get code
- Inspector sections, in order:
  - Content: the label text.
  - Variant: `VariantPicker`.
  - Size & behavior: Size `SegmentedControl` (S/M/L/Icon), Type `SegmentedControl` (button/submit/reset). Labels sit above their controls (the canvas fix for "reset" overflowing). Disabled and Loading become `role="switch"` buttons.
  - Colors: one row per role. The role name is on its own line, with Light and Dark chips at half width each, text truncated with an ellipsis. An inherited value shows "Preset" with a dashed chip.
  - Shape & depth: `SliderRow` for radius, border and min height; shadow X/Y as a number pair.
- The preview toolbar gets Light/Dark, Wide/Narrow and State `SegmentedControl`s (Rest/Hover/Focus/Active), plus a "Matches current recipe" status pill.

- [ ] **Step 1: Write the failing tests**
  - `model.test.ts`: a view with `forcedState: 'active'` round-trips.
  - `preview-protocol.test.ts`: the protocol accepts `forcedState: 'active'` and rejects `'pressed'`.
  - `properties-panel.test.tsx`:
    - `VariantPicker` presses `default` for the example recipe.
    - The color row for an un-overridden role renders the text "Preset" and no reset button.
    - The Type group has `role="group" aria-label="Button type"`.
  - e2e:
    - The recipe hash is unchanged after switching State to Active (extend the `view mode does not change recipe hash` test).
    - Every control is operable by keyboard (update the selectors in the existing keyboard test).
- [ ] **Step 2: Run them and confirm they fail.** Run: `pnpm exec vitest run apps/www/src/editor`. Expected: FAIL.
- [ ] **Step 3: Implement** the changes above.
- [ ] **Step 4: Verify.** Run: `pnpm exec vitest run apps/www/src/editor && pnpm build:packages && pnpm exec playwright test tests/e2e/editor.spec.ts`. Expected: PASS.
- [ ] **Step 5: Commit** `feat(www): rebuild Button editor on the editor shell with forced preview states`

### Task 6: Button output panel

**Files:**
- Modify: `apps/www/src/editor/components/artifact-panel.tsx`, `button-editor.tsx`
- Test: `apps/www/src/editor/components/artifact-panel.test.tsx` (new), `tests/e2e/editor.spec.ts`

**Interfaces:**
- Produces:
  - `type Tab = 'Usage' | 'Component' | 'CSS' | 'Recipe' | 'Install'`. `Recipe` is the former "Recipe JSON"; `Install` is the former "CLI".
  - `artifactMeta(result: RecipeCompileResult): string[]`: the recipe hash, `Catalog <release> · Compiler <version>`, and either the dependency list or "No additional dependencies".
- Remove the header's duplicate "Download recipe JSON" button; it now lives in the overflow menu. Remove the `#artifacts-title` "View code" link. The panel gets a collapse button whose open state is persisted through `useDrawerState('ombelle.button-editor.output', true)`.

- [ ] **Step 1: Write the failing tests**
  - The rendered tablist has exactly the five tab names in order.
  - `artifactMeta` for a recipe with no extra dependencies ends with "No additional dependencies".
  - e2e: the `artifact tabs support copy and validated recipe JSON download` test uses the new tab names and still downloads valid recipe JSON.
- [ ] **Step 2: Run them and confirm they fail.** Expected: FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Verify.** Run: `pnpm exec vitest run apps/www/src/editor/components && pnpm exec playwright test tests/e2e/editor.spec.ts`. Expected: PASS.
- [ ] **Step 5: Commit** `feat(www): simplify Button output to five tabs with a metadata line`

---

## Phase 4 — Refresh the existing families and release 0.4.0

### Task 7: Automated version alignment

**Files:**
- Create: `scripts/set-version.mjs`
- Test: `tests/integration/version-alignment.test.ts`
- Modify: these tests stop hard-coding `0.3.0` and import `publishedInstaller` instead:
  - `tests/e2e/editor.spec.ts`
  - `tests/integration/snapshot-page.test.ts`
  - `tests/integration/packed-cli.test.ts`
  - `tests/hosted/hosted-code-journey.test.ts`
  - `apps/www/src/snapshots/install-command.test.ts`
- Modify: root `package.json`, adding `"version:set": "node scripts/set-version.mjs"`.

**Interfaces:**
- Produces two modes:
  - `node scripts/set-version.mjs <x.y.z>` (workspace release):
    - Sets `version` in the six workspace `package.json` files.
    - Rewrites only the *current-version sites*: README line "The six workspace packages are version **X**", `docs/cli-release.md` line "All six workspace packages use software version X", `docs/04-presets-and-contracts.md` line "Workspace packages and the published installer are version X", and the `pack:cli` tarball name in `docs/cli-release.md` line 3.
    - Moves the `## Unreleased` body under `## <x.y.z> — <D Month YYYY>` and leaves an empty `## Unreleased` on top.
  - `node scripts/set-version.mjs --published <x.y.z>` (after npm publication):
    - Sets `publishedInstaller.version` in `apps/www/src/snapshots/install-command.ts`.
    - Rewrites `npx @ombelle-ui/cli@<old>` command examples in `docs/foundation-local-usage.md`, `docs/snapshot-service-operations.md`, `docs/07-delivery-plan.md` and the README.
  - `--check` exits 1 and names each file whose current-version site disagrees with `packages/cli/package.json`.
  - The script never edits historical sentences: dated publication notes in `docs/cli-release.md`, `CHANGELOG.md` entries other than `Unreleased`, and anything under `docs/evidence/`.

- [ ] **Step 1: Write the failing test**

```ts
it('sets a workspace release in a temp copy without touching history', async () => {
  const dir = await copyRepoSubset(['package.json','packages/*/package.json','apps/*/package.json','README.md','CHANGELOG.md','docs/cli-release.md','docs/04-presets-and-contracts.md'])
  await run('node', ['scripts/set-version.mjs', '0.4.0', '--root', dir, '--date', '2026-11-20'])
  for (const p of sixPackageJsons(dir)) expect(JSON.parse(read(p)).version).toBe('0.4.0')
  expect(read(dir,'CHANGELOG.md')).toMatch(/## Unreleased\n\n## 0\.4\.0 — 20 November 2026\n/)
  expect(read(dir,'docs/cli-release.md')).toContain('was published on 2026-11-04 from `a9e56fc`')
  expect((await run('node', ['scripts/set-version.mjs','--check','--root',dir])).code).toBe(0)
})
it('--published only flips website commands', async () => { /* install-command.ts version === '0.4.0'; package.json versions unchanged */ })
it('--check fails and names a misaligned package', async () => { /* edit one package.json; code 1; stderr contains its path */ })
```

- [ ] **Step 2: Run it and confirm it fails.** Run: `pnpm exec vitest run --config vitest.integration.config.ts tests/integration/version-alignment.test.ts`. Expected: FAIL with the script missing.
- [ ] **Step 3: Implement `scripts/set-version.mjs`.** It takes `--root` (default: cwd) and `--date` (default: today). Make each site an explicit `{ file, pattern }` list entry. If a pattern doesn't match exactly once, exit 1 rather than guessing.
- [ ] **Step 4: Verify.** Run the test, then `node scripts/set-version.mjs --check` on the real repo. Expected: PASS, and the check passes at 0.3.0.
- [ ] **Step 5: Commit** `build: add scripted workspace and published-installer version alignment`

### Task 8: Flat refresh

**Files:**
- Modify:
  - `packages/catalog/src/presets/flat.json`
  - `packages/catalog/src/styles/flat.css`
  - `packages/catalog/src/styles/{badge,card,checkbox,label,native-select,switch,tabs,textarea,tooltip}/flat.css`
  - `packages/compiler/test/fixtures/style-baseline.json`
- Test: `packages/compiler/test/stable-families.test.ts`, `packages/compiler/test/compile.test.ts`, `tests/integration/contrast.test.ts`, `tests/e2e/parity.spec.ts`

**Interfaces:**
- Produces: the preset values below, and family CSS that implements the canvas `FlatKit.dc.html` signature.

Preset values:
- `design`: `{ fontFamilyId: 'system-sans', radiusRem: 0.5, density: 'comfortable', borderWidthPx: 0, shadowOffsetXPx: 0, shadowOffsetYPx: 0, motion: 'reduced', transparency: 'reduced' }`

| Token | Light | Dark |
| --- | --- | --- |
| background / foreground | #F3F5F9 / #0F172A | #0B1120 / #F1F5F9 |
| card, popover / foreground | #FFFFFF / #0F172A | #151E32 / #F1F5F9 |
| primary / foreground | #1D4ED8 / #FFFFFF | #6B9BFF / #0B1120 |
| secondary / foreground | #E3EBFD / #1B3B9E | #1E2B4A / #C7D7FF |
| muted / foreground | #ECEFF5 / #4A5568 | #1B2439 / #A3AEC2 |
| accent / foreground | #FDE047 / #0F172A | #FDE047 / #0B1120 |
| destructive / foreground | #C81E1E / #FFFFFF | #F87171 / #0B1120 |
| border / input / ring | #E2E6EE / #7C879B / #1D4ED8 | #26314A / #6B7690 / #6B9BFF |

CSS rules:
- **Inputs, selects and textareas** are filled wells: background `var(--muted)`, no side borders, a 2px bottom rule in `var(--input)`, and top corners at `var(--radius)`.
  - On focus: `var(--card)` background and an inset 2px ring.
  - When invalid: a destructive bottom rule and a soft destructive tint.
- **Buttons:**
  - Outline is `inset 0 0 0 max(var(--border-width), 2px) var(--primary)`.
  - Hover and press darken the fill to 86% and 72% (`color-mix` toward black).
  - Disabled uses the muted fill and muted text, not opacity.
- **Tabs:** the active trigger is filled with `var(--primary)`.
- **Card and dialog:** no border and no shadow. A non-zero `--border-width` draws `inset 0 0 0 var(--border-width) var(--border)`.

- [ ] **Step 1: Write the failing tests**
  - `stable-families.test.ts`: `getCatalog('0.1.0').presets.flat.design.borderWidthPx === 0`, and the compiled flat `ui-style.css` contains `border-bottom:2px solid var(--input)` for `[data-slot="input"]`.
  - The same file (Review Focus 5): compiling flat with `borderWidthPx: 2` puts `var(--border-width)` in the card rule while the input bottom rule stays `2px`.
  - `contrast.test.ts`: all 8 flat pairs reach 4.5:1 or more in both modes.
  - `compile.test.ts`: the baseline gains an `intentionalChanges` entry `{ reason: 'flat family refresh', families: ['flat'], logicalPaths: [...] }`, and the test asserts those paths.
- [ ] **Step 2: Run them and confirm they fail.** Run: `pnpm build:packages && pnpm exec vitest run packages/compiler/test/stable-families.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement** the preset and CSS. Record the new hashes with `tsx scripts/record-stable-hashes.ts`, and review the regenerated `generated.ts` and the baseline diff.
- [ ] **Step 4: Verify.** Run: `pnpm test:unit && pnpm exec playwright test tests/e2e/parity.spec.ts tests/e2e/forms.spec.ts`. Expected: PASS. Liquid-glass and other-family hashes are unchanged.
- [ ] **Step 5: Commit** `feat(catalog): refresh flat family with tone surfaces and filled fields`

### Task 9: Minimalist refresh

Same file set as Task 8, with `minimalist` in place of `flat`; the minimalist states spec is `tests/e2e/minimalist-states.spec.ts`. Canvas: `MinimalistKit.dc.html`.

Preset values:
- `design`: `{ fontFamilyId: 'system-sans', radiusRem: 0.25, density: 'comfortable', borderWidthPx: 1, shadowOffsetXPx: 0, shadowOffsetYPx: 0, motion: 'reduced', transparency: 'reduced' }`

| Token | Light | Dark |
| --- | --- | --- |
| background / foreground | #FAFAF9 / #111111 | #0E0E0D / #F2F2EF |
| card, popover / foreground | #FFFFFF / #111111 | #161615 / #F2F2EF |
| primary / foreground | #111111 / #FFFFFF | #F2F2EF / #0E0E0D |
| secondary, accent / foreground | #F1F1EF / #111111 | #232321 / #F2F2EF |
| muted / foreground | #F1F1EF / #5F5F5A | #1D1D1B / #A6A6A0 |
| destructive / foreground | #B42318 / #FFFFFF | #F97066 / #0E0E0D |
| border / input / ring | #E5E5E1 / #8C8C86 / #111111 | #2C2C2A / #76766F / #F2F2EF |

CSS rules:
- **Inputs and selects** are underlines: no side or top borders, `border-bottom: var(--border-width) solid var(--input)`, square corners, transparent background. Focus thickens the line to 2px `var(--ring)`; invalid uses a 2px destructive line. Textarea keeps a full 1px box.
- **Destructive button** is outlined, not filled.
- **Tabs** are text on a hairline; the active trigger gets `box-shadow: inset 0 -2px 0 var(--foreground)`.
- **Focus outline** is `1px solid var(--ring)` with a 4px offset.
- **Labels and badges** are 11px uppercase with `letter-spacing: .1em`.
- **Tooltip** has a card background, a hairline border and the family's only shadow, `0 6px 16px -8px` at 18% black.

- [ ] **Step 1: Write the failing tests**
  - `minimalist.test.ts`: the input rule contains `border-bottom` and no `border:` shorthand on the sides.
  - The active tabs trigger contains `inset 0 -2px 0`.
  - Contrast pairs pass, and the baseline `intentionalChanges` entry for `minimalist` is present.
  - Review Focus 3, in `tests/integration/editor-preset-cli.test.ts`: `theme add` on a fixture installed with 0.3.0 output plans `ui-style.css` as an update, and a hand-modified `components/ui/input.tsx` still produces a conflict.
- [ ] **Step 2: Run them and confirm they fail.** Expected: FAIL.
- [ ] **Step 3: Implement**, re-record the hashes, and review the generated diff.
- [ ] **Step 4: Verify.** Run: `pnpm test:unit && pnpm test:integration && pnpm exec playwright test tests/e2e/minimalist-states.spec.ts tests/e2e/parity.spec.ts`. Expected: PASS.
- [ ] **Step 5: Commit** `feat(catalog): refresh minimalist family with hairlines and underlined fields`

### Task 10: Neo brutalism refresh

Same file set as Task 8, with `neo-brutalism` in place of `flat`. Canvas: `NeoBrutalismKit.dc.html`.

Preset values:
- `design`: `{ fontFamilyId: 'system-sans', radiusRem: 0, density: 'comfortable', borderWidthPx: 2.5, shadowOffsetXPx: 4, shadowOffsetYPx: 4, motion: 'reduced', transparency: 'reduced' }`

| Token | Light | Dark |
| --- | --- | --- |
| background / foreground | #F4F4EF / #111111 | #141414 / #F5F5F5 |
| card, popover / foreground | #FFFFFF / #111111 | #1F1F1F / #F5F5F5 |
| primary / foreground | #FFD23F / #111111 | #FFD23F / #111111 |
| secondary / foreground | #A6F4FF / #111111 | #A6F4FF / #111111 |
| muted / foreground | #EDEDE8 / #45453F | #2A2A2A / #BDBDB5 |
| accent / foreground | #FF90E8 / #111111 | #FF90E8 / #111111 |
| destructive / foreground | #FF5C5C / #111111 | #FF6B6B / #111111 |
| border / input / ring | #111111 ×3 | #F5F5F5 ×3 |

CSS rules:
- **Shadows:** card and dialog shadows are `calc(var(--shadow-x) * 2) calc(var(--shadow-y) * 2) 0 var(--border)`. This is derived from the existing offsets, with no new token.
- **Buttons, tabs, checkbox and switch:**
  - Hover moves the element by `translate(-2px,-2px)` and grows the shadow by 2px.
  - Press moves it by `translate(var(--shadow-x), var(--shadow-y))` with no shadow.
  - Disabled is a dashed border with no shadow.
- **Focus outline** is `3px dashed var(--ring)` with a 4px offset.
- **Badges** rotate ±2° on alternating `:nth-child`. Under `prefers-reduced-motion`, keep only the rotation; don't animate it.
- **Active tabs trigger** uses `var(--accent)` and stays in the pressed position.
- **Native select icon** sits in a `var(--primary)` box separated by a border.
- **Error text** is a destructive tag.

- [ ] **Step 1: Write the failing tests**
  - `stable-families.test.ts`: the card rule contains `calc(var(--shadow-x) * 2)`, and the focus rule contains `dashed`.
  - Contrast pairs pass in both modes, and the baseline `intentionalChanges` entry is present.
- [ ] **Step 2: Run them and confirm they fail.** Expected: FAIL.
- [ ] **Step 3: Implement**, re-record the hashes, and review the generated diff.
- [ ] **Step 4: Verify.** Run: `pnpm test:unit && pnpm exec playwright test tests/e2e/parity.spec.ts tests/e2e/keyboard.spec.ts`. Expected: PASS.
- [ ] **Step 5: Commit** `feat(catalog): refresh neo-brutalism family with key-press depth and stickers`

### Task 11: Release 0.4.0

**Files:**
- Modify: `CHANGELOG.md` (the Unreleased entries for Tasks 1–10), the six `package.json` files and the docs sites (both through Task 7's script), `docs/evidence/*` (regenerated by the gate), and `docs/decisions/0003-style-family-refresh.md` (new).
- Test: `pnpm check:foundation`

- [ ] **Step 1: Write the decision record** `docs/decisions/0003-style-family-refresh.md`. It covers:
  - catalog 0.1.0 bytes change in place (with the 0.3.0 precedent)
  - existing installs keep their files until `theme add`/`add` is rerun
  - recipe IDs and revisions stay immutable
  - the hashes listed under `intentionalChanges`
- [ ] **Step 2:** Run `pnpm version:set 0.4.0`, then `pnpm version:set --check`. Expected: the check exits 0.
- [ ] **Step 3:** Run `pnpm install --frozen-lockfile --ignore-scripts && pnpm build:packages && pnpm typecheck && pnpm test:unit && pnpm test:integration`. Expected: all PASS.
- [ ] **Step 4:** Run `pnpm check:foundation`. Expected: the 36-consumer matrix and browser contract pass, and the evidence files update.
- [ ] **Step 5:** Run `pnpm pack:cli`. Expected: `.artifacts/cli-release/ombelle-ui-cli-0.4.0.tgz` and `release.json` with `version: '0.4.0'`.
- [ ] **Step 6: Commit** `chore(release): prepare 0.4.0 with refreshed style families`, then open the PR.
- [ ] **Step 7 (user):** After merge, publish `@ombelle-ui/cli@0.4.0` following `docs/cli-release.md`, and record its integrity there.
- [ ] **Step 8:** Run `pnpm version:set --published 0.4.0`, then run the snapshot-page and install-command tests (Expected: PASS). Commit `chore(release): point website commands at @ombelle-ui/cli@0.4.0`.

---

## Phase 5 — Ombelle family and release 0.5.0

### Task 12: Add `ombelle` to schemas and contracts

**Files:**
- Modify: `schemas/preset.schema.json` (styleFamily enum), `packages/contracts/src/style-families.ts`, and the recipe schema if it lists families
- Test: `packages/contracts/test/style-support.test.ts`, `packages/contracts/test/validate.test.ts`, `tests/integration/cli.test.ts`, `tests/integration/consumer-matrix.test.ts`

**Interfaces:**
- Produces: `supportedStyleFamilies = ['flat', 'minimalist', 'neo-brutalism', 'ombelle']`. `styleSupport(id, 'ombelle')` is `'stable'` for all 12 components. The consumer matrix gains 4 rows (pnpm/npm × vite/next), taking it from 36 to 40.

- [ ] **Step 1: Write the failing tests**
  - `validatePreset({...flat, styleFamily: 'ombelle'})` passes.
  - `consumerCases().length === 40`.
  - Review Focus 4, in `tests/integration/cli.test.ts`: a 0.4.0-packed installer given an `ombelle` preset exits non-zero with a schema or compatibility error, and the target directory is byte-identical afterwards. Use the Task 11 tarball fixture.
- [ ] **Step 2: Run them and confirm they fail.** Expected: FAIL.
- [ ] **Step 3: Implement** the enum and contracts. Run `pnpm build:packages` and review the regenerated `preset-schema.ts`.
- [ ] **Step 4: Verify.** Run `pnpm typecheck && pnpm test:unit`. Expected: PASS; the next task supplies the missing catalog files.
- [ ] **Step 5: Commit** `feat(contracts): add ombelle as a stable style family`

### Task 13: Ombelle catalog preset and styles

**Files:**
- Create: `packages/catalog/src/presets/ombelle.json`, `packages/catalog/src/styles/ombelle.css`, and `packages/catalog/src/styles/<component>/ombelle.css` for every component directory that exists for the other stable families
- Modify: `packages/compiler/test/fixtures/style-baseline.json` (adds an `ombelle` family block)
- Test: `packages/compiler/test/stable-families.test.ts`, the per-component compiler tests, `tests/integration/contrast.test.ts`

Preset values:
- `id: 'builtin-ombelle'`, `name: 'Ombelle'`
- `design`: `{ fontFamilyId: 'system-sans', radiusRem: 0.75, density: 'comfortable', borderWidthPx: 1.5, shadowOffsetXPx: 3, shadowOffsetYPx: 3, motion: 'full', transparency: 'reduced' }`

| Token | Light | Dark |
| --- | --- | --- |
| background / foreground | oklch(98.5% 0.004 350) / oklch(22% 0.012 275) | oklch(17% 0.01 275) / oklch(97% 0.004 350) |
| card, popover / foreground | #FFFFFF / oklch(22% 0.012 275) | oklch(21% 0.012 275) / oklch(97% 0.004 350) |
| primary / foreground | oklch(55% 0.22 6) / oklch(99% 0 0) | oklch(68% 0.22 6) / oklch(16% 0.01 275) |
| secondary, accent / foreground | oklch(95% 0.035 6) / oklch(42% 0.17 6) | oklch(30% 0.08 6) / oklch(88% 0.08 6) |
| muted / foreground | oklch(95.5% 0.006 350) / oklch(47% 0.015 275) | oklch(26% 0.012 275) / oklch(72% 0.012 275) |
| destructive / foreground | oklch(52% 0.21 27) / oklch(99% 0 0) | oklch(70.4% 0.191 22.216) / oklch(16% 0.01 275) |
| border, input / ring | oklch(22% 0.012 275) / oklch(55% 0.22 6) | oklch(97% 0.004 350 / 80%) / oklch(68% 0.22 6) |

CSS rules (canvas `OmbelleKit.dc.html`):
- **Buttons, tabs, switch and badges** are pills (`border-radius: 999px`). Inputs keep `var(--radius)`; cards and dialogs use `calc(var(--radius) + 8px)`.
- **Every control** has a `var(--border-width) solid var(--border)` outline. Buttons, inputs, checkboxes, switches and tab lists cast `var(--shadow-x) var(--shadow-y) 0 var(--border)`; cards and dialogs cast `calc(var(--shadow-x) * 5 / 3)`.
- **Button states:** hover moves the button by `translate(-1px,-1px)` and adds 1px of shadow; press moves it by `translate(var(--shadow-x), var(--shadow-y))` with no shadow. Disabled is dashed, with no shadow, at 45% opacity.
- **Focus outline** is `2.5px solid var(--ring)` with a 3px offset.
- **Active tab trigger** is filled `var(--foreground)` with `var(--background)` text.
- **Switch:** the thumb is `var(--foreground)` when off. When on, it is `var(--card)` with an outline, on a `var(--primary)` track.
- **Tooltip:** `var(--primary)` background with an outline; the arrow keeps the outline.
- **Labels, badges and tabs** are uppercase at weight 700, with `letter-spacing: .07em` on labels and badges.

- [ ] **Step 1: Write the failing tests**
  - `getCatalog('0.1.0').presets.ombelle` validates.
  - Compiling every component with the ombelle preset produces `ui-style.css` containing `border-radius:999px` on `[data-slot="button"]`.
  - All 8 contrast pairs pass in both modes.
  - The baseline has an `ombelle` block and the other families' hashes are unchanged.
- [ ] **Step 2: Run them and confirm they fail.** Expected: FAIL.
- [ ] **Step 3: Implement**, record the hashes with `tsx scripts/record-stable-hashes.ts`, and review `generated.ts`.
- [ ] **Step 4: Verify.** Run `pnpm build:packages && pnpm test:unit`. Expected: PASS.
- [ ] **Step 5: Commit** `feat(catalog): add the ombelle style family`

### Task 14: Ombelle in the editors, preview, consumers and docs

**Files:**
- Modify: `apps/www/src/preset-editor/components/preset-controls.tsx` (`FamilyPicker` sample for ombelle), `apps/www/src/editor/components/properties-panel.tsx`, the preview gallery generation, `docs/03-components-styles-accessibility.md`, `docs/04-presets-and-contracts.md`, `docs/components/*.md` (an ombelle row in each), and `docs/decisions/0004-ombelle-family.md` (new)
- Test: `tests/e2e/preset-editor.spec.ts` (the `renders all twelve ${family}` loop now covers ombelle), `tests/e2e/parity.spec.ts`, `tests/integration/consumer-matrix.test.ts`

- [ ] **Step 1: Write the failing tests.** The e2e family loops already iterate `supportedStyleFamilies`, so they fail until the gallery and fixtures include ombelle. Add a `FamilyPicker` unit assertion that ombelle is offered without a "Beta" tag.
- [ ] **Step 2: Run them and confirm they fail.** Run: `pnpm build:packages && pnpm generate:preview && pnpm exec playwright test tests/e2e/preset-editor.spec.ts -g ombelle`. Expected: FAIL.
- [ ] **Step 3: Implement** the picker sample, gallery registration and docs. Then run `pnpm prepare:consumers` to create the 4 new consumers.
- [ ] **Step 4: Verify.** Run `pnpm exec playwright test tests/e2e/preset-editor.spec.ts tests/e2e/parity.spec.ts && pnpm test:integration`. Expected: PASS.
- [ ] **Step 5: Commit** `feat(www): offer the ombelle family in editors, previews and consumers`

### Task 15: Release 0.5.0

Same steps as Task 11, with these changes:
- The version is `0.5.0` and the commit is `chore(release): prepare 0.5.0 with the ombelle family`.
- `pnpm check:foundation` must report 40 consumers.
- The changelog entry states that installers at 0.4.0 or older reject `ombelle` presets and codes.
- After the user publishes, run `pnpm version:set --published 0.5.0`, then commit `chore(release): point website commands at @ombelle-ui/cli@0.5.0`.
