# Radio Group

Radio Group picks one value from a set, built on the reviewed Radix Radio Group primitive. It is available in flat, minimalist, neo brutalism, and ombelle, in light and dark mode. Liquid glass is experimental; see [Liquid glass](#liquid-glass). The template is a client component.

## Install and compose

```powershell
pnpm exec node packages/cli/dist/main.js add radio-group --cwd APP --dry-run --json
pnpm exec node packages/cli/dist/main.js add radio-group --cwd APP --yes
```

Plain radios pair a `RadioGroupItem` with a label:

```tsx
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'

export function Density() {
  return (
    <RadioGroup defaultValue="comfortable" aria-label="Density" name="density">
      <div><RadioGroupItem value="comfortable" id="d-1" /><label htmlFor="d-1">Comfortable</label></div>
      <div><RadioGroupItem value="compact" id="d-2" /><label htmlFor="d-2">Compact</label></div>
    </RadioGroup>
  )
}
```

Selectable option rows, as drawn in the sheets, wrap each radio with its label and description:

```tsx
import {
  RadioGroup, RadioGroupItem, RadioGroupOption,
  RadioGroupOptionLabel, RadioGroupOptionDescription,
} from '@/components/ui/radio-group'

export function PlanPicker() {
  return (
    <RadioGroup defaultValue="team" aria-label="Plan">
      <RadioGroupOption>
        <RadioGroupItem value="team" />
        <span>
          <RadioGroupOptionLabel>Team</RadioGroupOptionLabel>
          <RadioGroupOptionDescription>Unlimited projects and shared presets</RadioGroupOptionDescription>
        </span>
      </RadioGroupOption>
      <RadioGroupOption>
        <RadioGroupItem value="enterprise" disabled />
        <span>
          <RadioGroupOptionLabel>Enterprise</RadioGroupOptionLabel>
          <RadioGroupOptionDescription>Contact sales to enable</RadioGroupOptionDescription>
        </span>
      </RadioGroupOption>
    </RadioGroup>
  )
}
```

`RadioGroupOption` is a `<label>`. The whole row selects its radio, and the row's text becomes the radio's accessible name, description included. Name the group with `aria-label` or `aria-labelledby`.

## API and keyboard

- `RadioGroup` forwards the Radix Root props: `value`, `defaultValue`, `onValueChange`, `name`, `required`, `disabled`, `orientation`, `dir`, `loop`.
- `RadioGroupItem` forwards item props (`value`, `disabled`, `id`, `aria-invalid`) and renders its indicator (`radio-group-indicator`) when checked.
- `RadioGroupOption`, `RadioGroupOptionLabel` and `RadioGroupOptionDescription` forward native `label` and `span` props.

Tab moves into the group at the checked radio. Arrow keys move and select, skipping disabled radios, and Space selects the focused radio.

## Styles and artifacts

- Ombelle: outlined cards. The checked card takes the accent fill and an offset shadow, and a disabled card is dashed and faded.
- Flat: filled tiles. The checked tile turns secondary with a primary 2px border, and the dot is primary inside a primary ring.
- Minimalist: rows divided by hairlines. The checked label is bold, and a disabled radio is dashed.
- Neo brutalism: bordered cards with uppercase labels. The checked card is secondary with an offset shadow, and its radio is primary with an ink dot. A disabled card is dashed on the muted fill.

Option rows are styled through `:has()` on the checked or disabled radio. Radios smaller than 24px carry a transparent `::before` that extends the hit target to 24px. Focus rings follow each family. Forced colors use `Highlight` for the checked ring and dot and `GrayText` for disabled radios.

Compilation emits `components/ui/radio-group.tsx`, `components/ui/radio-group.css` and `examples/radio-group.tsx`. Runtime dependencies are exactly React 19.3.1, @radix-ui/react-radio-group 1.5.1 (MIT), clsx 2.1.1 and tailwind-merge 3.7.0.

See [the batch 1 verification record](../evidence/next-components-batch-1.md). Consumer-matrix rows, the browser e2e suite, and human screen-reader review are pending.

## Liquid glass

In liquid glass, radios are field glass with the `input` border; checked is `card` + `primary` 26% / 30% at 80% coverage with a `primary` rim at 60%, a glow and a `foreground` dot. Unchecked option rows are the field surface (`background` at 55%), so the field pairs bound their label and description. A checked row is `card` + `primary` 18% / 22% at 78% coverage with a `primary` rim at 55%; 78% is the lowest coverage at which its `mutedForeground` description passes in dark mode with the built-in preset, and it passes at exactly 4.50:1. Both row coverages are denser than the kit tile's 40% and 70%. Disabled rows are dashed at 55% opacity. In forced colours the checked row and radio take a `Highlight` edge and the dot is `CanvasText`. Installing it in a glass project needs `@ombelle-ui/cli` 0.5.0 or later. See [liquid glass](liquid-glass.md) for the contrast bound and fallbacks, and [glass form controls evidence](../evidence/glass-form-controls.md) for screenshots.

## Base UI edition

Projects whose `components.json` uses one of shadcn's `base-*` styles receive a Radio Group built on `RadioGroup` from `@base-ui/react/radio-group` and `Radio.Root` and `Radio.Indicator` from `@base-ui/react/radio` (`@base-ui/react` 1.9.0) instead of `@radix-ui/react-radio-group`. Group props follow Base UI (`value`, `defaultValue`, `onValueChange`, `disabled`, `name`, `required`); `RadioGroupOption`, its label and description, and every `data-slot` match the Radix edition. Base UI renders each item as a `span` with `role="radio"` plus a hidden input, instead of Radix's `button`.

State bridge: items and indicators carry `data-state="checked"` or `"unchecked"` from Base UI's state, next to Base UI's `data-checked`/`data-unchecked`, through each part's `render` function; a custom `render` replaces it. The option row's `:has([data-state='checked'])` styling therefore applies unchanged. The parity test covers default, clicked, hover, focus-visible and arrow-key selection. The Base UI edition has no allowed styling differences.
