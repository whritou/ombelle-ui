# Alert Dialog

Alert Dialog requests confirmation before an important action. Both editions use a dedicated alert-dialog primitive, expose `role="alertdialog"`, focus cancellation first and prevent pointer-outside dismissal. Escape cancels and focus returns to the trigger.

## Install and use

This component requires CLI 0.7.2 or later: `npx @ombelle-ui/cli@0.7.2 add alert-dialog`. For a built local checkout:

```powershell
pnpm exec node packages/cli/dist/main.js add alert-dialog --cwd APP --dry-run --json
pnpm exec node packages/cli/dist/main.js add alert-dialog --cwd APP --yes
```

```tsx
import {
  AlertDialog, AlertDialogTrigger, AlertDialogContent, AlertDialogHeader,
  AlertDialogFooter, AlertDialogTitle, AlertDialogDescription,
  AlertDialogCancel, AlertDialogAction,
} from '@/components/ui/alert-dialog'

export function DiscardDraft({ discard }: { discard: () => void }) {
  return (
    <AlertDialog>
      <AlertDialogTrigger>Discard draft</AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Discard draft?</AlertDialogTitle>
          <AlertDialogDescription>Your unsaved changes will be lost.</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Keep draft</AlertDialogCancel>
          <AlertDialogAction onClick={discard}>Discard draft</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
```

## Variants (0.7.5)

These need CLI **0.7.5** or later, including in component recipes. Leaving a prop or part out renders what earlier releases render.

```tsx
<AlertDialogContent>
  <AlertDialogHeader>
    <AlertDialogMedia tone="destructive" />
    <AlertDialogTitle>Delete ombelle-site?</AlertDialogTitle>
    <AlertDialogDescription>Its install code stops working for everyone.</AlertDialogDescription>
  </AlertDialogHeader>
  <AlertDialogConfirmInput expected="ombelle-site" />
  <AlertDialogFooter>
    <AlertDialogCancel>Cancel</AlertDialogCancel>
    <AlertDialogAction onClick={deleteProject}>Delete project</AlertDialogAction>
  </AlertDialogFooter>
</AlertDialogContent>
```

- **`AlertDialogMedia`** (`alert-dialog-media`) is an icon tile for the header, `aria-hidden`, with `tone` (`default` or `destructive`) set as `data-tone`. Without children it draws its own icon: a circled "i" for `default`, a warning triangle for `destructive`. It adds no icon dependency.
- **`AlertDialogConfirmInput`** (`alert-dialog-confirm`) asks for `expected` to be typed:
  - It renders the instruction, by default "Type <code>expected</code> to confirm" (or your `label`), as the label of a text input (`alert-dialog-confirm-input`) with autocomplete and spellcheck off.
  - `AlertDialogAction` is `disabled` until the input's value equals `expected` exactly: no trimming, case-sensitive. While it is disabled, the action's `aria-describedby` points at the instruction, so the reason is announced. Pasting is allowed.
  - Enter in the input runs the action only when the text matches; otherwise it does nothing and the dialog stays open.
  - When the dialog opens, focus goes to the input instead of Cancel. The text starts empty each time the dialog opens: the input clears it when it unmounts with the closed content. Content kept mounted with `forceMount` (Radix) or `keepMounted` (Base UI) keeps the typed text.
- **Recipe:** `media` (`none`, `default` or `destructive`) and the content field `confirmText` (empty for none).

## API and editions

`AlertDialog` supports controlled `open` / `onOpenChange` and uncontrolled `defaultOpen`. DOM parts forward their native primitive props, handlers and React 19 refs. `AlertDialogHeader` and `AlertDialogFooter` are native divs. Include a title, description and enabled cancel control. Put the cancel control before the action in the DOM to keep keyboard and visual ordering aligned.

Both action and cancel close the alert dialog and default to non-submit buttons. The application owns the confirmed operation. For an asynchronous operation, prevent the click's default close behavior, manage `open`, and close after success; keep cancellation available and announce errors in the application.

The Radix edition uses `@radix-ui/react-alert-dialog` 1.2.1, including its native `Cancel`, `Action`, `Content` and focus behavior. Compose another component with `asChild`, for example `<AlertDialogTrigger asChild><Button>Discard draft</Button></AlertDialogTrigger>`. Native `onOpenAutoFocus` remains available for explicit focus customization.

The Base UI edition uses `AlertDialog` from `@base-ui/react/alert-dialog` 1.9.0. Both action and cancel use its native `Close`. The content's default `initialFocus` finds its enabled `AlertDialogCancel` even when another control appears earlier. Native `initialFocus` and `finalFocus` remain available for explicit customization. Compose with `render`, for example `<AlertDialogTrigger render={<Button />}>Discard draft</AlertDialogTrigger>`. The default Popup and Backdrop render bridges add `data-state="open" | "closed"`; custom `render` replaces the Popup bridge.

## Styling and generated files

The compiler emits `components/ui/alert-dialog.tsx`, `components/ui/alert-dialog.css` and an example. It imports its own stylesheet and utils without depending on installed Button or Dialog files. Utils use clsx 2.1.1 and tailwind-merge 3.7.0.

The styling slots are `alert-dialog-trigger`, `alert-dialog-overlay`, `alert-dialog-content`, `alert-dialog-header`, `alert-dialog-footer`, `alert-dialog-title`, `alert-dialog-description`, `alert-dialog-cancel` and `alert-dialog-action`. The popup has a viewport-constrained scrolling area, and the footer wraps at narrow widths. All five families support forced colors and reduced motion. Liquid glass is experimental, with an opaque default when backdrop filtering is unavailable and explicit opaque reduced-transparency and forced-colors fallbacks.
