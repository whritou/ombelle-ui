# Tooltip

Tooltip wraps reviewed Radix Tooltip primitives, with flat, minimalist, neo-brutalism, and ombelle styles in light and dark modes. Liquid glass is experimental; see [liquid glass](liquid-glass.md). The template is a client component.

## Install and compose

Build packages and initialize the target project with a local preset before using the private local CLI:

```powershell
pnpm build:packages
pnpm exec node packages/cli/dist/main.js add tooltip --cwd APP --dry-run --json
pnpm exec node packages/cli/dist/main.js add tooltip --cwd APP --yes
```

```tsx
import {
  TooltipProvider, Tooltip, TooltipTrigger, TooltipContent, TooltipArrow,
} from '@/components/ui/tooltip'

export function ProjectHelp() {
  return (
    <TooltipProvider delayDuration={300}>
      <Tooltip>
        <TooltipTrigger type="button">Project details</TooltipTrigger>
        <TooltipContent>
          View the project summary.
          <TooltipArrow />
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
```

Provide a keyboard-focusable trigger with a visible or accessible name independent of the tooltip. Use `asChild` to compose a single focusable button or link that accepts the forwarded props and ref. Keep content brief, descriptive and non-interactive: no links, buttons or inputs. Essential instructions must also be visible in the page, including on touch devices. For interactive content use an appropriate popover or dialog. Radix provides the tooltip role and associates the open description with the trigger using aria-describedby.

## API and keyboard

TooltipProvider forwards Radix Provider props, including delayDuration, skipDelayDuration, disableHoverableContent and children. Tooltip forwards Root props, including open, defaultOpen, onOpenChange, delayDuration and disableHoverableContent. Controlled state uses open with onOpenChange; defaultOpen initializes uncontrolled state. Provider and Root are context primitives with conceptual slots tooltip-provider and tooltip; they create no DOM elements and do not accept DOM refs or presentation props.

TooltipTrigger, TooltipContent and TooltipArrow forward React.ComponentProps of the corresponding Radix primitive, including React 19 refs, event handlers, className and style. Their DOM slots are tooltip-trigger, tooltip-content and tooltip-arrow. Trigger supports asChild. When asChild composes the catalog Button, the element keeps Button's `data-slot="button"` so the family Button styles and focus ring apply; any other child takes `tooltip-trigger`. Content supports side, align, collision handling, forceMount and Escape/outside handlers; sideOffset defaults to 6 pixels and callers can override it. Content is portalled to document.body using Radix Portal. Content forceMount is forwarded to both Portal and Content, preserving the mounted DOM when closed for animation libraries; callers manage its visibility and exit animation in that mode. Arrow is optional and composed explicitly within Content; it forwards SVG size and presentation props. Refs reach the button, content div and arrow SVG respectively.

Pointer hover opens the tooltip after the configured delay; keyboard focus opens it immediately. Escape dismisses it while focus remains on the trigger. Leaving the trigger and content or blurring the trigger closes it. Radix preserves hoverable content by default, so pointer users can move into the description without closing it. Avoid disabling this behavior without assessing accessibility. No custom event logic overrides Radix. Tooltip is descriptive and never takes focus.

## Variants (0.7.6)

`TooltipShortcut` needs CLI **0.7.6** or later, including in component recipes. Leaving it out renders what earlier releases render.

```tsx
import {
  Tooltip, TooltipContent, TooltipShortcut, TooltipTrigger, ariaKeyShortcuts,
} from '@/components/ui/tooltip'

const undo = ['Ctrl', 'Z']

<Tooltip>
  <TooltipTrigger type="button" aria-label="Undo" aria-keyshortcuts={ariaKeyShortcuts(undo)}>↶</TooltipTrigger>
  <TooltipContent>
    Undo
    <TooltipShortcut keys={undo} />
  </TooltipContent>
</Tooltip>
```

