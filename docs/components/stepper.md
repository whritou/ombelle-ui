# Stepper

Stepper shows the ordered steps of a process and the user's place in it, horizontally or vertically. It only displays status: it does not route, and its steps take no focus. It is available in all five families in light and dark mode, in one template for both editions, with no client boundary.

This component requires CLI **0.7.3** or later. Until 0.7.3 is published, install it from a built local checkout:

```powershell
pnpm exec node packages/cli/dist/main.js add stepper --cwd APP --dry-run --json
pnpm exec node packages/cli/dist/main.js add stepper --cwd APP --yes
```

```tsx
import {
  Stepper,
  StepperDescription,
  StepperIndicator,
  StepperItem,
  StepperSeparator,
  StepperTitle,
} from '@/components/ui/stepper'

export function Setup() {
  return (
    <Stepper aria-label="Project setup">
      <StepperItem status="complete">
        <StepperIndicator>1</StepperIndicator>
        <StepperTitle>Preset</StepperTitle>
        <StepperDescription>Ombelle</StepperDescription>
        <StepperSeparator />
      </StepperItem>
      <StepperItem status="current">
        <StepperIndicator>2</StepperIndicator>
        <StepperTitle>Components</StepperTitle>
        <StepperDescription>Choose 4</StepperDescription>
        <StepperSeparator />
      </StepperItem>
      <StepperItem>
        <StepperIndicator>3</StepperIndicator>
        <StepperTitle>Install CLI</StepperTitle>
      </StepperItem>
    </Stepper>
  )
}
```

## API and accessibility

- `Stepper` is a `nav` named "Progress" by default around an ordered list; pass `aria-label` to rename it. `orientation` is `horizontal` or `vertical` and applies to every item.
- `StepperItem` takes `status`: `complete`, `current` or `upcoming` (the default). The current item has `aria-current="step"`. Its indicator, title and separator receive the status and orientation as `data-status` and `data-orientation`.
- `StepperIndicator` shows its children (the step number), then a check once the step is complete. It is hidden from assistive technology, because the list position already gives the number.
- `StepperTitle` adds visually hidden "Completed: " text before a complete step's title, so the check is not the only sign of its status. Like Dialog, it hides that text with the `sr-only` utility.
- `StepperSeparator` is the decorative connector to the next step. Leave it out of the last item.

## Recipe

The recipe editor sets `orientation`, the current step, and two to six steps, each with a title and an optional description. Steps before `current` are complete, and steps after it are upcoming. A `current` that is not below the number of steps is rejected. Compilation emits `components/ui/stepper.tsx`, `components/ui/stepper.css` and `examples/stepper.tsx`. Runtime dependencies are React 19.3.1, clsx 2.1.1, tailwind-merge 3.7.0 and lucide-react 1.55.0.

## Liquid glass

Liquid glass is experimental for Stepper, as for every glass component, and its findings do not block a release. See [liquid glass](liquid-glass.md).

See [display components evidence](../evidence/display-components.md) for the board comparison and the specimen audit.
