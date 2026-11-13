# Color Picker

Color Picker is a colour field: a swatch button and a text field. The button opens a popover with a saturation and brightness area, a hue slider, a format row with an eyedropper, swatches and a contrast readout. `ColorPickerPair` groups a light and a dark picker for one design token. It is available in all five families in light and dark mode, with Radix and Base UI editions. The template is a client component.

This component requires CLI **0.7.5** or later: `npx @ombelle-ui/cli@0.7.5 add color-picker`. For a built local checkout:

```powershell
pnpm exec node packages/cli/dist/main.js add color-picker --cwd APP --dry-run --json
pnpm exec node packages/cli/dist/main.js add color-picker --cwd APP --yes
```

```tsx
import { ColorPicker, ColorPickerPair } from '@/components/ui/color-picker'

const swatches = [{ label: 'Rose', value: 'oklch(0.55 0.22 6)' }, { label: 'Ink', value: 'oklch(0.22 0.012 275)' }]

export function PrimaryToken() {
  return (
    <ColorPickerPair label="Primary">
      <ColorPicker mode="light" defaultValue="oklch(0.55 0.22 6)" swatches={swatches}
        contrastWith="oklch(0.99 0 0)" contrastLabel="primary foreground" />
      <ColorPicker mode="dark" defaultValue="oklch(0.7 0.18 6)" swatches={swatches}
        contrastWith="oklch(0.16 0.01 275)" contrastLabel="primary foreground" />
    </ColorPickerPair>
  )
}
```

Color Picker is self-contained. It uses the Popover and Slider primitives of its edition directly and draws its own fields. It does not install the catalog's Popover, Slider, Input or Native Select. Each family's stylesheet repeats the Input, Popover, Slider and Badge looks.

## API

- `value` or `defaultValue` is a CSS colour string, and `onValueChange(value)` reports a new one. An empty string is allowed: the field then shows `placeholder`, and the swatch shows the placeholder colour when it is one.
- `onInvalid(text)` reports text in the field that is not a colour. The text stays in the field, marked `aria-invalid`.
- `label` names the swatch button ("Open <label> color picker"), the text field and the popover ("<label> color"). `id` and `name` go to the text field, and so do `aria-invalid` and `aria-describedby`, so an editor's own error message reaches it.
- `format` or `defaultFormat` is `oklch` (the default), `hex` or `rgb`, with `onFormatChange`. New values from the area, the hue, a swatch or the eyedropper are written in this format. Switching the format rewrites the format field. It does not change the value until the area, the hue, a swatch or the eyedropper changes it.
- `swatches` is a list of `{ label, value }`. They show in the popover. Placed as a child of a `ColorPicker`, `ColorPickerSwatches` shows them beside the trigger instead.
- `formats` lists the formats the format select offers, such as `['oklch', 'hex']` when only those can be stored. The website editors pass that.
- `container` sets where the popover is portalled. By default it goes into the nearest native popover or open dialog around the picker, which the browser draws above the page. The picker's popover then stays above it, and clicks in it do not dismiss it. Otherwise it goes into the document body. `maxLength` goes to the text field.
- `contrastWith` and `contrastLabel` turn on the contrast readout. `eyeDropper={false}` hides the eyedropper. `mode` (`light` or `dark`) is for pickers inside a pair.
- `ColorPickerPair({ label })` is a group named by `label`. A child with `mode` and no `label` is named "<label> · light" or "<label> · dark". The dark child's swatch sits on a dark backdrop, so a light colour stays visible. The pair only groups, names and lays out its pickers, in two columns that stack when the pair is narrower than about 360px.

## Accepted colours and the out-of-gamut rule

The field reads `#rgb`, `#rrggbb`, `rgb(r g b)`, `rgb(r, g, b)` and `oklch(L C H)`, with L as a percentage or a number from 0 to 1. Anything else, such as a colour name or `hsl()`, is invalid. Values are written as follows:

- hex as lowercase `#rrggbb`;
- RGB as `rgb(r g b)`;
- OKLCH as `oklch(0.55 0.22 6)`, with L and C to three decimals and H to one, trailing zeros trimmed.

