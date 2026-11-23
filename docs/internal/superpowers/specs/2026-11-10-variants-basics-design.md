# Variants, batch 6a: Button, Badge, Alert, Card, Avatar and Accordion

Sub-project 6 of the 0.7.3 work adds variants to 13 existing components and fixes Toast. It ships in three batches, each with its own spec, plan and PR:

- **6a (this spec):** Button, Badge, Alert, Card, Avatar and Accordion, whose variants are mostly props and styles.
- **6b:** Tabs, Table, Input and Textarea, Pagination and Select, which add structure and keyboard behaviour.
- **6c:** Toast (promise, stack, pause, duration, single announcement) and Sheet (bottom drawer, resizable).

This work stacks on sub-project 5 (Calendar, PR #105).

## Intent

The 0.7.3 design artifact (https://claude.ai/artifact/1FMRGWoyJSwht9wATT838U) has one "0.7.3 new variants" board per family, `project/<Family>073Variants.dc.html`. Batch 6a covers its sections 01 to 04, 11 and 13.

The board states its rule: no breaking changes, and every default stays. The variant CSS on the board is the same in all five families; only the family tokens differ.

Decisions taken in brainstorming (10 November 2026):

- **Split:** three batches and three PRs, as above.
- **Card semantics:**
  - `interactive` is a stretched link: a `CardLink` in the title whose `::after` covers the card.
  - `selected` belongs to a `CardGroup` and `CardOption` pair built on RadioGroup, from Radix or Base UI depending on the edition.
- **Shape:** every variant is a prop that sets a `data-*` attribute on an existing slot, plus CSS in each `styles/<id>/<family>.css`. Default specimens stay pixel-identical, and their stable hashes do not move.

## Components

Each change ships in both editions. Card gains a Base UI edition, because `CardGroup` uses that edition's RadioGroup. Every new prop is optional and keeps today's behaviour when it is left out.

### Button

- **`loading` keeps its width.**
  - When `loading` turns true, the button measures its border box and sets `min-inline-size` to that width as an inline style. When it turns false, the style is removed.
  - The spinner therefore never makes the button grow, but a longer label such as "Saving…" can still widen it.
  - The `aria-busy`, `disabled` and spinner behaviour is unchanged.
  - Ignored with `asChild`, as `loading` is today.
- **`variant="link-destructive"`:** a transparent background, the `--destructive` colour, an underline with a 4px offset, and 4px inline padding.
- **Icon only:**
  - There is no new prop. The docs and the recipe example show `size="icon"` or `"icon-sm"` with an `aria-label`, wrapped in Tooltip.
  - In development (`process.env.NODE_ENV !== 'production'`), a button with an icon size and no `aria-label` or `aria-labelledby` logs one `console.warn`. A button rendered with `asChild` is not checked.

### Badge

- **`appearance`:** `'solid'` by default, which is today's look, or `'soft'`.
- **`variant`:** gains `success`, `warning` and `info`, the Alert intents.
  - The soft background is a `color-mix` of the intent at 14 to 18 % over `--card`, as on the board.
  - The soft text is the intent mixed with `--foreground`.
- **Outline destructive:** `variant="destructive"` with `appearance="outline"` gives a transparent background with the `--destructive` text and border. `appearance` therefore takes `'solid' | 'soft' | 'outline'`.
- **Compatibility:** the existing `variant="outline"` stays and renders as today.
- **Dot:** the existing `BadgeDot` with `size="sm"`; no change.

### Alert

- **Dismiss:**
  - `onDismiss?: () => void`. When it is set, Alert renders an `AlertDismiss` button (`data-slot="alert-dismiss"`) in the third grid column, with a lucide `X` icon.
  - The button is named "Dismiss" by default, or by `dismissLabel`.
  - Alert does not unmount itself: the consumer removes it and moves focus. The docs show focus moving to the next heading or to the trigger.
- **`AlertActions`:** a part (`data-slot="alert-actions"`) for buttons, placed under the description in column 2, with an 8px gap.
- **`layout="compact"`:** one line, `align-items: center`, 8px × 12px padding and an 18px icon. The description takes the foreground colour, and a trailing link or button sits at the end.

### Card

- **`CardLink`:**
  - It renders an `<a>`, or its child with `asChild`, with `data-slot="card-link"`, and goes inside `CardTitle`.
  - Its `::after` is absolutely positioned over the whole card. Card sets `position: relative` and `data-interactive` when it contains a `CardLink`; CSS detects this with `:has([data-slot='card-link'])`, with no JavaScript.
  - The link's name is the title. Text in the description stays selectable because it sits above the link layer (`position: relative; z-index: 1` on `card-description` inside an interactive card). Other links and buttons inside the card do the same.
  - **Hover:** the card lifts by `translateY(-2px)`, with no movement under `prefers-reduced-motion: reduce`.
  - **Focus:** the family's focus ring is drawn on the card through `:has([data-slot='card-link']:focus-visible)`, and the link itself draws no outline.
- **`CardGroup` and `CardOption`:**
  - `CardGroup` (`data-slot="card-group"`) wraps the RadioGroup root, with `value`, `defaultValue`, `onValueChange`, `name`, `disabled`, `required`, `orientation` and `aria-label` or `aria-labelledby`.
  - `CardOption` (`data-slot="card-option"`) wraps a RadioGroup item rendered as the card surface, with the props `value`, `disabled`, `title` and `description`. Its accessible name is the title and its description is set through `aria-describedby`.
  - The checked option has a `--primary` border, a 3px `--primary` halo at 25 %, and a 22px `--primary` check circle (`data-slot="card-option-check"`, `aria-hidden`).
  - **Keyboard:** the primitive's own, with one Tab stop, arrows to move and select, and Space to select.
  - **Editions:** `@radix-ui/react-radio-group` in the Radix edition, and Base UI `RadioGroup` with `Radio` in the Base UI edition. The pins are the same ones the Radio Group component already uses.
- **`CardMedia`:**
  - A part (`data-slot="card-media"`) placed first in the card.
  - It takes `src` and `alt` for an `<img>` with `object-fit: cover`, or children for a custom cover.
  - Its block size is 96px by default and can be overridden with `className`. When the media is decorative, `alt=""` is required.
  - A card containing a media part drops its own padding, through `:has([data-slot='card-media'])`, and its other parts take the padding instead.

### Avatar

- **`shape`:** `'circle'` by default, or `'square'`, which uses the family's small radius (`calc(var(--radius) * 0.5)`).
- **`AvatarOverflow`:**
  - A part (`data-slot="avatar-overflow"`) with `count: number`.
  - It shows "+{count}" and carries `role="img"` with `aria-label` "{count} more" by default, or `label` when given.
  - It uses the `--muted` background and the `--foreground` colour, and takes the avatar's `size`.
- **Group:** avatars inside `AvatarGroup` overlap by 10px and carry a 2px `--card` ring.
- **`AvatarFallback`:** `delayMs` defaults to 600, so the fallback appears only if the image has not loaded after 600 ms. Both primitives support `delayMs` (Radix as `delayMs`, Base UI as `delay`); the Base UI template maps the prop name.

### Accordion

- **`appearance`** on `Accordion`:
  - `'bordered'` by default, which is today's look.
  - `'flush'`: no outer border, radius or background. The items are divided by a `--border-width` bottom border, the open trigger has a transparent background, and trigger and content lose their inline padding.
- **`icon`** on `Accordion`, `'chevron'` or `'plus'`:
  - When it is set, `AccordionTrigger` renders only that icon. Each item reads the value through a React context.
  - The plus icon becomes a minus when its item is open, as on the board (lucide `Plus` and `Minus`), and the chevron rotates.
  - When `icon` is left out, the trigger renders both icons and the family CSS chooses one, as today, so default output does not change.

## Styles

A generator in the session scratchpad adds the variant rules to each family stylesheet, as for Calendar. It reads the board's rules for each section, then:

- replaces the board's token names with the catalog's: `--pri` becomes `--primary`, `--des` becomes `--destructive`, and `--ok`, `--warn` and `--info` become `--success`, `--warning` and `--info`;
- scopes each rule to one slot, plus a `data-*` marker.

Every selector names a slot or a marker of its component, so the catalog style lint passes.

- **Liquid glass:**
  - Experimental and non-blocking.
  - The focus ring is 2px `--foreground` with no offset.
  - No selector names two slots; parent states go through `:is()` and `:has()`.
- **Forced colors:**
  - Badge soft and outline keep a `CanvasText` border.
  - Card selected and Card interactive focus use `Highlight`.
  - The Alert dismiss button keeps a `ButtonText` icon.
- **Out of scope:** Button and Input are not resized in any family.

## Accessibility

- **Badge soft:** text contrast is at least 4.5:1 in every family and mode, as measured by the audit. Any intent that fails is darkened in the generator, and the change is recorded in evidence.
- **Target size:** the Alert dismiss button and the `icon-sm` button are at least 24 × 24 px.
- **Names and decoration:**
  - `CardLink` is named by the card's title.
  - `CardOption` is named by its title and described by its description.
  - Check icons, accordion icons and the avatar group ring are `aria-hidden`, or are CSS only.
- **Group names:** `AvatarOverflow` is named "N more", and the docs require a name on `AvatarGroup` and on `CardGroup`.

## Recipes and editor

The `component-recipe` schema in `schemas/` gains:

| Component | New fields |
| --- | --- |
| `badge` | `appearance` (`solid`, `soft`, `outline`); `variant` gains `success`, `warning` and `info` |
| `alert` | `dismissible` (boolean), `actions` (boolean), `layout` (`default`, `compact`) |
| `card` | `mode` (`static`, `link`, `options`, `media`) |
| `avatar` | `shape` (`circle`, `square`), `overflow` (integer from 0 to 99) |
| `accordion` | `appearance` (`bordered`, `flush`), `icon` (`family`, `chevron`, `plus`) |

The Button recipe (`recipe.schema.json`) gains `link-destructive` in `variant`.

For each field:

- `recipe-specimen.ts` builds a specimen;
- the component editor shows a control, using the existing control types;
- validation rejects unknown values.

Every default keeps today's specimen, and the stable hashes are unchanged.

## Preview and site

- **Projects scene:** soft Badges for row status, an `AvatarGroup` with `AvatarOverflow` for reviewers, and a `CardLink` card for the featured project.
- **Settings scene:** a `CardGroup` plan picker, a dismissible Alert, and a flush Accordion with the plus icon for the FAQ.
- **Edition fixtures:** a `VariantsBasicsScenario` exercises every variant in both editions for the browser tests.
- **Gallery and site catalog:** they list the new variants.
- **Website size:** measured with `node scripts/measure-www-first-load.mjs` and recorded with no limit.

## Testing

- **Catalog unit tests**, one file per component under `packages/catalog/test/`:
  - **Button:** the `min-inline-size` is set and removed, `link-destructive` renders, and the icon-size warning fires only without a name.
  - **Badge:** the `data-appearance` and intent attributes.
  - **Alert:** the dismiss button is named, `onDismiss` is called, and the compact layout and actions render.
  - **Card:** in both editions:
    - `CardLink` sets `data-interactive` through CSS, which the test checks with a stylesheet assertion;
    - `CardGroup` renders radios;
    - `CardMedia` requires `alt`.
  - **Avatar:** `shape`, the `AvatarOverflow` name, and `delayMs` defaulting to 600.
  - **Accordion:** a single icon when `icon` is set, two icons without it, and plus becomes minus when open.
- **Compiler tests:**
  - the new recipe fields compile deterministically and invalid values are rejected;
  - `scripts/record-stable-hashes.ts` reports no change for default specimens.
- **Browser:** `tests/e2e/variants-basics.spec.ts`, run in both editions.
  - **CardGroup:**
    - Tab enters it once;
    - the arrows move and select;
    - Space selects;
    - the value is submitted through `name`.
  - **CardLink:**
    - a click on the description area follows the link;
    - text selection by dragging works;
    - the focus ring is drawn on the card.
  - **Alert:** the dismiss button calls `onDismiss`, and the scene moves focus.
  - **Button `loading`:** the width does not shrink while loading, and the min width is gone after loading.
  - **Avatar:** a fast image shows no fallback, and a broken image shows the fallback after 600 ms.
  - **Accordion:** `icon="plus"` shows one icon, which becomes a minus when open.
- **Specimen audit:**
  - Limited to this batch: `OMBELLE_AUDIT_COMPONENTS=button,badge,alert,card,avatar,accordion`.
  - It covers the new variant specimens in five families, both editions and both colour modes.
  - The other components are not re-run, because nothing they render changes.

## Docs

- **Component pages:** `docs/components/` for the six components, covering their API, accessibility and recipe fields.
- **Updates:** `docs/accessibility-review.md`, the CHANGELOG, and the README's variant notes.
- **Evidence:** `docs/evidence/variants-basics-073.md`, with the audit runs, the browser tests, the board comparison for sections 01 to 04, 11 and 13, and the website size.

## Out of scope

- Batches 6b and 6c.
- The Toast fixes: pause, duration and single announcement.
- The editor and liquid glass work of sub-project 7.
- Resizing Button or Input.
- New components.
- Releases and publishing.

## Delivery

Branch `feat/variants-basics-073`, from `feat/calendar-073`. The PR stacks on #105, and a fresh reviewer reviews the whole branch before the PR opens.
