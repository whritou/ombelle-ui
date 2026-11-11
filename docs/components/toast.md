# Toast

Toast provides temporary notifications with optional actions and an explicit dismiss control. The native primitives own announcements, dismissal, swipe gestures, focus handling and timer pausing while users interact with notifications. Semantic variants are `default`, `success`, `warning`, `info` and `destructive`.

## Install

Toast requires CLI 0.7.2 or later: `npx @ombelle-ui/cli@0.7.2 add toast`. For a built local checkout:

```powershell
pnpm exec node packages/cli/dist/main.js add toast --cwd APP --dry-run --json
pnpm exec node packages/cli/dist/main.js add toast --cwd APP --yes
```

## Radix edition

The Radix edition uses `@radix-ui/react-toast` 1.3.1. `Toast` forwards native `open`, `defaultOpen`, `onOpenChange`, `duration`, `type`, swipe handlers, DOM props and refs. `ToastProvider` defaults to rightward swipe dismissal, and each toast's duration follows its content (see Variants and timing). Set `duration={Infinity}` for notifications that require explicit dismissal. Radix defaults to foreground announcement priority; use `type="background"` for passive updates.

```tsx
import * as React from 'react'
import {
  ToastProvider, ToastViewport, Toast, ToastTitle, ToastDescription,
  ToastAction, ToastClose,
} from '@/components/ui/toast'

export function SaveNotification() {
  const [open, setOpen] = React.useState(false)
  return (
    <ToastProvider>
      <button type="button" onClick={() => setOpen(true)}>Save draft</button>
      <Toast open={open} onOpenChange={setOpen} variant="success">
        <ToastTitle>Draft saved</ToastTitle>
        <ToastDescription>Your changes are ready for review.</ToastDescription>
        <ToastAction altText="Undo saving the draft" onClick={() => undoSave()}>Undo</ToastAction>
        <ToastClose />
      </Toast>
      <ToastViewport />
    </ToastProvider>
  )
}
```

The application supplies `undoSave` and owns persistence. Radix actions close the toast by default. Triggers, actions and close controls support native `asChild` composition. The viewport's native shortcut is F8 and its label includes that shortcut.

## Base UI edition

The Base UI edition uses the native manager API from `@base-ui/react/toast` 1.9.0. It exports `useToastManager` and `createToastManager`. It intentionally preserves Base UI's manager-owned lifecycle: `Toast` takes a required `toast` object from `manager.toasts`, while `manager.add`, `manager.update` and `manager.close` control notifications. It does not accept Radix's `open`, `defaultOpen`, `onOpenChange` or per-toast `duration` props.

`ToastProvider duration` maps to Base UI's native `timeout` (6000 by default); `Infinity` maps to `0` (persistent). Supply per-toast `timeout` to `manager.add`. The provider also forwards native `limit` and `toastManager` props and supplies the default rightward `swipeDirection` to each `Toast`. Base UI accepts per-toast swipe overrides, including multiple directions. Base UI uses low announcement priority by default; set `priority: 'high'` when an urgent interruption is appropriate.

```tsx
import {
  ToastProvider, ToastViewport, Toast, ToastTitle, ToastDescription,
  ToastAction, ToastClose, useToastManager,
} from '@/components/ui/toast'

export function SaveNotifications() {
  return <ToastProvider><SaveButton /><Notifications /></ToastProvider>
}

function SaveButton() {
  const manager = useToastManager()
  return (
    <button type="button" onClick={() => manager.add({
      title: 'Draft saved', description: 'Your changes are ready for review.', type: 'success',
    })}>Save draft</button>
  )
}

function Notifications() {
  const manager = useToastManager()
  return (
    <ToastViewport>
      {manager.toasts.map((toast) => (
        <Toast key={toast.id} toast={toast}>
          <ToastTitle />
          <ToastDescription />
          <ToastAction altText="Undo saving the draft" onClick={() => {
            undoSave()
            manager.close(toast.id)
          }}>Undo</ToastAction>
          <ToastClose />
        </Toast>
      ))}
    </ToastViewport>
  )
}
```

`ToastTitle` and `ToastDescription` read the manager object's content when children are omitted. `Toast` derives `variant` from `toast.type`, with an explicit `variant` prop taking precedence. Base UI actions retain native behavior: the application performs the action and closes the notification through the manager when appropriate. `ToastAction` requires meaningful `altText` and uses it as the accessible button label unless an explicit `aria-label` is supplied. Base UI parts use native `render` composition and React 19 refs. Its viewport shortcut is F6. Custom root `render` replaces the default `data-state` bridge.

## Variants and timing (0.7.3)

These need CLI **0.7.3** or later, including in component recipes. Leaving a prop out renders what earlier releases render.

- **Duration**:
  - Without a `duration`, a toast stays 6000 ms, plus 60 ms for each character of title and description beyond 80, up to 10000 ms.
  - A toast with a `ToastAction` stays until dismissed, because an action must not vanish on a timer (WCAG 2.2.1).
  - A `duration` on the provider or the toast still wins.
  - `toastDuration(content, explicit?)` computes the same value, and the Base UI edition's `useToastManager().add` uses it when you pass no `timeout`.
  - The old provider default was 5000 ms.
- **Pause**:
  - Both editions pause a toast's timer while the pointer is over the notifications or keyboard focus is inside them, and resume it after.
  - The Base UI edition pauses for keyboard focus, as Base UI does, not for a mouse click.
- **Announcement**: each toast is announced once, through a single live region, in both editions.
- **`ToastPromise`**: one toast that follows a task.
  - Props: `promise`, `loading`, and `success` and `error` (content, or a function of the result).
  - While the promise is pending, it shows a spinner and stays open; it then turns `success` or `destructive` and takes the usual duration.
  - A promise that settles after the component is gone changes nothing.
- **`ToastViewport stack`**: overlaps the toasts, with the older ones peeking out behind the newest.
  - Hovering or focusing the stack spreads them out upwards, while the newest stays where it is.
  - There is no animation under reduced motion.

## Styling and placement

Place the provider and viewport near the application root, outside ancestors that clip or establish a fixed positioning container. Neither edition's viewport adds an automatic portal. Radix portals each root into its registered viewport; Base UI notifications render as children of the viewport. The Base UI wrapper includes native `Toast.Content` inside each root.

The compiler emits `components/ui/toast.tsx`, its own `toast.css` and an example. There are no cross-component imports. Utils use clsx 2.1.1 and tailwind-merge 3.7.0. Both editions expose `toast-viewport`, `toast`, `toast-content`, `toast-title`, `toast-description`, `toast-action` and `toast-close` slots. The root exposes `data-variant`.

All five families style semantic variants with paired status background/foreground tokens. Older presets without these optional tokens use reviewed opaque pairs: success #DCFCE7 / #14532D, warning #FEF3C7 / #78350F and info #DBEAFE / #1E3A8A. The viewport fits narrow screens, scrolls within the viewport and leaves the rest of the page interactive. Notifications expose visible keyboard focus, reduced motion and forced-colors fallbacks. Liquid glass is experimental: default notifications use glass where supported, while success, warning, info and destructive notifications stay opaque for predictable text contrast. Unsupported backdrop filtering, reduced transparency and forced colors also use opaque surfaces. Include status meaning in the title or description so color is not the only signal. Keep essential tasks available elsewhere in the application.
