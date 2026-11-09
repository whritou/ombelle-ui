# Sheet

Sheet opens a modal panel from a viewport edge. It uses Dialog primitives with a named built-in close button, focus trapping, Escape dismissal and focus return. The panel scrolls within the viewport; long content does not extend beyond it.

## Install and use

This component is available in the current private local CLI. Published CLI 0.7.1 does not include it; the website minimum is 0.7.2 pending a separate release.

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

## Styling and generated files

The compiler emits `components/ui/sheet.tsx`, `components/ui/sheet.css` and an example. The source imports only its own stylesheet and utils; it does not import another installed component. Both editions also use lucide-react 1.55.0 for the icon and clsx 2.1.1 / tailwind-merge 3.7.0 through utils.

The styling slots are `sheet-trigger`, `sheet-close`, `sheet-overlay`, `sheet-content`, `sheet-dismiss`, `sheet-header`, `sheet-footer`, `sheet-title` and `sheet-description`. `sheet-content` exposes `data-side` and `data-size`. All five families support forced colors and reduced motion. Liquid glass is experimental, with an opaque default when backdrop filtering is unavailable and explicit opaque reduced-transparency and forced-colors fallbacks.
