# Kbd

Kbd shows a keyboard key with the native `kbd` element, and KbdGroup keeps keys pressed together on one line. It is available in all five families in light and dark mode, in one template for both editions, with no client boundary.

This component requires CLI **0.7.3** or later: `npx @ombelle-ui/cli@0.7.3 add kbd`. For a built local checkout:

```powershell
pnpm exec node packages/cli/dist/main.js add kbd --cwd APP --dry-run --json
pnpm exec node packages/cli/dist/main.js add kbd --cwd APP --yes
```

```tsx
import { Kbd, KbdGroup } from '@/components/ui/kbd'

export function SearchHint() {
  return (
    <p>
      Search{' '}
      <KbdGroup>
        <Kbd>Ctrl</Kbd>
        <Kbd>K</Kbd>
      </KbdGroup>
    </p>
  )
}
```

## API and accessibility

- `Kbd` renders `kbd` with `data-slot="kbd"`; `KbdGroup` renders a `span` with `data-slot="kbd-group"`. Both forward their props and ref.
- Keys are text, so screen readers read them as written. Write the key names you want spoken ("Ctrl", not "^").
- Kbd is not interactive and takes no focus.

## Recipe

The recipe editor sets the keys (default "Ctrl K"); each space-separated key becomes a `Kbd` in one `KbdGroup`. Compilation emits `components/ui/kbd.tsx`, `components/ui/kbd.css` and `examples/kbd.tsx`. Runtime dependencies are React 19.3.1, clsx 2.1.1 and tailwind-merge 3.7.0.

## Liquid glass

Liquid glass is experimental for Kbd, as for every glass component, and its findings do not block a release. See [liquid glass](liquid-glass.md).

See [display components evidence](../evidence/display-components.md) for the board comparison and the specimen audit.
