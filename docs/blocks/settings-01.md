# settings-01

Account settings in three sections: Profile (avatar, name, email, time zone, bio), Notifications (switches and a radio group) and a Danger zone behind a confirm dialog. Tabs group the sections from 768px; on phones the tab list is hidden and the sections stack. It is installed with `ombelle add settings-01` and follows the project preset in every style family, both editions, light and dark. Liquid glass carries its usual accessibility caveat; see [Liquid glass](../components/liquid-glass.md).

## Install

```bash
ombelle add settings-01 --dry-run
ombelle add settings-01 --yes
```

```tsx
import { Settings01 } from '@/components/blocks/settings-01'

export default function SettingsPage() {
  return (
    <main>
      <h1 className="sr-only">Settings</h1>
      <Settings01 />
    </main>
  )
}
```

The block files are `<components parent>/blocks/settings-01.tsx` and `.css` (by default `src/components/blocks/`). They are managed files recorded in the lock; see [Blocks](../05-cli-specification.md#blocks). Use CLI 1.1 or later in a project with blocks.

## What it installs

The block and these components: Alert Dialog, Avatar, Button, Card, Field, Input, Radio Group, Select, Separator, Switch, Tabs, Textarea and Toast. Components you already edited are kept (`BLOCK_COMPONENT_EDITED`).

## Example only

Save and "Delete account" never contact a server. Both call `showExampleNotice()`, which shows a Toast: "Example only: nothing was saved" after Save, and "Example only: no account was deleted" after the dialog's confirm button, which also closes the dialog.

To wire it up, replace `showExampleNotice()` with your own save and delete calls, and replace the sample profile in the file.

## Layout and keyboard

- One `h2` and a labelled section; your page owns the `h1`.
- Works at 320px without horizontal scroll. From 768px the tabs show one section at a time; below it all three sections are visible and stacked.
- Tabs, switches, the radio group and the select follow their [component](../components/tabs.md) keyboard behaviour: arrow keys move between tabs and radios, Space toggles a switch.
- The confirm dialog traps focus and closes on Escape.
