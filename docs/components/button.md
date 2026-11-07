# Button

Button triggers an action. It is available in every style family, in light and dark mode, with `default`, `secondary`, `destructive`, `outline`, `ghost` and `link` variants and `sm`, `default`, `lg`, `icon` and `icon-sm` sizes. The saved preset's `componentDefaults.button` sets the default variant and size in the generated source. `loading` shows a spinner, sets `aria-busy` and disables the button.

## Install and use

```powershell
pnpm exec node packages/cli/dist/main.js add button --cwd APP --dry-run --json
pnpm exec node packages/cli/dist/main.js add button --cwd APP --yes
```

```tsx
import { Button } from '@/components/ui/button'

export function Save() {
  return <Button loading={false}>Save</Button>
}
```

## Radix edition

Projects whose `components.json` uses `radix-nova` or `new-york`, and projects without `components.json`, receive the Radix Button. It renders a native `button` and supports `asChild` through `@radix-ui/react-slot` 1.5.0 to render another element, such as a link, with Button styling. `loading` is ignored with `asChild`.

## Base UI edition

Projects whose `components.json` uses one of shadcn's `base-*` styles receive the Base UI Button, built on `@base-ui/react/button` from `@base-ui/react` 1.9.0. Variants, sizes, `loading`, `data-variant`, `data-size` and `data-slot="button"` match the Radix Button, so the same stylesheets apply.

Base UI uses a `render` prop instead of `asChild`:

```tsx
<Button render={<a href="/docs" />} nativeButton={false}>Docs</Button>
```

With `render`, the Button does not set `type` and ignores `loading`, as the Radix Button does with `asChild`. Pass `nativeButton={false}` when the rendered element is not a `button`, as Base UI requires.

## Generated files and dependencies

The compiler emits `components/ui/button.tsx` and `examples/button.tsx`, plus the shared utility and theme artifacts. Both editions use React 19.3.1, class-variance-authority 0.7.1, clsx 2.1.1 and tailwind-merge 3.7.0. Generated source has no Ombelle runtime dependency.
