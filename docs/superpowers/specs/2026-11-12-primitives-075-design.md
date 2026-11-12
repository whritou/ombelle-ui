# Primitives: Toggle, Collapsible, Scroll Area, Button Group and Item

Sub-project 1 of the 0.7.5 work. It adds five catalog components in the Radix and Base UI editions and all five style families, with component-editor recipes, and replaces the website's hand-built equivalents in the editors and docs.

## Intent

The 0.7.5 design artifact (https://claude.ai/artifact/1FMRGWoyJSwht9wATT838U, page "0.7.5 proposal", boards `project/<Family>08Components.dc.html`, sections 04 to 08) proposes eight components that are not on main after 0.7.4. Their content is the same in every family; only the family styling differs.

Decisions taken in brainstorming (12 November 2026):

- **Decomposition:** the 0.7.5 work ships as four sub-projects, each with its own spec, plan, branch and PR, stacked in this order:
  1. Primitives (this spec): Toggle, Collapsible, Scroll Area, Button Group, Item.
  2. Editor inputs: Number Input, Color Picker and Color Picker Pair (`2026-11-12-editor-inputs-075-design.md`).
  3. Code Block (`2026-11-12-code-block-075-design.md`).
  4. Variants for seven existing components (`2026-11-12-variants-075-design.md`).
- **Website scope:** each sub-project replaces the hand-built equivalents in the editors (preset, Button and component editors, Get code dialog) and the docs pages (component pages, guides, playground). The marketing home page (journey, style morph, home sections) keeps its own look.
- **Scrollbars in shipped lists:** Command, Combobox, Select and Sheet get family `scrollbar-color` and `scrollbar-width` rules on their existing scrolling slots. They are not wrapped in Scroll Area, so they gain no dependency and no structure.

The catalog has 45 components on main (the board's "43 today" predates two later additions). This sub-project brings it to 50. Installing the new components needs CLI 0.7.5.

## Shared conventions (all four sub-projects)

- **Files per component:**
  - Radix template `packages/catalog/src/templates/<id>.tsx` and Base UI template `templates/base/<id>.tsx`. A component without a primitive has one template that serves both editions.
  - `packages/catalog/src/styles/<id>/<family>.css` for `ombelle`, `flat`, `minimalist`, `neo-brutalism` and `liquid-glass`, taken from that family's 0.7.5 board.
  - Registration in `packages/contracts/src/component-ids.ts`, `style-families.ts`, `packages/catalog/src/component-slots.ts`, `index.ts` and `expansion-examples.ts`.
  - The recipe branch in `schemas/` (the TypeScript copies regenerate with `pnpm build:packages`), a specimen in `packages/compiler/src/recipe-specimen.ts`, and a component editor entry using the existing control types.
  - Preview scene use in `apps/preview`, a section in `fixtures/shared/preset-gallery.tsx`, `docs/components/<id>.md` and check rows in `docs/accessibility-review.md`.
- **Parts:** names follow shadcn where an equivalent exists. Every part forwards native props, refs, `className` and `style`, and carries a `data-slot` named after the part.
- **Style rules:**
  - Every selector names one slot or a marker of its component, so the catalog style lint passes.
  - Liquid glass: no selector names two slots; parent states go through `:is()` and `:has()`. The focus ring is 2px `--foreground` with no offset. Liquid glass stays experimental, and its findings do not block the release.
  - Forced colours keep borders and outlines, and on, pressed and selected states use `Highlight`.
  - Every interactive target is at least 24 × 24 px.
  - `prefers-reduced-motion: reduce` removes transitions and animations.
- **Board fidelity:** computed styles from the board files are compared with the audit specimens in every family. Each difference is fixed with a test or recorded in the evidence.
- **Website build:** `scripts/generate-www-ui.ts` compiles the new components with the Ombelle family into `apps/www/src/generated/ui/` at build time and in `predev`, never at request time. `apps/www` pins any new primitive. First Load JS of the editor and docs routes is recorded from `next build` before and after; if a route grows by more than 10 kB gzipped, the work stops for review before merging.
- **Delivery:** branch `feat/<topic>-075`, stacked on the previous sub-project's PR. Each closes with `docs/evidence/<topic>-075.md`, a CHANGELOG entry under Unreleased, and the README and docs/03 component counts.

## Components

### Toggle (`toggle`, client)

- **Parts:** `Toggle`.
- **Props:** `pressed` or `defaultPressed`, `onPressedChange`, `disabled`, `variant` (`default` or `outline`, default `default`), `size` (`sm`, `default` or `lg`, default `default`). Variant and size set `data-variant` and `data-size`.
- **Accessibility:** renders a `button` with `aria-pressed`. Space and Enter toggle it. An icon-only toggle needs `aria-label`; the docs and recipe example show it.
- **Primitives:** Radix `@radix-ui/react-toggle` 1.2.1 (already in the lockfile through Toggle Group; now pinned in `manifest.ts`) and Base UI `Toggle` (`@base-ui/react` 1.9.0). The Base UI template maps `pressed` and `onPressedChange` to the same names, so both editions share one API.
- **Styles:** each family's file repeats that family's Toggle Group toolbar item look (no cross-component import), with the pressed state from the board.

### Collapsible (`collapsible`, client)

- **Parts:** `Collapsible`, `CollapsibleTrigger` and `CollapsibleContent`.
- **Props:** `open` or `defaultOpen`, `onOpenChange`, `disabled`.
- **Trigger:** renders a `button` with `aria-expanded` and `aria-controls`, and a trailing lucide `ChevronDown` (`aria-hidden`) that rotates 180° when open. `asChild` replaces the button.
- **Content:** the height animates from the primitive's height variable (`--radix-collapsible-content-height`, Base UI `--collapsible-panel-height`); reduced motion removes the animation. Closed content is hidden from assistive technology.
- **Primitives:** Radix `@radix-ui/react-collapsible` 1.2.1 (already in the lockfile through Accordion; now pinned) and Base UI `Collapsible`.
- **Styles:** the board's "Advanced" group: a bordered trigger row and an indented content region.

### Scroll Area (`scroll-area`, client)

- **Parts:** `ScrollArea` (root, viewport and corner) and `ScrollBar` (`orientation`, `vertical` by default). `ScrollArea` renders a vertical `ScrollBar` by default; add a horizontal one as a child.
- **Behaviour:** scrolling stays native; only the bar and thumb are drawn by the family. The bar shows on hover and while scrolling (`type="hover"` in Radix; the Base UI template matches it with the `data-hovering` and `data-scrolling` states).
- **Accessibility:** the viewport takes `tabIndex={0}` while its content overflows, so keyboard users can scroll it and a region that cannot scroll adds no Tab stop. It needs `aria-label` or `aria-labelledby`, passed through from `ScrollArea`. The bar and thumb are not focusable.
- **Primitives:** Radix `@radix-ui/react-scroll-area` 1.4.0 (MIT, released 12 October 2026), a new pin in `manifest.ts`, and Base UI `ScrollArea`.
- **Styles:** the board's thumb and rail in each family: the glass thumb, the brutalist square thumb with a border, the minimalist hairline.

### Shipped list scrollbars (no new part)

The scrolling slots of Command (list), Combobox (list), Select (viewport and content) and Sheet (content) gain `scrollbar-width: thin` and a family `scrollbar-color` in each family file, between `/* 0.7.5 scrollbars */` markers. Their structure, dependencies and default specimens' layout stay the same.

### Button Group (`button-group`, no dependency, one template)

- **Parts:** `ButtonGroup`, `ButtonGroupSeparator` and `ButtonGroupText`.
- **Props:** `orientation` (`horizontal` or `vertical`, default `horizontal`), set as `data-orientation`.
- **Accessibility:** `ButtonGroup` is `role="group"` and needs `aria-label` or `aria-labelledby`. `ButtonGroupSeparator` is `role="separator"` with the cross orientation. `ButtonGroupText` is a `span` for addons such as a unit.
- **Joining:** Buttons, Inputs, Select triggers and Input Groups placed directly inside share borders and radius: inner corners are square, adjacent borders collapse, and the focused child is raised so its ring is not covered. Selectors go through `[data-slot='button-group'] > :is(...)`, written per family so the lint and the liquid-glass rule hold.
- **Split button:** a documented composition of `Button` and a `DropdownMenuTrigger` with `asChild` around an icon Button, not a part.
- **Server-safe:** no `'use client'`.

### Item (`item`, no dependency, one template)

- **Parts:** `Item`, `ItemMedia`, `ItemContent`, `ItemTitle`, `ItemDescription`, `ItemActions`, `ItemGroup` and `ItemSeparator`.
- **Props:**
  - `Item`: `variant` (`default`, `outline` or `muted`, default `default`), `size` (`default` or `sm`), `asChild` to render a link or button.
  - `ItemMedia`: `variant` (`default`, `icon` or `image`).
- **Accessibility:**
  - `ItemGroup` is a `div` with `role="list"` that wraps each `Item` in a `div role="listitem"`, so a link Item keeps its link role. No context is needed, so the template stays server-safe.
  - Actions are real buttons and need names. A link Item keeps its actions outside the link: `ItemActions` renders beside the `asChild` element, not inside it. `asChild` clones its child, so Item has no dependency in either edition.
- **Server-safe:** no `'use client'`.

## Recipes and the component editor

| Component | Props | Content |
| --- | --- | --- |
| Toggle | `variant`, `size`, `iconOnly` (boolean), `pressed` (boolean) | `label` |
| Collapsible | `defaultOpen` (boolean) | `label`, up to six `rows` |
| Scroll Area | `orientation` (`vertical`, `horizontal` or `both`), `height` (integer px, 120 to 480) | `label`, `itemCount` (4 to 40) |
| Button Group | `mode` (`toolbar`, `split` or `input`), `orientation` | `label`, up to five `items` |
| Item | `variant`, `size`, `media` (`none`, `icon` or `image`), `actions` (boolean) | `title`, `description` |

`validateComposition` rejects an icon-only Toggle without a label, a Button Group without a label, and a Scroll Area without a label.

## Website

- **Toggle:** the dark theme toggle in `apps/www/src/site/theme.tsx` (keeps `aria-label="Dark theme"`).
- **Collapsible:** the `<details>` disclosures in
  - `preset-editor/components/glass-panel.tsx` (known limitations);
  - `preset-editor/components/preset-export-panel.tsx` (Dependencies);
  - `preset-editor/components/preset-editor.tsx` (the confirmation's changed values);
  - `app/components/layout.tsx` (the docs' mobile components sidebar).
- **Scroll Area:**
  - the Button editor rail and artifact tabs (`editor/components/button-editor.module.css`);
  - the preset editor's scrolling panels (`preset-editor.module.css`);
  - the editor shell's scrolling panel (`editor-shell.module.css`);
  - the Get code dialog body (`snapshots/components/get-code-dialog.module.css`).
  Each keeps its current maximum height and is named by its panel heading. A viewport is focusable only while its content overflows, so a region that cannot scroll adds no Tab stop.
- **Button Group:** the Undo and Redo pair in `editor-shell/top-bar.tsx`, named "History".
- **Item:** no hand-built equivalent exists in the editors or docs; it ships to the preview scenes and the gallery only.
- **Not changed:** `editor/components/component-navigation.tsx` uses `<details>` as a menu; Collapsible would give it the wrong semantics.

## Preview scenes and gallery

- The Settings scene gains an "Advanced" Collapsible and a Button Group toolbar, the Projects scene lists projects as Items in a Scroll Area, and a toolbar Toggle shows the grid.
- `fixtures/shared/preset-gallery.tsx` gets a section for each of the five.

## Verification

Run and record the environment of each:

- `pnpm build:packages`, `pnpm typecheck`, `pnpm test:unit` and `pnpm test:integration`.
- `pnpm generate:preview` and `pnpm test:specimen-audit` limited to the new components with `OMBELLE_AUDIT_COMPONENTS`, then the four shipped components whose scrollbars changed.
- Browser tests in both editions:
  - Toggle: Space and Enter flip `aria-pressed`.
  - Collapsible: the trigger flips `aria-expanded`, and closed content is hidden.
  - Scroll Area: the viewport is named, scrolls with arrow keys and Page Down, and draws the family thumb.
  - Button Group: it is a named group, and a focused child's ring is not covered by its neighbour.
  - Item: an `ItemGroup` is a list, and a link Item has one Tab stop plus its actions.
- The website's editor and docs end-to-end tests, updated for the swaps.
- Board comparison by computed styles in every family.
- `next build` First Load JS for the editor and docs routes, before and after.

## Documentation

- `docs/components/{toggle,collapsible,scroll-area,button-group,item}.md`, including the split-button composition.
- `docs/accessibility-review.md`: check rows for the five and the list scrollbars.
- docs/03, the README count (50), the CHANGELOG under Unreleased, and `docs/evidence/primitives-075.md`.

## Out of scope

- Wrapping shipped components in Scroll Area.
- Toggle Group changes.
- A Collapsible that is also a disclosure list (that is Accordion).
- Item drag handles or selection.
- Releases and the CLI version bump.
