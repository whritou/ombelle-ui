# Switch

Switch wraps the reviewed Radix Switch primitive. It supports flat, minimalist, and neo-brutalism in light and dark modes through semantic tokens. Liquid glass is unavailable. The template is a client component.

## Install and compose

Build packages and initialize the target project with a local preset, then use the private local CLI:

```powershell
pnpm build:packages
pnpm exec node packages/cli/dist/main.js add switch --cwd APP --dry-run --json
pnpm exec node packages/cli/dist/main.js add switch --cwd APP --yes
```

```tsx
import { Switch, SwitchThumb } from '@/components/ui/switch'

export function NotificationSetting() {
  return (
    <>
      <label htmlFor="notifications">Enable notifications</label>
      <Switch id="notifications" name="notifications" value="enabled">
        <SwitchThumb />
      </Switch>
    </>
  )
}
```

Every Switch requires an accessible name, normally a visible label whose htmlFor matches its id. The root uses role="switch" and announces off/on through aria-checked="false"/"true". Tab focuses an enabled control; Space toggles it. Enter is prevented from toggling or submitting the primitive button. Applications provide descriptions with aria-describedby as needed.

## API and forms

Switch and SwitchProps expose React.ComponentProps<typeof SwitchPrimitive.Root>. checked and defaultChecked are booleans; onCheckedChange receives the next boolean state. Use checked with onCheckedChange for controlled state, or defaultChecked for uncontrolled state. Event handlers, primitive props, className, style, and the React 19 ref reach the visible root button. Its slot is switch.

SwitchThumb forwards React.ComponentProps<typeof SwitchPrimitive.Thumb>, including className, style, and ref, to the primitive thumb span. Its slot is switch-thumb. Switch supplies a default SwitchThumb when children are absent. Supplying children allows an explicitly customized thumb as shown above. The primitive sets data-state on both parts; thumb position uses that state and logical inline placement for RTL.

Radix renders a hidden native checkbox when the root belongs to a form and forwards name, value (default on), required, disabled, and form. Checked controls submit their value; unchecked controls contribute no value. Required validation uses that input. Disabled controls, including descendants of a disabled fieldset, cannot activate and contribute no form value. The native :disabled selector styles fieldset-disabled roots too. An uncontrolled form reset restores defaultChecked. Controlled state remains owned by the application; handle reset in that state owner as appropriate. Refs target the visible button or thumb, not the hidden input.

## Styles and generated artifacts

The root target is 44 by 24 CSS pixels, with a 16px thumb. Consumers can enlarge the block dimension through layout or labels. Off uses muted background and foreground tokens; on uses primary and primary-foreground. All families include visible 3px ring focus with 3px offset, disabled styling, forced-color system colors, and reduced-motion rules. Flat and minimalist use rounded tracks; minimalist uses the input border token, and neo-brutalism uses the preset radius and offset shadow. Logical positioning supports both text directions. Focus is not clipped.

Compilation emits components/ui/switch.tsx, components/ui/switch.css, and examples/switch.tsx plus shared utility/theme artifacts. Keep the colocated CSS import. The example includes a visible label and explicit thumb composition. Installer dry-run, aliases, destination paths, ownership hashes, and conflict safeguards remain in effect; --yes accepts a safe plan.

Runtime dependencies are exactly React 19.3.1, @radix-ui/react-switch 1.4.1 (MIT), clsx 2.1.1, and tailwind-merge 3.7.0. There is no Ombelle runtime dependency; the primitive is scoped to Switch imports.

Focused catalog/compiler checks and a local Chromium behavior probe cover this implementation. Shared preview and generated consumer matrix evidence belongs to the final M2 verification task. Human NVDA and VoiceOver review remains pending.
