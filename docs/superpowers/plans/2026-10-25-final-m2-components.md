# Final M2 Catalog Components Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Checkbox, Switch, Tabs, and Tooltip as the final M2 catalog components, with stable flat, minimalist, and neo-brutalism support in light and dark modes.

**Architecture:** Implement all four with the existing Radix/shadcn composition approach. Each component owns its TSX template, three family CSS files, compiler example, public API documentation, and focused unit/compiler coverage. A shared generated fixture and browser suite then verify form behavior, keyboard interactions, accessibility, and preview/consumer parity across the declared matrix.

**Tech Stack:** TypeScript/React 19, Radix UI, CSS custom properties, Vitest, Playwright, axe-core, pnpm.

**Spec:** `docs/superpowers/specs/2026-10-25-final-m2-components-design.md`

## Global Constraints

- Use Node 24.19.0 and pnpm 11.25.0.
- Support `flat`, `minimalist`, and `neo-brutalism`, in light and dark modes.
- Use exact runtime dependency versions and preserve component-scoped dependency declarations.
- Keep glass unsupported for Checkbox and Switch, and defer glass for Tabs and Tooltip.
- Preserve deterministic compiler artifacts, CLI dry-run and ownership safety, saved presets, and existing component bytes.
- Use Radix primitives for all four components; keep semantics and keyboard behavior consistent across style families.
- Do not claim human NVDA or VoiceOver review without recording that review.

## Review Focus

- Checkbox mixed state must remain a valid accessible checked state, while native form submission and form reset produce the expected values.
- A disabled Checkbox or Switch inside a disabled `fieldset` must remain disabled and visually inactive.
- Tabs must keep one roving tab stop, honor orientation, activate with the documented automatic model, and retain selection in controlled and uncontrolled use.
- Tooltip must appear on keyboard focus as well as hover, close on Escape, and never contain essential interactive content.
- Component CSS, installed source imports, and theme styles must remain equivalent across preview, Vite, Next.js, and npm consumer fixtures without changing saved project defaults.

---

### Task 1: Add Checkbox

**Files:**
- Modify: `packages/contracts/src/component-ids.ts`
- Modify: `packages/catalog/src/manifest.ts`
- Modify: `packages/catalog/package.json` and `pnpm-lock.yaml`
- Modify: `packages/catalog/src/index.ts`
- Create: `packages/catalog/src/templates/checkbox.tsx`
- Create: `packages/catalog/src/styles/checkbox/{flat,minimalist,neo-brutalism}.css`
- Modify generated: `packages/catalog/src/generated.ts` through `pnpm build:packages`
- Test: `packages/catalog/test/catalog.test.ts`
- Test: `packages/compiler/test/checkbox.test.ts`
- Create: `docs/components/checkbox.md`
- Modify: `packages/compiler/src/compile.ts` for `examples/checkbox.tsx`

**Interfaces:**
- Consumes: current `ComponentTemplate`, `runtimeDependencies`, and generated catalog conventions.
- Produces: `ComponentId` `checkbox`; `Checkbox` and `CheckboxProps`; Radix checked state `boolean | 'indeterminate'`; native form props, `onCheckedChange`, and the `checkbox` and `checkbox-indicator` slots.

- [x] **Step 1: Write failing catalog and compiler tests.** Assert Checkbox is supported; its dependency list includes its exact Radix primitive and `lucide-react` plus shared runtime dependencies; all three styles expose checked, mixed, focus-visible, invalid, disabled, forced-colors, and reduced-motion rules; compilation emits deterministic component, CSS, usage, utility, and theme artifacts with the selected style and dependencies.
- [x] **Step 2: Run the focused tests and confirm they fail** because the ID, template, styles, and compiler usage example are absent.

Run: `pnpm exec vitest run packages/catalog/test/catalog.test.ts packages/compiler/test/checkbox.test.ts`

Expected: Checkbox-specific assertions fail; existing component assertions remain passing.

- [x] **Step 3: Add Checkbox source, exact dependency, and docs.** Use `@radix-ui/react-checkbox`; put an indicator inside the root and use the existing icon dependency for checked and mixed marks. Forward primitive props and refs. Verify the primitive's form value, indeterminate, disabled-fieldset, and reset behavior. Add three semantic-token styles with visible focus and forced-colors treatment. Document labelling, error association, composition, form behavior, support status, and install command.
- [x] **Step 4: Regenerate and run focused checks.**

Run: `pnpm build:packages; pnpm exec vitest run packages/catalog/test/catalog.test.ts packages/compiler/test/checkbox.test.ts`

Expected: package build succeeds and focused catalog/compiler tests pass.

- [x] **Step 5: Commit** as `feat(checkbox): add reviewed catalog component`.

### Task 2: Add Switch

