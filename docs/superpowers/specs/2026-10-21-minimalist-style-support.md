# Minimalist style family support

Date: 21 October 2026

Status: Proposed written specification. The user approved the conversational design; this document requires review before implementation planning.

## 1. Intent and success

Give React developers a third visibly distinct style for the existing Button, Dialog, and Input while preserving Ombelle's central promise: preview, generated source, installed source, and later additions use the same saved preset and component APIs.

Complete the missing third token set and visual fixtures from delivery ticket F03, and supply the automated and documented behavior evidence relevant to F09. This is a foundation slice toward M2, not completion of the twelve-component web alpha or its manual accessibility gates.

The user approved a dedicated minimalist preset and slot stylesheet using the existing shared component templates. The intended appearance is quiet neutral surfaces, monochrome primary actions, generous spacing, subtle decorative borders, modest rounding, and no decorative shadows. Visible focus and destructive intent take priority over visual restraint.

Success means a developer can preview either mode, initialize a supported app with the minimalist preset, install Button/Dialog, then add Input in a fresh process without specifying the preset again. Installed artifacts agree with the canonical compiler output, builds succeed, unrelated CSS and local edits remain protected, and the project's manager and lockfile ownership are retained.

## 2. Scope and boundaries

Include the minimalist preset, slot CSS, implemented-family contract, catalog generation, compiler integration, explicit preview routing, consumer preparation, CLI regression coverage, accessibility/state fixtures, CI integration, and measured support documentation.

Use the current React/ReactDOM 19.3.1, Tailwind v4, Node and package-manager pins. Keep the repository on pnpm. No new runtime dependency is needed for a style family. An implementation proposal requiring a new dependency must explain why before changing the approved scope.

Exclude new components or component props, separate minimalist TSX implementations, liquid glass, production editors, recipes, snapshots, public distribution, release publication, framework upgrades, workspace installation, and expanded browser/screen-reader support claims. Existing release inputs remain catalog/compiler 0.1.0 and preset schema 1.0 for this private additive foundation slice; unchanged existing inputs must continue to produce unchanged artifacts.

## 3. Preset and visual rules

Add `packages/catalog/src/presets/minimalist.json` with id `builtin-minimalist`, name `Minimalist`, revision 1, styleFamily `minimalist`, and the existing preset schema/platform/release fields. Supply all nineteen semantic colors in each mode.

| Token | Light | Dark |
| --- | --- | --- |
| background | #FAFAFA | #111827 |
| foreground | #111827 | #F9FAFB |
| card | #FFFFFF | #1F2937 |
| cardForeground | #111827 | #F9FAFB |
| popover | #FFFFFF | #1F2937 |
| popoverForeground | #111827 | #F9FAFB |
| primary | #111827 | #F9FAFB |
| primaryForeground | #FFFFFF | #111827 |
| secondary | #F3F4F6 | #374151 |
| secondaryForeground | #111827 | #F9FAFB |
| muted | #F3F4F6 | #1F2937 |
| mutedForeground | #4B5563 | #D1D5DB |
| accent | #E5E7EB | #374151 |
| accentForeground | #111827 | #F9FAFB |
| destructive | #B91C1C | #FCA5A5 |
| destructiveForeground | #FFFFFF | #111827 |
| border | #D1D5DB | #4B5563 |
| input | #6B7280 | #9CA3AF |
| ring | #111827 | #F9FAFB |

These are intended defaults, not claimed contrast results. Required contrast must be measured before recording support. Correct a failing default pair within this neutral direction and record the adjustment and measured result; a substantial aesthetic change requires design review.

Default design values: system-sans typography, radiusRem 0.375, comfortable density, borderWidthPx 1, both shadow offsets 0, reduced motion, and reduced transparency. Button defaults remain variant `default` and size `default`. Preserve the existing design override and compact-density semantics. Use generous internal spacing, including a 2rem default Dialog content inset, without modifying shared preview layout or existing families to manufacture a difference.

Add `packages/catalog/src/styles/minimalist.css` against the established data slots and semantic CSS variables:

