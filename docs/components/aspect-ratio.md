# Aspect Ratio

Aspect Ratio keeps a preview, video or image at a fixed ratio while its width follows the layout, so nothing jumps while media loads. It is available in all five families in light and dark mode; one server template serves the Radix and Base UI editions, and it has no dependency beyond React.

This component requires CLI **0.7.6** or later: `npx @ombelle-ui/cli@0.7.6 add aspect-ratio`. For a built local checkout:

```powershell
pnpm exec node packages/cli/dist/main.js add aspect-ratio --cwd APP --dry-run --json
pnpm exec node packages/cli/dist/main.js add aspect-ratio --cwd APP --yes
```

```tsx
import { AspectRatio } from '@/components/ui/aspect-ratio'

export function Preview() {
  return (
    <AspectRatio ratio={16 / 9} style={{ maxInlineSize: '32rem' }}>
      <img src="/preview.png" alt="The Ombelle preset gallery in light mode" />
    </AspectRatio>
  )
}
```

## API and accessibility

- `ratio` is width over height, such as `16 / 9` (the default), `4 / 3` or `1`. It sets the CSS `aspect-ratio` property inline; your own `style` is kept.
- An `img`, `video`, `iframe`, `picture` or `canvas` child fills the frame with `object-fit: cover`. Give images their own `alt` text; the frame adds no role or name.
- Without media, the frame shows the family's muted surface and centres its children.
- The root is `data-slot="aspect-ratio"` with the family's border and radius. Forced colours keep the border.

## Recipe

The recipe editor sets `ratio` (`16/9`, `4/3`, `1/1`, `3/2` or `21/9`) and the label shown inside the frame. Compilation emits `components/ui/aspect-ratio.tsx`, `components/ui/aspect-ratio.css` and `examples/aspect-ratio.tsx`. Runtime dependencies are React 19.3.1, clsx 2.1.1 and tailwind-merge 3.7.0.

## Base UI edition

The Base UI edition uses the same template: Aspect Ratio has no primitive.

## Liquid glass

Liquid glass support is experimental: the frame uses a translucent surface over the backdrop.
