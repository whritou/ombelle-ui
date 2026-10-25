# Card

Card groups related presentational content. It supports `flat`, `minimalist`, and `neo-brutalism` in light and dark modes, with default or dense spacing. Liquid glass is unavailable in this slice.

## Install and compose

Build the packages and initialize the target project with a local preset before using the private local CLI:

```powershell
pnpm build:packages
pnpm exec node packages/cli/dist/main.js add card --cwd APP --dry-run --json
pnpm exec node packages/cli/dist/main.js add card --cwd APP --yes
```

```tsx
import {
  Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter,
} from '@/components/ui/card'

export function ProjectSummary() {
  return (
    <Card density="dense" className="summary-card">
      <CardHeader>
        <CardTitle level={2} id="project-title">Website refresh</CardTitle>
        <CardDescription>Design work for the next release.</CardDescription>
      </CardHeader>
      <CardContent><p>Three milestones remain.</p></CardContent>
      <CardFooter>Updated today</CardFooter>
    </Card>
  )
}
```

Every part is optional. A content-only composition such as `<Card><CardContent>Notes</CardContent></Card>` is valid. Card adds no click behavior, focus stop, or client boundary. Place real links and buttons inside the composition when the content needs actions.

| Export | Native element | Additional prop |
| --- | --- | --- |
| `Card` / `CardProps` | `div` | `density?: 'default' \| 'dense'`, default `default` |
| `CardHeader` / `CardHeaderProps` | `div` | — |
| `CardTitle` / `CardTitleProps` | `h3` by default | `level?: 1 \| 2 \| 3 \| 4 \| 5 \| 6`, default `3` |
| `CardDescription` / `CardDescriptionProps` | `p` | — |
| `CardContent` / `CardContentProps` | `div` | — |
| `CardFooter` / `CardFooterProps` | `div` | — |

Props extend `React.ComponentProps` for the corresponding element (`h3` for the title). Children, native attributes, event handlers, `className`, `style`, and React 19 refs are forwarded. Each part sets its own `data-slot`; the root also sets `data-density` from `density`. These markers select the reviewed styles. Caller attributes with other names pass through.

Choose the title's heading level from the surrounding page outline. A Card is a plain container, and its footer is a `div`, so neither creates a landmark automatically. If a group needs article or section semantics, provide an appropriate surrounding native element and accessible heading. Avoid turning every decorative content surface into a region. Application authors remain responsible for meaningful labels, heading structure, content, and interactive behavior.

## Styles and density

Default spacing uses `1.5rem` for root vertical padding and gaps, and for header/content/footer horizontal padding. Dense uses `1rem` for those values. Both use the preset's card surface, card foreground, muted foreground, border width/color, radius, and font tokens. Flat and minimalist use no decorative shadow; neo-brutalism uses the preset's offset shadow. Long words wrap, and footers can wrap their contents. Forced colors use system colors and remove the shadow; Card introduces no animation or transition.

Card uses the saved global preset. A later theme operation can change semantic tokens; it does not rewrite the installed family's `card.css`. Changing the family of installed source requires an explicit migration. Component-scoped presets and recipes remain Button-only.

## Generated files and ownership

Compilation emits `components/ui/card.tsx`, colocated `components/ui/card.css`, and `examples/card.tsx`, together with the existing shared utility and theme artifacts. The installer honors configured aliases and destination paths; the ordinary default usage destination is `src/ombelle-examples/card.tsx`. Importing the generated Card loads `./card.css`; retain that import if moving the component. The standard registry item includes the exact component, utility, and Card CSS bytes.

Card adds no dependency versions: it reuses React 19.3.1, clsx 2.1.1, and tailwind-merge 3.7.0. Generated source has no Ombelle runtime dependency.

Adding Card beside existing components preserves their source, `ui-style.css`, the shared utility, and saved project defaults. Manager selection and lockfile ownership stay intact. In the verified fixtures, shared dependencies were already present and package metadata and manager lockfile bytes also stayed unchanged; missing shared dependencies still use ordinary guarded dependency planning. The Ombelle ownership lock gains records for the three new Card artifacts and retains prior entries. Card TSX and CSS have independent ownership hashes. An identical repeat is a no-op, dry-run writes nothing, and edits to either file produce a conflict even with `--yes`. Planning, stale-plan checks, transactions, and recovery remain the existing guarded CLI path.

The supplied repository PNG logos stay under `assets/` and are not imported or copied into Card or consumer artifacts. See [Card verification evidence](../evidence/card.md) for measured coverage and the foundation-stage results, finalization timeout, and saved-output revalidation. This catalog slice does not establish full-catalog stability or certify consuming applications.
