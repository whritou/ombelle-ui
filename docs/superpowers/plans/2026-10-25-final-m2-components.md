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

- [x] **Step 1: Write failing catalog/compiler assertions.** Cover exports and slots, exact scoped dependency, tooltip content/arrow style and forced-colors/reduced-motion behavior in each family, client boundary, generated usage, and dependency ordering.
- [x] **Step 2: Run the focused tests and confirm Tooltip assertions fail.**

Run: `pnpm exec vitest run packages/catalog/test/catalog.test.ts packages/compiler/test/tooltip.test.ts`

Expected: Tooltip-specific assertions fail because the component is not registered.

- [x] **Step 3: Implement Tooltip with `@radix-ui/react-tooltip`.** Forward primitive props and refs. Preserve provider delay configuration, controlled/uncontrolled open state, hover/focus entry, and Escape dismissal. Use a portal for content as required by the primitive and keep content descriptive and non-interactive. Style all three families, add the labelled compiler example, and document accessible use and the glass deferral.
- [x] **Step 4: Regenerate and run focused catalog/compiler checks.**

Run: `pnpm build:packages; pnpm exec vitest run packages/catalog/test/catalog.test.ts packages/compiler/test/tooltip.test.ts`

Expected: package build succeeds and focused checks pass.

- [x] **Step 5: Commit** as `feat(tooltip): add reviewed catalog component`.

### Task 5: Add component-specific preview and generated-consumer coverage

User correction on 26 October 2026: keep Checkbox, Switch, Tabs, and Tooltip in separate fixture, CLI, and browser files, matching existing component-specific coverage. The previous combined layout has historical passing focused results. The revised layout below has not been run because the user explicitly instructed no test reruns; verification steps remain unchecked. The single full foundation run was stopped at the user's request during integration after package build and 255 unit tests passed.

**Files:**
- Create: `fixtures/shared/checkbox-fixture.tsx`, `switch-fixture.tsx`, `tabs-fixture.tsx`, and `tooltip-fixture.tsx`
- Modify: `fixtures/shared/scenario.tsx`
- Modify: `scripts/prepare-node-consumer.ts` and `scripts/prepare-bun-consumers.ts`
- Modify: `scripts/generate-preview.ts`
- Create: `tests/e2e/checkbox.spec.ts`, `switch.spec.ts`, `tabs.spec.ts`, and `tooltip.spec.ts`
- Create: `tests/integration/checkbox-cli.test.ts`, `switch-cli.test.ts`, `tabs-cli.test.ts`, and `tooltip-cli.test.ts`
- Modify: `tests/helpers/scenario-fixture.ts` and its callers to use named fixture options
- Modify: `tests/integration/scenario-fixture.test.ts` for independent fixture propagation
- Modify: `scripts/foundation-evidence.mjs` and `tests/integration/foundation-groups.test.ts`
- Modify: `docs/07-delivery-plan.md`
- Create: `docs/evidence/m2-components.md`

**Interfaces:**
- Consumes: all four compiled APIs and generated artifacts from Tasks 1–4.
- Produces: independent `?checkboxes=1`, `?switches=1`, `?tabs=1`, and `?tooltips=1` fixtures; each component owns a matrix over `supportedStyleFamilies`, light/dark, and `preview`, `vite`, `next`, `npm-vite`, and `npm-next`.

- [x] **Step 1: Add integration coverage for CLI ownership and parity.** Each component has its own Vite/Next × family matrix, adds only its own ID, and asserts a non-mutating dry-run, three exact artifacts and component-scoped dependencies, ownership, preservation, no-op repeat, and TSX/CSS `FILE_CONFLICT` despite `--yes`. Next cases exercise a custom UI alias.
- [ ] **Step 2: Run the focused component CLI and fixture integration checks after the split.**

Run: `pnpm build:packages; pnpm exec vitest run --config vitest.integration.config.ts tests/integration/checkbox-cli.test.ts tests/integration/switch-cli.test.ts tests/integration/tabs-cli.test.ts tests/integration/tooltip-cli.test.ts tests/integration/scenario-fixture.test.ts`

Expected: the 24 component ownership cases and independent fixture propagation cases pass, including exact dependency scopes and custom aliases. This step is deferred by the user's instruction not to rerun tests.

- [x] **Step 3: Add separate fixtures and browser checks.** Include all four new IDs in Node-manager and Bun-manager consumer preparation after base fixture installs so generated consumer builds and lockfiles contain their declared dependencies. Give each component an isolated fixture, scenario gate, and browser spec. Preserve checkbox mixed/disabled/invalid and form submission/reset, switch off/on/disabled and form submission/reset, Tabs roles/selection/automatic keyboard activation/orientation, Tooltip descriptive help/focus/hover/Escape/closed `forceMount`, axe, visible focus, 24px minimum targets, dark mode, RTL, reduced motion, and stable family styles. No fixture imports the other three new components.
- [ ] **Step 4: Run the M2 browser suite against preview and generated consumers.**

Run: `pnpm generate:preview; pnpm prepare:consumers; pnpm build:preview; pnpm build:consumers; pnpm exec playwright test tests/e2e/checkbox.spec.ts tests/e2e/switch.spec.ts tests/e2e/tabs.spec.ts tests/e2e/tooltip.spec.ts`

Expected: each spec's 30 app/family/mode cases pass, for 120 new component cases across preview, Vite, Next.js, npm Vite, and npm Next.js; installed DOM and computed component styles match preview; no axe violations. The strict inventory requires all four exact spec identities at 30 each, for 298 total browser cases, with one omission regression per component. This expectation has not been rerun after the split.

- [ ] **Step 5: Run package, integration, type, and foundation verification.**

Run: `pnpm build:packages; pnpm typecheck; pnpm test:unit; pnpm test:integration; pnpm check:foundation`

Expected: every stage passes with no failed, skipped, flaky, or incomplete component matrix evidence. If a documented toolchain/environment limitation prevents a stage, capture the exact command and failure in the evidence doc and do not claim the stage passed.

- [x] **Step 6: Record evidence and delivery status.** Record the historical combined-layout results separately from the untested component-specific split, the interrupted full gate, environment, package versions, consumer matrix, accessibility findings, and human-review limits in `docs/evidence/m2-components.md`. All twelve catalog rows declare stable support for the three standard families; glass retains the existing experimental/unavailable matrix.
- [x] **Step 7: Commit** as `feat(catalog): complete final M2 components`.
