# Tooltip

Tooltip wraps reviewed Radix Tooltip primitives, with flat, minimalist, and neo-brutalism styles in light and dark modes. Liquid glass is deferred and unavailable. The template is a client component.

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

TooltipTrigger, TooltipContent and TooltipArrow forward React.ComponentProps of the corresponding Radix primitive, including React 19 refs, event handlers, className and style. Their DOM slots are tooltip-trigger, tooltip-content and tooltip-arrow. Trigger supports asChild. Content supports side, align, collision handling, forceMount and Escape/outside handlers; sideOffset defaults to 6 pixels and callers can override it. Content is portalled to document.body using Radix Portal. Arrow is optional and composed explicitly within Content; it forwards SVG size and presentation props. Refs reach the button, content div and arrow SVG respectively.

Pointer hover opens the tooltip after the configured delay; keyboard focus opens it immediately. Escape dismisses it while focus remains on the trigger. Leaving the trigger and content or blurring the trigger closes it. Radix preserves hoverable content by default, so pointer users can move into the description without closing it. Avoid disabling this behavior without assessing accessibility. No custom event logic overrides Radix. Tooltip is descriptive and never takes focus.

## Styles and artifacts

The content uses semantic popover colors for both modes, readable text, logical padding and sizing, wrapping, and a width bounded by the available collision space. The default side offset separates content from the trigger focus ring. Consumers must still check placement around other focusable controls and keep triggers at least 24 by 24 CSS pixels (44 by 44 preferred). Flat has a subtle shadow, minimalist removes it, and neo-brutalism uses the preset offset shadow. Arrow fill and outline match the content. Trigger focus uses a 3px ring with 3px offset. Forced colors use system colors for content, arrow and focus; reduced motion removes the entry fade.

Compilation emits components/ui/tooltip.tsx, components/ui/tooltip.css and examples/tooltip.tsx plus shared utility/theme files. Keep the colocated CSS import. The example has a visibly labelled button and descriptive text with an optional arrow. Installer dry-run, file ownership, alias rewriting and conflict safeguards apply; --yes accepts a safe plan.

Runtime dependencies are exactly React 19.3.1, @radix-ui/react-tooltip 1.4.1 (MIT), clsx 2.1.1 and tailwind-merge 3.7.0. Generated Tooltip dependencies include only its own primitive and shared utilities. Focused checks cover catalog contracts and deterministic compiler artifacts. Shared preview and generated consumer matrix evidence belongs to the final M2 verification task. Human NVDA and VoiceOver review remains pending.