- Primary actions use the monochrome primary pair. Secondary, outline, ghost, link, and destructive variants keep their established meanings and size behavior. Provide visible hover and pressed feedback without moving the hit target or obscuring focus.
- Inputs and control boundaries that identify interactive elements use the stronger `input` token. The lower-contrast `border` token is decorative; it must not be the sole required boundary or state indicator. Check applicable boundaries against their actual adjacent surfaces.
- Inputs retain native behavior and visibly distinguish invalid and disabled states. Invalid examples include associated error text and appropriate native/ARIA state; color alone is insufficient. Disabled appearance does not imply the control is available.
- Dialog uses an opaque popover surface, restrained border, generous spacing, and no decorative shadow. Preserve overlay, stacking, scroll, close, title/description association, focus trap, Escape, and focus-return behavior from the shared primitive.
- Keep an unmistakable focus-visible indicator, using the ring token and sufficient separation from filled surfaces. Honor the existing motion setting and prefers-reduced-motion; provide a usable forced-colors rendering with system colors rather than suppressing browser adjustments globally.

The preset is configurable, not grayscale enforcement. Existing allowlisted palette/design overrides still work. Verification labels apply only to the exact tested defaults and scenarios; an arbitrary user override is not automatically verified.

## 4. Architecture and data flow

Keep component behavior and public APIs in the existing Button, Dialog, and Input templates. The family controls appearance through its preset and slot stylesheet. Do not add a styleFamily prop to individual components or duplicate their TSX.

Extend the implemented StyleFamily contract to include `minimalist`. The preset schema already admits minimalist and liquid-glass; schema acceptance alone is not implementation availability. Keep liquid-glass unavailable with the existing actionable diagnostic.

Use one authoritative implemented-family list, consumed or consistency-checked across catalog generation, catalog lookup, compiler dispatch, preview generation, consumer preparation, and tests. Remove two-family assumptions in the touched paths without introducing a plugin framework or unrelated refactoring. The available-family contract must agree with the actual presets and styles; a missing pack fails clearly rather than rendering another family.

Data flow remains: validate and resolve the preset against the exact catalog/compiler version; generate canonical component/style/usage artifacts and hashes; transform only documented aliases for preview or consumer destinations; plan installation; apply existing source/config transactions and dependency policy.

The new family uses existing token generation, theme mappings, dependency declarations, canonical formatting, project preset/config files, and lock provenance. Preserve artifact ordering, hashing, and diagnostics. Existing flat and neo-brutalism preset resolution and generated artifact bytes must remain unchanged for identical inputs.

## 5. Preview and state fixtures

Add an explicit `/minimalist/` preview route with the existing `?mode=light` and `?mode=dark` controls. Select the actual generated minimalist entry; test that it cannot fall through to neo-brutalism. Keep existing route behavior compatible, while ensuring unknown family identifiers cannot masquerade as verified minimalist output.

Generate the preview from the same compiler artifacts installed into independent consumers. Preserve the current common scenario/layout so cross-app screenshots, normalized DOM, computed styles, and source hashes remain comparable.

Add a dedicated state fixture or scoped scenario section covering all supported Button variants and sizes, normal/focused/disabled controls, Input empty/filled/invalid/disabled states, and Dialog open/closed/keyboard behavior. Make the fixture usable through the preview and installed-source path; do not introduce a second hand-authored implementation as a visual reference. Add hooks needed for state tests without changing existing families' canonical component/style output.

Review minimalist light/dark screenshots beside flat to confirm that the restrained borders, neutral actions, spacing, and radius produce a distinct family. Screenshot equality between preview and consumer establishes parity; it does not by itself establish visual quality or accessibility.

## 6. Installation and consumer matrix

Preserve all existing CLI commands and flags. The new preset must work with init, add, theme add, dry-run, saved-preset reuse, no-op behavior, local-edit conflict detection, and existing transaction/recovery rules.

Theme add remains a palette/design-token merge into the configured global stylesheet and saved project defaults; it does not restyle or reinstall existing upstream shadcn component source. Verify that it preserves unrelated declarations, imports, components.json, component files, manager metadata, and the manager lockfile, then repeats without changes. Later Ombelle component additions use the saved minimalist preset.

Retain the current nineteen prepared consumers and manager regression suites. Extend preparation with these fifteen minimalist cases, reusing owned disposable fixtures and committed manager lockfiles rather than migrating managers:

| Manager / layout | Frameworks | Built CLI runtime | New cases |
| --- | --- | --- | --- |
| npm 11.19.0 | Vite and Next.js | Node | 2 |
| pnpm 11.25.0 | Vite and Next.js | Node | 2 |
| Yarn Classic 1.22.22 / node_modules | Vite | Node | 1 |
| Yarn 4.18.1 / node-modules | Next.js | Node | 1 |
| Yarn 4.18.1 / Plug'n'Play | Vite | Node | 1 |
| Bun 1.4.3 / bun.lock | Vite and Next.js | Node and Bun | 4 |
| Bun 1.4.3 / bun.lockb | Vite and Next.js | Node and Bun | 4 |

