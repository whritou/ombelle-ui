# Alert

Alert shows a status, error, success, warning or information message with an optional icon, a title and a description. It is available in flat, minimalist, neo brutalism, and ombelle, in light and dark mode, and as an experimental liquid glass style. It has no client boundary and no dependency beyond the shared utility.

The `success`, `warning` and `info` variants require CLI 0.7.2 or later.

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
      <svg aria-hidden="true" viewBox="0 0 24 24">
        {/* icon */}
      </svg>
      <AlertTitle>Install blocked</AlertTitle>
      <AlertDescription>
        button.tsx was edited locally. Review the change before replacing it.
      </AlertDescription>
    </Alert>
  )
}
```

A leading `<svg>` child becomes the icon column; without one, the title and description span the full width. Mark decorative icons `aria-hidden`.

## API and roles

- `Alert` forwards native `div` props, including refs, and adds `variant` (`default`, `destructive`, `success`, `warning` or `info`).
- Default, success, warning and info Alerts have `role="status"`: a polite live region, so updates are announced without interrupting.
- A destructive Alert has `role="alert"`, which is announced immediately.
- Pass `role` to override. For example, use `role="note"` for a static warning that is present when the page loads and should not be announced as an event.
- `AlertTitle` and `AlertDescription` forward native `div` props.

Live regions announce content that changes after they mount. Render the Alert first and then update its text, or mount it in response to the event it reports.

```tsx
<Alert variant="success">
  <AlertTitle>Changes saved</AlertTitle>
  <AlertDescription>Your project settings are up to date.</AlertDescription>
</Alert>

<Alert variant="warning">
  <AlertTitle>Storage almost full</AlertTitle>
  <AlertDescription>Remove unused uploads before adding more files.</AlertDescription>
</Alert>

<Alert variant="info">
  <AlertTitle>Maintenance scheduled</AlertTitle>
  <AlertDescription>The editor will be read-only from 02:00 to 02:15.</AlertDescription>
</Alert>
```

Warnings remain polite by default. Choose an explicit `role="alert"` only when
the message needs immediate attention. State the meaning in the title or body;
the color and any decorative icon support that text rather than replacing it.

## Semantic color pairs

The new intents use an opaque background and its matching text color in every
family. Titles, descriptions and leading icons inherit the paired foreground,
so muted description styles cannot override the intent's contrast pair.

| Variant   | Background  | Text                   |
| --------- | ----------- | ---------------------- |
| `success` | `--success` | `--success-foreground` |
| `warning` | `--warning` | `--warning-foreground` |
| `info`    | `--info`    | `--info-foreground`    |

Set each background and foreground together in light and dark palettes. Older
palettes without these optional tokens use explicit opaque fallback pairs:
success `#DCFCE7` / `#14532D`, warning `#FEF3C7` / `#78350F`, and info `#DBEAFE` /
`#1E3A8A`. These pairs retain at least 4.5:1 text contrast in both modes without
requiring an update to existing installed themes. Liquid glass keeps the intent
fill opaque and adds no blur.

## Variants (0.7.3)

These variants need CLI **0.7.3** or later, including in component recipes. Leaving a prop out renders what earlier releases render.

- **Dismiss:**
  - `onDismiss` adds a Dismiss button in the corner, 28px square and named "Dismiss". `dismissLabel` renames it.
  - Alert does not remove itself: remove it in `onDismiss`, then move focus somewhere sensible, such as the next heading. Otherwise focus is lost with the button.
  - `AlertDismiss` is the same button as a part, for when you wire it yourself. A child `AlertDismiss` reserves the same corner space.
- **`AlertActions`:** holds buttons or links under the description.
- **`layout="compact"`:** puts the icon, the text and a trailing link or button on one line.
- **Dependency:** the Dismiss icon is lucide-react's `X`, so Alert now depends on lucide-react 1.55.0.

```tsx
const [open, setOpen] = React.useState(true)
const next = React.useRef<HTMLHeadingElement>(null)
return <>
  {open && (
    <Alert variant="info" onDismiss={() => { setOpen(false); next.current?.focus() }}>
      <AlertTitle>New version available</AlertTitle>
      <AlertDescription>0.7.3 adds 14 components.</AlertDescription>
      <AlertActions><Button size="sm">Update</Button></AlertActions>
    </Alert>
  )}
  <h2 ref={next} tabIndex={-1}>Plan</h2>
</>
```

## Styles and artifacts

- Ombelle: the default alert has an outlined accent fill with an offset shadow. Destructive alerts use the card fill with a destructive outline, shadow, icon and title.
- Flat: a secondary tint, and a destructive tint for destructive alerts.
- Minimalist: a hairline card. Destructive alerts get a destructive border, icon and title.
- Neo brutalism: a bordered secondary block with an uppercase title. Destructive alerts are a solid destructive block.
- Liquid glass (experimental): a solid card with a glass highlight. It adds no backdrop blur.

Success, warning and info retain each family's border, radius, typography and
shadow treatment while using the semantic color pair. Existing default and
destructive appearances are preserved.

Forced colors use system colors, including for success, warning and info, and
give the destructive variant a double border, so it does not rely on color
alone. Intent text and decorative icons inherit the system foreground.

Compilation emits `components/ui/alert.tsx`, `components/ui/alert.css` and `examples/alert.tsx`. Alert adds no dependency versions: React 19.3.1, clsx 2.1.1 and tailwind-merge 3.7.0.

See [the batch 1 verification record](../evidence/next-components-batch-1.md). Consumer-matrix rows, the browser e2e suite, and human screen-reader review are pending.
