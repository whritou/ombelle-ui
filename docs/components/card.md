# Card

Card groups related presentational content. It supports `flat`, `minimalist`, `neo-brutalism`, and `ombelle` in light and dark modes, with default or dense spacing and default, outlined or subtle appearances. Liquid glass is experimental for Card: a translucent root surface with specular sheen and edge light; see [liquid glass](liquid-glass.md).

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
| `Card` / `CardProps` | `div` | `density?: 'default' \| 'dense'`, `appearance?: 'default' \| 'outlined' \| 'subtle'`; both default to `default` |
| `CardHeader` / `CardHeaderProps` | `div` | — |
| `CardTitle` / `CardTitleProps` | `h3` by default | `level?: 1 \| 2 \| 3 \| 4 \| 5 \| 6`, default `3` |
| `CardDescription` / `CardDescriptionProps` | `p` | — |
| `CardContent` / `CardContentProps` | `div` | — |
| `CardFooter` / `CardFooterProps` | `div` | — |

Props extend `React.ComponentProps` for the corresponding element (`h3` for the title). Children, native attributes, event handlers, `className`, `style`, and React 19 refs are forwarded. Each part sets its own `data-slot`; the root also sets `data-density` from `density` and `data-appearance` from `appearance`. These markers select the reviewed styles. Caller attributes with other names pass through.

Choose the title's heading level from the surrounding page outline. A Card is a plain container, and its footer is a `div`, so neither creates a landmark automatically. If a group needs article or section semantics, provide an appropriate surrounding native element and accessible heading. Avoid turning every decorative content surface into a region. Application authors remain responsible for meaningful labels, heading structure, content, and interactive behavior.

## Styles and density

`appearance="default"` retains the existing family treatment. Use
`appearance="outlined"` for a background-colored surface with a visible token
border and no decorative shadow, or `appearance="subtle"` for a muted surface
without the outer border or shadow. Both keep the family's spacing, typography
and radius, and can be combined with `density="dense"`. Their headers inherit the
surface instead of adding a second fill. In experimental liquid glass these
appearances use opaque surfaces and omit the backdrop filter. Forced colors
retain a visible system-color border for both appearances.

```tsx
<Card appearance="outlined"><CardContent>Project notes</CardContent></Card>
<Card appearance="subtle" density="dense"><CardContent>Last saved today</CardContent></Card>
```

These appearance props require CLI 0.7.2 or later. The default appearance is
visually unchanged.

Default spacing uses `1.5rem` for root vertical padding and gaps, and for header/content/footer horizontal padding. Dense uses `1rem` for those values. Both use the preset's card surface, card foreground, muted foreground, border width/color, radius, and font tokens. Flat and minimalist use no decorative shadow; neo-brutalism uses the preset's offset shadow, and ombelle uses a larger offset shadow with a rounder radius. Long words wrap, and footers can wrap their contents. Forced colors use system colors and remove the shadow; Card introduces no animation or transition.

Card uses the saved global preset. A later theme operation can change semantic tokens; it does not rewrite the installed family's `card.css`. Changing the family of installed source requires an explicit migration. Appearance and density are component props and can be recorded in component recipes.

## Variants (0.7.3)

These variants need CLI **0.7.3** or later, including in component recipes. Leaving a prop out renders what earlier releases render.

Card stays a server component with no new dependency, and both editions use the same template.

- **`CardLink` makes the whole card a link.**
  - Put it in `CardTitle`. Its `::after` covers the card, so a click anywhere on the card follows the link, and the link's name stays the title.
  - Buttons, links and form controls inside the card stay above that layer and keep their own clicks.
  - Description text is under the link layer, so it cannot be selected by dragging.
  - The card lifts by 2px on hover, unless reduced motion is set, and shows the family's focus ring when the link has keyboard focus.
- **`CardGroup` and `CardOption` make a group of cards to pick one of.**
  - Each option holds a native radio, and the radios share the group's `name`. The group therefore has one Tab stop, the arrow keys move and choose, and a form submits the value without script.
  - Each radio is named by its option's `title` and described by its `description`.
  - `CardGroup` takes `name` (required), `value` or `defaultValue`, `onValueChange`, `disabled`, `required` and `orientation`.
  - Name the group with `aria-label` or `aria-labelledby`.
  - The chosen card shows a `--primary` edge, a halo and a check mark. In forced colours it uses `Highlight`.
- **`CardMedia` adds an image or cover above the content.**
  - It takes `src` and `alt` for an image, where `alt` is required (use `alt=""` when the image is decorative), or `children` for a custom cover, which is hidden from assistive technology.
  - A card with media drops its top padding.

```tsx
<CardGroup name="plan" aria-label="Plan" defaultValue="team">
  <CardOption value="starter" title="Starter" description="One project." />
  <CardOption value="team" title="Team" description="Ten seats." />
</CardGroup>
<Card>
  <CardHeader>
    <CardTitle><CardLink href="/projects/website">Website refresh</CardLink></CardTitle>
    <CardDescription>Reviews close on Friday.</CardDescription>
  </CardHeader>
</Card>
```

## Generated files and ownership

Compilation emits `components/ui/card.tsx`, colocated `components/ui/card.css`, and `examples/card.tsx`, together with the existing shared utility and theme artifacts. The installer honors configured aliases and destination paths; the ordinary default usage destination is `src/ombelle-examples/card.tsx`. Importing the generated Card loads `./card.css`; retain that import if moving the component. The standard registry item includes the exact component, utility, and Card CSS bytes.

Card adds no dependency versions: it reuses React 19.3.1, clsx 2.1.1, and tailwind-merge 3.7.0. Generated source has no Ombelle runtime dependency.

Adding Card beside existing components preserves their source, `ui-style.css`, the shared utility, and saved project defaults. Manager selection and lockfile ownership stay intact. In the verified fixtures, shared dependencies were already present and package metadata and manager lockfile bytes also stayed unchanged; missing shared dependencies still use ordinary guarded dependency planning. The Ombelle ownership lock gains records for the three new Card artifacts and retains prior entries. Card TSX and CSS have independent ownership hashes. An identical repeat is a no-op, dry-run writes nothing, and edits to either file produce a conflict even with `--yes`. Planning, stale-plan checks, transactions, and recovery remain the existing guarded CLI path.

The supplied repository PNG logos stay under `assets/` and are not imported or copied into Card or consumer artifacts. See [Card verification evidence](../evidence/card.md) for measured coverage and the foundation-stage results, finalization timeout, and saved-output revalidation. This catalog slice does not establish full-catalog stability or certify consuming applications.