A typed OKLCH colour outside the sRGB gamut is kept exactly as typed. The area and the hue show the nearest colour in gamut, at the same lightness and hue with less chroma. Opening the popover, focusing a control or switching the format does not rewrite the value. Only the area, the hue, a swatch or the eyedropper replaces it.

A swatch whose value is already written in the current format is applied as written. Otherwise it is converted.

An alpha in the space forms (`oklch(0.97 0.004 350 / 14%)`, `rgb(29 78 216 / 50%)`) is read and kept: area, hue and swatch edits write it back, as a percentage in OKLCH and RGB. Hex has no alpha here. The picker does not edit alpha. Wide-gamut (P3) output, colour names and other colour spaces are not supported.

## Accessibility

- The area is one focusable element with `role="slider"` and `aria-roledescription="2D slider"`. It is named "<label> saturation and brightness" and its `aria-valuetext` reads "Saturation 72%, brightness 28%". Left and Right change the saturation, and Up and Down change the brightness, by 1, or by 10 with Shift. It works in HSV at the current hue, so every point is in gamut.
- Dragging or stepping to black, white or grey keeps the hue. While the value is the one the picker wrote, the picker keeps its own saturation, brightness and hue, so the 8-bit rounding of Hex and RGB cannot move them.
- The hue is a slider named "Hue", from 0 to 360, with value text "Hue, 6 degrees".
- The format row holds a select named "Color format", a field named "<Format> value" and the eyedropper.
- Swatches are buttons named by their label. A swatch has `aria-pressed="true"` when it equals the value.
- The contrast readout shows the WCAG 2 ratio, such as "5.3:1 on primary foreground", and a level written as text: AAA (7:1 or more), AA (4.5:1), AA large (3:1) or Fails. A polite live region announces the ratio of the new colour when a drag, a key press, a swatch or a pick ends, not on every move. The printed ratio is rounded down, so it never shows a level the colour misses.

## Eyedropper

The eyedropper is a button named "Pick a color from the screen". It renders only after mount, and only where the browser has the EyeDropper API, so the server output matches the first client render. The picked colour becomes the value in the current format. Esc keeps the value. Closing the popover, or unmounting the picker, cancels a pick still in progress, and a result that arrives after that is ignored.

| Browser | Eyedropper |
| --- | --- |
| Chrome and Edge (desktop) | Shown |
| Firefox | Not shown: no EyeDropper API |
| Safari | Not shown: no EyeDropper API |

## Recipe

The recipe editor sets `format`, `paired`, `contrast`, `swatches` (0 to 8) and `eyeDropper`, and the label, value and dark value. The defaults follow the 0.7.5 board: a paired Primary token, `oklch(0.55 0.22 6)` in light and `oklch(0.7 0.18 6)` in dark, with five swatches. With `contrast`, the readout measures against the Ombelle primary foreground of each mode.

A recipe is rejected when its value, or its dark value when paired, is not an accepted colour, or when its label is blank. An unpaired recipe ignores its dark value, so the editor can switch the pair off and back on. Compilation emits `components/ui/color-picker.tsx`, `components/ui/color-picker.css` and `examples/color-picker.tsx`.

Runtime dependencies are React 19.3.1, clsx 2.1.1, tailwind-merge 3.7.0 and lucide-react 1.55.0. The Radix edition adds @radix-ui/react-popover 1.3.1 and @radix-ui/react-slider 1.6.1.

## Base UI edition

The Base UI edition uses `Popover` and `Slider` from `@base-ui/react` and adds no dependency. The colour maths and the picker itself are the same code in both editions, and a catalog test keeps them identical. Only the popover and slider parts differ. The props, names and `data-slot` values are the same.

## Liquid glass

Liquid glass is experimental for Color Picker, as for every glass component, and its findings do not block a release. See [liquid glass](liquid-glass.md).

See [editor inputs evidence](../evidence/editor-inputs-075.md) for the tests, the specimen audit and the board comparison.
