# Accessibility review protocol

This is the manual review that acceptance criterion PR5 in the [product requirements](01-product-requirements.md#acceptance-criteria) requires alongside automated checks. It covers the stable catalog: 63 components in 7 stable style families, 441 component and family entries. The components are `supportedComponentIds` in `packages/contracts/src/component-ids.ts`; the families are `supportedStyleFamilies` in `packages/contracts/src/style-families.ts` (flat, minimalist, neo-brutalism, ombelle, papier, organic and retro futurism). When either list changes, change the count here and the rows of the results tables. Liquid glass is not one of the stable families and is outside this protocol. The [components doc](03-components-styles-accessibility.md#accessibility-target) lists the behaviors the review must establish.

**No manual review has been performed.** The results tables below are empty. Until a human reviewer fills them in for a recorded environment, PR5 is not met, whatever the automated suites report. The automated half (axe with no rule exclusions, plus scripted keyboard, focus, target-size, contrast, forced-colors and reduced-motion checks) is summarized in the [web alpha readiness audit](web-alpha-readiness.md) and its linked evidence; this protocol does not repeat those checks, and passing them does not count as a manual result.

## How the entries are covered

Behavior comes from a component's template, and every family installs the same template: keyboard operation, names, roles, states and announcements do not change with the family. So the behavior passes (K, N and V below) are done once per component and edition, in any one stable family:

- 39 components have a separate Base UI template in `packages/catalog/src/templates/base/`. They need K, N and V in the Radix edition and again in the Base UI edition.
- The other 24 have no primitive imports, and one template serves both editions. One set of K, N and V covers both.

What the family changes is how things look: focus indicators, boundaries, forced colors, zoom and motion. A visual pass per family covers that, across all 63 components. Both editions share one stylesheet per family, so the visual pass is done on the Radix audit page.

An entry, one component in one family, is reviewed when the component's behavior passes and the family's visual pass are all **Pass** and the visual pass lists no failure for that component.

## Who and what

The reviewer is a person operating a real keyboard and screen reader, not an agent or a script. Record one row per pass: reviewer, date, commit, operating system and version, browser and version, screen reader and version, and any non-default settings (speech rate, verbosity, browse/focus mode defaults, keyboard layout). A pass that changes any of these is a separate row.

| Pass | Environment | Mode |
| --- | --- | --- |
| K | Any supported desktop browser, no assistive technology | Keyboard only. Unplug or ignore the pointer |
| N | Windows, current NVDA, current Chrome | NVDA browse mode and focus mode, keyboard only |
| V | macOS, current VoiceOver, current Safari | VoiceOver keyboard commands (VO keys), keyboard only. Enable "Press Tab to highlight each item on a webpage" in Safari settings |
| Visual | Any supported desktop browser; Windows for forced colors | Focus indicators in light and dark mode, Windows forced colors (High Contrast), 200 percent browser text zoom, and the operating system's reduced-motion setting |

## Setup

Run the preview from the repository checkout under review:

1. `pnpm install --frozen-lockfile --ignore-scripts`
2. `pnpm build:packages`
3. `pnpm generate:preview`
4. `pnpm dev:preview`

Each family and edition has a specimen audit page that renders every catalog component:

```text
http://127.0.0.1:4173/audit/<family>/<edition>/?mode=<mode>&only=<component>
```

- `<family>`: `flat`, `minimalist`, `neo-brutalism`, `ombelle`, `papier`, `organic` or `retro-futurism`.
- `<edition>`: `radix` or `base`. The Base UI page renders every component from its Base UI edition; the 24 one-template components are the same on both pages.
- `<mode>`: `light` or `dark`. Leaving `mode` out gives light.
- `<component>`: a component ID from the tables below, such as `context-menu`. Several IDs can be joined with commas. Leaving `only` out shows all 63 components.

For example, `http://127.0.0.1:4173/audit/papier/base/?mode=dark&only=combobox`.

For the behavior passes, open each component in light mode in one family of your choice, on the `radix` page and, for the 39 components with a Base UI template, on the `base` page. Record the family used in the Notes column. For the visual pass of a family, go through all 63 components on its `radix` page in light mode, then in dark mode, then with forced colors on, at 200 percent text zoom, and with reduced motion on.

Some checks below name a preview scene or the website because a component is easier to judge in context there (the `projects`, `settings` and `dashboard` scenes, the edition pages at `/editions/<family>/<edition>/`, and the website editors). Results are still recorded in the component's row.

## Automated checks

The [specimen audit](evidence/specimen-audit.md) automates part of what this protocol looks for, in Chromium only. For every catalog component in all eight families (the seven stable families and liquid glass), both editions, and light and dark mode, it measures:

- **Focus visible**: each control, list item and menu item reached by keyboard changes by at least 3:1 over 90 percent of a 1px outline.
- **Clipping**: shadows and focus rings are not cut by a clipping ancestor.
- **Overflow**: text does not leave its box, and boxes that clip do not squeeze their content.
- **Spacing**: a label sits at least 4px from its control.
- **Target size**: WCAG 2.5.8, with its spacing exception.
- **Forced colors**: focus shows as an outline, borders survive and no backdrop filter remains.
- **Axe**: the WCAG 2.2 A and AA rules.

Run it with `pnpm test:specimen-audit` after `pnpm build:packages` and `pnpm generate:preview`. It does not replace any K, N, V or visual pass: it checks what can be measured from rendered pixels and styles, not what a screen reader announces or how a person experiences reading order, zoom or forced colors.

## Checks for every component

Apply these in every behavior pass, then the component-specific checks. Steps marked *visual* are repeated in each family's visual pass.

1. **Tab order** follows the visual reading order and skips nothing interactive. Non-interactive elements (Badge, Card, Label, Tooltip content) take no tab stop.
2. **Focus visible** (*visual*): every focused control shows an indicator that is not clipped by overflow, is distinguishable from the unfocused state, and remains visible in dark mode and forced colors.
3. **Name, role, state** (N, V): the screen reader announces a meaningful name, the correct role, and the current state (checked, selected, expanded, disabled, invalid, required) on focus. No icon is announced in place of text.
4. **Disabled** controls are announced as disabled or unavailable and cannot be operated.
5. **Errors** (where present): the error text is announced with the field, not only shown in colour.
6. **Reading order** (N browse mode, V with VO+Right): content is read in the visual order, with no duplicated or orphaned text.
7. **Right-to-left** (where the fixture offers it): arrow-key direction and visual order mirror correctly.

## Component-specific checks

Each component's row in the results covers every check listed for it here, including its variant batches. A component with no section of its own (such as Dropdown Menu, Radio Group, Separator or Skeleton) is reviewed with the checks for every component.

**Button**
- Enter and Space both activate. Activation fires once per press.
- Loading buttons announce a busy or loading state and cannot be activated twice; the label stays meaningful.
- Icon-only buttons have an accessible name.
- Disabled buttons do not look active (*visual*).

**Badge**
- Read as inline text in context; it is not announced as a button or link and takes no tab stop.
- The destructive variant's meaning is carried by its text, not colour alone.

**Card**
- The title is announced as a heading at the documented level and appears in the screen reader's heading list (NVDA H / Insert+F7, VoiceOver rotor Headings).
- Header, description, content and footer are read in order. The card itself is not focusable and has no landmark or role announced.
- The dense variant reads identically to the default.

**Input**
- The associated Label is announced as the name on focus.
- Required, invalid and disabled states are announced. The error message is announced via its description.
- Typing, selection and deletion are echoed normally (NVDA focus mode switches automatically).

**Textarea**
- As Input, plus multi-line entry with Enter works and the screen reader stays in focus mode while editing.

**Label**
- Activating the label (VO+Space on the label, or clicking with the pointer re-enabled for this one check) moves focus to its control.
- The required marker is not read as a stray "star"; the control itself is announced as required.
- The 120-character label is read in full.

**Checkbox**
- Space toggles; Enter does not submit unexpectedly.
- The mixed checkbox is announced as "half checked" (NVDA) or "mixed" (VoiceOver), and toggling it announces the new state.
- Invalid state is announced. Submitting and resetting the fixture form reflect the state that was announced.

**Switch**
- Announced as a switch (or toggle button) with on/off state. Space toggles and the new state is announced immediately.

**Native Select**
- Opening, arrow-key navigation and selection work as the platform's native select; the selected option is announced.
- Option groups are announced. The 90-character option is read in full.
- The multiple select announces multi-selection and supports the platform's selection keys.
- The decorative chevron is never announced. Fieldset-disabled selects are announced as disabled.

**Dialog**
- Opening moves focus into the dialog; the title is announced as its name and the description is read.
- Tab and Shift+Tab stay inside the dialog. Escape closes it. The icon close button has an accessible name.
- Closing returns focus to the trigger. Content behind the dialog is not reachable in browse mode while it is open.
- The long dialog scrolls with the keyboard and focused elements are not clipped (*visual*).

**Tabs**
- Tab enters the list at the selected trigger and moves on to the active panel.
- Arrow keys move between triggers in the documented direction (Left/Right, mirrored in RTL; Up/Down when vertical); Home and End reach the ends; disabled triggers are skipped.
- Automatic activation selects the panel on focus; the selected state and "n of m" position are announced.
- The panel is announced as a tab panel named by its trigger.

**Tooltip**
- Focusing the trigger opens the tooltip immediately and the screen reader reads its text as the trigger's description.
- Escape dismisses it while focus stays on the trigger. Blur closes it.
- The tooltip holds no essential or interactive content and never receives focus.

**Display components (0.7.3)**

Spinner, Kbd, Empty, Field, Meter and Stepper. They also appear in context on the preview `projects`, `settings` and `dashboard` scenes.

- **Spinner**: a standalone spinner is announced once as a status named "Loading" (or its label); one marked `aria-hidden` inside a labelled button is not announced at all. It takes no tab stop.
- **Kbd**: keys are read as written text and take no tab stop.
- **Empty**: the title is read at the heading level the page gave it, then the description, then the actions in visual order (secondary, then primary).
- **Field**: focusing the control announces the label, the required state and the hint; while invalid it also announces "invalid" and the error text. The `*` is not read.
- **Meter**: the meter is announced with its label and value text ("128 of 200"); the visible "128 / 200" is not read twice as part of the meter. Labelled parts are understandable from the legend without colour.
- **Stepper**: the steps are read as an ordered list inside a navigation landmark named "Progress"; the current step is announced as current, and completed steps say "Completed". No step takes a tab stop.

**Form controls (0.7.3)**

Slider, Toggle Group, Chip, Tag Input and Input OTP. They also appear in context on the preview `settings` and `projects` scenes and in the website editor.

- **Slider**: each thumb is announced as a slider with its name and value text ("Border radius, 12 pixels"); the arrow keys, Page Up, Page Down, Home and End change it; range thumbs have distinct names and do not pass each other.
- **Toggle Group**: a single choice is announced as a radio group with one Tab stop, the arrow keys move between options, and Space selects; a multiple choice is a toolbar of toggle buttons announced as pressed or not.
- **Chip**: a filter chip is announced as a toggle button, pressed or not; a remove button is announced as "Remove" plus the chip's text.
- **Tag Input**: the input is announced with its label and hint; adding, removing, a duplicate and the maximum are announced politely; each tag's remove button is reachable by Tab and returns focus to the input.
- **Input OTP**: the code is announced as one named field in the Radix edition, or as named inputs ("Digit 2 of 6") in the Base UI edition; a pasted code fills every slot.

**Overlays and search (0.7.3)**

Combobox, Command, Hover Card, Context Menu and Calendar. They also appear in context on the preview `projects` and `settings` scenes and in the website editor (the Ctrl+K palette and the icon and glass preset pickers).

- **Combobox**: the field is announced as a combobox with its label, collapsed or expanded; the highlighted option is announced as the arrow keys move while focus stays in the field; "No presets found." is announced; each chip's remove button is named "Remove" plus its label.
- **Command**: Ctrl+K opens a dialog named "Command menu" with focus in the search box; group headings name their groups; the highlighted command is announced; Escape returns focus to where it was.
- **Hover Card**: the link reads and works on its own; the card appears on keyboard focus as on hover and closes on Escape.
- **Calendar**: one Tab enters the grid, named by its month; the arrow keys, Page Up, Page Down, Home and End move by day, month and week end; each day is announced with its full date, "Today" and "selected"; a disabled day cannot be chosen; the Date Picker button announces its date or "Choose a date", and choosing or Escape returns focus to it.
- **Context Menu**: Shift+F10 or the context-menu key on the focused area opens the menu; items, the submenu and the destructive item are announced; Escape returns focus to the area.

**Variants, batch 6a (0.7.3)**

New variants of Button, Badge, Alert, Card, Avatar and Accordion, recorded in each component's row. They also appear on the preview `projects` scene, the `settings` scene's Billing tab and the edition pages' "Variants" section.

- **Button**: a loading button keeps its name and is announced busy; an icon-only button is named by its `aria-label`, and its Tooltip shows the same words.
- **Badge**: soft and outline badges keep their status in the visible text; the colour is not the only cue.
- **Alert**: the Dismiss button is named "Dismiss"; after a dismiss, focus moves to the next heading rather than being lost.
- **Card**: a link card is announced as one link named by its title, and its other buttons keep their own names; a card group is announced as a radio group with its name, each option as a radio named by its title and described by its description; one Tab enters the group, and the arrow keys move and choose.
- **Avatar**: the overflow count is announced as "4 more reviewers", or its label.
- **Accordion**: a flush accordion keeps its headings and expanded states; the plus and minus icons are not announced.

**Variants, batches 6b and 6c (0.7.3)**

New variants of Tabs, Table, Input, Textarea, Input Group, Pagination, Select, Toast and Sheet, recorded in each component's row. They also appear on the preview `projects` and `settings` scenes and the edition pages' "More variants" section.

- **Tabs**: a pill with a count is named with its count, such as "Review 3"; vertical tabs move with Arrow Up and Arrow Down.
- **Table**: a sortable header is a button and announces its order through `aria-sort`; the actions header is named "Actions"; a loading table is busy, and its bars are not announced.
- **Input Group**: Clear is named and returns focus to the field; the counter is announced near and past the limit only.
- **Pagination**: compact previous and next are named "Previous page" and "Next page" and disabled at the ends; the page-size select is labelled.
- **Select**: a multiple select announces a listbox that allows several choices, each option selected or not, and keeps focus on its trigger.
- **Toast**: a toast is announced once; it waits while hovered or focused; a toast with an action stays until dismissed; a pending promise toast is not announced as an error.
- **Sheet**: the bottom handle and the side grip are named separators with their values, and work with the keyboard.

**Primitives (0.7.5)**

Toggle, Collapsible, Scroll Area, Button Group and Item. They also appear in the preview "Primitives" section of the edition pages and in the website editor. Review the family scrollbars on the Command, Combobox, Select and Sheet lists with the same pass as Scroll Area, and record them in the Scroll Area row.

- **Toggle**: the button is announced with its name and as pressed or not; Space and Enter toggle it; an icon-only Toggle is named by its `aria-label`.
- **Collapsible**: the trigger is announced as expanded or collapsed; Tab skips links and buttons in closed content and reaches them once it is open.
- **Scroll Area**: the viewport is announced as a region with its name; it is a Tab stop only while its content overflows, and then the arrow, Page Up and Page Down keys scroll it.
- **Button Group**: the group is announced with its name; each button is its own Tab stop; a separator is not a Tab stop; the ring of the focused button is whole.
- **Item**: a link Item is announced as a link inside a list item; its actions are separate buttons reached after it, not inside it.
- **List scrollbars**: the scrollbar on a Command, Combobox, Select or Sheet list does not add a Tab stop or change what the list announces.

**Editor inputs (0.7.5)**

Number Input and Color Picker. They also appear in the preview "Editor inputs" section of the edition pages, the settings scene and the website's preset and component editors.

- **Number Input steppers**: the field is announced as a spin button with its name, value and unit ("12 pixels"); the arrow, Page, Home and End keys change it; the two steppers are named "Decrease …" and "Increase …", are not Tab stops, and are announced as unavailable at the bounds; a half-typed value is kept and announced as invalid after the field loses focus.
- **Color Picker 2D area**: the swatch button is announced with "Open … color picker" and as expanded or collapsed; the popover is a dialog named "… color"; the area is one Tab stop announced as a 2D slider with "Saturation …%, brightness …%", and the arrow keys move it; the hue slider reads "Hue, … degrees".
- **Color Picker contrast readout**: the ratio and its level (AAA, AA, AA large or Fails) are text, not colour alone; the ratio is announced once when a drag or key press ends, not on every move.
- **Color Picker eyedropper**: where the browser has the EyeDropper API, the button is named "Pick a color from the screen"; Esc in the browser's picker leaves the value; where the API is missing, no button is shown.
- **Color Picker Pair**: the pair is announced as a group with the token's name, and each picker as "… · light" and "… · dark".

**Code Block (0.7.5)**

Code Block also appears in the preview "Code Block" section of the edition pages, the Projects scene's project page and the website's docs, component pages, editors' artifact views and Get code dialog.

- **Package-manager tabs**: the tab list is announced with its name ("Package manager"), each manager as a tab and the selected one as selected; the arrow keys move between tabs and select them, Home and End jump to the ends, and the command below changes; Copy is named "Copy command" (or the page's own label) and copies the selected manager's command.
- **Scrollable `pre`**: the code is one Tab stop announced as a region named "<title> source", or "Code" without a title; the arrow keys scroll it, and a long line scrolls inside it, not the page; line numbers are not read and are not part of a copied selection; several untitled blocks on one page share the name "Code".
- **Copy announcement**: Copy is named "Copy <title>" or "Copy code"; after a click "Copied" is announced once and the label reads "Copied" for 2 s; when the clipboard is unavailable or refuses, "Copy failed" is announced and the label reads "Copy failed" for 2 s.
- **Token contrast**: every token colour is readable on the dark surface in both site and preview modes (at least 4.5:1, line numbers 3:1, as measured in the evidence); in forced colours the code is `CanvasText` on `Canvas` with a visible border, and the selected tab is `Highlight`.

**Variants, batch 4a (0.7.5)**

Record these in the row of the component they belong to. They also appear in the preview "0.7.5 variants" section of the edition pages, the Settings and Projects scenes and the website's component editor.

- **Checkbox Option**: the checkbox is announced with the option's title as its name and its description as its description; a click on the title, the description or anywhere on the card toggles it once; Tab reaches the checkbox and Space toggles it; a disabled option does not toggle.
- **Small Switch target**: the `sm` Switch can be activated anywhere in a 24 × 24 px area around its track; in a horizontal Field row it is named by the row's label.
- **Progress labelling**: a Progress with a label is announced with the label as its name and the readout ("64%", or the formatted text) as its value; the readout itself is not read twice; a tone is never the only status signal.
- **Popover arrow**: the arrow is not announced; the popover keeps its name and focus behaviour.

**Variants, batch 4b (0.7.5)**

Record these in the row of the component they belong to. They also appear in the preview "0.7.5 variants" section of the edition pages, the Projects scene and the website's editors.

- **Scrolling Dialog body**: the body is announced as a region named by the dialog title; while it overflows, Tab reaches it and the arrow keys and Page Down scroll it; the footer actions stay on screen; a body that fits is not a Tab stop.
- **Typed confirmation**: focus starts in the text field, announced with the instruction as its name; the action is announced as unavailable with the instruction as its description until the text matches exactly; Enter does nothing until then; Escape and Cancel close.
- **Collapsed Breadcrumb menu**: the "Show N more" button is announced with its count and opens a menu whose items are the folded pages, as links, in trail order; Escape closes it and returns focus to the button.

**Components (0.7.6)**

Record these in the row of the component they belong to (the form error summary and FieldSet in the Field row). They also appear in the preview "0.7.6 components" section of the edition pages, the Settings and Projects scenes and the website's editor top bar.

- **Form error summary**: before the first submit nothing is announced as invalid; after a failed submit focus moves to the summary, announced as a region named "Fix N fields before …"; each line is a link that moves focus to its field, which is announced as invalid with its message as its description; an error clears when its field changes.
- **FieldSet and Checkbox Group**: the group is announced with its legend; the parent checkbox is announced as mixed, checked or not checked, with the count in its name; pressing it checks or clears every enabled child; a disabled fieldset disables every control inside.
- **Password Field**: the toggle is announced as "Show password", pressed or not; toggling keeps focus and the caret in the input; "Caps Lock is on" is announced once while the input has focus; the strength meter is announced with its word and the first missing check.
- **Carousel**: the region is announced as a carousel with its name, each slide as "N of M"; the viewport is one Tab stop scrolled by the arrow keys; Previous and Next are announced as unavailable at the ends; the current dot is marked as current; nothing moves on its own.
- **Image Carousel**: each slide's image is announced with its alt text; the thumbnails are a group named "Choose an image", each button named by its image's alt text and the current one announced as current; activating a thumbnail moves to its slide and the current mark follows; images from the third slide load lazily without changing what is announced; below 640px the thumbnails scroll sideways and every one stays reachable with Tab.
- **Aspect Ratio**: the frame adds no role or name; its media keeps its own alt text.
- **Toolbar**: the toolbar is one Tab stop announced with its name; the arrow keys, Home and End move between items; toggles announce their state; when items overflow, the More button is announced with its menu, which lists the hidden items in order with toggles as checkable items, and focus never lands on a hidden item.
- **Prose**: headings keep their levels; links keep their underline and are announced as links; a wide table scrolls inside its box without hiding headers from assistive technology.
- **Navigation Menu**: the navigation is announced with its name; triggers are buttons announced as expanded or collapsed; the arrow keys move between top-level items and Escape closes a panel, returning focus to its trigger; the current page's link is announced as current.
- **Sidebar**: the sidebar is a navigation region with its name; the trigger is announced as expanded or collapsed; collapsed to icons, each item keeps its name and shows it as a tooltip on focus; the current item is announced as current; on phones the sheet is a modal dialog with its name that keeps focus; Ctrl or Cmd + B toggles it except while typing.
- **Resizable**: each handle is a separator with its value, named when there are several; the arrow keys, Home and End resize; a pointer can grab it within 12 px of its line.
- **Menubar**: the bar is one Tab stop announced as a menubar with its name; the arrow keys move between menus and open the neighbouring menu while one is open; checkbox and radio items announce their state; Escape returns focus to the trigger; shortcuts are shown as text only.
- **Data Table**: sorted headers announce their order; the search field and facet popover are named; the selection count and "No results." are announced politely; row checkboxes and row actions are named.

## Results

Record each pass as **Pass**, **Fail** (with a linked issue) or **Blocked** (with a reason). Leave a cell empty until it is actually tested.

### Environments

| Pass | Reviewer | Date | Commit | OS and version | Browser and version | Screen reader and version | Settings |
| --- | --- | --- | --- | --- | --- | --- | --- |
| K | | | | | | n/a | |
| N | | | | | | | |
| V | | | | | | | |
| Visual | | | | | | n/a | |

### Behavior by component

One row per component, 63 in all. Record the family the passes used in Notes.

#### Components with a Base UI template (39)

| Component | ID | Radix K | Radix N | Radix V | Base UI K | Base UI N | Base UI V | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Accordion | `accordion` | | | | | | | |
| Button | `button` | | | | | | | |
| Avatar | `avatar` | | | | | | | |
| Checkbox | `checkbox` | | | | | | | |
| Dialog | `dialog` | | | | | | | |
| Dropdown Menu | `dropdown-menu` | | | | | | | |
| Popover | `popover` | | | | | | | |
| Progress | `progress` | | | | | | | |
| Radio Group | `radio-group` | | | | | | | |
| Select | `select` | | | | | | | |
| Switch | `switch` | | | | | | | |
| Separator | `separator` | | | | | | | |
| Tabs | `tabs` | | | | | | | |
| Tooltip | `tooltip` | | | | | | | |
| Sheet | `sheet` | | | | | | | |
| Alert Dialog | `alert-dialog` | | | | | | | |
| Breadcrumb | `breadcrumb` | | | | | | | |
| Toast | `toast` | | | | | | | |
| Empty | `empty` | | | | | | | |
| Field | `field` | | | | | | | |
| Meter | `meter` | | | | | | | |
| Slider | `slider` | | | | | | | |
| Toggle Group | `toggle-group` | | | | | | | |
| Input OTP | `input-otp` | | | | | | | |
| Combobox | `combobox` | | | | | | | |
| Command | `command` | | | | | | | |
| Hover Card | `hover-card` | | | | | | | |
| Context Menu | `context-menu` | | | | | | | |
| Calendar | `calendar` | | | | | | | |
| Toggle | `toggle` | | | | | | | |
| Collapsible | `collapsible` | | | | | | | |
| Scroll Area | `scroll-area` | | | | | | | |
| Color Picker | `color-picker` | | | | | | | |
| Code Block | `code-block` | | | | | | | |
| Toolbar | `toolbar` | | | | | | | |
| Navigation Menu | `navigation-menu` | | | | | | | |
| Sidebar | `sidebar` | | | | | | | |
| Menubar | `menubar` | | | | | | | |
| Data Table | `data-table` | | | | | | | |

#### Components with one template for both editions (24)

| Component | ID | K | N | V | Notes |
| --- | --- | --- | --- | --- | --- |
| Alert | `alert` | | | | |
| Badge | `badge` | | | | |
| Card | `card` | | | | |
| Input | `input` | | | | |
| Label | `label` | | | | |
| Native Select | `native-select` | | | | |
| Skeleton | `skeleton` | | | | |
| Table | `table` | | | | |
| Textarea | `textarea` | | | | |
| Input Group | `input-group` | | | | |
| Pagination | `pagination` | | | | |
| Spinner | `spinner` | | | | |
| Kbd | `kbd` | | | | |
| Stepper | `stepper` | | | | |
| Chip | `chip` | | | | |
| Tag Input | `tag-input` | | | | |
| Button Group | `button-group` | | | | |
| Item | `item` | | | | |
| Number Input | `number-input` | | | | |
| Password Field | `password-field` | | | | |
| Carousel | `carousel` | | | | |
| Aspect Ratio | `aspect-ratio` | | | | |
| Prose | `prose` | | | | |
| Resizable | `resizable` | | | | |

### Visual pass by family

| Family | Light focus | Dark focus | Forced colors | 200% zoom | Reduced motion | Components that fail (with issue) |
| --- | --- | --- | --- | --- | --- | --- |
| Flat (`flat`) | | | | | | |
| Minimalist (`minimalist`) | | | | | | |
| Neo-brutalism (`neo-brutalism`) | | | | | | |
| Ombelle (`ombelle`) | | | | | | |
| Papier (`papier`) | | | | | | |
| Organic (`organic`) | | | | | | |
| Retro futurism (`retro-futurism`) | | | | | | |

### Findings

| ID | Component | Family | Pass | Description | Severity | Issue | Status |
| --- | --- | --- | --- | --- | --- | --- | --- |
| | | | | | | | |

Record visual failures here too, with their family. When the tables are complete, update the PR5 row in the [web alpha readiness audit](web-alpha-readiness.md) with the environments and outcome. Any entry with a failing or missing pass stays out of the stable claim.
