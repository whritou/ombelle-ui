# Separator

Separator draws a horizontal or vertical rule, optionally with a centred label such as "or". It is built on the reviewed Radix Separator primitive and is available in flat, minimalist, neo brutalism, and ombelle, in light and dark mode. Liquid glass is experimental; see [Liquid glass](#liquid-glass).

## Install and compose

```powershell
pnpm exec node packages/cli/dist/main.js add separator --cwd APP --dry-run --json
pnpm exec node packages/cli/dist/main.js add separator --cwd APP --yes
```

```tsx
import { Separator } from '@/components/ui/separator'

export function SignInOptions() {
  return (
    <>
      <button type="button">Continue with SSO</button>
      <Separator>or</Separator>
      <button type="button">Continue with email</button>
      <nav aria-label="Footer">
        <a href="/docs">Docs</a>
        <Separator orientation="vertical" />
        <a href="/changelog">Changelog</a>
      </nav>
    </>
  )
}
```

## API and roles

- `orientation` is `horizontal` (the default) or `vertical`. A vertical separator stretches to its row's height.
- `decorative` defaults to `true`, which renders `role="none"`, so assistive technology skips the line. A label such as "or" is then read as plain text.
- Pass `decorative={false}` when the line separates content semantically. Radix then renders `role="separator"` with `aria-orientation`. Note that a semantic separator's text label is not read.
- Children render as a centred label (`separator-label`) between two lines and set `data-labelled`.

## Styles and artifacts

- Ombelle: an ink rule at the border width. The labelled form has hairline lines and an uppercase label.
- Flat: a 1px border rule. Vertical rules use the input colour.
- Minimalist: a 1px hairline, and a spaced uppercase label.
- Neo brutalism: a rule at the full border width, and a heavy uppercase label.

Forced colors draw every rule in `CanvasText`. All dimensions are logical, so the label and vertical rules follow the text direction.

Compilation emits `components/ui/separator.tsx`, `components/ui/separator.css` and `examples/separator.tsx`. Runtime dependencies are exactly React 19.3.1, @radix-ui/react-separator 1.2.0 (MIT), clsx 2.1.1 and tailwind-merge 3.7.0.

See [the batch 2 verification record](../evidence/next-components-batch-2.md).

## Liquid glass

In liquid glass, a separator is an etched hairline: a `var(--border-width)` line in the `border` colour with the glass highlight 1px beside it, below a horizontal rule and at the end side of a vertical one. The highlight is a logical border, so vertical rules follow the text direction. The label is `mutedForeground` at 12px / 600 with no surface of its own, as in the design kit: inside a Card or other glass panel the `mutedForeground` on `card` contrast pair covers it, and on a bare backdrop its contrast depends on that backdrop. Forced colours draw the rule in `CanvasText` without the highlight. Installing it in a glass project needs `@ombelle-ui/cli` 0.5.0 or later. See [liquid glass](liquid-glass.md) for the contrast bound and fallbacks, and [glass display evidence](../evidence/glass-display.md) for screenshots.

## Base UI edition

Projects whose `components.json` uses one of shadcn's `base-*` styles receive a Separator built on `Separator` from `@base-ui/react/separator` (`@base-ui/react` 1.9.0) instead of `@radix-ui/react-separator`. `orientation`, `decorative`, children labels, `data-slot` and `data-labelled` match the Radix edition. Base UI sets `data-orientation` itself, so no state bridge is needed. Base UI always renders `role="separator"`; the template sets `role="none"` and drops `aria-orientation` while `decorative` is true, as Radix does. The Base UI edition has no allowed styling differences.
