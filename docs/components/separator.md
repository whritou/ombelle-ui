# Separator

Separator draws a horizontal or vertical rule, optionally with a centred label such as "or". It is built on the reviewed Radix Separator primitive and is available in flat, minimalist, neo brutalism, and ombelle, in light and dark mode. Liquid glass is unavailable.

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
