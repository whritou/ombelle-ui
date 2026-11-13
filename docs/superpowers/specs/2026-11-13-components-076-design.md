# Components 0.7.6: Password Field, Carousel, Aspect Ratio and Toolbar, with Form and Checkbox Group parts

Track 1 of the 0.7.6 work. It adds four catalog components, and Form, Fieldset and Checkbox Group parts to the shipped Field and Checkbox, in the Radix and Base UI editions and all five style families, with component-editor recipes, and replaces the editor's hand-built toolbar. Track 2 (`2026-11-13-variants-076-design.md`) adds the variants and stacks on this track.

## Intent

The 0.7.6 design artifact (https://claude.ai/artifact/1FMRGWoyJSwht9wATT838U, page "0.7.6 proposal") has one "0.7.6 proposed components" board per family, `project/<Family>076Components.dc.html`, sections 01 to 06. Its content is the same in every family; only the family styling differs. The board is the visual source of truth for every family.

0.7.6 is a patch release in the 0.7 line. It adds components that Radix, Base UI or shadcn ship and the catalog lacks, and that are not part of the 0.9 app shell (Sidebar, Navigation Menu, Resizable, Data Table, Menubar, Prose) or the 1.0 blocks.

Decisions taken in brainstorming (13 November 2026):

- **Toolbar ships in 0.7.6**, not with Menubar in 0.9. It is a single primitive rather than shell layout, and it replaces the editor's hand-built `top-bar.tsx` overflow.
- **Two tracks, two PRs:** this track ships the new components; track 2 ships the variants, including the Carousel image variant, and stacks on this one.
- **Form and Checkbox Group are parts, not components.** Every catalog component installs as one self-contained file, and the CLI cannot make one component install another. Form has to hand each Field its errors by name, and the Radix Checkbox Group has to drive each Checkbox, so `Form` and `FormErrorSummary` ship in `field.tsx` (with `FieldSet` and `FieldLegend`) and `CheckboxGroup` and `CheckboxGroupParent` ship in `checkbox.tsx`. There is no `add form` and no installer work; projects that already have Field or Checkbox get the parts by adding them again, under the usual modified-file guard.
- **Out of 0.7.6:** Chip filter (already on main since 0.7.3), Tabs as links (moved to 0.9) and Chart (moved to 1.0).

The catalog has 53 components on main. This track brings it to 57. Installing the new components and parts needs CLI 0.7.6.

**Self-contained files (my call, following 0.7.5's Breadcrumb, which imports the menu primitive rather than Dropdown Menu):** a component that looks like another catalog component draws that look itself, with its own slots and its own copy of the family CSS. Toolbar's More menu uses the dropdown menu primitive; Password Field draws its own input group and strength bar; the Carousel image variant sets `aspect-ratio` itself.

## Goals, non-goals, anti-goals

- **Goals:** four components and the Field and Checkbox parts, that match their boards in every family, pass the specimen audit and the accessibility checks in both editions, and work without JavaScript where the board says so (Form's first validation, Carousel's scrolling, Aspect Ratio).
- **Non-goals:** the 0.8 style family (everything added here will have to be drawn in it later, but not in this track); releasing or bumping the CLI; Carousel autoplay, mouse dragging and looping.
- **Anti-goals:** any change to default output of shipped components (their specimens and stable hashes must not move); a new runtime dependency where the board says "no dependency"; a Form that hides errors from screen readers or reports errors before the first submit.

## Shared conventions

0.7.5's conventions carry over unchanged; read the "Shared conventions" section of `2026-11-12-primitives-075-design.md`. In short:

- **Files per component:** Radix template `packages/catalog/src/templates/<id>.tsx`, Base UI template `templates/base/<id>.tsx` (one template serves both when there is no primitive), `styles/<id>/<family>.css` for the five families, registration in `packages/contracts/src/component-ids.ts`, `style-families.ts`, `packages/catalog/src/component-slots.ts`, `index.ts` and `expansion-examples.ts`, the recipe branch in `schemas/`, a specimen in `packages/compiler/src/recipe-specimen.ts`, a component editor entry, a preview scene, a section in `fixtures/shared/preset-gallery.tsx`, `docs/components/<id>.md` and rows in `docs/accessibility-review.md`.
- **Parts** follow shadcn names where one exists, forward native props, refs, `className` and `style`, and carry a `data-slot` named after the part.
- **Style rules:** every selector names one slot or a marker; liquid glass never names two slots, uses a 2px `--foreground` ring with no offset and stays experimental (its findings do not block); forced colours keep borders and use `Highlight` for on, pressed, selected and current; every target is at least 24 × 24 px; reduced motion removes transitions and smooth scrolling.
- **Board fidelity:** computed styles from the board files are compared with the audit specimens in every family; each difference is fixed with a test or recorded in the evidence.
- **Website build:** `scripts/generate-www-ui.ts` compiles new components into `apps/www/src/generated/ui/`; `apps/www` pins any new primitive; First Load JS of the editor and docs routes is recorded before and after, and growth above 10 kB gzipped on a route stops the work for review.
- **New dependencies** are pinned to exact versions, like the existing primitives.

## Components

### Form (parts of `field`)

Board section 01: the "Save preset" form with a summary "Fix 2 fields before saving".

- **Parts:** `Form` (`data-slot="form"`, a `<form>`) and `FormErrorSummary` (`data-slot="form-error-summary"`), exported from `field.tsx`. Fields inside are the existing 0.7.3 `Field` parts, which read the form's context from the same file.
- **Field change:** `Field` gains an optional `name` prop. It is how a field receives its error from the form, keyed by name. In the Radix edition, without a `Form` parent, `name` changes nothing. In the Base UI edition, `Field.Root` also gives the control the name it submits with, which is correct form behaviour; the docs say so.
- **Validation order:**
  1. Before hydration the form has no `noValidate`, so the browser's own constraint validation (`required`, `min`, `max`, `pattern`, `type`) runs on submit.
  2. After hydration `Form` sets `noValidate`, reads each control's `validity` on submit, then calls an optional `validate(values)` prop that returns errors keyed by field name.
  3. Errors returned by the server go in an `errors` prop keyed by field name (the board's "Returned by the server after Save") and land on the field they name.
- **After a failed submit:** `FormErrorSummary` lists every invalid field, by label, with its message, and takes focus. It is a region named by its heading. Each line is a link or button that moves focus to its field's control.
- **Clearing:** a field's error clears when its value changes. Nothing is reported before the first submit.
- **Editions:** Base UI uses `@base-ui/react/form` with its `errors` prop, and its Field already joins it. The Radix edition is built on a native `<form>` with a context that `Field` reads; it does not use `@radix-ui/react-form`, whose own Field and Message would duplicate the catalog's Field. (Builder's call to revisit only if the Radix package turns out to fit Field without duplication.)
- **Website:** the preset editor's save form and the snapshot publish form use `Form` where they collect fields today; the builder finds each hand-built form in `apps/www/src` and swaps it when it has field-level errors.

### Checkbox Group (parts of `checkbox`) and Fieldset (parts of `field`)

Board section 02: "Overlays to install", a parent "All overlays" reading "2 of 4", and an editions fieldset locked by the project.

- **Parts:** exported from `checkbox.tsx`: `CheckboxGroup` (`data-slot="checkbox-group"`), and a parent checkbox `CheckboxGroupParent` (`data-slot="checkbox-group-parent"`) that reads checked, unchecked or mixed (`aria-checked="mixed"`) from its children and sets them all when pressed. Children are `Checkbox` or `CheckboxOption` (0.7.5) with a `value`.
- **Value:** `value`, `defaultValue` and `onValueChange` on the group, as arrays of child values; `allValues` names the children the parent controls.
- **Fieldset:** `FieldSet` and `FieldLegend` are added as parts of `field` (`data-slot="field-set"` and `"field-legend"`), as shadcn does. A disabled `FieldSet` disables every control in it. The group is usually placed in one, and the board's locked editions group is a disabled `FieldSet`.
- **Editions:** Base UI uses `@base-ui/react/checkbox-group` and `@base-ui/react/fieldset`. The Radix edition builds the group with a context in `checkbox.tsx` that `Checkbox` and `CheckboxOption` read, and uses native `<fieldset>` and `<legend>`.
- **Accessibility:** the group is named by its legend; the parent's count ("2 of 4") is visible text, and the parent's name says what it controls.

### Password Field (`password-field`, client)

Board section 03: a password with a show toggle, "Caps Lock is on", a strength meter "Strong · add a symbol to reach the last check", and a confirm field.

- **Parts:** `PasswordField` (root, drawn like Input Group), `PasswordFieldInput`, `PasswordFieldToggle` (drawn like an Input Group button), `PasswordFieldCapsLock` (`data-slot="password-field-caps-lock"`) and `PasswordFieldStrength` (a labelled `meter` element drawn like Meter). All are in `password-field.tsx` with their own slots.
- **Toggle:** switches the input between `password` and `text` without moving the caret or selection and without remounting the input, so password managers keep it. It is a toggle button with `aria-pressed` and a fixed name ("Show password"). The value is hidden again when the form submits.
- **Caps Lock:** read from `getModifierState('CapsLock')` on key events while the input has focus; the notice is a polite live region and disappears on blur.
- **Strength:** the consumer passes `checks`, a list of `{ label, test(value) }`; the meter shows how many pass and names the first that fails. The component ships no password-strength library.
- **Editions:** one template serves both editions. Radix's `PasswordToggleField` is a preview package, so the Radix edition does not take it as a dependency. (My call, made in brainstorming; it changes no output.)

### Carousel (`carousel`, client, no dependency, one template)

Board section 04: five slides of UI kit cards, previous and next buttons, one dot per slide, "1 / 5", and arrows "Hidden below 640px".

- **Parts:** `Carousel` (root, a region with `aria-roledescription="carousel"` and a name), `CarouselContent` (the scroll-snap viewport), `CarouselItem` (`role="group"`, `aria-roledescription="slide"`, named "N of M"), `CarouselPrevious`, `CarouselNext`, `CarouselDots` and `CarouselCounter`.
- **Scrolling:** CSS scroll snap does the work; touch, trackpad and keyboard scrolling work without a script. The buttons and dots only scroll a slide into view; the current slide is tracked with an IntersectionObserver. Previous and Next are disabled at the ends. Smooth scrolling is off under reduced motion.
- **Dots:** one button per slide, named "Slide N", with `aria-current` on the current one; each dot's hit area is at least 24 × 24 px even when the drawn dot is smaller.
- **Small screens:** below 640px the arrows are hidden and the dots stay.
- **Never autoplays**, so it needs no pause control. Orientation is horizontal only.
- The `image` variant and `CarouselThumbnails` are in track 2.

### Aspect Ratio (`aspect-ratio`, no dependency, one template)

Board section 05: 16 : 9, 1 : 1 and 4 : 3 frames.

- **Part:** `AspectRatio` (`data-slot="aspect-ratio"`) with `ratio` (a number, default `16 / 9`), using the CSS `aspect-ratio` property with the family's border and radius; media children fill it with `object-fit: cover`.
- Server component; no script.

### Toolbar (`toolbar`, client)

Board section 06: a wide toolbar (Light, Dark, Grid, Open preview) and a narrow one with its overflow open.

- **Parts:** `Toolbar`, `ToolbarButton`, `ToolbarLink`, `ToolbarToggleGroup`, `ToolbarToggleItem`, `ToolbarSeparator` and `ToolbarOverflow`.
- **Keyboard:** one Tab stop for the whole bar; arrow keys move between items, Home and End jump to the ends, and toggles keep `aria-pressed` (or `aria-checked` inside a single-select group, as the primitive does).
- **Overflow:** items that no longer fit move, in the same order, into a "More" menu built on the dropdown menu primitive, inside `toolbar.tsx`; a ResizeObserver measures the bar. Each item states how it reads in the menu (a toggle becomes a checkbox or radio item). The menu copies Dropdown Menu's family styles under its own slots.
- **Not Button Group:** Button Group adds no arrow-key navigation and each child is its own Tab stop.
- **Editions:** Radix `@radix-ui/react-toolbar`, Base UI `@base-ui/react/toolbar`. Installing Toolbar installs the dropdown menu primitive (`@radix-ui/react-dropdown-menu` in Radix; Base UI's menu is in `@base-ui/react`).
- **Website:** replaces the hand-built bar and `role="menu"` overflow in `apps/www/src/editor-shell/top-bar.tsx` and `overflow-menu.tsx`; `top-bar.test.tsx` is updated for the swap. The Undo and Redo Button Group from 0.7.5 stays inside the toolbar.

## Recipes and the component editor

The builder settles exact field names, following 0.7.5. Proposed:

| Component | Props | Content |
| --- | --- | --- |
| Field (new 0.7.6 fields) | `form` (`none`, or `summary`: a Form of up to four Fields with an error summary), `fieldset` (`none`, `default`, `disabled`) | `legend`, up to four `fields` |
| Checkbox (new 0.7.6 fields) | `group` (`none`, or `parent`: a Checkbox Group with a parent checkbox) | `legend`, up to six `options` |
| Password Field | `strength` (boolean), `capsLockNotice` (boolean), `confirm` (boolean) | `label` |
| Carousel | `dots` (boolean), `counter` (boolean), `slidesPerView` (1 to 3) | `label`, up to eight `slides` |
| Aspect Ratio | `ratio` (`16/9`, `4/3`, `1/1`, `3/2`, `21/9`) | `label` |
| Toolbar | `overflow` (boolean), `toggles` (`none`, `single`, `multiple`) | `label`, up to eight `items` |

`validateComposition` rejects a Toolbar or Carousel without a label, and a Field `fieldset` or Checkbox `group` without a legend. The new Field and Checkbox fields have no schema default and sit behind the 0.7.6 gate, so existing `field` and `checkbox` recipes keep their specimens and stable hashes. Every new component and field needs CLI 0.7.6.

## Preview scenes and gallery

- The Settings scene gains a Form with a Password Field and a Checkbox Group in a FieldSet; the Projects scene gains a Carousel of project cards in Aspect Ratio frames; the preview's own top bar uses Toolbar.
- `fixtures/shared/preset-gallery.tsx` gets a section for each of the four new components, and the Field and Checkbox sections gain Form, Fieldset and Checkbox Group.

## Verification

Record the environment of each:

- `pnpm build:packages`, `pnpm typecheck`, `pnpm test:unit` and `pnpm test:integration`.
- `pnpm generate:preview` and `pnpm test:specimen-audit` limited to the four new components, Field and Checkbox (their new parts, with default specimens checked for unchanged hashes) with `OMBELLE_AUDIT_COMPONENTS`. Shipped components are not re-audited unless their output changed.
- Browser tests in both editions:
  - Form: submitting with JavaScript disabled shows the browser's messages; after hydration a failed submit focuses the summary, each summary line focuses its field, server errors land on their field, and an error clears on change.
  - Checkbox Group: the parent reads mixed, checks all and clears all; a disabled FieldSet disables its controls.
  - Password Field: the toggle keeps caret position and the input element; submit hides the value; the Caps Lock notice is announced.
  - Carousel: arrow keys scroll the viewport, buttons and dots move to a slide and set `aria-current`, arrows hide below 640px.
  - Aspect Ratio: the frame keeps its ratio at three widths.
  - Toolbar: one Tab stop, arrows, Home and End, overflow moves items to More in order and the menu is keyboard operable.
- The editor end-to-end tests, updated for the Toolbar swap.
- Board comparison by computed styles in every family.
- `next build` First Load JS for the editor and docs routes, before and after.

## Documentation

- `docs/components/{password-field,carousel,aspect-ratio,toolbar}.md`; `field.md` for `name`, `Form`, `FormErrorSummary`, `FieldSet` and `FieldLegend`; `checkbox.md` for `CheckboxGroup`. Both pages say how to get the parts into an existing project (add the component again).
- `docs/accessibility-review.md` rows for the four and the Field and Checkbox parts.
- docs/03, the README count (57), the CHANGELOG under Unreleased, and `docs/evidence/components-076.md`.

## Delivery

Branch `feat/components-076` from `main`, one PR. Track 2 branches from it.

## Left to the builder

- Exact recipe field names and limits, within the table above.
- How the Form and Checkbox Group contexts are laid out inside `field.tsx` and `checkbox.tsx`, as long as Field and Checkbox without them render as today.
- Where Form replaces hand-built website forms.
- Each family's measurements, taken from its board (read through the canvas link above; the boards are not in the repository).
- Whether a component needs a Base UI template of its own when one template serves both.

## Out of scope

- The Carousel image variant and thumbnails (track 2).
- Carousel autoplay, looping, vertical orientation and mouse dragging (Embla stays an option for later).
- A password-strength library.
- A CLI component dependency graph (components that install other components).
- Menubar and the rest of the 0.9 shell.
- Releases and the CLI version bump.