- **`TooltipShortcut`** (`keys`, up to three in practice) draws one key cap (`tooltip-shortcut-key`, a `kbd`) per key after the tooltip text. It is `aria-hidden`, so the tooltip is announced as "Undo" alone.
- **Pass the same keys to `aria-keyshortcuts` on the trigger** through `ariaKeyShortcuts(keys)`, so the shortcut is announced once, by the trigger. It turns `Ctrl` into `Control`, `Cmd` and `⌘` into `Meta`, `Option` and `⌥` into `Alt`, `⇧` into `Shift` and `Esc` into `Escape`, upper-cases a single character, and joins with `+`: `['Ctrl', 'Z']` gives `Control+Z`, `['Cmd', 'Shift', 'p']` gives `Meta+Shift+P`.
- Key caps are mono 11px with a 1px border at 45 % of the tooltip's text colour, a 4px radius (square in neo brutalism) and a 3px gap. Forced colours draw the border in `CanvasText`.
- **Recipe:** `content.shortcut`, up to three keys joined by `+` (`Ctrl+Z`, `Ctrl+Shift+P`), at most 40 characters; empty means none. An empty key (`Ctrl++`) or a fourth key is rejected.

## Styles and artifacts

The content uses semantic popover colors for both modes, readable text, logical padding and sizing, wrapping, and a width bounded by the available collision space. The default side offset separates content from the trigger focus ring. Consumers must still check placement around other focusable controls and keep triggers at least 24 by 24 CSS pixels (44 by 44 preferred). Flat has a subtle shadow, minimalist removes it, neo-brutalism and ombelle use the preset offset shadow (ombelle fills the content with the primary color). Arrow fill and outline match the content. Trigger focus uses a 3px ring with 3px offset. Forced colors use system colors for content, arrow and focus; reduced motion removes the entry fade.

Compilation emits components/ui/tooltip.tsx, components/ui/tooltip.css and examples/tooltip.tsx plus shared utility/theme files. Keep the colocated CSS import. The example has a visibly labelled button and descriptive text with an optional arrow. Installer dry-run, file ownership, alias rewriting and conflict safeguards apply; --yes accepts a safe plan.

Runtime dependencies are exactly React 19.3.1, @radix-ui/react-tooltip 1.4.1 (MIT), clsx 2.1.1 and tailwind-merge 3.7.0. Generated Tooltip dependencies include only its own primitive and shared utilities. Focused checks cover catalog contracts and deterministic compiler artifacts. Shared preview and generated consumer matrix evidence belongs to the final M2 verification task. Human NVDA and VoiceOver review remains pending.

## Base UI edition

Projects whose `components.json` uses one of shadcn's `base-*` styles receive a Tooltip built on `Tooltip.Provider`, `Root`, `Trigger`, `Portal`, `Positioner`, `Popup` and `Arrow` from `@base-ui/react/tooltip` (`@base-ui/react` 1.9.0) instead of `@radix-ui/react-tooltip`. Part names and `data-slot` values match the Radix edition. `TooltipProvider` keeps Radix's `delayDuration` (700ms by default) and `skipDelayDuration` (300ms), mapped to Base UI's `delay` and `timeout`. `TooltipContent` renders in a portal and keeps `side` (top by default), `sideOffset` (6px), `align`, `alignOffset`, `collisionPadding` and `sticky`, passed to Base UI's positioner. Use `render` on `TooltipTrigger` where the Radix edition uses `asChild`.

State bridge: the trigger and popup carry `data-state` `delayed-open` or `closed`, and the popup `data-side` and `data-align`, through each part's `render` function; a custom `render` replaces it. The popup maps Base UI's `--available-width` to `--radix-tooltip-content-available-width`. `TooltipArrow` renders the same SVG triangle as Radix, so the stylesheet's `fill` and `stroke` apply. Radix also distinguishes `instant-open`; the Base UI edition reports `delayed-open` for every open tooltip, which the stylesheet does not distinguish.

The parity test covers the closed tooltip and the popup opened by focus and by hover, including the portal content and arrow. The Base UI edition has no allowed styling differences.
