# Checkbox

Checkbox wraps the reviewed Radix Checkbox primitive with Lucide check and minus marks. It supports `flat`, `minimalist`, `neo-brutalism`, and `ombelle` in light and dark modes. Liquid glass is experimental; see [Liquid glass](#liquid-glass). The component is a client component.

## Install and compose

Build packages and initialize the target project with a local preset, then use the private local CLI:

```powershell
pnpm build:packages
pnpm exec node packages/cli/dist/main.js add checkbox --cwd APP --dry-run --json
pnpm exec node packages/cli/dist/main.js add checkbox --cwd APP --yes
```

```tsx
import { Checkbox } from '@/components/ui/checkbox'

export function TermsField() {
  return (
    <>
      <label htmlFor="terms">Accept terms</label>
      <Checkbox id="terms" name="terms" value="accepted" required
        aria-invalid="true" aria-describedby="terms-error" />
      <p id="terms-error">Accept the terms to continue.</p>
    </>
  )
}
```

`Checkbox` and `CheckboxProps` expose `React.ComponentProps<typeof CheckboxPrimitive.Root>`. Props, event handlers, `className`, `style`, and the React 19 `ref` reach the primitive root button. `checked` and `defaultChecked` accept `boolean | 'indeterminate'`; `onCheckedChange` receives that state. Use `checked` with `onCheckedChange` for controlled state or `defaultChecked` for uncontrolled state. The root and indicator slots are `checkbox` and `checkbox-indicator`; the indicator contains decorative icons selected by the primitive's `data-state`. The component supplies its indicator children. As with shadcn, consumers normally compose it beside a label, rather than putting children inside the root.

Every Checkbox needs an accessible name, normally a visible `label` with matching `htmlFor` and `id`. The application supplies `aria-invalid` and links error/help text using `aria-describedby`. Mixed state is announced with `aria-checked="mixed"`. Tab focuses the enabled control; Space toggles it, including mixed to checked. Enter does not toggle or submit the root button. Callers manage selection-group semantics and mixed parent state.

## Variants (0.7.5)

These need CLI **0.7.5** or later, including in component recipes. Leaving a prop or part out renders what earlier releases render.

```tsx
import { CheckboxOption } from '@/components/ui/checkbox'

<CheckboxOption name="extras" value="examples" title="Include examples" description="Adds examples next to the component." />
<CheckboxOption appearance="card" name="targets" value="vite" title="Vite" description="React 19" />
```

- **`CheckboxOption`** takes every `Checkbox` prop plus `title` (required), `description` and `appearance` (`row`, the default, or `card`).
  - It renders a `label` (`checkbox-option`, with `data-appearance`) holding the checkbox, the title (`checkbox-option-title`) and the description (`checkbox-option-description`).
  - The title names the checkbox through the wrapping label; the description describes it through `aria-describedby`, merged with any `aria-describedby` you pass.
  - A click anywhere on the row or card toggles the checkbox once, in both editions and inside a form. The keyboard is the checkbox's own: Tab, then Space.
  - `className` goes on the label; the other props go on the checkbox.
- **Row** follows each family's Radio Group option row. **Card** is a padded tile with the box at its top-end corner; when checked it takes a `--primary` border and a 3px `--primary` halo at 25 %, as Card Option does. In forced colours the checked option takes a `Highlight` edge.
- **Recipe:** `option` (`none`, `row` or `card`) and the content field `description`. A description shows only with a row or card option.

## Checkbox Group (0.7.6)

`checkbox.tsx` also exports `CheckboxGroup`, `CheckboxGroupParent` and `CheckboxGroupCount`. They ship in the Checkbox component because the group drives each checkbox: a project that installed Checkbox before 0.7.6 gets them by adding Checkbox again (`add checkbox`). They need CLI **0.7.6**. Pair the group with Field's `FieldSet` and `FieldLegend` to name it.

```tsx
import { CheckboxGroup, CheckboxGroupParent, CheckboxOption } from '@/components/ui/checkbox'
import { FieldLegend, FieldSet } from '@/components/ui/field'

export function Overlays() {
  return (
    <FieldSet>
      <FieldLegend>Overlays to install</FieldLegend>
      <CheckboxGroup defaultValue={['dialog', 'popover']}>
        <CheckboxGroupParent title="All overlays" />
        <CheckboxOption value="dialog" title="Dialog" />
        <CheckboxOption value="popover" title="Popover" />
        <CheckboxOption value="sheet" title="Sheet" />
        <CheckboxOption value="tooltip" title="Tooltip" />
      </CheckboxGroup>
    </FieldSet>
  )
}
```

- `CheckboxGroup` takes `value`, `defaultValue` and `onValueChange` as lists of values, and `disabled`. Every `Checkbox` or `CheckboxOption` inside it with a `value` takes its checked state from the group; outside a group, nothing changes. `allValues` names the values the parent controls when the checkboxes are not direct descendants.
- `CheckboxGroupParent` reads checked when every child is checked, unchecked when none is, and mixed (`aria-checked="mixed"`) otherwise; it points at the children with `aria-controls`. Pressing it checks every enabled child, or clears them when all enabled children are already checked. Disabled children keep their state. It shows "2 of 4" after its title unless `count={false}`; `CheckboxGroupCount` shows the same count anywhere in the group.
- Options inside a group are drawn as compact rows, indented under the parent.
- The Base UI edition builds the group with the same logic as the Radix edition, not `@base-ui/react/checkbox-group`, whose parent restores the earlier mixed state on a third press. A Base UI checkbox is a `span`, so it reads the nearest disabled `fieldset` itself.
- **Recipe:** `group` (`none` or `parent`) and the content fields `legend` and up to six `options`. A group needs a legend and at least two options.

## Form behavior

Radix renders a hidden native checkbox input when the root belongs to a form, forwarding `name`, `value` (default `on`), `required`, `disabled`, and `form`. Checked controls submit their value; unchecked and indeterminate controls do not. `required` uses native validation through that input. A disabled control, including one inside a disabled `fieldset`, cannot be activated and contributes no submitted value. The native `:disabled` selector also styles fieldset-disabled roots. An uncontrolled form reset restores the initial state, including an initial mixed state. Controlled state remains owned by the application; handle reset in that state owner as appropriate. Forwarded refs target the visible button, not the hidden input.

## Styles and generated files

The root has a 24 by 24 CSS pixel target with semantic background/foreground and border tokens. Checked and mixed states use `--primary` and `--primary-foreground` with distinct check/minus marks. All families expose a visible 3px `--ring` focus outline at a 3px offset, destructive invalid border, disabled treatment, forced-color system colors and double invalid borders, and reduced-motion rules. Minimalist uses `--input` for the border; neo-brutalism and ombelle add the preset offset shadow. Logical sizes and spacing support RTL. Consumers can enlarge the target with layout or labels.

Compilation emits `components/ui/checkbox.tsx`, `components/ui/checkbox.css`, and `examples/checkbox.tsx`, plus shared utility and theme artifacts. Keep the colocated CSS import when moving the source. The generated example includes labelled required/invalid and mixed controls. The installer respects aliases, destination paths, ownership hashes, dry-run, and conflict checks; `--yes` does not bypass modified-file conflicts.

Runtime dependencies are exactly React 19.3.1, `@radix-ui/react-checkbox` 1.4.1 (MIT), `lucide-react` 1.55.0 (ISC), clsx 2.1.1, and tailwind-merge 3.7.0. Generated components have no Ombelle runtime dependency. Primitive dependencies are scoped to this component's imports.

Focused catalog/compiler checks and a local Chromium behavior probe cover this implementation. Full preview/generated-consumer matrix coverage is part of the shared final M2 verification task. Human NVDA and VoiceOver review remains pending; this page does not claim that review or certify consuming applications.

## Liquid glass

In liquid glass, the box is field glass (`background` at 55%) with the `input` border. Checked and indeterminate are `card` + `primary` at the resting tint + 8 points (26% light, 30% dark) at 80% coverage, with a `primary` rim at 60% and a glow; the mark stays `foreground`, a declared contrast pair at 80%. Disabled is dashed at 50% opacity. Reduced transparency and missing backdrop filters paint the same surfaces opaque; in forced colours the checked box takes a `Highlight` edge and the visible mark carries the state. Installing it in a glass project needs `@ombelle-ui/cli` 0.5.0 or later. See [liquid glass](liquid-glass.md) for the contrast bound and fallbacks, and [glass form controls evidence](../evidence/glass-form-controls.md) for screenshots.

## Base UI edition

Projects whose `components.json` uses one of shadcn's `base-*` styles receive a Checkbox built on `Checkbox.Root` and `Checkbox.Indicator` from `@base-ui/react/checkbox` (`@base-ui/react` 1.9.0) instead of `@radix-ui/react-checkbox`. The Ombelle API is kept: `checked` and `defaultChecked` accept `true`, `false` or `'indeterminate'`, and an uncontrolled indeterminate checkbox becomes checked on its first change, as with Radix. The template maps this to Base UI's separate `indeterminate` prop. `onCheckedChange` receives a boolean. `data-slot` values and the check and minus marks match the Radix edition. Base UI renders the root as a `span` with `role="checkbox"` plus a hidden input, instead of Radix's `button`.

State bridge: the root and indicator carry `data-state` `checked`, `unchecked` or `indeterminate` from Base UI's state, next to Base UI's own attributes, through each part's `render` function; a custom `render` replaces it. `data-disabled` comes from Base UI. The parity test covers default, checked, cleared indeterminate, invalid, disabled, hover and focus-visible states. The Base UI edition has no allowed styling differences.
