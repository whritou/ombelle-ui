# Input

Input is a native single-line text control. It keeps shadcn's `Input` name and `data-slot="input"` marker and has no client boundary. It is available in all eight families (the seven stable families and liquid glass) in light and dark mode. One template serves both the Radix and the Base UI edition, with no dependency beyond React; see [Liquid glass](#liquid-glass) for the glass treatment.

## Install and compose

Build the packages and initialize the target project with a local preset before using the private local CLI:

```powershell
pnpm build:packages
pnpm exec node packages/cli/dist/main.js add input --cwd APP --dry-run --json
pnpm exec node packages/cli/dist/main.js add input --cwd APP --yes
```

```tsx
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export function EmailField() {
  return (
    <>
      <Label htmlFor="email">Email</Label>
      <Input id="email" type="email" autoComplete="email" aria-invalid="true" aria-describedby="email-error" />
      <p id="email-error">Enter an email address.</p>
    </>
  )
}
```

| Export | Native element | Additional prop |
| --- | --- | --- |
| `Input` | `input` | `size`: `sm`, `default` or `lg` |
| `InputProps` | — | Props type: `React.ComponentProps<'input'>` without the HTML `size` attribute, plus `size` |

`type` defaults to `text`. `value`/`defaultValue`, `placeholder`, `required`, `disabled`, `readOnly`, `name`, `autoComplete`, ARIA attributes, event handlers, `className`, `style`, and React 19 refs are forwarded, so both controlled and uncontrolled use work as for a native `input`. The template sets `data-size` when `size` is `sm` or `lg`, spreads caller props, then sets `data-slot="input"`, so a caller cannot replace the marker the styles select on. Its own classes are `w-full` and `disabled:cursor-not-allowed`, merged with `className`. Give every Input an accessible name, normally a [Label](label.md) with `htmlFor`. Associate error text with `aria-describedby`; the application decides when a value is invalid and sets `aria-invalid`. For a label, hint and error wired up for you, use [Field](field.md); for adjacent text, icons, buttons or a counter, use [Input Group](input-group.md).

## States and styles

Input has no stylesheet of its own: its rules are in the family stylesheet, `styles/ui-style.css`, beside Button and Dialog. Each family draws the field its own way:

- **Flat**: a filled field in `--muted` with a 2px `--input` bottom line and top corners rounded; focus fills it with `--card` inside a 2px ring.
- **Minimalist**: an underlined field on a transparent background, with no side or top border; focus thickens the underline to a 3px `--ring` rule (a 2px border and a 1px inset line), so a narrow field still changes over at least its 1px perimeter.
- **Neo-brutalism**: a `--card` field with the preset border and offset shadow and semibold text; focus tints it with `--primary` under a 3px dashed outline.
- **Ombelle**: a `--card` field with the preset border and an inset top shade; focus draws the ring outline and an offset shadow in `--ring`.
- **Papier**: a ruled `--card` field with an inset bottom line; the border turns `--primary` on hover, and focus draws a 2px ring.
- **Organic**: a 2px `--input` border with its own uneven corners and a soft inset shadow; the corners shift on focus, and the border turns `--primary` on hover and focus.
- **Retro futurism**: a 2px `--input` border on a rounded field with an inset top shade; the border turns `--primary` on hover and focus, and focus draws a 3px ring.

| State | Selector | Treatment |
| --- | --- | --- |
| Empty | `::placeholder` | Placeholder text in `--muted-foreground` at full opacity |
| Focus | `:focus-visible` | The family's ring, as above |
| Invalid | `[aria-invalid="true"]` | `--destructive` border, bottom line or shadow, and in flat and neo-brutalism a destructive tint |
| Disabled | `:disabled` | Dashed or dotted edge, muted fill or reduced opacity, and `cursor: not-allowed` |
| Small and large | `[data-size="sm"]`, `[data-size="lg"]` | Shorter or taller field with smaller or larger text; `default` keeps the family's size |

Under forced colors the field uses system colors, loses its shadows, and shows focus as an outline; the invalid border or bottom line becomes `double` in every stable family, so the state does not rely on color. The shared `[data-slot]` reduced-motion rule removes the transitions. Input uses the saved global preset; a later theme operation changes the family stylesheet and tokens, not `input.tsx`.

## Sizes (0.7.3, 1.0)

`size="sm"` and `size="lg"` need CLI **0.7.3** or later, including in component recipes. Leaving the prop out renders what earlier releases render. On `Input`, the prop replaces the HTML `size` attribute; set the field's width with layout or `className` instead.

In 1.0 the sizes follow the [shared size scale](../03-components-styles-accessibility.md#sizes): `sm` and `lg` are one 0.5rem step below and above the default, which is the density's control height plus the family's field edge (2px in flat, 0.25rem in neo-brutalism, organic and retro futurism). Flat `sm` and `lg` fields moved by 2px and neo-brutalism's by 4px to sit exactly one step away, and organic and retro futurism fields now follow compact density.

## Generated files and ownership

Compilation emits `components/ui/input.tsx` and `examples/input.tsx`, together with the shared utility and theme artifacts. There is no `input.css`: the styles come with the family stylesheet. The example is an email field inside its label. The installer honors configured aliases and destination paths.

Input adds no dependency versions: it uses React 19.3.1, clsx 2.1.1, and tailwind-merge 3.7.0. Generated source has no Ombelle runtime dependency.

Adding Input beside existing components preserves their source, the shared utility, and saved project defaults. An identical repeat is a no-op, dry-run writes nothing, and an edit to `input.tsx` produces `FILE_CONFLICT` even with `--yes`.

## Liquid glass

In liquid glass, Input is a field of `background` glass at 55% of the glass opacity under a 60% sheen, with the `input` border, a `foreground` value and a `mutedForeground` placeholder. Focus draws a 2px `foreground` ring that hugs the field; `aria-invalid` gives a 2px `destructive` border; disabled is dashed at 50% opacity. Nested in glass, it drops its own blur and paints at the full nested opacity. Reduced transparency and missing backdrop filters paint `background` opaque; forced colours use `Field` and `FieldText`. Installing it in a glass project needs `@ombelle-ui/cli` 0.5.0 or later. See [liquid glass](liquid-glass.md) for the contrast bound and fallbacks, and [glass form controls evidence](../evidence/glass-form-controls.md) for screenshots.
