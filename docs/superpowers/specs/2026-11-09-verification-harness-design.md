# Verification harness

Sub-project 1 of the 0.7.3 work. It makes silent styling and accessibility
regressions fail a check before new components multiply them. The 0.7.3
components, variants and editor improvements are later sub-projects, each
with its own spec; they join this harness when they are added.

## Intent

The 0.7.2 follow-up found four defects by eye: Table Head lost its styles
because a prop shadowed a closure name, Accordion showed both icons because
the style scoper dropped a rule, the Toast close button squeezed its "Dismiss"
text, and the glass Toast's scroll viewport clipped its shadow. Each was
measurable. This harness measures them, plus focus visibility, target size,
forced colors and axe rules, for every catalog recipe specimen.

Decisions taken in brainstorming:

- Checks fail only on measured defects. Screenshots are saved as review
  evidence and never compared against committed baselines, matching the
  repository's existing browser tests.
- The browser audit runs in the foundation gate, not as a separate PR job.
- Defects found on the first run are fixed in this sub-project. The gate lands
  green with no known-failures list.
- Layered approach: static checks at build and unit-test time, one browser
  suite over a generated audit page.

## 1. Static checks

### Catalog style lint

`scripts/sync-catalog.mjs` (run by `pnpm build:packages`) parses every catalog
stylesheet with PostCSS and postcss-selector-parser and stops the build when a
selector breaks these rules. Rules inside `@keyframes` are exempt.

- Component stylesheets, `packages/catalog/src/styles/<component>/<family>.css`:
  every selector names a `data-slot` value defined by that component's Radix
  template or Base UI template, or a component-owned marker attribute
  `data-<component>-…`.
- Family stylesheets, `packages/catalog/src/styles/<family>.css` and
  `liquid-glass-lab.css`: every selector names a `data-slot` value defined by
  some catalog template.

The error names the file, the selector and the broken rule, for example
`accordion/ombelle.css: "[data-icon='plus']" names no accordion slot or
marker`. The build script runs before the compiler is built, so it extracts
template slots itself; a unit test asserts that its slot list equals the
compiler's `recipeTemplateSlots` for every template and edition, so the lint
and the scoper cannot disagree.

A read-only probe on `main` at 29c325d found no violations in either rule, so
the lint lands passing and compiler output does not change.

### Recipe source shadowing lint

A unit test in `packages/compiler/test/` compiles the default catalog draft of
every component in all five families and both editions, then parses each
generated `.tsx` component artifact with the TypeScript compiler API (the root
`typescript` dev dependency). It fails when:

- a declaration inside `createScopedPrimitives` (parameter, destructured
  binding, variable or function) reuses one of the factory's own names: its
  parameters `recipeScope` and `recipeInstance` or its local constants;
- a declaration elsewhere in the generated module reuses a wrapper name:
  `scope`, `instance` or `instanceId`.

The failure names the component, family, edition, identifier and line. It
runs in `pnpm test:unit`, so the existing CI checks job enforces it.

### No new compiler runtime error

The catalog is the only source of recipe styles and the build lint covers it,
so the compiler gains no runtime error and keeps its deterministic output.

## 2. Audit page and browser measurements

### Audit page

`pnpm generate:preview` also writes one audit page per family and edition to
`apps/preview`, served at `/audit/<family>/<edition>/?mode=light|dark`.

- Families: flat, minimalist, neo-brutalism, ombelle, liquid-glass. Editions:
  radix, base. Each page renders all 29 catalog components.
- Each specimen is the catalog's default draft for that component (the draft
  `createCatalogDraft` gives the component editor), compiled with
  `compileComponentRecipe` against the family's built-in preset. The page
  loads only the recipe artifacts: no editor stage CSS.
- Glass pages draw the backdrop that `glassPresetBackdrop` returns for the
  built-in liquid glass preset in that mode, as the editors do.
- Each specimen sits in a `section[data-audit="<component>"]` with a heading
  naming it and enough width for its real layout. `main` gets
  `data-ready="true"` once fonts and specimens have loaded.

### Suite

`tests/e2e/specimen-audit.spec.ts`, run by `playwright.specimen-audit.config.ts`
(preview server only, headless Chromium, `reducedMotion: 'reduce'`,
`OMBELLE_BROWSER_CHANNEL` honoured like the other configs). Script:
`pnpm test:specimen-audit`.

- One test per family × edition × mode: 20 tests, 580 specimens. Every
  failure message names component, family, edition, mode and check.
- Before measuring a specimen, the suite opens its overlay with the real
  trigger (Dialog, Alert Dialog, Sheet, Popover, Dropdown Menu, Select, Toast),
  focuses the Tooltip trigger, and expands the first Accordion item. All six
  measurements run with the overlay open; the suite then closes it with
  Escape, checks that focus returned to the trigger, and moves on.

### Measurements

Each is a pure function in `tests/helpers/specimen-audit.ts` that returns a
list of findings; any finding fails the test.

