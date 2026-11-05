# Avatar

Avatar shows a person's image, with their initials as a fallback while the image loads or when it fails, built on the reviewed Radix Avatar primitive. It is available in flat, minimalist, neo brutalism, and ombelle, in light and dark mode. Liquid glass is unavailable. The template is a client component.

## Install and compose

```powershell
pnpm exec node packages/cli/dist/main.js add avatar --cwd APP --dry-run --json
pnpm exec node packages/cli/dist/main.js add avatar --cwd APP --yes
```

```tsx
import {
  Avatar, AvatarImage, AvatarFallback, AvatarStatus, AvatarGroup,
} from '@/components/ui/avatar'

export function Reviewers() {
  return (
    <AvatarGroup aria-label="Reviewers">
      <Avatar variant="primary" role="img" aria-label="Ada Lovelace, online">
        <AvatarImage src="/ada.png" alt="" />
        <AvatarFallback>AL</AvatarFallback>
        <AvatarStatus />
      </Avatar>
      <Avatar variant="secondary" role="img" aria-label="3 more reviewers">
        <AvatarFallback>+3</AvatarFallback>
      </Avatar>
    </AvatarGroup>
  )
}
```

How to name avatars:
- **Standalone:** give the avatar `role="img"` and an `aria-label` with the person's name and, when shown, their status.
- **Next to visible text:** an avatar beside the person's name is decorative. Mark it `aria-hidden`.
- **Images:** give `AvatarImage` an empty `alt`, so the name isn't read twice.
- **Groups:** name `AvatarGroup`.

## API

- `Avatar` forwards the Radix Root props. It adds `size` (`sm` 32px, `default` 40px, `lg` 56px) and `variant`:
  - `default`: accent colours in ombelle, secondary in flat and neo brutalism, card in minimalist;
  - `primary`;
  - `secondary`: muted, or accent in flat and neo brutalism.
- `AvatarImage` and `AvatarFallback` forward the Radix Image and Fallback props, including `delayMs` and `onLoadingStatusChange`.
- `AvatarStatus` draws a presence dot. `status` is `online` (the default) or `offline`. The dot is `aria-hidden`; put the status in the avatar's name.
- `AvatarGroup` is a `div` with `role="group"`. It overlaps its avatars and outlines each one in the surface colour.

## Styles and artifacts

- Ombelle: an outlined circle; the large size casts an offset shadow.
- Flat: a filled circle with no border.
- Minimalist: a hairline circle.
- Neo brutalism: an outlined square with an offset shadow. Shadows drop inside a group, and the status dot is outlined and sits off the corner.

Online green follows each kit: `oklch(62% 0.15 150)`, `#15803d`, `#2f6b3a` or `#7ce38b`. Offline uses the muted colour. In forced colors the avatar uses `Canvas` with a `CanvasText` border. The status dot is filled with `CanvasText` when online and hollow when offline, so presence doesn't depend on colour.

Compilation emits `components/ui/avatar.tsx`, `components/ui/avatar.css` and `examples/avatar.tsx`. Runtime dependencies are exactly React 19.3.1, @radix-ui/react-avatar 1.3.1 (MIT), clsx 2.1.1 and tailwind-merge 3.7.0.

See [the batch 2 verification record](../evidence/next-components-batch-2.md).
