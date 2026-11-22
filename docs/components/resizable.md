# Resizable

Resizable puts panels side by side or stacked, with handles a pointer drags and the arrow keys move. A layout can be remembered, and a panel can fold to a strip. It is available in all eight families in light and dark mode; one template serves both editions.

This component requires CLI **0.9.0** or later: `npx @ombelle-ui/cli@0.9.0 add resizable`. For a built local checkout:

```powershell
pnpm exec node packages/cli/dist/main.js add resizable --cwd APP --dry-run --json
pnpm exec node packages/cli/dist/main.js add resizable --cwd APP --yes
```

```tsx
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable'

export function EditorSplit() {
  return (
    <ResizablePanelGroup direction="horizontal" autoSaveId="editor-split">
      <ResizablePanel id="preview" defaultSize="60%" minSize="30%">Preview</ResizablePanel>
      <ResizableHandle withHandle aria-label="Resize preview and controls" />
      <ResizablePanel id="controls" defaultSize="40%" minSize="20%" collapsible collapsedSize="3rem">Controls</ResizablePanel>
    </ResizablePanelGroup>
  )
}
```

## API and accessibility

- `ResizablePanelGroup` takes `direction` (`horizontal` or `vertical`) and `autoSaveId`, which remembers the layout in local storage. A saved value that is malformed, out of range or blocked by the browser is ignored, and the default sizes apply.
- `ResizablePanel` passes `defaultSize`, `minSize`, `maxSize`, `collapsible`, `collapsedSize` and `panelRef` to react-resizable-panels.
- `ResizableHandle` is a focusable separator with `aria-valuenow`: the arrow keys resize in steps, Home and End jump to the limits. `withHandle` draws a grip. Its hit area is at least 24 px across (44 px on touch), even though the drawn line is thin. Name it with `aria-label` when there are several.
- To offer "Reset layout", keep a `panelRef` and call `resize` or `expand` on it.

## Recipe

The recipe sets `direction`, `withHandle`, `panels` (2 or 3) and one label per panel. Compilation emits `components/ui/resizable.tsx`, `components/ui/resizable.css` and `examples/resizable.tsx`. Runtime dependencies are React 19.3.1, react-resizable-panels 4.17.0, clsx 2.1.1 and tailwind-merge 3.7.0.

## Liquid glass

Liquid glass is supported, without an accessibility guarantee.
