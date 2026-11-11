# Overlays and search

Sub-project 4 of the 0.7.3 work. It adds four catalog components: Combobox, Command, Hover Card and Context Menu. They come in the Radix and Base UI editions and all five style families, with component-editor recipes. The preview scenes use all four, and the website editor gains a command palette and Combobox pickers. This work stacks on sub-project 3 (form controls, PR #103).

## Intent

The 0.7.3 design artifact (https://claude.ai/artifact/1FMRGWoyJSwht9wATT838U, "0.7.3 new components" boards, sections 04, 06, 08 and 09) defines these overlays in each family. Select cannot filter, and the twelve built-in presets already outgrow a plain list. A keyboard-first command menu, a preview card and a menu that opens at the pointer complete the overlay set that Popover, Dropdown Menu, Dialog and Tooltip started.

Decisions taken in brainstorming (10 November 2026):

- **The Radix edition** builds Combobox and Command on `cmdk`, as the boards do.
- **The Base UI edition** uses Base UI's own primitives: Combobox, Autocomplete (for Command), Preview Card and Context Menu. Base apps do not install `cmdk`. This follows phase 3's precedent of using OTPField.
- **Combobox** ships single selection with an optional create option, and a multiple mode whose selected values show as chips.
- **The components are used in the preview scenes and in the www editor chrome**, as in phase 3. They are compiled at build time, never when a page loads.

## Components

All four are client components. They come in five families and both colour modes. Liquid glass is experimental, and its findings do not block the release. Installing them needs CLI 0.7.3, and the catalog grows from 40 to 44 components. Both editions share part names and `data-slot` values.

### Combobox (`combobox`)

- **Parts:**

  | Part | Role |
  | --- | --- |
  | `Combobox` | root |
  | `ComboboxInput` | the field: an input with `role="combobox"`, plus the chips in multiple mode |
  | `ComboboxContent` | the popover |
  | `ComboboxList` | the list |
  | `ComboboxItem` | one option |
  | `ComboboxGroup` | a group of options, with its heading |
  | `ComboboxEmpty` | the empty state |
  | `ComboboxCreate` | the create option |
  | `ComboboxChips` | the multiple-mode chip row: slots `combobox-chips`, `combobox-chip` and `combobox-chip-remove` |

- **Root props:**
  - `value` or `defaultValue`: a `string` in single mode, `string[]` in multiple mode.
  - `onValueChange`, `multiple`, `disabled` and `name`. A named Combobox submits hidden inputs, one per value.
  - `onCreate?(query: string)`.
- **Behaviour:**
  - Typing filters items case-insensitively.
  - `highlightMatch(text, query)` wraps the matched run in `<mark>`. It is exported and escapes regex characters; with no match it returns the plain text.
  - `ComboboxCreate` renders "Create “query”" only when the query is not empty and no item label equals it, ignoring case. Choosing it calls `onCreate`.
  - In multiple mode, choosing an item toggles it, and the list stays open.
  - Backspace on empty text removes the last chip. Each chip's remove button is named "Remove X" and returns focus to the input.
  - Esc closes the list and keeps the value.
- **Accessibility:**
  - The input has `aria-expanded`, `aria-controls`, `aria-autocomplete="list"` and an `aria-activedescendant` that follows the highlight.
  - Each option has `role="option"` with `aria-selected`.
  - The empty state is announced in a polite live region.
  - The input takes its name from a Field or `aria-label`.
- **Primitives:**
  - Radix edition: `cmdk` 1.1.1 (MIT), which filters and moves the highlight, inside `@radix-ui/react-popover` 1.3.1. The input is the popover anchor. The selection and chips are Combobox state, not cmdk state.
  - Base UI edition: Base UI `Combobox`, including its `multiple` mode and chips, from `@base-ui/react` 1.9.0.
- The chips copy Chip's look through their own slots. They do not import `chip.tsx`, because the installer does not model one component depending on another.

### Command (`command`)

- **Parts:**

  | Part | Role |
  | --- | --- |
  | `Command` | inline root |
  | `CommandDialog` | Command inside Dialog, with an Esc hint |
  | `CommandInput` | the search box, with a search icon |
  | `CommandList` | the list |
  | `CommandGroup` | a group of items, with its `heading` |
  | `CommandItem` | one command: `onSelect`, `disabled`, `keywords` |
  | `CommandShortcut` | a key hint, rendered as `<kbd>` in the Kbd look |
  | `CommandSeparator` | a separator |
  | `CommandEmpty` | the empty state |

- **Behaviour:**
  - Typing filters items. A group whose items are all filtered out is hidden.
  - Up and Down move the highlight, and Enter runs `onSelect`.
  - `CommandDialog` takes `open` and `onOpenChange`. It focuses the search box on open and returns focus to the opener on close. The shortcut that opens it (for example Ctrl+K or ⌘K) belongs to the consumer and is shown in the docs.
- **Accessibility:**
  - The search box is a combobox that controls the listbox.
  - Items are options, and group headings name their groups.
  - The dialog is named "Command menu" unless the consumer names it.
  - The empty state is announced politely.
- **Primitives:**
  - Radix edition: `cmdk` 1.1.1, with `@radix-ui/react-dialog` 1.3.1 for the dialog.
  - Base UI edition: Base UI `Autocomplete` with an inline, always-open list, and Base UI `Dialog` for the dialog.

### Hover Card (`hover-card`)

- **Parts:** `HoverCard`, `HoverCardTrigger`, `HoverCardContent` and `HoverCardArrow` (the board's caret).
- **Props:**
  - `open` or `defaultOpen`, `onOpenChange`.
  - `openDelay` (default 500 ms) and `closeDelay` (default 200 ms).
  - On the content: `side` (`top` or `bottom`) and `align`.
- **Behaviour:**
  - The card opens on hover and on keyboard focus of the trigger, and closes on Esc, blur or pointer leave.
  - The trigger is a link that works on its own. The card is a supplement and holds no actions it alone offers.
- **Primitives:** Radix `@radix-ui/react-hover-card` 1.2.1 (MIT) and Base UI `PreviewCard`.

### Context Menu (`context-menu`)

- **Parts:** `ContextMenu`, `ContextMenuTrigger` (the zone), `ContextMenuContent`, `ContextMenuItem` (with `variant="destructive"`), `ContextMenuCheckboxItem`, `ContextMenuRadioGroup`, `ContextMenuRadioItem`, `ContextMenuLabel`, `ContextMenuSeparator`, `ContextMenuShortcut`, `ContextMenuSub`, `ContextMenuSubTrigger` and `ContextMenuSubContent`. They mirror Dropdown Menu.
- **Behaviour:**
  - A right-click opens the menu at the pointer. Shift+F10 and the context-menu key open it when the trigger has focus.
  - The arrow keys move through the items, Right opens a submenu, and Left or Esc closes it.
  - Esc closes the menu and returns focus to the trigger.
- **Primitives:** Radix `@radix-ui/react-context-menu` 2.4.1 (MIT) and Base UI `ContextMenu`.
- **Styles:** its own `context-menu-*` slots, because each selector names its slot. In every family the styles copy Dropdown Menu's item look.

Every primitive is pinned in `manifest.ts`. The phase 3 `editionDependencies` filter keeps each edition to the packages its template imports, so the Base UI edition never lists `cmdk` or a Radix package.

## Styles

- Every component has styles in all five families, following the boards:
  - the matched-text `<mark>` and the active option;
  - the Create row with its plus icon;
  - the search row with its Esc hint;
  - group headings;
  - the Kbd-styled shortcuts;
  - the hover card's caret;
  - the dashed context-menu zone.
- Focus follows the established rules. Text fields use the `:focus-within` wrapper ring that the audit measures. Glass uses the 2px foreground ring with no gap.
- Glass styles follow the glass lint: one `data-slot` per selector, the fixed `@supports` condition, and the `calc(var(--glass-inner-opacity, var(--glass-opacity)) * 100%)` form.
- Reduced motion turns off the overlays' open and close animations.
- Button and Input sizes do not change.

## Recipes and the component editor

Recipe schema branches. Object arrays carry an `id`, so items added in the editor keep it.

| Id | Props | Content |
| --- | --- | --- |
| `combobox` | `mode` (`single` or `multiple`), `creatable`, `selection[]` | `label`, `placeholder`, `emptyText`, `items {id, label, group}` |
| `command` | `presentation` (`inline` or `dialog`) | `placeholder`, `emptyText`, `groups {id, heading, items {id, label, shortcut}}` |
| `hover-card` | `side` (`top` or `bottom`), `arrow` | `triggerText`, `title`, `handle`, `body`, `initials` |
| `context-menu` | none | `zoneText`, `items {id, label, shortcut, kind}`, where `kind` is `item`, `submenu`, `separator` or `destructive` |

`validateComposition` in `packages/contracts/src/component-recipe.ts` rejects:
- `selection` ids that are not in `items`;
- more than one selection in `single` mode;
- an empty Command group;
- a Context Menu that starts or ends with a separator, or that has no item.

Compiler specimens in `recipe-specimen.ts` match the boards:
- **Combobox:** the "Preset" field filtered on "gla", with three matches and Create.
- **Command:** inline, filtered on "add", with Components and Theme groups and shortcuts.
- **Hover Card:** open, with the Ombelle UI card.
- **Context Menu:** open on the layer zone, with Duplicate, Apply preset ▸, Copy as JSX, a separator and Delete.

The overlay specimens are closed, like the existing Popover and Dropdown Menu specimens. The specimen audit's `overlays` map opens each one: a click for Combobox, focus for Hover Card, a right-click for Context Menu. The inline Command needs nothing opened. `install-command.ts` adds the four ids to the 0.7.3 gate.

## Website editor chrome

- **Command palette:**
  - Ctrl+K (⌘K on macOS) opens a `CommandDialog` in the editor shell. A toolbar button with a Kbd hint opens it too.
  - Groups:
    - *Components*: jump to any of the 44.
    - *Families*: switch the family.
    - *Actions*: reset, copy the install command, toggle the dark preview.
  - The palette loads with `next/dynamic` on the first open, so cmdk and the dialog stay out of First Load JS.
- **Combobox:** single mode without create replaces the Button icon `<select>` in `properties-panel.tsx` and the glass preset `<select>` in `apps/www/src/site/glass-preset-select.tsx`.
- **Compilation:** the editor uses the Radix edition. `scripts/generate-www-ui.ts` compiles it into the gitignored `apps/www/src/generated/ui` at build time.
- Hover Card and Context Menu stay out of the editor.
- **Size:** `scripts/measure-www-first-load.mjs` measures before and after, and the catalog growth is reported apart from the editor change. The editor change has a budget of **+20 kB gzip**. If the measurement exceeds it, the work stops and the result is reported before going on.

## Preview scenes and gallery

- **projects:**
  - a multiple Combobox "Owner" filter beside the status ChipGroup;
  - a Hover Card on each owner name;
  - a row Context Menu: Open, Duplicate, Archive, Delete.
- **settings:**
  - a single, creatable Combobox for "Default preset";
  - an inline Command card, which also opens as a dialog with Ctrl+K.
- **Gallery and edition scenarios:** gain a `data-testid="overlays-search"` section.

## Verification

- **Unit tests (vitest):**
  - each component's contract: parts, slots, pinned dependencies per edition, selectors, and experimental glass;
  - server markup: Combobox ARIA and `aria-selected`, Command listbox, headings and `<kbd>`, Hover Card and Context Menu triggers and open content;
  - `highlightMatch`, the rule that hides Create, and the multiple-mode toggle;
  - the `validateComposition` rules;
  - the specimens and the install gate.
- **Browser tests:** `tests/e2e/overlays-search.spec.ts` runs against both editions. It is added to `playwright.specimen-audit.config.ts` and ignored by the default config.
  - Combobox: filtering, the highlight and `aria-activedescendant`, Enter and Esc, Create, and multiple-mode chips with Backspace and the remove buttons.
  - Command: Ctrl+K open and focus, Esc and focus return, hidden empty groups, the announced empty state, and Enter running a command.
  - Hover Card: opening on hover and on focus, closing on Esc and blur, and the link still navigating.
  - Context Menu: right-click at the pointer, Shift+F10, arrows, the submenu, and Esc returning focus.
  - Editor: the palette (Ctrl+K, switching component and family) and both Combobox pickers. The editor specs that used `<select>` are updated.
- **Specimen audit:** 4 components × 5 families × 2 editions × light and dark. It checks focus, clipping, overflow, label spacing, target size, forced colors and axe. Glass findings are recorded but do not block.
- Passing suites are not re-run without a change that affects them.

## Documentation

- `docs/components/{combobox,command,hover-card,context-menu}.md`.
- `docs/evidence/overlays-search-073.md`: the size table, audit runs and board comparison.
- Updates to `docs/accessibility-review.md`, docs/03, the README (44 components), the CHANGELOG, and the component count in `tests/integration/liquid-glass-cli.test.ts`.

## Out of scope

- Async or remote item loading, and virtualized long lists.
- A Menubar.
- Palette search across docs pages.
- Hover Card and Context Menu in the editor.
- Calendar (sub-project 5), and variants of existing components (sub-project 6).
- Releases and the CLI version bump.
