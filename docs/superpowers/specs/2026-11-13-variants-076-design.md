# Variants 0.7.6: Sheet, Card, Slider, Progress and Meter, Code Block, Tooltip and Carousel

Track 2 of the 0.7.6 work. It adds variants and parts to six shipped components and an image variant to the new Carousel, in both editions and all five style families, with recipe fields. It stacks on track 1 (`2026-11-13-components-076-design.md`), whose shared conventions apply here.

## Intent

The 0.7.6 design artifact (https://claude.ai/artifact/1FMRGWoyJSwht9wATT838U, page "0.7.6 proposal") has one "0.7.6 proposed variants" board per family, `project/<Family>076Variants.dc.html`, sections 01 to 07.

The board states its rule: leaving the new prop or part out renders what 0.7.5 renders, and the recipe fields wait behind a 0.7.6 gate, as the 0.7.5 variants did.

Decisions taken in brainstorming (13 November 2026): the variants ship as one track and one PR, after the new components. The board's changes since the first list hold: Chip filter dropped (on main since 0.7.3), Tabs as links moved to 0.9, Chart moved to 1.0.

## Goals, non-goals, anti-goals

- **Goals:** seven variants that match their boards in every family and pass the audit and accessibility checks in both editions.
- **Non-goals:** the 0.8 style family; releasing or bumping the CLI.
- **Anti-goals:** any change to default output; default specimens stay pixel-identical and their stable hashes do not move.

## Conventions

Files stay self-contained, as in track 1: a part that looks like another catalog component draws that look itself. 0.7.3 and 0.7.5's variant conventions carry over (see `2026-11-12-variants-075-design.md`):

- A variant is an optional prop that sets a `data-*` attribute on an existing slot, or a new part with its own `data-slot`.
- Variant CSS is appended between `/* 0.7.6 variants */` markers in each `styles/<id>/<family>.css`.
- Every selector names one `data-slot`; parent states go through `:is()`, `:has()` and `data-<component>-…` markers.
- The audit pages add `component~variant` sections.
- New recipe fields have no schema default; the 0.7.6 gate checks for them in `props` and `content`, so a recipe without them still installs with CLI 0.7.5. Each field gets a specimen in `recipe-specimen.ts`, a component-editor control from the existing control types, and validation that rejects unknown values.

## Variants

### 01 Sheet: `snapPoints`

- `SheetContent side="bottom" snapPoints={[0.5, 0.9]}`: fractions of the viewport height. Only bottom sheets take it; other sides ignore it.
- When released after a drag, `SheetHandle` settles on the nearest snap point; below 0.25 it still closes, as today. The sheet opens at the first snap point.
- The handle's arrow keys step between snap points (Up to the next higher, Down to the next lower or close below the lowest); Home and End go to the lowest and highest. The handle's `aria-valuetext` names the point ("Half height", "Full height", or the percentage).
- Reduced motion: the settle has no transition.
- Recipe: `sheet` `snapPoints` (`none`, `half-full`, or `third-half-full`).

### 02 Card: `CardAction`

- **Part:** `CardAction` (`data-slot="card-action"`), placed in `CardHeader`, sits at the header's end and spans the title and description rows, so the title keeps its width when the action changes (shadcn's grid layout).
- **No `size` prop (my call):** Card already has `density="dense"`, which tightens spacing. The board's `size="sm"` is drawn with the existing `dense`; where the two differ, the difference is recorded in the evidence rather than moving `dense`'s stable hash.
- Recipe: `card` `action` (boolean).

### 03 Slider: `SliderValue`

- **Part:** `SliderValue` (`data-slot="slider-value"`) shows the value beside the label, formatted by `format(value, index)`, which falls back to the Slider's existing `getValueText`, so it matches the thumb's `aria-valuetext`. A range slider shows both values ("20 – 80"). It is an `<output>` linked to the slider and is not announced twice.
- **`editable`** (one thumb only; validation rejects it on a range): the value becomes a small number input, drawn like Number Input in `slider.tsx` with its own slot, named by the slider's label; Enter or blur moves the thumb, clamped and stepped to the slider's range. Escape restores the value.
- **Editions:** Base UI uses `Slider.Value`; the Radix edition renders the same output element.
- Recipe: `slider` `value` (`none`, `readout`, `editable`).

