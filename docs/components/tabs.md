# Tabs

Tabs wraps reviewed Radix Tabs primitives, with flat, minimalist, neo-brutalism, and ombelle styles in light and dark modes. Liquid glass is experimental; see [liquid glass](liquid-glass.md). The template is a client component.

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

`TabsList` accepts `appearance="contained"` (the existing default) or
`appearance="underline"`. The underline follows the bottom edge in horizontal
lists and the inline end edge in vertical lists, including RTL. It preserves
selection, keyboard navigation, disabled behavior and visible focus in both
primitive editions. The component editor exports this option as a recipe prop.
The new appearance requires CLI 0.7.2 or later; existing recipes without the
option keep their normalized identity.

Triggers have a preferred 44 by 44 CSS pixel minimum target. Semantic tokens distinguish inactive and active triggers across both modes. Flat uses a muted list and background active trigger, minimalist removes the list fill, neo-brutalism uses a primary active trigger with preset offset shadow, and ombelle uses a pill list with the preset offset shadow. Logical dimensions and padding support both text directions. Root and list orientation selectors provide horizontal and vertical layouts. Trigger and panel focus rings use a visible 3px outline with 3px offset; component styling does not clip focus. Disabled triggers, forced colors, and reduced motion are covered. Inactive content is hidden even when forceMount preserves its DOM.

Compilation emits components/ui/tabs.tsx, components/ui/tabs.css, and examples/tabs.tsx plus shared utility/theme files. Keep the colocated CSS import. The example includes a labelled list and disabled trigger. Installer dry-run, file ownership, alias rewriting, and conflict safeguards apply; --yes accepts a safe plan.

Runtime dependencies are exactly React 19.3.1, @radix-ui/react-tabs 1.2.1 (MIT), clsx 2.1.1, and tailwind-merge 3.7.0. Generated Tabs dependencies include only its own primitive and shared utilities.

Focused catalog/compiler checks and a local agent-operated Chromium probe cover this implementation. Shared preview and generated consumer matrix evidence belongs to the final M2 verification task. Human NVDA and VoiceOver review remains pending.

## Base UI edition

Projects whose `components.json` uses one of shadcn's `base-*` styles receive Tabs built on `Tabs.Root`, `Tabs.List`, `Tabs.Tab` and `Tabs.Panel` from `@base-ui/react/tabs` (`@base-ui/react` 1.9.0) instead of `@radix-ui/react-tabs`. `Tabs`, `TabsList`, `TabsTrigger` and `TabsContent` keep their names and `data-slot` values. Two defaults are set to match Radix: `TabsList` activates a tab when it receives focus (`activateOnFocus`, Radix's automatic mode), and `TabsContent` keeps inactive panels mounted and hidden (`keepMounted`). Pass `false` to either for Base UI's own defaults.

State bridge: triggers carry `data-state="active"` or `"inactive"` and panels `data-state="active"` or `"inactive"` (from Base UI's `hidden` state), plus `data-orientation`, through each part's `render` function, next to Base UI's own attributes; a custom `render` replaces it.

Known difference: after a mouse click, Chromium shows the focus ring on a Radix tab, because Radix focuses it programmatically, but not on a Base UI tab. Keyboard focus rings are identical. The parity test covers default, clicked (compared after blur), hover, focus-visible and arrow-key states in both orientations.

Base UI arrow navigation can focus a disabled tab while keeping the previous
enabled tab selected; another arrow continues through the list. Radix skips
disabled tabs. The expansion browser gate checks each edition's native behavior
in horizontal and vertical underline lists. An omitted horizontal
`aria-orientation` in Base UI retains ARIA's default horizontal meaning.
