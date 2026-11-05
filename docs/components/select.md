# Select

Select is a custom single-value listbox built on the reviewed Radix Select primitive. It is available in flat, minimalist, neo brutalism, and ombelle, in light and dark mode. Liquid glass is experimental; see [Liquid glass](#liquid-glass). The template is a client component. Use [Native Select](native-select.md) when you need the platform picker, native form autofill, or no JavaScript.

## Install and compose

Build packages and initialize the target project with a local preset, then use the private local CLI:

```powershell
pnpm build:packages
pnpm exec node packages/cli/dist/main.js add select --cwd APP --dry-run --json
pnpm exec node packages/cli/dist/main.js add select --cwd APP --yes
```

```tsx
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from '@/components/ui/select'

export function RolePicker() {
  return (
    <>
      <label id="role-label">Role</label>
      <Select defaultValue="designer" name="role">
        <SelectTrigger aria-labelledby="role-label">
          <SelectValue placeholder="Choose a role" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="designer">Designer</SelectItem>
          <SelectItem value="engineer">Engineer</SelectItem>
          <SelectItem value="researcher" disabled hint="Seat limit">Researcher</SelectItem>
        </SelectContent>
      </Select>
    </>
  )
}
```

Give the trigger an accessible name with `aria-labelledby` or `aria-label`. Radix supplies the `combobox` and `listbox` roles, `aria-expanded`, the active option, typeahead and the hidden native select used for form submission when `name` is set.

## API and keyboard

- `Select` forwards the Radix Root props: `value`, `defaultValue`, `onValueChange`, `open`, `defaultOpen`, `onOpenChange`, `name`, `required`, `disabled`, `dir`.
- `SelectTrigger` forwards trigger props and adds `size` (`default` or `sm`). It renders a chevron icon (`select-icon`) that turns while open. Set `aria-invalid` to show the invalid state.
- `SelectContent` renders in a portal. It defaults to `position="popper"` with a 6px `sideOffset`, opening below the trigger at least as wide as the trigger. Pass `position="item-aligned"` for the macOS-style overlay. It includes scroll buttons and a viewport.
- `SelectItem` forwards item props (`value`, `disabled`, `textValue`). Its children become the selected value text. The optional `hint` renders after the label (for example why an option is disabled), stays out of the selected value, and is linked to the option with `aria-describedby`.
- `SelectGroup`, `SelectLabel`, `SelectSeparator`, `SelectScrollUpButton` and `SelectScrollDownButton` forward their Radix parts.

Space, Enter and the arrow keys open the list; arrows, Home and End move the highlight; typing jumps to a matching option; Enter or Space selects; Escape closes and returns focus to the trigger. Disabled options are skipped.

## Styles and artifacts

Each family follows its UI kit and the "next 10 components" sheet:

- Ombelle: an outlined field with a small offset shadow, a pill-highlighted list with an offset shadow, a primary check on the selected option, and an uppercase hint.
- Flat: a filled field with a 2px underline that turns primary while open, an elevated list, and a tinted highlight.
- Minimalist: an underlined field that thickens while open, a hairline list with a soft shadow, and a muted highlight.
- Neo brutalism: a bordered field with the chevron in a primary box. The list has rules between options, a primary highlight, a secondary selected row, and a striped disabled row.

Offset shadows use `var(--shadow-color, var(--border))`, so dark ombelle and neo brutalism presets cast their rose and pink shadows. The trigger uses the catalog control height (`--control-height`); options are at least 36px tall. Focus rings follow each family. Forced colors use `Field`, `Highlight` and `GrayText`, and remove shadows. Reduced motion removes the open animation and chevron turn.

Compilation emits `components/ui/select.tsx`, `components/ui/select.css` and `examples/select.tsx` plus the shared utility and theme files. Adding Select does not change existing artifacts. Runtime dependencies are exactly React 19.3.1, @radix-ui/react-select 2.4.1 (MIT), clsx 2.1.1, tailwind-merge 3.7.0 and lucide-react 1.55.0.

Catalog, compiler and preview checks cover this slice; see [the batch 1 verification record](../evidence/next-components-batch-1.md). Consumer-matrix rows, the browser e2e suite, and human NVDA and VoiceOver review are pending.

## Liquid glass

In liquid glass, the trigger is the Input field surface with a `foreground` value, a `mutedForeground` placeholder and a static `mutedForeground` chevron (the kit does not turn it). The list is the Dropdown Menu glass surface: nested glass inside it drops its own blur, and it animates only while open. A highlighted option is the `popover` glass tinted with `primary` 18% light / 22% dark; its text and its hint are declared contrast pairs on that tint. The selected option is weight 600 with the check, and a disabled option is `mutedForeground`. Reduced transparency mixes the highlight into an opaque `popover`; forced colours use `Field`, `Highlight` and `GrayText`, and the check stays visible. Installing it in a glass project needs `@ombelle-ui/cli` 0.5.0 or later. See [liquid glass](liquid-glass.md) for the contrast bound and fallbacks, and [glass form controls evidence](../evidence/glass-form-controls.md) for screenshots.
