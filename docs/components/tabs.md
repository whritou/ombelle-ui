# Tabs

Tabs wraps reviewed Radix Tabs primitives, with flat, minimalist, and neo-brutalism styles in light and dark modes. Liquid glass is unavailable. The template is a client component.

## Install and compose

Build packages and initialize the target project with a local preset before using the private local CLI:

```powershell
pnpm build:packages
pnpm exec node packages/cli/dist/main.js add tabs --cwd APP --dry-run --json
pnpm exec node packages/cli/dist/main.js add tabs --cwd APP --yes
```

```tsx
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'

export function ProjectSections() {
  return (
    <Tabs defaultValue="overview">
      <TabsList aria-label="Project sections">
        <TabsTrigger value="overview">Overview</TabsTrigger>
        <TabsTrigger value="activity">Activity</TabsTrigger>
        <TabsTrigger value="settings" disabled>Settings</TabsTrigger>
      </TabsList>
      <TabsContent value="overview">Project overview.</TabsContent>
      <TabsContent value="activity">Recent activity.</TabsContent>
    </Tabs>
  )
}
```

Give TabsList an accessible name using aria-label or aria-labelledby. Each trigger needs a unique value matching its content value. Radix generates the tab/tabpanel roles, selection state, IDs, and accessible associations. Consumers provide trigger text and panel content.

## API and keyboard

Tabs and TabsProps forward React.ComponentProps<typeof TabsPrimitive.Root>, including value, defaultValue, onValueChange, orientation, dir, activationMode, className, style, and the React 19 ref. Use value with onValueChange for controlled selection or defaultValue for uncontrolled selection. The root slot is tabs.

TabsList, TabsTrigger, and TabsContent forward their corresponding Radix List, Trigger, and Content props, including handlers, className, style, and refs. Their slots are tabs-list, tabs-trigger, and tabs-content. TabsList supports loop; TabsTrigger supports disabled; TabsContent supports forceMount. Refs reach the primitive DOM elements. No custom event logic overrides the primitive.

Automatic activation is the default: moving focus to a trigger selects its panel immediately. Keep automatically activated panel content available without noticeable latency. Consumers can explicitly set activationMode="manual" for panels that require deferred loading; Space or Enter then activates the focused tab. Tab enters the tab list at its selected trigger and moves onward to the active panel or its focusable content. Horizontal lists use Left/Right arrows, respecting dir="rtl"; vertical lists use Up/Down arrows. Home/End move to the first/last enabled trigger. Navigation skips disabled triggers and loops by default. Set orientation="vertical" on Tabs for a vertical list and panel layout.

## Styles and artifacts

Triggers have a preferred 44 by 44 CSS pixel minimum target. Semantic tokens distinguish inactive and active triggers across both modes. Flat uses a muted list and background active trigger, minimalist removes the list fill, and neo-brutalism uses a primary active trigger with preset offset shadow. Logical dimensions and padding support both text directions. Root and list orientation selectors provide horizontal and vertical layouts. Trigger and panel focus rings use a visible 3px outline with 3px offset; component styling does not clip focus. Disabled triggers, forced colors, and reduced motion are covered. Inactive content is hidden even when forceMount preserves its DOM.

Compilation emits components/ui/tabs.tsx, components/ui/tabs.css, and examples/tabs.tsx plus shared utility/theme files. Keep the colocated CSS import. The example includes a labelled list and disabled trigger. Installer dry-run, file ownership, alias rewriting, and conflict safeguards apply; --yes accepts a safe plan.

Runtime dependencies are exactly React 19.3.1, @radix-ui/react-tabs 1.2.1 (MIT), clsx 2.1.1, and tailwind-merge 3.7.0. Generated Tabs dependencies include only its own primitive and shared utilities.

Focused catalog/compiler checks and a local agent-operated Chromium probe cover this implementation. Shared preview and generated consumer matrix evidence belongs to the final M2 verification task. Human NVDA and VoiceOver review remains pending.
