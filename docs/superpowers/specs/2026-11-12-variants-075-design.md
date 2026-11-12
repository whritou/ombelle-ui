# Variants: Checkbox, Switch, Progress, Popover, Dialog, Alert Dialog and Breadcrumb

Sub-project 4 of the 0.7.5 work adds variants and parts to seven existing components, in both editions and all five style families, with recipe fields. It ships in two batches, each with its own branch and PR:

- **4a:** Checkbox, Switch, Progress and Popover, whose changes are mostly props, parts and styles.
- **4b:** Dialog, Alert Dialog and Breadcrumb, which add structure and behaviour.

This work stacks on sub-project 3 (`2026-11-12-code-block-075-design.md`); the shared conventions are in sub-project 1 (`2026-11-12-primitives-075-design.md`).

## Intent

The 0.7.5 design artifact (https://claude.ai/artifact/1FMRGWoyJSwht9wATT838U, page "0.7.5 proposal") has one "0.7.5 proposed variants" board per family, `project/<Family>08Variants.dc.html`, sections 01 to 07. The board was checked against main after 0.7.3 and drops three items already on main: the Separator label, the auto-growing Textarea and the Radio Group card tile.

The board states its rule: every default stays.

Decisions taken in brainstorming (12 November 2026):

- **Split:** batches 4a and 4b, two PRs, 4b stacked on 4a.
- **Breadcrumb auto-collapse** lives in `breadcrumb.tsx`, which becomes a client file that uses the dropdown menu primitive, rather than a separate component. The board already composes Breadcrumb with Dropdown Menu.
- **Dialog sizes:** below 640px only `lg` and `fullscreen` fill the screen; `sm` and `default` behave as today.

0.7.3's variant conventions carry over:

- A variant is an optional prop that sets a `data-*` attribute on an existing slot, or a new part with its own `data-slot`.
- The variant CSS is appended between `/* 0.7.5 variants */` markers in each `styles/<id>/<family>.css`.
- Every selector names one `data-slot`; parent states go through `:is()`, `:has()` and `data-<component>-…` markers.
- Default specimens stay pixel-identical, and their stable hashes do not move.
- The audit pages add `component~variant` sections.

## Batch 4a

### Checkbox: `CheckboxOption`

- **Part:** `CheckboxOption` (`data-slot="checkbox-option"`), a `label` wrapping a `Checkbox`, a title (`data-slot="checkbox-option-title"`) and an optional description (`data-slot="checkbox-option-description"`).
- **Props:** every `Checkbox` prop, plus `title` (required), `description`, and `appearance` (`'row'` by default, or `'card'`), set as `data-appearance`.
- **Row:** checkbox, then the title over the description, as on the board ("Include examples").
- **Card:** a padded tile with the checkbox in its top-end corner and the title and description below. When checked: a `--primary` border and a 3px `--primary` halo at 25 %, as `CardOption` has.
- **Accessibility:** the checkbox is named by the title (the wrapping label) and described by the description through `aria-describedby`. The whole row or tile toggles it. The keyboard is the checkbox's own.
- **Editions:** both templates gain the part; it mirrors `RadioGroupOption`.

### Switch: `size`

- `size?: 'default' | 'sm'` on `Switch`, set as `data-size` on the root and the thumb. Default output is unchanged.
- `sm` takes its track and thumb sizes from each family's board section 02. Its hit area stays at least 24 × 24 px through an inset `::before` on the root.
- The docs show `sm` in settings rows with `Field orientation="horizontal"`, which already works.

### Progress: `size`, `tone`, `ProgressLabel` and `ProgressValue`

- **Props:** `size` (`sm`, `default` or `lg`) and `tone` (`default`, `success`, `warning` or `destructive`), set as `data-size` and `data-tone` on the root.
- **Parts:** `ProgressLabel` (`data-slot="progress-label"`) and `ProgressValue` (`data-slot="progress-value"`), passed as children, as Meter does.
  - With either part, `Progress` renders a wrapper (`data-slot="progress-field"`) holding a header row (label, then value at the end) and the progressbar beside it, because the progressbar's own children are presentational. The progressbar takes `aria-labelledby` set to the label.
  - Without them, `Progress` renders exactly as today.
- **`ProgressValue`:** shows the rounded percentage ("64%") by default, or the result of `format(value, max)`. It is `aria-hidden`; the progressbar's `aria-valuetext` carries the same text.
- **Base UI:** uses `Progress.Label` and `Progress.Value`. The Radix edition writes them by hand with the same output.
- **Tone** is never the only signal; the docs ask for status text in the label.

### Popover: `PopoverArrow`

- **Part:** `PopoverArrow` (`data-slot="popover-arrow"`), placed inside `PopoverContent`. Radix uses `PopoverPrimitive.Arrow` and Base UI `Popover.Arrow`, as `TooltipArrow` does.
- **Styles:** filled with the content's background. Families with a visible content border (neo brutalism, minimalist, flat) draw the arrow's two outer edges in the border colour and width, so the border continues onto the arrow. Liquid glass uses the content's tint. `PopoverContent` with an arrow gains a `sideOffset` of 10px by default.
- **Accessibility:** decorative and `aria-hidden`.

## Batch 4b

### Dialog: `DialogBody`, `DialogFooter` and `size`

- **Parts:**
  - `DialogBody` (`data-slot="dialog-body"`) scrolls with `overflow: auto`. It is a `role="region"` named by the dialog title through `aria-labelledby`, and takes `tabIndex={0}` while it overflows so keyboard users can scroll it (ruling in the plan: a body that fits adds no empty Tab stop).
  - `DialogFooter` (`data-slot="dialog-footer"`), a row of actions aligned to the end that stacks in reverse below 640px, matching `AlertDialogFooter`.
- **Layout:** a `DialogContent` that contains a `DialogBody` becomes a column limited to `100dvh - 2rem`, detected with `:has(> [data-dialog-body])`, a marker the body renders so the selector names one slot; the header and footer stay visible while the body scrolls. When the body overflows, the footer gains a top border, from a scroll-state check on the body (`data-overflowing`, set by a ResizeObserver).
- **`size`** on `DialogContent`: `sm` (24rem), `default` (today's width), `lg` (48rem) or `fullscreen` (the viewport less 1rem on each side), set as `data-size`. Below 640px, `lg` and `fullscreen` fill the screen with no radius; `sm` and `default` stay as today.
- A dialog without the new parts or `size` renders exactly as before.

### Alert Dialog: `AlertDialogMedia` and typed confirmation

- **`AlertDialogMedia`** (`data-slot="alert-dialog-media"`), placed in `AlertDialogHeader`: an icon tile, `aria-hidden`, with `tone` (`default` or `destructive`) set as `data-tone`. With no children it draws an inline SVG for its tone, so Alert Dialog gains no icon dependency.
- **`AlertDialogConfirmInput({ expected, label })`** (`data-slot="alert-dialog-confirm"`):
  - Renders an instruction, by default "Type <code>{expected}</code> to confirm", as the label of a text input.
  - Through context, `AlertDialogAction` is `disabled` until the input's value equals `expected` exactly, without trimming, case-sensitive. Pasting is allowed. Enter in the input activates the action only when it matches.
  - The action gains `aria-describedby` pointing at the instruction, so the reason it is disabled is announced.
  - The input's value resets when the dialog closes.
  - Initial focus goes to the input instead of Cancel.
- An Alert Dialog without these parts renders exactly as before.

### Breadcrumb: auto-collapse

- **Prop:** `collapse` on `Breadcrumb`, `'none'` (the default, today's behaviour) or `'auto'`.
- **Behaviour with `'auto'`:**
  - A ResizeObserver on the list measures the trail. Item widths are measured once from the full render and remeasured when the items change.
  - When the trail overflows, the middle items fold, from the second item onward, into `BreadcrumbEllipsis`, until the trail fits. The first item and the current page (`BreadcrumbPage`) always stay.
  - `BreadcrumbEllipsis` becomes a Dropdown Menu trigger, a `button` named "Show N more", whose menu lists the hidden items as links in trail order.
  - The server renders the full trail; the collapse applies after mount.
- **Template:** `breadcrumb.tsx` gains `'use client'` and imports the menu primitive directly (`@radix-ui/react-dropdown-menu`; Base UI `Menu` in a new Base UI template), drawing the menu under its own slots `breadcrumb-menu` and `breadcrumb-menu-item` with each family's Dropdown Menu rules repeated. Templates never import other catalog components and the catalog has no component-to-component install (ruling in the plan), so installing Breadcrumb installs the `@radix-ui/react-dropdown-menu` package, not the Dropdown Menu component. The HTML of the default parts is unchanged.
- The docs keep the manual Ellipsis and Dropdown Menu composition for fixed trails.

## Styles

A generator in the session scratchpad appends the variant rules to each family stylesheet between `/* 0.7.5 variants */` markers. It reads each board section, replaces the board's token names with the catalog's (`--pri` → `--primary`, `--des` → `--destructive`, `--ok` → `--success`, `--warn` → `--warning`), and scopes each rule to one slot plus a `data-*` marker.

- Forced colours: Checkbox card checked and Progress tones use `Highlight`; the Popover arrow keeps a `CanvasText` edge; the Dialog footer border stays; the disabled typed-confirmation action uses `GrayText`.
- Liquid glass: experimental and non-blocking; no selector names two slots.

## Recipes and the component editor

| Component | New fields |
| --- | --- |
| `checkbox` | `option` (`none`, `row` or `card`), `description` (content string) |
| `switch` | `size` (`default` or `sm`) |
| `progress` | `size`, `tone`, `showLabel` (boolean), `showValue` (boolean); the recipe already has an integer `value` prop |
| `popover` | `arrow` (boolean) |
| `dialog` | `size`, `footer` (boolean), `scrollingBody` (boolean) |
| `alert-dialog` | `media` (`none`, `default` or `destructive`), `confirmText` (content string; empty for none) |
| `breadcrumb` | `collapse` (`none` or `auto`) |

New fields have no schema default, and the 0.7.5 gate checks for them in `props` and `content`. For each field, `recipe-specimen.ts` builds a specimen, the component editor shows a control using the existing control types, and validation rejects unknown values. A `checkbox` recipe with `option` other than `none` requires a label. Every default keeps today's specimen and stable hash.

## Website

- **Breadcrumb `collapse="auto"`:** the editor top bar's hand-built `<nav aria-label="Breadcrumb">` in `editor-shell/top-bar.tsx`.
- **Dialog with `DialogBody`, `DialogFooter` and `size="lg"`:** the Get code dialog (`snapshots/components/get-code-dialog.tsx`, a native `<dialog>` today) and the preset identity dialog in `preset-editor/components/preset-editor.tsx`.
- **Alert Dialog:**
  - the preset editor's family-change confirmation `<dialog>`, with `AlertDialogMedia`, keeping sub-project 1's Collapsible list of changed values;
  - the `window.confirm` before replacing recovery data, with destructive media.
- **Switch `sm` and `CheckboxOption`:** in `editor/components/catalog-properties.tsx`, boolean fields become `sm` Switches in horizontal Field rows, and multi-choice fields become `CheckboxOption` rows, replacing its native checkboxes.
- **Progress and `PopoverArrow`:** no hand-built equivalent exists in the editors or docs; they ship to the preview scenes and the gallery only.
- `wwwUiComponents` in `scripts/generate-www-ui.ts` gains `dialog`, `alert-dialog`, `breadcrumb`, `switch`, `checkbox` and `field`; Breadcrumb carries its own menu, so no Dropdown Menu component is compiled for it.

## Preview scenes and gallery

- The Settings scene gains `sm` Switch rows and `CheckboxOption` cards for framework targets; the Projects scene gains a publishing Progress with label and value, a delete-project Alert Dialog with typed confirmation, a long collapsing Breadcrumb and an export Dialog with a footer; a help Popover shows its arrow.
- `fixtures/shared/preset-gallery.tsx` gains `component~variant` entries for each.

## Verification

Run and record the environment of each:

- `pnpm build:packages`, `pnpm typecheck`, `pnpm test:unit` and `pnpm test:integration`.
- `pnpm generate:preview` and `pnpm test:specimen-audit` limited to the seven components, plus a check that every default specimen hash is unchanged.
- Browser tests in both editions:
  - `CheckboxOption`: named by its title, described by its description; a click anywhere on the tile toggles it.
  - Switch `sm`: the hit area is at least 24 × 24 px.
  - Progress: named by `ProgressLabel`; `aria-valuetext` matches `ProgressValue`.
  - `PopoverArrow`: rendered and `aria-hidden`.
  - Dialog: the footer stays visible while the body scrolls; the body is named and scrolls with the keyboard; `lg` fills the screen at 375px and `default` does not.
  - Typed confirmation: the action is disabled until the text matches, with its reason announced; the text resets on close.
  - Breadcrumb: at 320px the trail collapses, the first item and current page stay, and "Show N more" opens a menu holding the hidden links; at 1280px nothing collapses.
- The website's editor end-to-end tests, updated for the dialogs, the breadcrumb and the properties fields.
- Board comparison by computed styles in every family.
- `next build` First Load JS for the editor routes, before and after.

## Documentation

- `docs/components/{checkbox,switch,progress,popover,dialog,alert-dialog,breadcrumb}.md` gain the new props and parts.
- `docs/accessibility-review.md`: check rows for `CheckboxOption`, Switch `sm` target size, Progress labelling, the scrolling Dialog body, typed confirmation and the collapsed Breadcrumb menu.
- The CHANGELOG under Unreleased, noting that Breadcrumb now installs Dropdown Menu, and `docs/evidence/variants-075.md`.

## Out of scope

- Indeterminate Checkbox changes and Switch label positions.
- Progress buffers, steps and circular progress.
- Popover or Hover Card placement changes beyond the arrow; arrows on Hover Card and Dropdown Menu.
- Nested dialogs and drawer behaviour (Sheet covers it).
- Breadcrumb truncation of a single long label.
- Releases and the CLI version bump.
