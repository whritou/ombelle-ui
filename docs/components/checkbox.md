# Checkbox

Checkbox wraps the reviewed Radix Checkbox primitive with Lucide check and minus marks. It supports `flat`, `minimalist`, and `neo-brutalism` in light and dark modes. Liquid glass is unavailable. The component is a client component.

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

## Form behavior

Radix renders a hidden native checkbox input when the root belongs to a form, forwarding `name`, `value` (default `on`), `required`, `disabled`, and `form`. Checked controls submit their value; unchecked and indeterminate controls do not. `required` uses native validation through that input. A disabled control, including one inside a disabled `fieldset`, cannot be activated and contributes no submitted value. The native `:disabled` selector also styles fieldset-disabled roots. An uncontrolled form reset restores the initial state, including an initial mixed state. Controlled state remains owned by the application; handle reset in that state owner as appropriate. Forwarded refs target the visible button, not the hidden input.

## Styles and generated files

The root has a 24 by 24 CSS pixel target with semantic background/foreground and border tokens. Checked and mixed states use `--primary` and `--primary-foreground` with distinct check/minus marks. All families expose a visible 3px `--ring` focus outline at a 3px offset, destructive invalid border, disabled treatment, forced-color system colors and double invalid borders, and reduced-motion rules. Minimalist uses `--input` for the border; neo-brutalism adds the preset offset shadow. Logical sizes and spacing support RTL. Consumers can enlarge the target with layout or labels.

Compilation emits `components/ui/checkbox.tsx`, `components/ui/checkbox.css`, and `examples/checkbox.tsx`, plus shared utility and theme artifacts. Keep the colocated CSS import when moving the source. The generated example includes labelled required/invalid and mixed controls. The installer respects aliases, destination paths, ownership hashes, dry-run, and conflict checks; `--yes` does not bypass modified-file conflicts.

Runtime dependencies are exactly React 19.3.1, `@radix-ui/react-checkbox` 1.4.1 (MIT), `lucide-react` 1.55.0 (ISC), clsx 2.1.1, and tailwind-merge 3.7.0. Generated components have no Ombelle runtime dependency. Primitive dependencies are scoped to this component's imports.

Focused catalog/compiler checks and a local Chromium behavior probe cover this implementation. Full preview/generated-consumer matrix coverage is part of the shared final M2 verification task. Human NVDA and VoiceOver review remains pending; this page does not claim that review or certify consuming applications.
