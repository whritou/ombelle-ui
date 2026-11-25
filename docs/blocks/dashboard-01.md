# dashboard-01

An overview content area: four stat cards, a usage meter, a setup progress bar and a recent-activity table with status badges. Tabs switch the figures between 7 and 30 days. It has no sidebar or app shell, so it drops into your own layout. It is installed with `ombelle add dashboard-01` and follows the project preset in every style family, both editions, light and dark. Liquid glass carries its usual accessibility caveat; see [Liquid glass](../components/liquid-glass.md).

## Install

```bash
ombelle add dashboard-01 --dry-run
ombelle add dashboard-01 --yes
```

```tsx
import { Dashboard01 } from '@/components/blocks/dashboard-01'

export default function OverviewPage() {
  return (
    <main>
      <h1 className="sr-only">Overview</h1>
      <Dashboard01 />
    </main>
  )
}
```

The block files are `<components parent>/blocks/dashboard-01.tsx` and `.css` (by default `src/components/blocks/`). They are managed files recorded in the lock; see [Blocks](../05-cli-specification.md#blocks). Use CLI 1.1 or later in a project with blocks.

## What it installs

The block and these components: Avatar, Badge, Button, Card, Dropdown Menu, Meter, Progress, Table, Tabs and Toast. Components you already edited are kept (`BLOCK_COMPONENT_EDITED`).

## Example only

Every figure is example data. The row menu items (View details, Copy link, Archive) never act on anything: each calls `showExampleNotice()`, which shows a Toast such as `Example only: "Archive" did nothing`.

To wire it up, replace the example data with your own, and replace `showExampleNotice()` with your own actions.

## Layout and keyboard

- One `h2` and a labelled section; your page owns the `h1`.
- Works at 320px without horizontal scroll. The wide table scrolls inside its own box, so the page does not.
- Tabs: arrow keys move between 7 days and 30 days. Each table row has a menu button named "Actions for <action>"; it opens a Dropdown Menu where arrow keys move, Enter chooses and Escape closes.
- Status badges carry text, not only colour.