**Files:**
- Modify: `packages/contracts/src/component-ids.ts`
- Modify: `packages/catalog/src/manifest.ts`, `packages/catalog/package.json`, `pnpm-lock.yaml`, and `packages/catalog/src/index.ts`
- Create: `packages/catalog/src/templates/switch.tsx`
- Create: `packages/catalog/src/styles/switch/{flat,minimalist,neo-brutalism}.css`
- Modify generated: `packages/catalog/src/generated.ts` through `pnpm build:packages`
- Modify: `packages/catalog/test/catalog.test.ts`
- Create: `packages/compiler/test/switch.test.ts`
- Create: `docs/components/switch.md`
- Modify: `packages/compiler/src/compile.ts` for `examples/switch.tsx`

**Interfaces:**
- Consumes: catalog and package patterns from Task 1.
- Produces: `ComponentId` `switch`; `Switch` and `SwitchProps`; `SwitchThumb`; controlled/uncontrolled checked state and the `switch` and `switch-thumb` slots.

- [x] **Step 1: Write failing catalog/compiler assertions.** Cover exported parts and slots, exact scoped dependency, off/on/focus-visible/disabled and forced-colors/reduced-motion styles in every family, compiled CSS import and deterministic `examples/switch.tsx`, and form value behavior.
- [x] **Step 2: Run the focused tests and confirm the new assertions fail.**

Run: `pnpm exec vitest run packages/catalog/test/catalog.test.ts packages/compiler/test/switch.test.ts`

Expected: Switch-specific assertions fail because the component is not registered.

- [x] **Step 3: Implement Switch with `@radix-ui/react-switch`.** Forward root primitive props, refs, `checked`, `defaultChecked`, `onCheckedChange`, and form props. Style the thumb position from primitive state, preserve target size, and honor disabled fieldsets. Add light/dark-compatible three-family CSS, the compiler usage example, and API/install documentation that requires an accessible label.
- [x] **Step 4: Regenerate and run focused catalog/compiler checks.**

Run: `pnpm build:packages; pnpm exec vitest run packages/catalog/test/catalog.test.ts packages/compiler/test/switch.test.ts`

Expected: package build succeeds and focused checks pass.

- [x] **Step 5: Commit** as `feat(switch): add reviewed catalog component`.

### Task 3: Add Tabs

**Files:**
- Modify: `packages/contracts/src/component-ids.ts`
- Modify: `packages/catalog/src/manifest.ts`, `packages/catalog/package.json`, `pnpm-lock.yaml`, and `packages/catalog/src/index.ts`
- Create: `packages/catalog/src/templates/tabs.tsx`
- Create: `packages/catalog/src/styles/tabs/{flat,minimalist,neo-brutalism}.css`
- Modify generated: `packages/catalog/src/generated.ts` through `pnpm build:packages`
- Modify: `packages/catalog/test/catalog.test.ts`
- Create: `packages/compiler/test/tabs.test.ts`
- Create: `docs/components/tabs.md`
- Modify: `packages/compiler/src/compile.ts` for `examples/tabs.tsx`

**Interfaces:**
- Consumes: catalog and package patterns from Tasks 1–2.
- Produces: `ComponentId` `tabs`; `Tabs`, `TabsList`, `TabsTrigger`, and `TabsContent` exports and corresponding root/list/trigger/content slots; automatic activation by default.

- [x] **Step 1: Write failing catalog/compiler assertions.** Cover every exported part and slot, exact scoped dependency, style states and orientation selectors in each family, compiled artifact names/imports/example, controlled and uncontrolled values, and deduplication/order determinism.
- [x] **Step 2: Run the focused tests and confirm Tabs assertions fail.**

Run: `pnpm exec vitest run packages/catalog/test/catalog.test.ts packages/compiler/test/tabs.test.ts`

Expected: Tabs-specific assertions fail because the component is not registered.

- [x] **Step 3: Implement Tabs with `@radix-ui/react-tabs`.** Forward primitive props and refs. Preserve controlled/uncontrolled selection, disabled triggers, orientation, direction, automatic activation, and arrow-key behavior. Add family CSS for active, inactive, focused, disabled, and content states; add a labelled compiler example and document activation and keyboard behavior.
- [x] **Step 4: Regenerate and run focused catalog/compiler checks.**

Run: `pnpm build:packages; pnpm exec vitest run packages/catalog/test/catalog.test.ts packages/compiler/test/tabs.test.ts`

Expected: package build succeeds and focused checks pass.

- [x] **Step 5: Commit** as `feat(tabs): add reviewed catalog component`.

### Task 4: Add Tooltip

**Files:**
- Modify: `packages/contracts/src/component-ids.ts`
- Modify: `packages/catalog/src/manifest.ts`, `packages/catalog/package.json`, `pnpm-lock.yaml`, and `packages/catalog/src/index.ts`
- Create: `packages/catalog/src/templates/tooltip.tsx`
- Create: `packages/catalog/src/styles/tooltip/{flat,minimalist,neo-brutalism}.css`
- Modify generated: `packages/catalog/src/generated.ts` through `pnpm build:packages`
- Modify: `packages/catalog/test/catalog.test.ts`
- Create: `packages/compiler/test/tooltip.test.ts`
- Create: `docs/components/tooltip.md`
- Modify: `packages/compiler/src/compile.ts` for `examples/tooltip.tsx`

