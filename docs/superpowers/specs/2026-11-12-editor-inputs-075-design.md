# Editor inputs: Number Input, Color Picker and Color Picker Pair

Sub-project 2 of the 0.7.5 work. It adds two catalog components, Number Input and Color Picker (with its `ColorPickerPair` part), in the Radix and Base UI editions and all five style families, with component-editor recipes. The website editors then replace their native colour inputs and number fields with them. This work stacks on sub-project 1 (`2026-11-12-primitives-075-design.md`), whose shared conventions apply here.

## Intent

The 0.7.5 design artifact (https://claude.ai/artifact/1FMRGWoyJSwht9wATT838U, page "0.7.5 proposal", boards `project/<Family>08Components.dc.html`, sections 01 and 02) defines both components. They serve the preset and component editors first, as Slider did in 0.7.3.

Our editors build them by hand today:

- three separate native `<input type="color">` controls in `preset-controls.tsx`, `properties-panel.tsx` and `catalog-appearance.tsx`;
- a `type="number"` field in `catalog-properties.tsx`, and text number fields in the inspector's `SliderRow` and the shadow offset rows.

Decisions taken in brainstorming (12 November 2026):

- **Color Picker** follows the full board: swatch trigger and text input, and a popover with a 2D area, a hue slider, a format select with a value input, swatches and a contrast readout.
- **Color Picker Pair** is a part of `color-picker`, not a separate component, because the preset editor edits every token as a light and dark pair.
- **Eyedropper:** the popover adds an eyedropper button wherever the browser has the EyeDropper API. The board was updated on 12 November 2026 to show it in every family.
- **Number Input** is one in-house template for both editions, not Base UI `NumberField`, so a half-typed value behaves the same in both: it stays visible and is reported, never cleared or reformatted.
- **Colour maths** is in-house, with no dependency.

The catalog goes from 50 to 52 components. Installing them needs CLI 0.7.5.

## Components

### Number Input (`number-input`, client, no dependency, one template)

- **Parts:** `NumberInput`, a field-like box holding a decrement button, a text `input`, an optional unit and an increment button.
- **Props:**
  - `value` or `defaultValue`: `number | null`, where `null` is empty.
  - `onValueChange(value: number | null, details: { text: string; valid: boolean })`. It fires on every edit; `value` is `null` when the text is empty or does not parse.
  - `min`, `max`, `step` (default 1), `largeStep` (default 10), `unit`, `placeholder`, `disabled`, `name`, `id`, `decrementLabel`, `incrementLabel`.
  - `id` goes to the input, so `Field` and `<label htmlFor>` name it.
- **Behaviour:**
  - The input is `type="text"` with `inputMode="decimal"` and `role="spinbutton"`, with `aria-valuenow`, `aria-valuemin`, `aria-valuemax`, and `aria-valuetext` that adds the unit ("12 pixels"; units `px`, `ms`, `%` and `deg` have spoken names, others are read as written).
  - Arrow Up and Down move one `step`; Shift + arrow and Page Up or Page Down move one `largeStep`; Home and End go to `min` and `max`. Stepping clamps to the range.
  - Typed text such as `1.`, `-` or `12a` stays in the field. Text that does not parse, or a number outside `min`..`max`, gets `aria-invalid` on blur and `valid: false`. It is never clamped or rewritten.
  - When a controlled `value` changes from outside, the text resyncs unless the input is focused and its text already parses to that value.
- **Steppers:** `button`s named by `decrementLabel` and `incrementLabel`, default "Decrease <label>" and "Increase <label>" from the input's accessible name. They take `tabIndex={-1}` because the arrow keys cover keyboard use, are disabled at the bounds, are at least 24 × 24 px, and carry lucide `Minus` and `Plus` icons (`aria-hidden`).
- **Forms:** with `name`, the input submits its text.

### Color Picker (`color-picker`, client, no new dependency)

Self-contained, like Combobox and Calendar: the catalog has no component-to-component install, so the template imports the Popover and Slider primitives of its edition directly and draws its inputs and format select as native elements, with each family's Input, Popover, Slider and Badge rules repeated in its stylesheet.

- **Parts:** `ColorPicker`, `ColorPickerSwatches` and `ColorPickerPair`. The popover's area, hue, format row and contrast readout are internal and carry their own `data-slot` values (`color-picker-area`, `-hue`, `-format`, `-eyedropper`, `-contrast`) for styling.
- **Props:**
  - `value` or `defaultValue` (a CSS colour string), `onValueChange(value: string)`, `onInvalid?(text: string)`.
  - `label` (names the trigger, the text input and the popover), `placeholder` (the inherited value, as the editors show today), `disabled`, `name`, `id`.
  - `format` or `defaultFormat` (`oklch`, `hex` or `rgb`, default `oklch`), `onFormatChange`.
  - `swatches?: { label: string; value: string }[]`.
  - `contrastWith?: string` and `contrastLabel?: string`.
  - `eyeDropper?: boolean`, default `true`.
  - `mode?: 'light' | 'dark'`, used inside `ColorPickerPair`.
- **Trigger row:**
  - A swatch `button` named "Open <label> color picker" with `aria-expanded`, filled with the current colour.
  - A text input, labelled by `label`. A valid colour calls `onValueChange`. Text that does not parse stays, gets `aria-invalid`, and is reported through `onInvalid`.
- **Popover** (`role="dialog"`, named "<label> color"):
  - **2D area:** HSV saturation on the x axis and brightness on the y axis, at the current hue, so every point is in the sRGB gamut. It is one focusable element with `role="slider"`, `aria-roledescription="2D slider"`, `aria-valuenow` set to the saturation, and `aria-valuetext` "Saturation 72%, brightness 28%". Left and Right change saturation, Up and Down change brightness, by 1 or by 10 with Shift. Pointer drag moves the marker.
  - **Hue:** a catalog Slider from 0 to 360, with a hue gradient track and value text "Hue, 6 degrees".
  - **Format row:** a Native Select named "Color format" (OKLCH, Hex, RGB), an input named "<Format> value" holding the value in that format, and the eyedropper button.
  - **Swatches:** `ColorPickerSwatches` renders `swatches` as `button`s named by their label, with `aria-pressed` when the swatch equals the value. It renders inside the popover by default and can also be placed beside the trigger.
  - **Contrast readout:** shown when `contrastWith` is set: "5.1:1 on <contrastLabel>" and a pill reading AAA (7:1 or more), AA (4.5:1), "AA large" (3:1) or "Fails". The pill states its level in text, not by colour alone. A polite live region announces the ratio when a drag or key press ends, not on every move.
- **Eyedropper:**
  - A `button` named "Pick a color from the screen", with the lucide `Pipette` icon (`aria-hidden`), in the format row. It is styled as the family's small outline icon button.
  - It renders only after mount and only when `'EyeDropper' in window`, so Firefox and Safari show no dead control and server output matches the first client render. `eyeDropper={false}` hides it.
  - A click calls `new EyeDropper().open({ signal })` within the click handler, as the API requires a user gesture. The returned `sRGBHex` becomes the value in the current format; the area, hue and contrast readout follow.
  - Esc rejects with `AbortError`, which is ignored; the value stays. Closing the popover or unmounting aborts a pick still open.
- **Colour maths** (an internal module of the template):
  - Parses `#rgb`, `#rrggbb`, `rgb(r g b)` and `rgb(r, g, b)`, and `oklch(L C H)` with L as a percentage or a number from 0 to 1.
  - Converts between sRGB, HSV and OKLCH, and computes the WCAG 2 contrast ratio from relative luminance.
  - Writes the chosen format: hex as lowercase `#rrggbb`; RGB as `rgb(r g b)`; OKLCH as `oklch(0.55 0.22 6)`, with L and C to 3 decimals and H to 1 decimal, trailing zeros trimmed.
  - A typed OKLCH value outside the sRGB gamut is kept exactly as typed. The area and hue show its gamut-clipped position, and the value is replaced only when the area, hue, a swatch or the eyedropper changes it.
- **Out of scope:** alpha, wide-gamut (P3) output, named colours, and colour spaces beyond the three formats.

### Color Picker Pair (part of `color-picker`)

- `ColorPickerPair({ label })` is `role="group"`, named by `label` (for example "Primary"), and lays out its two `ColorPicker` children in a two-column grid that stacks below 360px.
- A child with `mode="light"` or `mode="dark"` takes the default label "<label> · light" or "<label> · dark", and the dark child's trigger swatch sits on a dark backdrop so a light colour stays visible.
- The two pickers keep their own values and popovers. The pair only groups, labels and lays them out.

## Styles

Each family file draws the trigger row from the family Input, the popover from the family Popover, the area marker and hue thumb from the family Slider thumb, and the contrast pill from the family Badge, as on the board. The Number Input box follows the family Input, with steppers styled as the family's ghost icon buttons and the unit in `--muted-foreground`.

- Forced colours: the area and hue track keep a `CanvasText` border, the marker and thumbs use `Highlight`, and the contrast pill keeps a border.
- The area marker has a two-ring outline (light and dark) so it stays visible over any colour.
- Reduced motion removes the marker and thumb transitions.

## Recipes and the component editor

| Component | Props | Content |
| --- | --- | --- |
| Number Input | `min`, `max`, `step`, `unit` (`none`, `px`, `ms`, `%`, `deg`), `value` | `label`, `hint` |
| Color Picker | `format`, `paired` (boolean), `contrast` (boolean), `swatches` (0 to 8), `eyeDropper` (boolean) | `label`, `value`, `darkValue` |

`validateComposition` rejects `min` greater than `max`, a Number Input value outside its range, a Color Picker `value` or `darkValue` that does not parse, and `darkValue` without `paired`.

## Website

- **Color Picker Pair:** in `preset-editor/components/preset-controls.tsx`, each token's hand-built `popover="auto"` panel with two native colour inputs becomes a `ColorPickerPair`.
  - The token's scheme dots become the pair's `swatches`.
  - The contrast readout uses the token's `-foreground` pair, measured with the existing `preset-editor/contrast.ts`.
  - Reset buttons, the measured placeholders and the editor's error reporting (`aria-invalid`, `preset-error`) stay; `onInvalid` feeds the existing error path.
- **Color Picker:** the colour roles in `editor/components/properties-panel.tsx` and the colour fields in `editor/components/catalog-appearance.tsx`. Their reset buttons and `colorPlaceholder` values stay.
- **Number Input:**
  - `editor/components/catalog-properties.tsx`, replacing `type="number"`;
  - the number field of `SliderRow` in `editor-shell/inspector.tsx`, next to its Slider;
  - the shadow X and Y fields in `preset-controls.tsx` and `properties-panel.tsx`.
  The editors keep receiving the raw text through `details.text`, so their own validation and messages stay the same.
- **Build:** `wwwUiComponents` in `scripts/generate-www-ui.ts` (today `slider`, `toggle-group`, `chip`, `combobox` and `command`) gains `number-input` and `color-picker`; `apps/www` already pins `@radix-ui/react-popover`, so no new dependency is added.

## Preview scenes and gallery

- The Settings scene gains a brand colour `ColorPickerPair` with contrast against its foreground, and a Number Input for the session timeout in minutes.
- `fixtures/shared/preset-gallery.tsx` gets a section for each.

## Verification

Run and record the environment of each:

- `pnpm build:packages`, `pnpm typecheck`, `pnpm test:unit` and `pnpm test:integration`.
- `pnpm generate:preview` and `pnpm test:specimen-audit` limited to the two components.
- Unit tests of the colour maths: hex, RGB and OKLCH round trips within one unit of the last written digit, parsing of each accepted form and rejection of others, and WCAG 2 ratios against reference pairs (#000 on #fff is 21:1; the board's primary on its foreground is 5.1:1).
- Browser tests in both editions:
  - Number Input: arrow, Shift + arrow, Page, Home and End keys change `aria-valuenow`; `1.` stays visible and reports `valid: false` with `aria-invalid` on blur.
  - Color Picker: the area moves with the arrow keys and announces its value text; the hue Slider updates the value; switching the format rewrites the value; a swatch sets the value and is pressed; the contrast pill reads the expected level.
  - Eyedropper: with `window.EyeDropper` stubbed to return `#1d4ed8`, the named button sets the value to its OKLCH form; with the stub rejecting `AbortError`, the value is unchanged; without the stub, the button is absent.
  - Color Picker Pair: a group named by its label, with two named pickers.
- The preset and component editor end-to-end tests, updated for the new controls.
- Board comparison by computed styles in every family.
- `next build` First Load JS for the editor routes, before and after.

## Documentation

- `docs/components/{number-input,color-picker}.md`, the latter covering `ColorPickerPair`, the eyedropper support matrix and the out-of-gamut rule.
- `docs/accessibility-review.md`: check rows for the 2D area, the contrast readout, the steppers and the eyedropper.
- docs/03, the README count (52), the CHANGELOG under Unreleased, and `docs/evidence/editor-inputs-075.md`.

## Out of scope

- Alpha, P3 output and named colours.
- Hold-to-repeat steppers and scrubbing a Number Input by dragging its label.
- The marketing home page's colour controls.
- Releases and the CLI version bump.
