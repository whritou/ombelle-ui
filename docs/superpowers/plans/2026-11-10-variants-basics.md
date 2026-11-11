# Variants batch 6a Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add the 0.7.3 board variants to Button, Badge, Alert, Card, Avatar and Accordion in both editions and all five families, with recipe fields, specimens, scenes, browser tests and docs. No default output changes.

**Architecture:**
- Each variant is an optional prop that sets a `data-*` attribute on an existing slot, or adds a new part with its own `data-slot`.
- One scratchpad generator appends the board's variant CSS to every family stylesheet, between `/* 0.7.3 variants */` markers. Rerunning it replaces that block.
- Recipe fields go in `schemas/`, specimens in `recipe-specimen.ts`, and the CLI 0.7.3 gate in `apps/www/src/snapshots/install-command.ts`.
- Card gains `templates/base/card.tsx`, because `CardGroup` uses each edition's RadioGroup.

**Tech Stack:**
- TypeScript ES modules, React 19, lucide-react 1.55.0.
- Radix edition: `@radix-ui/react-radio-group` (the existing pin). Base UI edition: `@base-ui/react` 1.9.0.
- Vitest, Playwright.

**Spec:** `docs/superpowers/specs/2026-11-10-variants-basics-design.md`

## Global Constraints

- **Toolchain and branch:** Node 24.19.0, pnpm 11.25.0 (`corepack pnpm …`). Branch `feat/variants-basics-073`, stacked on `feat/calendar-073` (PR #105).
- **Commits:** Conventional Commits, no `codex` prefix.
- **Sources:**
  - Edit `schemas/`, never the generated contracts copy, and catalog sources, never `generated.ts`.
  - Run `corepack pnpm build:packages` after package changes, and `pnpm generate:preview` before any preview or e2e run.
- **No breaking change:** every new prop is optional, and leaving it out renders exactly what is rendered today. `packages/compiler/test/fixtures/stable-family-hashes.json` must be unchanged after `corepack pnpm exec tsx scripts/record-stable-hashes.ts`.
- **Board source:** sections 01–04, 11 and 13 of `project/<Family>073Variants.dc.html`, in the session copy under `scratchpad/artifact-files/0200fefe-623b-4550-9795-0ba26acade31/project/`. The variant CSS is the same in all families.
- **Token mapping** from the board: `--pri` → `--primary`, `--pri-fg` → `--primary-foreground`, `--des` → `--destructive`, `--ok` → `--success`, `--warn` → `--warning`, `--info` → `--info`, `--fg` → `--foreground`, `--mut` → `--muted`, `--mut-fg` → `--muted-foreground`, `--bd` → `--border`, `--bw_` → `--border-width`, `--rs_` → `calc(var(--radius) * 0.5)`.
- **Exact copy:**
  - The Alert dismiss button is named `Dismiss`.
  - `AvatarOverflow` shows `+{count}` and is named `{count} more`.
  - The default `AvatarFallback` `delayMs` is `600`.
- **CSS rules:**
  - One `data-slot` per selector, with logical properties.
  - Every family has a forced-colours block.
  - Card lift only outside `prefers-reduced-motion: reduce`.
  - Targets of at least 24px.
  - The glass ring is 2px `--foreground` with no gap, and no glass selector names two slots (use `:is()` and `:has()`).
- **Do not resize** Button or Input in any family.
- **Install gate:** any recipe using a field or value added here requires CLI `0.7.3`.
- **Reruns (user instruction):**
  - Run only tests a change can affect, and do not re-run passing tests whose code did not change.
  - Audit only `OMBELLE_AUDIT_COMPONENTS=button,badge,alert,card,avatar,accordion`.
  - Stop any preview server started by the browser pane before e2e runs.
- **Remote actions:** no push, release or deploy without asking.
- **Files with backslashes** in regex or schema patterns are written with Write or Edit, never a shell heredoc.

## Review Focus

- **A `CardLink` card with a second link or button inside** (for example a "Share" button): clicking that control activates it, not the card link. Task 4 pins this with a test on a card holding a nested button.
- **Button `loading` toggled on before first paint**, with `loading` true at mount: no `min-inline-size` is measured from an empty box, and the style is only set when the width was measured while not loading. Task 2 pins it.
- **`CardGroup` inside a `<form>`:** the selected value is submitted under `name` in both editions. Task 6 pins it with a form fixture.
- **`Accordion icon="plus"` on an item opened by default:** it shows the minus at first render, with no flash of plus. Task 5 pins it with a server-render test.
- **Badge soft contrast in dark mode** for `warning` and `success`, the lightest intents: they reach at least 4.5:1, and the audit fails otherwise. Task 7 checks it and records any darkened mix.

---

### Task 1: Recipe fields and the install gate

**Files:**
- Modify:
  - `schemas/component-recipe.schema.json`, in the props of these branches:
    - **badge:** `appearance` enum `solid|soft|outline`, no default; `variant` gains `success`, `warning` and `info`.
    - **alert:** `dismissible` boolean, `actions` boolean, `layout` enum `default|compact`.
    - **card:** `mode` enum `static|link|options|media`.
    - **avatar:** `shape` enum `circle|square`; `overflow` integer from 0 to 99.
    - **accordion:** `appearance` enum `bordered|flush`; `icon` enum `family|chevron|plus`.
    - None of these fields has a schema default, so existing recipes stay byte-identical.
  - `schemas/recipe.schema.json:28`: Button `variant` gains `link-destructive`.
  - `apps/www/src/snapshots/install-command.ts`:
    - add `variantRecipeFields073: Record<string, readonly string[]>` with the new keys per component, and `variantRecipeValues073` with `badge.variant` (`success`, `warning`, `info`);
    - `componentRecipeInstallBlocked` returns true below `displayCatalogMinimumCli` when a recipe uses one of them;
    - `recipeInstallBlocked` does the same when Button `variant` is `link-destructive`;
    - `installableRecipeInstallNotice` returns `displayCatalogInstallNotice` for these recipes.
  - Run `node scripts/sync-schema.mjs`.
- Test: `packages/contracts/test/component-recipe.test.ts` and `apps/www/src/snapshots/install-compatibility.test.tsx`.

**Interfaces:**
- Produces the recipe prop names above, which Task 6 reads.

- [ ] **Step 1: Write the failing tests.**
  - Each new field validates with each allowed value.
  - `overflow: 100` and `appearance: 'raised'` are rejected.
  - `componentRecipeInstallBlocked({ component: 'badge', props: { appearance: 'soft' } }, { version: '0.7.2' })` is `true`, and the same at `0.7.3` is `false`.
  - A Badge recipe with only `variant: 'default'` at `0.7.2` is `false`.
  - A Button recipe with `link-destructive` at `0.7.2` is blocked.
- [ ] **Step 2: Run** `corepack pnpm exec vitest run packages/contracts apps/www/src/snapshots/install-compatibility.test.tsx`. Expected: FAIL.
- [ ] **Step 3: Implement** the schema fields, run the sync, then add the gate.
- [ ] **Step 4: Run** the same command. Expected: PASS.
- [ ] **Step 5: Commit** with `feat(contracts): add the batch 6a recipe fields and their 0.7.3 gate`.

### Task 2: Button

**Files:**
- Modify:
  - `packages/catalog/src/templates/button.tsx` and `base/button.tsx`.
  - `styles/button/*.css`, through the generator.
- Create: `scratchpad/gen-variants-6a.mjs`. It takes the repository root as its argument and holds one function per component, `button(family)`, `badge(family)` and so on, each returning a CSS string. It writes `/* 0.7.3 variants */ … /* end 0.7.3 variants */` at the end of `styles/<id>/<family>.css`, replacing any earlier block.
- Test: `packages/catalog/test/button-variants.test.ts`.

**Interfaces:**
- `ButtonProps['variant']` gains `'link-destructive'`.
- No new exports.

**Behaviour:**
- A `useLayoutEffect` on `[busy]`:
  - When `busy` becomes true, set `style.minInlineSize` to the width measured by the previous effect run, which `getBoundingClientRect().width` took while not busy. Keep that width in a ref updated in each non-busy run.
  - When `busy` becomes false, clear the style.
  - If no width has been measured, as with `loading` true at mount, set nothing.
  - The consumer's `style` prop is merged, never replaced.
- **Development warning:** `size` `icon` or `icon-sm`, no `aria-label`, no `aria-labelledby`, not `asChild` or `render`, and `NODE_ENV !== 'production'` together log, once per mount:
  `console.warn('Button: an icon-only button needs aria-label or aria-labelledby.')`
- **CSS for `[data-variant='link-destructive']`:** a transparent background and border, no shadow, `color: var(--destructive)`, an underline with `text-underline-offset: 4px`, and `padding-inline: 4px`. The forced-colours rule gives `color: LinkText`.

- [ ] **Step 1: Write the failing tests**, with jsdom and React Testing Library, run in both editions through the existing `base-templates` loader pattern:
  - `keeps the measured width while loading`: render with `loading={false}`, stub `getBoundingClientRect` to `{ width: 120 }`, rerender with `loading`, and expect `style.minInlineSize === '120px'`. Rerender with `loading={false}` and expect an empty string.
  - `measures nothing when loading at mount`: expect an empty `minInlineSize`.
  - `renders link-destructive`: expect `data-variant` to be `link-destructive`.
  - `warns for an unnamed icon button`: the warning is called once. With an `aria-label`, it is never called.
  - **Stylesheet assertion:** every family's `button/<family>.css` contains `[data-slot='button'][data-variant='link-destructive']`.
- [ ] **Step 2: Run** `corepack pnpm exec vitest run packages/catalog/test/button-variants.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement** the templates, and the generator's `button` section. Run `node <scratchpad>/gen-variants-6a.mjs .`, then `corepack pnpm build:packages`. Expected: the style lint passes.
- [ ] **Step 4: Run** the test. Expected: PASS.
- [ ] **Step 5: Commit** with `feat(catalog): keep Button width while loading and add link-destructive`.

### Task 3: Badge and Alert

**Files:**
- Modify:
  - `templates/badge.tsx` and `templates/alert.tsx`. Badge and Alert have no Base UI template; the edition shares the Radix one.
  - `styles/badge/*.css` and `styles/alert/*.css`, through the generator.
  - `component-slots.ts`: `alert-dismiss` and `alert-actions`.
  - `index.ts`: `extraDependencies.alert` gains `lucide-react`.
- Test: `packages/catalog/test/badge-variants.test.ts` and `alert-variants.test.ts`.

**Interfaces:**
- **Badge:**
  - `BadgeProps['appearance']?: 'solid' | 'soft' | 'outline'`, which sets `data-appearance` only when it is given.
  - `variant` gains `'success' | 'warning' | 'info'`.
- **Alert:**
  - `AlertProps` gains `onDismiss?: () => void`, `dismissLabel?: string` (default `'Dismiss'`) and `layout?: 'default' | 'compact'`. `data-layout` is set only for compact.
  - New export `AlertActions(props: React.ComponentProps<'div'>)`.
  - New export `AlertDismiss(props: React.ComponentProps<'button'> & { label?: string })`, which renders `<button type="button" data-slot="alert-dismiss" aria-label={label ?? 'Dismiss'}>` with a lucide `X` icon (`aria-hidden`).
  - When `onDismiss` is set, Alert appends `<AlertDismiss label={dismissLabel} onClick={onDismiss} />`. A child `AlertDismiss` also sets the three-column grid, through `:has([data-slot='alert-dismiss'])`.
  - Ruling taken while planning: the spec puts the dismiss button inside Alert. Exporting it as well lets recipe specimens, which cannot hold functions, render it.

**CSS** (board sections 02 and 03):
- **Badge:**
  - The soft mixes per intent: default and `info` at 14 %, `success` at 16 %, `warning` at 18 % and `destructive` at 14 %. The text mixes are 70, 65, 60, 70 and 75 % with `--foreground`.
  - Outline destructive: a transparent background, with `--destructive` text and border.
- **Alert:**
  - With a dismiss button, the grid is `20px minmax(0,1fr) auto`.
  - The dismiss button is 28px round, sits in column 3 and spans two rows.
  - Actions sit in column 2, with an 8px gap and an 8px top margin.
  - Compact: `grid-template-columns: 18px minmax(0,1fr) auto`, `align-items: center` and `padding: 8px 12px`.

- [ ] **Step 1: Write the failing tests.**
  - **Badge:** `data-appearance` for `soft` and `outline`; no attribute when the prop is left out; and the stylesheet contains `[data-slot='badge'][data-appearance='soft'][data-variant='warning']` in every family.
  - **Alert:** the button with the name `Dismiss` is present only with `onDismiss`; a click calls it once; `dismissLabel="Close notice"` renames it; `AlertActions` has `data-slot='alert-actions'`; and `layout="compact"` sets `data-layout`.
- [ ] **Step 2: Run** both files. Expected: FAIL.
- [ ] **Step 3: Implement** the templates and the generator sections, run the generator, then `build:packages`.
- [ ] **Step 4: Run** both files. Expected: PASS.
- [ ] **Step 5: Commit** with `feat(catalog): add soft Badge and dismissible, compact Alert`.

### Task 4: Card

**Files:**
- Modify: `templates/card.tsx`.
- Create: `templates/base/card.tsx`, the same file with Base UI `RadioGroup` and `Radio` from `@base-ui/react`.
- Modify:
  - `component-slots.ts`: `card-link`, `card-group`, `card-option`, `card-option-check` and `card-media`.
  - `index.ts`: `extraDependencies.card = ['@radix-ui/react-radio-group', 'lucide-react']`.
  - `styles/card/*.css`, through the generator.
  - `packages/catalog/test/base-templates.test.ts`: add the card edition.
- Test: `packages/catalog/test/card-variants.test.ts`.

**Interfaces (the same names in both editions):**
- `CardLink(props: React.ComponentProps<'a'> & { asChild?: boolean })`, with `data-slot="card-link"`. The Base UI edition uses `render` instead of `asChild`, as its Button does.
- `CardGroup(props)`, with `data-slot="card-group"`:
  - props `value`, `defaultValue`, `onValueChange(value: string)`, `name`, `disabled`, `required`, `orientation`, `aria-label`, `aria-labelledby`, `className` and `children`;
  - Radix `RadioGroupPrimitive.Root`, or Base UI `RadioGroup`.
- `CardOption(props: { value: string; title: React.ReactNode; description?: React.ReactNode; disabled?: boolean; className?: string; children?: React.ReactNode })`:
  - a radio item rendered as the card surface, with `data-slot="card-option"` and `data-state` or `data-checked`, normalised to `data-checked` in both editions;
  - the title is in a `<span data-slot="card-title">`;
  - the description has an id from `useId`, set as `aria-describedby`;
  - the check is `<span data-slot="card-option-check" aria-hidden="true">` with lucide `Check`, shown only when checked.
- `CardMedia(props: React.ComponentProps<'img'> | { children: React.ReactNode; className?: string })`, with `data-slot="card-media"`. An `<img>` without `alt` is a type error: `alt` is required in the image overload.

**CSS** (board section 04):
- **Link card:**
  - `[data-slot='card']:has([data-slot='card-link'])` takes `position: relative`, and lifts by `translateY(-2px)` on hover, inside `@media (prefers-reduced-motion: no-preference)`.
  - `[data-slot='card-link']::after` uses `inset: 0` and `content: ''`.
  - Other links, buttons and `card-description` inside it take `position: relative; z-index: 1`.
  - The focus ring is on `:has([data-slot='card-link']:focus-visible)`.
- **Card option:**
  - When checked: `border-color: var(--primary)` and `box-shadow: 0 0 0 3px color-mix(in oklab, var(--primary) 25%, transparent)`.
  - The check is 22px round, with `--primary` and `--primary-foreground`.
- **Media card:** `:has([data-slot='card-media'])` sets `padding: 0; overflow: hidden`. The media is 96px block size, and the other parts take 16px padding.

- [ ] **Step 1: Write the failing tests**, in both editions:
  - `CardGroup` renders `role="radiogroup"` with radios named by their titles and described by their descriptions.
  - `defaultValue` checks the matching option, and `data-checked` and the check icon appear only on it.
  - `CardLink` renders an anchor with `data-slot='card-link'`.
  - A nested `<button>` inside a link card is not inside the anchor.
  - The stylesheet contains `[data-slot='card-link']::after` and a `prefers-reduced-motion` guard around the lift.
  - `CardMedia` renders an `img` with its `alt`.
- [ ] **Step 2: Run** the file. Expected: FAIL.
- [ ] **Step 3: Implement** both templates and the generator section, run the generator, then `build:packages`.
- [ ] **Step 4: Run** the file and `base-templates.test.ts`. Expected: PASS.
- [ ] **Step 5: Commit** with `feat(catalog): add Card link, option group and media`.

### Task 5: Avatar and Accordion

**Files:**
- Modify:
  - `templates/avatar.tsx`, `base/avatar.tsx`, `templates/accordion.tsx` and `base/accordion.tsx`;
  - `component-slots.ts`: `avatar-overflow`;
  - `styles/avatar/*.css` and `styles/accordion/*.css`, through the generator.
- Test: `packages/catalog/test/avatar-variants.test.ts` and `accordion-variants.test.ts`.

**Interfaces:**
- **Avatar:**
  - `AvatarProps['shape']?: 'circle' | 'square'`, which sets `data-shape` only when it is `square`.
  - `AvatarFallback` takes `delayMs = 600`. Base UI maps it to `delay`.
  - New `AvatarOverflow(props: React.ComponentProps<'span'> & { count: number; label?: string; size?: 'sm' | 'default' | 'lg' })`, which renders `role="img"`, `aria-label={label ?? \`${count} more\`}` and the text `+{count}`.
- **Accordion:**
  - `AccordionProps` gains `appearance?: 'bordered' | 'flush'` and `icon?: 'chevron' | 'plus'`. Each sets its `data-*` attribute on the root only when it is given.
  - A React context passes `icon` to `AccordionTrigger`:
    - `chevron` renders only `ChevronDownIcon`;
    - `plus` renders `PlusIcon` and `MinusIcon`, both with `data-accordion-icon`, and CSS shows the minus under `[data-state='open']`, so the first render needs no state;
    - when `icon` is undefined, the trigger renders exactly today's two icons.

**CSS:**
- **Avatar:** the square shape takes the radius `calc(var(--radius) * 0.5)`. In a group, avatars overlap by `margin-inline-start: -10px`, except the first, and carry `outline: 2px solid var(--card)`. The overflow uses `--muted` with `--foreground`.
- **Accordion flush:** follows the board's `.acc.fl` rules, mapped to slots. Under `[data-icon='plus']`, the minus is hidden when closed and the plus when open.

- [ ] **Step 1: Write the failing tests.**
  - **Avatar:**
    - `AvatarOverflow count={4}` is named `4 more` and shows `+4`.
    - The fallback stays absent at 599 ms and is present at 600 ms with a never-loading image, using fake timers.
    - `shape="square"` sets `data-shape`.
  - **Accordion:**
    - `icon="chevron"` renders one svg in the trigger.
    - Without `icon`, two svgs render.
    - `icon="plus"` with `defaultValue` open, rendered with `renderToString`, contains `data-state="open"` on the trigger and both the plus and minus icons. The stylesheet shows only the minus under open.
    - The stylesheet contains `[data-slot='accordion'][data-appearance='flush']`.
- [ ] **Step 2: Run** both files. Expected: FAIL.
- [ ] **Step 3: Implement** the templates and the generator sections, run the generator, then `build:packages`.
- [ ] **Step 4: Run** both files. Expected: PASS.
- [ ] **Step 5: Commit** with `feat(catalog): add square and overflow Avatar, flush Accordion and icon choice`.

### Task 6: Specimens, hashes, scenes and browser tests

**Files:**
- Modify:
  - `packages/compiler/src/recipe-specimen.ts`, the `badge`, `alert`, `card`, `avatar` and `accordion` cases. Each new prop is passed only when it is present in the recipe:
    - **badge:** `appearance` is passed through.
    - **alert:** `dismissible` appends a child `AlertDismiss`, because specimen props cannot hold functions. `actions` adds `AlertActions` with `trigger('button', 'Undo')`; specimens never import another component. `layout` is passed through.
    - **card:**
      - `link` puts `CardLink href="#card"` in the title;
      - `options` builds a `CardGroup aria-label={content.title}` with three options, `Starter`, `Team` and `Enterprise`, and `defaultValue: 'team'`;
      - `media` adds a `CardMedia` with a decorative gradient child.
    - **avatar:** `shape` is passed through. `overflow` above 0 wraps the avatar in an `AvatarGroup` named `Reviewers`, with an `AvatarOverflow count={overflow}`.
    - **accordion:** `appearance` is passed; `icon` is passed unless it is `family`.
  - `fixtures/shared/edition-scenario*.tsx`: a `VariantsBasicsScenario` with every variant, including a `<form>` holding a `CardGroup name="plan"` and a submit output.
  - `apps/preview/src/scenes/projects.tsx`: soft row Badges, an AvatarGroup with overflow, and a featured `CardLink` card.
  - `apps/preview/src/scenes/settings.tsx`: a `CardGroup` plan picker, a dismissible Alert that moves focus to the "Plan" heading when it is dismissed, and a flush Accordion with plus icons.
  - The gallery and site catalog entries for the six components.
- Test:
  - `packages/compiler/test/variants-basics.test.ts`;
  - `tests/e2e/variants-basics.spec.ts`;
  - the `specimen-audit.spec.ts` `overlays` map needs nothing, since none of these open overlays.

**Interfaces:**
- Consumes the Task 1 field names, and the Task 2 to 5 exports.

- [ ] **Step 1: Write the failing tests.**
  - **Compiler:** each new field compiles to its prop, deterministically across two runs, in all five families, and in both editions for card. The default recipe of each component compiles byte-identical to `HEAD~` output, as checked through `stable-family-hashes.json`.
  - **e2e**, in both editions:
    - **CardGroup:** Tab enters once, ArrowRight selects `Enterprise`, Space keeps it, and submitting shows `plan=enterprise`.
    - **CardLink:** a click on the description navigates to `#featured`. A drag over the description selects text and does not navigate. The nested "Share" button click does not navigate. The keyboard focus ring is on the card: its outline width is at least 2px.
    - **Alert:** Dismiss removes the alert, and focus lands on the "Plan" heading.
    - **Button `loading`:** the width after toggling is at least the width before, and `min-inline-size` is empty after loading ends.
    - **Avatar:** a broken-src avatar shows its initials after 600 ms, and a data-URL image shows no initials.
    - **Accordion:** the plus trigger shows one visible icon, a minus when open.
- [ ] **Step 2: Run** `corepack pnpm exec vitest run packages/compiler/test/variants-basics.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement** the specimens, fixtures and scenes. Then run `build:packages`, `pnpm generate:preview` and `corepack pnpm exec tsx scripts/record-stable-hashes.ts`. Expected: `git diff --exit-code packages/compiler/test/fixtures/stable-family-hashes.json` exits 0.
- [ ] **Step 4: Run** the compiler test, then `corepack pnpm exec playwright test tests/e2e/variants-basics.spec.ts`. Expected: PASS in both editions.
- [ ] **Step 5: Commit** with `feat(preview): show the batch 6a variants in specimens, scenes and tests`.

### Task 7: Audit, board comparison and size

**Files:**
- Modify only what the audit finds: the generator sections, then the regenerated CSS. Pin each fix in `packages/catalog/test/specimen-audit-fixes.test.ts`.
- Create: `docs/evidence/variants-basics-073.md`.

- [ ] **Step 1: Run** `OMBELLE_AUDIT_COMPONENTS=button,badge,alert,card,avatar,accordion corepack pnpm test:specimen-audit`. The audit must include specimens for each new recipe field; if it audits only default recipes, add the variant recipes to the audit list for these components and record a ruling.
  - Expected: every non-glass configuration passes. Each failure is fixed through its generator section, with its pin test written first, and only the failing families are re-run.
- [ ] **Step 2: Compare** screenshots against board sections 01–04, 11 and 13 per family, and write the comparison table, as in `calendar-073.md`.
- [ ] **Step 3: Measure** with `node scripts/measure-www-first-load.mjs` and record the three routes against the sub-project 5 numbers (789.7, 238.8 and 794.5 kB).
- [ ] **Step 4: Commit** with `fix(catalog): make the batch 6a variants pass the specimen audit`, or `docs: record batch 6a evidence` when there is no fix.

### Task 8: Documentation

**Files:**
- Modify:
  - `docs/components/{button,badge,alert,card,avatar,accordion}.md`: API, accessibility and recipe fields. The Alert page shows focus moving after a dismiss, and the Button page shows icon-only use with Tooltip.
  - `docs/accessibility-review.md` and `CHANGELOG.md`, under 0.7.3.
  - The README variant notes.

- [ ] **Step 1: Write** the docs. Every claim matches a test or evidence row.
- [ ] **Step 2: Run** `corepack pnpm exec vitest run packages/cli/test/liquid-glass-cli.test.ts` only if the README's component list changed. Expected: PASS.
- [ ] **Step 3: Commit** with `docs: document the batch 6a variants`.
