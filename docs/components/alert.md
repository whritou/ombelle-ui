# Alert

Alert shows a status or error message with an optional icon, a title and a description. It is available in flat, minimalist, neo brutalism, and ombelle, in light and dark mode, and as an experimental liquid glass style. It has no client boundary and no dependency beyond the shared utility.

## Install and compose

```powershell
pnpm exec node packages/cli/dist/main.js add alert --cwd APP --dry-run --json
pnpm exec node packages/cli/dist/main.js add alert --cwd APP --yes
```

```tsx
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert'

export function InstallBlocked() {
  return (
    <Alert variant="destructive">
      <svg aria-hidden="true" viewBox="0 0 24 24">{/* icon */}</svg>
      <AlertTitle>Install blocked</AlertTitle>
      <AlertDescription>button.tsx was edited locally. Review the change before replacing it.</AlertDescription>
    </Alert>
  )
}
```

A leading `<svg>` child becomes the icon column; without one, the title and description span the full width. Mark decorative icons `aria-hidden`.

## API and roles

- `Alert` forwards native `div` props and adds `variant` (`default` or `destructive`).
- A default Alert has `role="status"`: a polite live region, so updates are announced without interrupting.
- A destructive Alert has `role="alert"`, which is announced immediately.
- Pass `role` to override. For example, use `role="note"` for a static warning that is present when the page loads and should not be announced as an event.
- `AlertTitle` and `AlertDescription` forward native `div` props.

Live regions announce content that changes after they mount. Render the Alert first and then update its text, or mount it in response to the event it reports.

## Styles and artifacts

- Ombelle: the default alert has an outlined accent fill with an offset shadow. Destructive alerts use the card fill with a destructive outline, shadow, icon and title.
- Flat: a secondary tint, and a destructive tint for destructive alerts.
- Minimalist: a hairline card. Destructive alerts get a destructive border, icon and title.
- Neo brutalism: a bordered secondary block with an uppercase title. Destructive alerts are a solid destructive block.
- Liquid glass (experimental): a solid card with a glass highlight. It adds no backdrop blur.

Forced colors use system colors and give the destructive variant a double border, so it does not rely on color alone.

Compilation emits `components/ui/alert.tsx`, `components/ui/alert.css` and `examples/alert.tsx`. Alert adds no dependency versions: React 19.3.1, clsx 2.1.1 and tailwind-merge 3.7.0.

See [the batch 1 verification record](../evidence/next-components-batch-1.md). Consumer-matrix rows, the browser e2e suite, and human screen-reader review are pending.