**Interfaces:**
- Consumes: catalog and package patterns from Tasks 1–3.
- Produces: `ComponentId` `tooltip`; `TooltipProvider`, `Tooltip`, `TooltipTrigger`, `TooltipContent`, and `TooltipArrow` exports and provider/root/trigger/content/arrow slots.

- [ ] **Step 1: Write failing catalog/compiler assertions.** Cover exports and slots, exact scoped dependency, tooltip content/arrow style and forced-colors/reduced-motion behavior in each family, client boundary, generated usage, and dependency ordering.
- [ ] **Step 2: Run the focused tests and confirm Tooltip assertions fail.**

Run: `pnpm exec vitest run packages/catalog/test/catalog.test.ts packages/compiler/test/tooltip.test.ts`

Expected: Tooltip-specific assertions fail because the component is not registered.

- [ ] **Step 3: Implement Tooltip with `@radix-ui/react-tooltip`.** Forward primitive props and refs. Preserve provider delay configuration, controlled/uncontrolled open state, hover/focus entry, and Escape dismissal. Use a portal for content as required by the primitive and keep content descriptive and non-interactive. Style all three families, add the labelled compiler example, and document accessible use and the glass deferral.
- [ ] **Step 4: Regenerate and run focused catalog/compiler checks.**

Run: `pnpm build:packages; pnpm exec vitest run packages/catalog/test/catalog.test.ts packages/compiler/test/tooltip.test.ts`

Expected: package build succeeds and focused checks pass.

- [ ] **Step 5: Commit** as `feat(tooltip): add reviewed catalog component`.

### Task 5: Add shared preview and generated-consumer coverage

**Files:**
- Create: `fixtures/shared/m2-components-fixture.tsx`
- Modify: `fixtures/shared/scenario.tsx`
- Modify: `scripts/generate-preview.ts`
- Create: `tests/e2e/m2-components.spec.ts`
- Create: `tests/integration/m2-components-cli.test.ts`
- Modify: `docs/07-delivery-plan.md`
- Create: `docs/evidence/m2-components.md`

**Interfaces:**
- Consumes: all four compiled APIs and generated artifacts from Tasks 1–4.
- Produces: one opt-in `?m2=1` fixture for Checkbox, Switch, Tabs, and Tooltip; end-to-end matrix evidence over `supportedStyleFamilies`, light/dark, and `preview`, `vite`, `next`, `npm-vite`, and `npm-next`.

- [ ] **Step 1: Add integration coverage for CLI ownership and parity.** For Vite and Next fixtures and each family, initialize once, add all four IDs, and assert dry-run is non-mutating; the plan includes each component TSX, CSS, usage example, and exact dependencies; apply records artifact ownership and preserves existing component source, theme, manager, and saved preset; repeat is a no-op; edits to a new component's TSX or CSS return `FILE_CONFLICT` even with `--yes`.
- [ ] **Step 2: Run the focused CLI integration test and confirm it fails** for missing components/artifacts.

Run: `pnpm build:packages; pnpm exec vitest run --config vitest.integration.config.ts tests/integration/m2-components-cli.test.ts`

Expected: the new matrix fails because the shared fixture and generated component artifacts are not yet covered by it.

- [ ] **Step 3: Add the shared fixture and browser checks.** Label each form control, expose checkbox mixed/disabled/invalid cases and switch off/on/disabled cases, provide horizontal and vertical Tabs examples with a disabled tab, and use Tooltip only for brief descriptive help. The browser suite asserts checkbox form submission/reset, switch state/form values, Tabs roles/selection/automatic keyboard activation/orientation, Tooltip focus and hover entry/Escape dismissal, axe violations, visible focus, 24px minimum targets where applicable, dark mode, RTL, reduced motion, and stable family styles.
- [ ] **Step 4: Run the M2 browser suite against preview and generated consumers.**

Run: `pnpm generate:preview; pnpm prepare:consumers; pnpm build:preview; pnpm build:consumers; pnpm exec playwright test tests/e2e/m2-components.spec.ts`

Expected: each app/family/mode case passes; installed DOM and computed component styles match the preview; no axe violations are reported.

- [ ] **Step 5: Run package, integration, type, and foundation verification.**

Run: `pnpm build:packages; pnpm typecheck; pnpm test:unit; pnpm test:integration; pnpm check:foundation`

Expected: every stage passes with no failed, skipped, flaky, or incomplete component matrix evidence. If a documented toolchain/environment limitation prevents a stage, capture the exact command and failure in the evidence doc and do not claim the stage passed.

- [ ] **Step 6: Record evidence and close M2.** Add actual environment, component/browser counts, package versions, tested consumer matrix, accessibility findings, and human-review limitations to `docs/evidence/m2-components.md`. Update the delivery plan to state that all twelve catalog rows now have stable support for the three standard families, while glass remains experimental or unavailable by the existing matrix.
- [ ] **Step 7: Commit** as `feat(catalog): complete final M2 components`.