The resulting prepared-consumer target is thirty-four. Each minimalist case initializes from the new preset, installs Button/Dialog, adds Input in a fresh process, verifies exact dependencies and preset reuse, compares installed source against canonical artifacts, and completes its appropriate production build and audit. Use the existing manager-specific audit policies, including Bun's whole dependency graph, without broadening claims. Preserve binary Bun locks, PnP ownership, lifecycle suppression, runtime identity, and the Node-based framework-build boundary.

Extend browser parity and keyboard coverage to minimalist for preview and npm/pnpm Vite/Next.js in both modes. Existing Yarn/Bun coverage stays at actual installation, source parity, and production builds; do not describe those rows as browser-tested. Recheck the gate's duration against the existing CI budget during planning; preserve the acceptance matrix rather than silently dropping cases.

## 7. Accessibility and evidence

Apply the project's documented targets: at least 4.5:1 normal text contrast and 3:1 for applicable non-text controls/state indicators, with the project's relevant large-text exceptions. Measure rendered semantic pairs, including muted labels, destructive states, focus, and required control boundaries, on their actual surfaces. Document disabled-state exemptions and decorative borders instead of treating them as evidence for enabled controls.

Automate accessible naming and field-error association, keyboard focus visibility/order, Dialog initial focus/trap/close/Escape/return, invalid and disabled behavior, reduced motion, and forced colors. Check representative zoom/reflow behavior at 200 percent text zoom and 320 CSS pixels without clipping essential content or focus. Preserve existing scans and distinguish what automation measures from what requires review.

Record reviewed light/dark visual states and a repeatable manual keyboard checklist for this family. Evidence must identify whether a check was automated, agent-operated, or performed by a human. Broader browser, NVDA, VoiceOver, and other outstanding manual review remain release gates; do not report them as completed without observed evidence.

Successful implementation may label these three components foundation-supported in the documented tested environments. Do not mark the full minimalist catalog stable, certify arbitrary presets or consumer applications, or claim that all F09 manual review or alpha acceptance criteria have passed.

## 8. Acceptance and handoff

| ID | Acceptance result | Required evidence |
| --- | --- | --- |
| M01 | Minimalist resolves as an implemented pack; unavailable styles still fail clearly | Contract/catalog/compiler tests |
| M02 | Identical minimalist inputs are deterministic; existing families retain artifact bytes | Canonical artifacts and baseline hash regressions |
| M03 | Both minimalist preview routes render the intended family and generated source | Route, DOM, style, screenshot, and artifact checks |
| M04 | Fresh-process Input addition retains the saved minimalist preset | Independent CLI process and installed-source checks |
| M05 | All fifteen minimalist cases preserve manager/lock/runtime ownership and build | Per-case measured provenance, audit, and build outcomes |
| M06 | Existing-shadcn theme merge is non-destructive and idempotent for all four managers | Before/after source, CSS, configuration, and lock assertions |
| M07 | Local edits, dry-run, no-op, and failure protections remain effective | Focused regression tests plus existing safety suites |
| M08 | Required automated state, contrast, keyboard, motion, forced-colors, and reflow checks pass; unperformed manual review is explicitly pending | State tests, measured pairs, screenshots, review checklist, and accurate coverage labels |
| M09 | All existing coverage and the extended foundation gate pass | Actual counts, manager/browser/runtime versions, source revision, dirty-tree flag, statuses, and evidence paths |

The implementation plan must name concrete tasks, files/interfaces, failing-then-passing verification, the final review focus, and how results are retained. It must not predict successful measurements or write success evidence before the run. Keep the existing toolchain pins; record any available local Node/browser deviation separately from hosted CI.

Conversational approval authorized this specification only. Written-spec approval permits invoking writing-plans. Implementation begins only after the user reviews the resulting plan and selects its execution method. Push, PR, publication, and merge remain separate integration decisions.

## Project references

- [Product requirements](../../01-product-requirements.md): style differentiation, persistent defaults, preview parity, and the alpha boundary.
- [Style and accessibility contract](../../03-components-styles-accessibility.md): minimalist direction, component semantics, and evidence policy.
- [Delivery plan](../../07-delivery-plan.md): F03/F09 and the M2 direction.
- [Installation and theme merging](../../10-installation-and-theme-merging.md): existing-shadcn behavior and source ownership.
- [Bun support evidence](../../evidence/bun-consumer-support.md): current manager/runtime matrix and verification limits.