1. **Squeezed or overflowing content.** Text inside a slot extends past that
   slot's box, or a control's content box is wider than its border box.
   Elements styled with `text-overflow: ellipsis` are exempt.
2. **Clipped shadows and focus rings.** The painted box is the border box
   plus the `box-shadow` extent (offset, blur, spread of every non-inset
   shadow) and the `outline` extent (width plus offset). A finding is reported
   when it crosses the padding box of an ancestor, up to the specimen
   section, with `overflow` other than `visible`, a `clip-path`, or
   `contain: paint`.
3. **Focus visible.** The suite tabs through every focusable element in the
   specimen, including open overlays. For each, it screenshots the element's
   padded box unfocused and focused in the same run and decodes both in the
   page with a canvas. A finding is reported unless the changed pixels have at
   least 3:1 contrast with the pixels they replace and cover at least the
   element's 1 CSS px perimeter (WCAG 2.4.7 and 1.4.11).
4. **Target size.** Every interactive element is at least 24×24 CSS px
   (WCAG 2.5.8). Inline links inside running text are exempt.
5. **Forced colors.** A second pass, light mode only, emulates
   `forced-colors: active`. Every focused control has a solid outline, every
   surface with a border keeps a visible border, no element keeps a
   `backdrop-filter`, and no text is transparent.
6. **Axe.** `@axe-core/playwright` scans each section with the `wcag2a`,
   `wcag2aa`, `wcag21a`, `wcag21aa` and `wcag22aa` tags, colour contrast
   included.

Screenshots of every specimen, and of every open overlay, are saved to
`.artifacts/specimen-audit/<family>/<edition>/<mode>/<component>.png`.

## 3. Gate, self-tests, fixes and docs

### Foundation gate and evidence

- `scripts/foundation-evidence.mjs` adds `test:specimen-audit` to the
  `consumers` group, after `generate:preview`, and `specimen-audit.json` to
  that group's `evidenceFiles`. The `all` group gains the step too.
- The suite writes `.artifacts/specimen-audit.json`: Node and browser
  versions, the family × edition × mode matrix, the specimen count per check,
  and the failure count.
- Evidence validation rejects the file when it is missing, when any of the 20
  configurations is absent, when fewer than 29 specimens were measured in a
  configuration, or when the failure count is not zero.

### Self-tests for the checks

`tests/e2e/specimen-audit-checks.spec.ts` loads a small static fixture page
with one planted defect per check and a clean twin of each:

- a shadow clipped by an `overflow: auto` parent;
- a button with no focus indicator;
- text squeezed inside a 2rem button;
- a 16px target;
- a bordered surface that loses its border in forced colors;
- an axe violation (an unnamed button).

Each check must report its defect and report nothing on the clean twin. The
self-test runs in the same config before the audit.

### Fixing what the checks find

Each defect found on the first full run is fixed in the affected family
stylesheet, in its own `fix(catalog): …` commit that names the component,
family and check. Fixes that change installed recipe output update
`packages/compiler/test/fixtures/stable-family-hashes.json` and
`style-baseline.json` in the same commit. The sub-project is complete only
when all 20 configurations pass.

### Documentation

- `docs/evidence/specimen-audit.md` (new): measured environment, what each
  check measures and its WCAG criterion, defects found and their fixes, and
  limits: no NVDA or VoiceOver, no native 200 percent text zoom, Chromium
  only, built-in presets only, and no consuming application.
- `docs/accessibility-review.md`: an "Automated checks" section listing what
  the audit automates and stating that the manual screen-reader passes remain
  required.
- `docs/03-components-styles-accessibility.md`: the component definition of
  done requires a passing specimen audit and catalog style lint.
- `README.md`, `docs/foundation-local-usage.md` and the `AGENTS.md` command
  list: the `pnpm test:specimen-audit` command.
- `CHANGELOG.md` under Unreleased: the harness, and each catalog fix that
  changes installed output.
- Website, `apps/www/src/site/docs/guides.tsx`: one sentence in the
  verification step saying the catalog's built-in preset specimens are
  checked automatically in Chromium for focus visibility, target size, forced
  colors and axe rules, keeping the reminder that applications verify their
  own pages.

## Out of scope

- Toast pause, duration and single announcement: sub-project 6.
- Contrast-aware backdrop pick, dark-mode lab ink, reduced-transparency
  toggle and the other editor work: sub-project 7.
- New components and variants: sub-projects 2 to 6.
- Committed pixel baselines and non-Chromium browsers.
- Releases, deployment and pushes.

## Verification

Run `pnpm build:packages`, `pnpm typecheck`, `pnpm test:unit`,
`pnpm test:integration`, `pnpm generate:preview` and
`pnpm test:specimen-audit`. Report the environment of each run. Do not treat
historical evidence as a new passing run. `pnpm check:foundation` is reported
separately if its registry and toolchain requirements are not available.
