# Sheet

Sheet opens a modal panel from a viewport edge. It uses Dialog primitives with a named built-in close button, focus trapping, Escape dismissal and focus return. The panel scrolls within the viewport; long content does not extend beyond it.

## Install and use

This component requires CLI 0.7.2 or later: `npx @ombelle-ui/cli@0.7.2 add sheet`. For a built local checkout:

```powershell
pnpm exec node packages/cli/dist/main.js add sheet --cwd APP --dry-run --json
pnpm exec node packages/cli/dist/main.js add sheet --cwd APP --yes
```

```tsx
import {
  Sheet, SheetTrigger, SheetClose, SheetContent, SheetHeader,
  SheetFooter, SheetTitle, SheetDescription,
} from '@/components/ui/sheet'

export function SettingsSheet() {
  return (
    <Sheet>
      <SheetTrigger>Edit settings</SheetTrigger>
      <SheetContent side="inline-end" size="default">
        <SheetHeader>
          <SheetTitle>Settings</SheetTitle>
          <SheetDescription>Update your display preferences.</SheetDescription>
        </SheetHeader>
        <p>Your settings controls go here.</p>
        <SheetFooter><SheetClose>Done</SheetClose></SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
```

## API and editions

`SheetContent` accepts `side="inline-start" | "inline-end" | "top" | "bottom"` (default `inline-end`) and `size="sm" | "default" | "lg"` (default `default`). Side panel widths are 20rem, 28rem and 40rem, constrained to the viewport. Top and bottom panels use the same size as a maximum height and fit shorter content. Inline positioning follows the document's direction, including RTL.

`Sheet` preserves the primitive's `open`, `defaultOpen` and `onOpenChange` behavior. DOM parts forward native primitive props, event handlers and React 19 refs. Always provide `SheetTitle` and an appropriate description; primitive accessibility props remain available for alternate labeling. `SheetHeader` and `SheetFooter` are native divs. `SheetClose` is a composable close control; the built-in icon close is independently named “Close.”

The Radix edition uses `@radix-ui/react-dialog` 1.3.1. Compose triggers and close controls with `asChild`, for example `<SheetTrigger asChild><Button>Edit settings</Button></SheetTrigger>`.

The Base UI edition uses `Dialog` from `@base-ui/react/dialog` 1.9.0. Compose with `render`, for example `<SheetTrigger render={<Button />}>Edit settings</SheetTrigger>`. Base UI uses `Popup` and `Backdrop` and forwards their native props. Its default render bridge adds `data-state="open" | "closed"` alongside Base UI's attributes; supplying a custom `render` replaces that bridge.

## Variants (0.7.3)

These need CLI **0.7.3** or later, including in component recipes. Leaving a prop out renders what earlier releases render.

- **`SheetHandle`**: for `side="bottom"`, or `side="top"`, where it goes last and is dragged down to grow.
  - It is a separator named "Resize sheet", with the height as a percentage of the viewport, from 25 to 95.
  - Arrow Up and Arrow Down change it by 10, and Home and End go to the bounds.
  - Dragging it resizes the sheet, and releasing below 25 % closes it, returning focus to the trigger.
- **`SheetContent resizable`**: for `side="inline-start"` or `"inline-end"`.
  - It adds a separator named "Resize panel" on the open edge.
  - The arrow keys change the width by 16px, or 64px with Shift, and Home and End go to `minSize` (240) and `maxSize` (640).
  - Dragging resizes it too. The width never passes the viewport less 16px, even below `minSize`, and follows the window as it is resized.
  - Other props: `defaultSize` (320) and `onSizeChange`.

## Variants (0.7.6)

`snapPoints` needs CLI **0.7.6** or later, including in component recipes. Leaving it out renders what earlier releases render.

```tsx
<Sheet>
  <SheetTrigger>Filters</SheetTrigger>
  <SheetContent side="bottom" snapPoints={[0.5, 0.9]}>
    <SheetHandle label="Resize Filters" />
    <SheetHeader><SheetTitle>Filters</SheetTitle></SheetHeader>
  </SheetContent>
</Sheet>
```

- **Snap points apply to bottom sheets only.** On any other `side` the prop is ignored and adds no attribute. Each point is a fraction of the viewport height, kept between 0.25 and 0.95; duplicates are dropped and the points are sorted.
- The sheet opens at its first point and opens there again after it closes, however it was left.
- With a `SheetHandle`:
  - a drag moves the sheet freely; on release it settles on the nearest point (a tie goes to the higher one), and a release below 25 % closes it and returns focus to the trigger;
  - Arrow Up goes to the next higher point, Arrow Down to the next lower one, and Arrow Down on the lowest point closes the sheet; Home and End go to the lowest and highest points;
  - the handle's value text names the point: `Half height` for 0.5, `Full height` for the highest point when it is at least 0.9, otherwise the percentage (`33%`).
- The settle is a 200 ms height transition, only when the user allows motion; nothing moves under `prefers-reduced-motion: reduce`. Forced colours are unchanged.
- `nearestSnapPoint(height, points)` and `snapPointText(point, points)` are exported.
- **Recipe:** `snapPoints` is `none`, `half-full` (`[0.5, 0.9]`) or `third-half-full` (`[0.33, 0.5, 0.9]`), and needs `side: 'bottom'`.

## Styling and generated files

The compiler emits `components/ui/sheet.tsx`, `components/ui/sheet.css` and an example. The source imports only its own stylesheet and utils; it does not import another installed component. Both editions also use lucide-react 1.55.0 for the icon and clsx 2.1.1 / tailwind-merge 3.7.0 through utils.

The styling slots are `sheet-trigger`, `sheet-close`, `sheet-overlay`, `sheet-content`, `sheet-dismiss`, `sheet-header`, `sheet-footer`, `sheet-title` and `sheet-description`. `sheet-content` exposes `data-side` and `data-size`. All five families support forced colors and reduced motion. Liquid glass is experimental, with an opaque default when backdrop filtering is unavailable and explicit opaque reduced-transparency and forced-colors fallbacks.
