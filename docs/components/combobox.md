# Combobox

Combobox is a text field that filters a list of options. It can offer to create a name that no option has, and in multiple mode the chosen options show as chips in the field. It is available in all five families in light and dark mode, with Radix and Base UI editions; the template is a client component.

This component requires CLI **0.7.3** or later: `npx @ombelle-ui/cli@0.7.3 add combobox`. For a built local checkout:

```powershell
pnpm exec node packages/cli/dist/main.js add combobox --cwd APP --dry-run --json
pnpm exec node packages/cli/dist/main.js add combobox --cwd APP --yes
```

```tsx
import { Combobox, ComboboxContent, ComboboxCreate, ComboboxEmpty, ComboboxInput, ComboboxItem, ComboboxList } from '@/components/ui/combobox'

export function PresetPicker({ presets, onAdd }: { presets: string[]; onAdd(name: string): void }) {
  const [preset, setPreset] = React.useState('Ombelle')
  return (
    <>
      <label id="preset-label">Preset</label>
      <Combobox value={preset} onValueChange={setPreset} onCreate={onAdd}>
        <ComboboxInput aria-labelledby="preset-label" placeholder="Search presets" />
        <ComboboxContent>
          <ComboboxList>
            {presets.map(name => <ComboboxItem key={name} value={name}>{name}</ComboboxItem>)}
            <ComboboxCreate />
          </ComboboxList>
          <ComboboxEmpty>No presets found.</ComboboxEmpty>
        </ComboboxContent>
      </Combobox>
    </>
  )
}
```

## API and accessibility

- `Combobox` takes `value` or `defaultValue`, `onValueChange`, `multiple`, `disabled`, `name` (one hidden input per value) and `defaultQuery`. The value is a string, or an array of strings with `multiple`.
- Write the options as `ComboboxItem` elements below `Combobox`; arrays and fragments are fine. The field reads them to know the labels, the order and the create row before the list opens, so options rendered inside your own component are not reached by the arrow keys and show their value instead of their label once chosen.
- `ComboboxItem` takes its `value`; its text is the label, and the part of it that matches the query is wrapped in `<mark>`. `ComboboxGroup` takes a `heading` and hides itself when none of its options match.
- `ComboboxCreate` offers `Create “query”` when the trimmed query is not blank and no option label equals it, ignoring case. Choosing it calls `onCreate(query)`; without `onCreate`, the typed name becomes the value.
- Opening the list shows every option with the current one highlighted; typing filters them. Arrow keys move the highlight, Enter chooses, Escape closes and keeps the value, and Tab leaves. The field shows the chosen option's label whenever the person is not typing, including after the value changes from outside.
- In multiple mode, choosing an option toggles it and keeps the list open. Backspace in the empty field removes the last chip, and each chip has a "Remove …" button.
- The input is a `combobox` with `aria-expanded`, `aria-controls` and `aria-activedescendant`; focus stays in it while the list is open. Options are `option`s, and chosen ones show a check; in the Radix edition `aria-checked` also tells which are chosen in multiple mode.
- `ComboboxEmpty` is a polite live region that is always present, so "No presets found." is announced. Place it after `ComboboxList`.
- `highlightMatch(text, query)` and `shouldOfferCreate(query, labels)` are exported for custom option content.
- Name the field with a label (`aria-labelledby`, or `FieldControl` inside a Field).

## Recipe

The recipe editor sets the mode (single or multiple), whether to offer Create, the selected options, the label, placeholder and empty text, and the options with an optional group. Compilation emits `components/ui/combobox.tsx`, `components/ui/combobox.css` and `examples/combobox.tsx`.

Runtime dependencies of the Radix edition are React 19.3.1, @radix-ui/react-popover 1.3.1, clsx 2.1.1, tailwind-merge 3.7.0 and lucide-react 1.55.0. The Base UI edition uses @base-ui/react 1.9.0 in place of Radix Popover.

## Editions

- **Radix edition:** Radix Popover positions the list against the field; the template filters, highlights and chooses. It does not use cmdk, which manages its own input and conflicts with a field outside its list.
- **Base UI edition (Combobox):** Base UI navigates the visible options and draws the chips; the template filters them.

Part names and `data-slot` values are the same in both editions.

## Liquid glass

Liquid glass is experimental for Combobox, as for every glass component, and its findings do not block a release. See [liquid glass](liquid-glass.md).

See [overlays and search evidence](../evidence/overlays-search-073.md) for the board comparison, the specimen audit and the browser tests.