### 04 Progress and Meter: `shape`

- `shape?: 'bar' | 'circle'` on `Progress` and `Meter`, set as `data-shape`. `circle` draws the same value as an SVG ring for a card corner, an upload row or a button; Progress's ring follows its `size` (`sm`, `default`, `lg`); Meter's ring has one fixed size and Meter gains no `size` prop (my call).
- Progress keeps `ProgressLabel`, `ProgressValue` and its tones. The number inside the ring is `aria-hidden`; the role and `aria-valuetext` already carry it.
- Indeterminate progress in a ring spins, and stops under reduced motion (a static partial ring).
- Meter's segments are not drawn in a ring; a segmented Meter with `shape="circle"` draws the total.
- Recipe: `progress` `shape` and `meter` `shape`.

### 05 Code Block: `diff`

- `diff` on `CodeBlockCode` (or the `CodeBlock` shorthand), set as `data-diff`. Lines starting with `+` and `-` are marked added and removed with a gutter `+` and `−` as well as colour, and with visually hidden "Added:" and "Removed:" text for screen readers. The header shows a `+N −M` count.
- **Copy** takes only the new version: added and unchanged lines, without the markers.
- Works with the existing tabs and line highlighting; under forced colours the markers remain the signal.
- Recipe: `code-block` `diff` (boolean).

### 06 Tooltip: `TooltipShortcut`

- **Part:** `TooltipShortcut` (`data-slot="tooltip-shortcut"`) inside `TooltipContent`, drawing the keys as key caps like Kbd, with its own slots in `tooltip.tsx`. It is `aria-hidden`.
- `TooltipTrigger` takes the keys as `aria-keyshortcuts` (for example `Control+Z`), so they are announced once. The docs show passing the same keys to both.
- Recipe: `tooltip` `shortcut` (a key list, up to three keys).

### 07 Carousel: `variant="image"` and `CarouselThumbnails`

- `variant="image"` and `ratio` on `Carousel`: one image per view at a fixed ratio, each slide a frame using the CSS `aspect-ratio` property, drawn like Aspect Ratio (track 1) inside `carousel.tsx`, with the next image peeking. Each image requires alt text; images past the next one load with `loading="lazy"`.
- **Part:** `CarouselThumbnails` (`data-slot="carousel-thumbnails"`): a row of buttons that jump to an image, named by its alt text, the current one marked with `aria-current`. Below 640px the arrows are hidden and the thumbnails scroll sideways.
- Recipe: `carousel` `variant` and `thumbnails` (boolean).

## Preview scenes and gallery

Each variant appears in the scene that already uses its component (bottom sheet filters, settings sliders, card lists, upload rows, install preview, toolbar tooltips, project gallery) and in its component's gallery section.

## Verification

- `pnpm build:packages`, `pnpm typecheck`, `pnpm test:unit` and `pnpm test:integration`.
- `pnpm test:specimen-audit` limited to Sheet, Card, Slider, Progress, Meter, Code Block, Tooltip and Carousel, default specimens checked for unchanged hashes.
- Browser tests in both editions: Sheet settles and steps between snap points by drag and keyboard; CardAction keeps the title width; SliderValue edits move the thumb and Escape restores; a ring's number is hidden and its value is announced; diff Copy contains only the new version; the shortcut is announced once; thumbnails jump and set `aria-current`, and lazy images load on approach.
- Board comparison by computed styles in every family.

## Documentation

The seven components' pages, `docs/accessibility-review.md` rows, the CHANGELOG under Unreleased and `docs/evidence/variants-076.md`.

## Delivery

Branch `feat/variants-076` from `feat/components-076`, one PR. If it grows like 0.7.5's did, the builder may split it into two batches (props-and-parts first: Card, Slider, Progress and Meter, Tooltip; then Sheet, Code Block and Carousel), each with its own PR.

## Left to the builder

- Exact recipe field names and values, within what is listed.
- Each family's measurements, taken from its board (read through the canvas link above; the boards are not in the repository).
- Whether to split into two batches.

## Out of scope

- Chip filter, Tabs as links and Chart.
- Snap points for side sheets.
- Releases and the CLI version bump.
