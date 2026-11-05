# Accordion

Accordion stacks headings that each show or hide a section of content, built on the reviewed Radix Accordion primitive. It is available in flat, minimalist, neo brutalism, and ombelle, in light and dark mode. Liquid glass is unavailable. The template is a client component.

## Install and compose

```powershell
pnpm exec node packages/cli/dist/main.js add accordion --cwd APP --dry-run --json
pnpm exec node packages/cli/dist/main.js add accordion --cwd APP --yes
```

```tsx
import {
  Accordion, AccordionItem, AccordionTrigger, AccordionContent,
} from '@/components/ui/accordion'

export function Faq() {
  return (
    <Accordion type="single" collapsible defaultValue="preset">
      <AccordionItem value="preset">
        <AccordionTrigger>What does a preset change?</AccordionTrigger>
        <AccordionContent>Colors, radius, borders, shadows and type.</AccordionContent>
      </AccordionItem>
      <AccordionItem value="edit">
        <AccordionTrigger>Can I edit installed components?</AccordionTrigger>
        <AccordionContent>Yes. Installed source stays yours to edit.</AccordionContent>
      </AccordionItem>
    </Accordion>
  )
}
```

Each trigger is a button inside a heading. Radix supplies `aria-expanded`, `aria-controls`, and a `region` for each panel, labelled by its trigger.

## API and keyboard

- `Accordion` forwards the Radix Root props:
  - `type` (`single` or `multiple`), `collapsible` (single only);
  - `value`, `defaultValue` and `onValueChange`;
  - `disabled`, `orientation` and `dir`.
- `AccordionItem` forwards `value` and `disabled`.
- `AccordionTrigger` renders the heading and trigger. `level` (2–6, default 3) sets the heading level so the accordion fits the page outline.
- `AccordionContent` forwards the Radix Content props, including `forceMount`. It wraps its children in `accordion-content-inner` for padding.
- The trigger renders both a chevron and a plus icon (`data-accordion-icon`). Each family shows one of them.

Tab moves between triggers, and Enter or Space toggles the focused item. Up and Down arrows move between triggers, and Home and End jump to the first or last.

## Styles and artifacts

- Ombelle: an outlined card with rules between items. The open trigger takes the accent fill, and the chevron turns.
- Flat: separate filled tiles. The open tile turns secondary.
- Minimalist: an ink top rule and hairlines between items. The open title is bold, and the plus turns 45° into a close mark.
- Neo brutalism: a bordered card with an offset shadow and uppercase triggers. The chevron sits in a bordered box, and the open trigger is primary with a rule below it.

The ombelle container clips its corners, so its focus ring is drawn inside the trigger (`outline-offset: -4px`). Neo brutalism likewise draws its ring inside the trigger, and flat and minimalist keep theirs visible. Content opens with a height animation that runs only while open; reduced motion removes it. Forced colors use system colors with a `Highlight` focus ring and `GrayText` for disabled items.

Compilation emits `components/ui/accordion.tsx`, `components/ui/accordion.css` and `examples/accordion.tsx`. Runtime dependencies are exactly React 19.3.1, @radix-ui/react-accordion 1.3.1 (MIT), clsx 2.1.1, tailwind-merge 3.7.0 and lucide-react 1.55.0.

See [the batch 3 verification record](../evidence/next-components-batch-3.md).
