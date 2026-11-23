# Prose

Prose styles the headings, paragraphs, lists, quotes, inline code, keys, rules, images and tables written inside it, so guides and articles read well without a class on every element. It is available in all eight families in light and dark mode; one server template serves both editions.

This component requires CLI **0.9.0** or later: `npx @ombelle-ui/cli@0.9.0 add prose`. For a built local checkout:

```powershell
pnpm exec node packages/cli/dist/main.js add prose --cwd APP --dry-run --json
pnpm exec node packages/cli/dist/main.js add prose --cwd APP --yes
```

```tsx
import { Prose, ProseLead } from '@/components/ui/prose'

export function ReleaseNotes() {
  return (
    <Prose>
      <h1>Building an app shell</h1>
      <ProseLead>A sidebar, a header and a content area that reads well at any width.</ProseLead>
      <h2>Install</h2>
      <p>Add the <code>sidebar</code> component, then press <kbd>Ctrl</kbd> + <kbd>B</kbd> to fold it.</p>
    </Prose>
  )
}
```

## API and accessibility

- `Prose` takes `measure`: `narrow` (60ch), `default` (72ch) or `wide` (88ch). A `className` with a max-width overrides it.
- `ProseLead` is the opening paragraph, larger and quieter than the body text.
- Element styles sit at the prose slot's specificity, so a utility class on an element wins. Elements inside another catalog component, such as a Code Block or a Table, keep that component's look.
- Long words and addresses wrap, and a wide table scrolls inside its own box, so the page never scrolls sideways at 320 px. Prose has no script and cannot tell which tables overflow, so give a table that may be wider than the text `tabIndex={0}` and a name (`aria-label` or a `caption`): a keyboard can then reach and scroll it. Chromium and Firefox focus a scrolling box on their own; Safari does not.
- Headings keep their levels: Prose changes how they look, not the outline.

## Recipe

The recipe sets `measure` and the article heading. Compilation emits `components/ui/prose.tsx`, `components/ui/prose.css` and `examples/prose.tsx`. Runtime dependencies are React 19.3.1, clsx 2.1.1 and tailwind-merge 3.7.0.

## Liquid glass

Liquid glass is supported, without an accessibility guarantee.
