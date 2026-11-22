# 04 — Component good practices

Date: 21 November 2026. Commit `7045d93d8b19cd59358cb203ed8d70fb60af2b82` (0.9.1 plus the audit docs commit), branch `docs/1-0-audits-wave-1`. Windows 11, Node 24.19.0, Chrome (system channel) through the repository's `@playwright/test`.

**Covered:** `packages/catalog/src/templates` (64 Radix-edition files for 63 components plus the glass filter, 9,702 lines) and `templates/base` (39 Base UI files, 8,350 lines), `manifest.ts`, `component-slots.ts`, `shadcn.ts`, the dependency wiring in `index.ts`, `docs/decisions/0005-base-ui-edition.md` and the 63 files in `docs/components/`. Counts come from the built catalog (`supportedComponentIds`: 63 components; `baseTemplates`: 39).

**How it was checked.** Templates were read; the table and dependency checks were scripted against the source and `packages/catalog/dist`. Runtime claims were reproduced two ways:

- In the preview dev server at `http://localhost:5183` (client-rendered), with Playwright scripts.
- In a throwaway Next.js 16.4.6 app in the scratchpad (`audit-04/rsc`), which imports the real templates (types stripped with esbuild, CSS imports removed) and is built with `next build --webpack`. It has one page authored as a Server Component and the same markup under `'use client'`.

All probe scripts are in the scratchpad `audit-04/` directory, not in the repository.

**Depth of reading.**

- Deep read (every line, Radix edition): sidebar, navigation-menu, resizable, data-table, menubar, prose, dialog, alert-dialog, sheet, popover, tooltip, hover-card, select, combobox, command, calendar (with DatePicker), toast, carousel, number-input, tag-input, field (with Form), password-field, checkbox, card, chip, input-otp, alert, native-select, button, input, textarea, label, badge, kbd, skeleton, spinner, separator, switch, toggle, toggle-group, aspect-ratio, button-group, empty, tabs, radio-group, collapsible, item.
- Partial read (the logic, not every part): toolbar, breadcrumb, code-block, slider.
- Skim (scripted table, greps for effects, browser APIs, casts, handlers and strings): accordion, avatar, color-picker, context-menu, dropdown-menu, input-group, meter, pagination, progress, scroll-area, stepper, table, liquid-glass-filter.
- Base UI edition: sidebar was diffed line by line against Radix. The other 38 were compared by script only (exports, slot order, dependencies, the patterns behind CAT-01, CAT-02, CAT-04, CAT-05 and CAT-07). No Base UI template was run in the Next.js probe.

**Not covered:** visual quality (audit 05), assistive-technology behaviour (audit 06), glass (audit 09), the CSS files beyond checks for logical properties and reduced motion, and the recipe compiler's rewriting of templates. React strict mode and the React Compiler were not run (see Unverified).

## Summary

The templates are careful code: handlers are merged in most places, effects clean up, ids come from `useId`, the server templates hold no hooks they should not, the CSS uses logical properties throughout, and the two editions export the same names. One structural habit does not survive contact with Next.js: fifteen client templates find their parts by comparing `child.type` with a component, and that comparison is always false when the tree is written in a Server Component, which is where a Next.js App Router page starts. The parts then render but the parent does not know them, so the carousel's buttons stay disabled, the combobox ignores the arrow keys, and group counts and descriptions are wrong, with no error. That blocks 1.0 unless the docs require `'use client'` around these components or the templates register parts through context. The other findings are real but shippable: a `data-slot` ordering split that strips a component's styles under an `asChild` trigger, three right-to-left and server-rendering bugs reproduced in a browser, a Data Table claim the props cannot honour, and a set of small prop and type leaks.

## API consistency table

Built by script from the Radix templates; the Base UI edition matches except where noted in the findings.

| Convention | Majority | Outliers |
| --- | --- | --- |
| `data-slot` relative to `{...props}` | After the spread, so the slot cannot be overridden: 40 templates | Before the spread on every part: accordion, alert-dialog (8 of 10 parts), avatar (3 of 6), collapsible, context-menu, dialog, dropdown-menu, hover-card, input, menubar, popover, radio-group, separator, sheet, switch, tabs, toast, tooltip. Mixed inside one file: checkbox, combobox, command, progress, scroll-area, select. See CAT-02 |
| `data-slot` on parts that render no DOM | Not set | Set and discarded on `Popover`, `Tooltip`, `TooltipProvider`, `HoverCard`, `Select`, `MenubarMenu`, `MenubarPortal`, `MenubarSub`, and the same parts of dropdown-menu and context-menu (as shadcn does). `Dialog`, `DialogTrigger` and `DialogClose` are the bare primitives with no slot at all |
| Size prop | `size?: 'sm' \| 'default' \| 'lg'` | Two values only: badge, native-select, select trigger, switch, item. Button adds `icon`, `icon-sm`. Dialog uses `sm \| default \| lg \| fullscreen` |
| `data-size` for the default size | Emitted as `default` (badge, button, native-select, select, sheet, spinner, toggle, item) | Omitted for default: input, textarea, switch, dialog |
| Look variants | `variant` | `appearance` (accordion, badge, card, checkbox option, tabs list), `tone` (alert-dialog media, meter, progress), `density` (card, table), `layout` (alert), `shape` (avatar, skeleton, meter, progress). Badge has both `variant` and `appearance` |
| Controlled value | `value ?? internal`: `value={undefined}` is uncontrolled | DatePicker treats a present `value` prop as controlled even when undefined (`calendar.tsx:149`); NumberInput uses `null` for empty |
| Root element props | Typed as the element's props and spread | Closed prop types with no spread: `DataTable`, `Combobox`, `DatePicker`, `SheetHandle`, `ToolbarOverflow`, `CodeBlockCopy` (no `onClick`) |
| Caller `ref` on a part that needs its own | Merged (button, dialog body, alert-dialog action, tag-input, password-field, toolbar) | Replaced: `ComboboxInput`, `NumberInput`, `CarouselContent`. See CAT-10 |
| Render another element | Radix `Slot` (button, empty) | Hand-written clones with opposite precedence: `SidebarMenuButton` (child props win) and `Item` (parent props win); neither merges handlers. See CAT-09 |
| `'use client'` | Present on every template with hooks, context or primitives; absent on the 19 that have none | None wrong. Server templates attach a handler only when the caller passes one |

## Findings

### CAT-01 Fifteen client components lose their parts when composed in a Server Component

- Severity: blocker
- Where (Radix edition; the Base UI files carry the same comparisons, in 11 of them):
  - `packages/catalog/src/templates/combobox.tsx:45-46`
  - `packages/catalog/src/templates/carousel.tsx:34,41,52,64-65`
  - `packages/catalog/src/templates/select.tsx:54`
  - `packages/catalog/src/templates/checkbox.tsx:94`
  - `packages/catalog/src/templates/field.tsx:28-31,189,198`
  - `packages/catalog/src/templates/command.tsx:20,60`
  - `packages/catalog/src/templates/toast.tsx:46-48`
  - `packages/catalog/src/templates/popover.tsx:77`
  - `packages/catalog/src/templates/breadcrumb.tsx:151,224,231`
  - `packages/catalog/src/templates/avatar.tsx:26`, `chip.tsx:13`, `meter.tsx:46-49`, `password-field.tsx:38`, `progress.tsx:63-66`, `slider.tsx:116`
  - Docs that show these compositions with no `'use client'` and no warning: every matching file in `docs/components/` (only `carousel.md:67` mentions a related limit, for thumbnails)
- What happens: these parents walk `children` and test `child.type === ComboboxItem` (and so on) to learn their options, slides, labels or triggers. When the JSX is written in a Server Component, React hands the client parent elements whose `type` is a lazy client reference, never the function itself, so every test is false. The parts still render, so nothing looks broken at first. Measured in the Next.js probe, same markup, server-authored page versus `'use client'` page:
  - Combobox with `defaultValue="b"`: the field shows `b`, not `Banana`. Arrow keys highlight nothing (`aria-activedescendant` stays empty), both options get the id `…-option--1`, and the "no results" text shows beside the options.
  - Carousel with three slides: every slide is labelled `1 of 1`, the counter reads `0 / 0`, and Next stays disabled after hydration.
  - Multiple Select with a chosen value: the trigger shows the placeholder, the hidden `<select>` holds the raw value as its label, and arrow keys highlight nothing.
  - CheckboxGroup with one of two checked: the parent reads unchecked, the count reads `0 of 0`, and both checkboxes share one id.
  - Field: the control has no `aria-describedby`, so the description is not announced.

  By the same code path, not run: a `CommandDialogTrigger` is not lifted out of the dialog, so it renders inside the closed dialog and cannot open it; a Toast with an action auto-dismisses; a Breadcrumb with `collapse="auto"` never folds. A Next.js App Router page is a Server Component unless the author adds `'use client'`, and the docs examples are pasted into exactly that file. The repository's consumers never see this because every specimen in `fixtures/shared/specimens/` starts with `'use client'`.
- How verified: reproduced. `next build --webpack` of the scratchpad app, then (a) the prerendered `.next/server/app/server.html` against `client.html`, and (b) `node rscprobe.mjs`, which starts `next start` and drives both pages in Chrome after hydration. The remaining ten templates were read: same comparison, same consequence.
- Suggested change: have parts register themselves with the parent through context (the pattern `Form`/`Field` already uses as a fallback in `field.tsx:244-254`), keeping the render-time walk only as a server-HTML optimisation. Until then, state in each affected doc that the composing file must be a client component, and add one server-authored page to the Next.js consumer.
- Effort: L

### CAT-02 Twenty-four templates let an `asChild` parent replace their `data-slot`, which removes their styles

- Severity: should-fix
- Where: every part listed as "before the spread" in the table above, for example `packages/catalog/src/templates/input.tsx:16-23`, `switch.tsx:19-22`, `tabs.tsx:35-38`, `radio-group.tsx:27-29`, `checkbox.tsx:28-31`, `accordion.tsx`, `select.tsx:224-227`, and the same lines in `templates/base/`. The hazard is already described and fixed in one place: `button.tsx:86-88`.
- What happens: family CSS selects on `[data-slot='…']`. A Radix trigger with `asChild` passes its own `data-slot` down through `Slot`. Templates that write `data-slot` before `{...props}` let it win. Measured: `<PopoverAnchor asChild><Input /></PopoverAnchor>` renders `<input data-slot="popover-anchor">`; `<TooltipTrigger asChild><Switch /></TooltipTrigger>` renders the switch with `data-slot="tooltip-trigger"`; a `TabsTrigger` under a tooltip trigger does the same. Each loses every family rule. `<TooltipTrigger asChild><Button>` keeps `data-slot="button"` because Button sets it after the spread. A tooltip on a switch, tab or toggle is an ordinary composition.
- How verified: reproduced: `/slot` page of the scratchpad Next.js app, prerendered HTML inspected. Ordering counted by `node table.mjs`.
- Suggested change: put `data-slot` (and the other attributes the CSS depends on) after `{...props}` in every template, and add a unit test that fails when a slot literal precedes a spread.
- Effort: M

### CAT-03 Carousel cannot advance past the second slide in right-to-left layouts

- Severity: should-fix
- Where: `packages/catalog/src/templates/carousel.tsx:141-150` (`measure`), `:100-108` (`scrollTo`). Carousel has no Base UI file, so both editions share it.
- What happens: `measure` takes `Math.abs(content.scrollLeft)` but compares it with `slide.offsetLeft - start`, which is negative in RTL. The nearest slide is therefore always the first. The index stays 0, so Next always scrolls to slide 2, the counter stays `1 / 5` and the first dot stays current. Measured with `document.documentElement.dir = 'rtl'`: three clicks on Next leave `scrollLeft` at -500 of 2000 and the counter at `1 / 5`; the same clicks in LTR reach slide 4.
- How verified: reproduced with `OMBELLE_BROWSER_CHANNEL=chrome node probe.mjs` against the preview's `c076-carousel` specimen.
- Suggested change: compare absolute offsets (`Math.abs(slide.offsetLeft - start)`), and add an RTL case to the carousel browser test.
- Effort: S

### CAT-04 A resizable side Sheet resizes the wrong way in right-to-left layouts

- Severity: should-fix
- Where: `packages/catalog/src/templates/sheet.tsx:168-198` (`sign` at `:172`), `packages/catalog/src/templates/base/sheet.tsx:176`
- What happens: the CSS places `side="inline-end"` with `inset-inline-end`, so in RTL the sheet sits on the left with its handle on its right edge. The handle's direction is fixed (`sign = side === 'inline-end' ? -1 : 1`). Measured in RTL: Arrow Right narrows the sheet (320 to 304) though the handle should move right and widen it, Arrow Left widens it, and a pointer drag of the handle did not change the width at all. In LTR all three behave.
- How verified: reproduced with `node sheet.mjs` against the preview's `vm-sheets` specimen (Radix edition). The Base UI file was read: same line.
- Suggested change: read the direction from the dialog (`getComputedStyle(...).direction`) when a drag or key starts and flip `sign` for RTL.
- Effort: S

### CAT-05 DatePicker's trigger text causes a hydration error when the server and browser locales differ

- Severity: should-fix
- Where: `packages/catalog/src/templates/calendar.tsx:26-32,120-122,156`, same lines in `templates/base/calendar.tsx`; `docs/components/calendar.md` (the `locale` prop)
- What happens: with no `locale` prop the trigger text is formatted by `new Intl.DateTimeFormat(undefined, …)`, which is the server process's locale on the server and the browser's on the client. The prop comment says the default is "the document's language"; the code never reads it. Measured with `defaultValue="2026-03-04"` on a server whose locale is French: an `en-US` browser gets server text `4 mars 2026`, client text `Mar 4, 2026` and React error 418 (hydration text mismatch); `de-DE` the same; `fr-FR` is clean. On an `en-US` server every visitor whose browser is not `en-US` hits it.
- How verified: reproduced with `node probe2.mjs` (`/date` page of the scratchpad Next.js app, three browser locales).
- Suggested change: render the server text with a fixed locale (or `suppressHydrationWarning` on the span) and switch to the browser or document locale in an effect; correct the comment and doc either way.
- Effort: S

### CAT-06 `autoSaveId` does not restore the saved layout on a server-rendered page

- Severity: should-fix
- Where: `packages/catalog/src/templates/resizable.tsx:27-47` (`checkedStorage`, `SavedGroup`); `docs/components/resizable.md:28`
- What happens: on the server `checkedStorage.getItem` returns null, so the HTML carries the default sizes. After hydration the saved layout is in local storage but the panels keep the server sizes. Measured in the Next.js probe: panels 492/492, five Arrow Right presses give 738/246 and store `{"a":75,"b":25}`, a reload returns to 492/492. In the client-rendered preview the same steps restore the layout (219/407 before and after reload), and that is the only case `tests/e2e/app-shell-09.spec.ts:134-152` covers. The doc promises the layout is remembered, without the condition.
- How verified: reproduced with `node probe3.mjs` (server-rendered) and `node probe4.mjs` (preview).
- Suggested change: after mount, when a valid saved layout differs from the rendered one, apply it through the group's imperative `setLayout`; add a server-rendered case to the Next.js consumer.
- Effort: M

### CAT-07 Data Table's docs promise server-side sorting, filtering and paging that its props cannot do

- Severity: should-fix
- Where: `packages/catalog/src/templates/data-table.tsx:76-107,123-137`, same lines in `templates/base/data-table.tsx`; `docs/components/data-table.md:34` and the `state` prop comment at `data-table.tsx:79`
- What happens: the doc says every state can be controlled "to move sorting, filters or pages to a server". The component fixes the table options: `manualPagination` is true only when pagination is off, and there is no `manualSorting`, `manualFiltering`, `rowCount` or `pageCount`, nor a way to pass table options. With `pagination` on and one server page of rows as `data`, the table paginates those rows again, reports "Page 1 of 1" and disables Next. Sorting and filtering are re-applied on the client to the server's page.
- How verified: read end to end (`DataTableProps` is a closed type and `useTable` receives only the listed options).
- Suggested change: add `manual?: { sorting?, filtering?, pagination? }` and `rowCount`, or an `options` pass-through to `useTable`; otherwise remove the server sentence from the doc and the prop comment.
- Effort: M

### CAT-08 Data Table rebuilds its columns on every render and shows zero counts for non-string facets

- Severity: nice-to-have
- Where: `packages/catalog/src/templates/data-table.tsx:111,114-121` (`facets = []` in a `useMemo` dependency list), `:249-251,272` (`counts.get(option.value)`), `:82-86` (`updater: any`); same lines in the Base UI file
- What happens: without a `facets` prop the default `[]` is a new array each render, so the `columns` memo never holds and TanStack rebuilds columns, headers and cells on every render, including each keystroke in the filter. Separately, facet options are strings while `getFacetedUniqueValues()` is keyed by the raw cell value, so a numeric or boolean column lists its values with a count of 0. The five change handlers are typed `(updater: any) => void`, which removes the updater type from user code.
- How verified: read end to end.
- Suggested change: hoist a constant empty array, look counts up by `String(key)`, and type the handlers with TanStack's `OnChangeFn`.
- Effort: S

### CAT-09 `SidebarMenuButton` rejects refs at the type level, and its `asChild` does not merge handlers

- Severity: should-fix
- Where: `packages/catalog/src/templates/sidebar.tsx:208-224,231-232`, `packages/catalog/src/templates/base/sidebar.tsx:209-234`; compare `packages/catalog/src/templates/item.tsx:13-19`
- What happens: the props are `ComponentProps<'button'> & ComponentProps<'a'>`, so `ref` must satisfy both element types. `useRef<HTMLButtonElement>(null)` and `useRef<HTMLAnchorElement>(null)` are both compile errors (TS2322), a callback ref loses its parameter type, and a handler typed for the anchor is rejected. At run time, `MenuButtonSlot` spreads `{ ...props, ...children.props }`: when both the button and the child link have `onClick`, only the child's runs. `Item asChild` clones the other way round, so there the parent's wins. Neither matches Radix `Slot`, which Button and Empty use and which merges both.
- How verified: the type errors were reproduced with `tsc -p .` on a five-line file in the scratchpad (`audit-04/ts`); the merge order was read.
- Suggested change: type the props as a union keyed on `href` (or use `React.ComponentProps<'button'>` with an explicit anchor overload), and use `@radix-ui/react-slot` in the Radix edition; sidebar already depends on three Radix packages.
- Effort: S

### CAT-10 Several parts accept props they then drop

- Severity: should-fix
- Where:
  - Caller `ref` replaced by the part's own: `packages/catalog/src/templates/combobox.tsx:229-230`, `number-input.tsx:131-132`, `carousel.tsx:164-165`
  - Caller handler replaced: `sidebar.tsx:140` (`SidebarRail` `onClick`), `combobox.tsx:285-290` (`ComboboxContent` `onInteractOutside` and both auto-focus handlers come before the spread, so a caller's replaces the guard that keeps the field's own clicks from closing the list), `combobox.tsx:349-354` (`ComboboxItem` `onClick`, `onMouseDown`)
  - Whole prop sets ignored in multiple mode: `select.tsx:123-128` (`SelectGroup`), `:145-152` (`SelectValue`, including `className`), `:245-267` (`SelectContent`: `side`, `align`, `style`, `id`, escape handlers), `:293` (`SelectLabel`), `:319-344` (`SelectItem`: `textValue`, `id`, handlers), `:366` (`SelectSeparator`)
  - Hard-set after the spread: `resizable.tsx:51` (`resizeTargetMinimumSize`)
- What happens: the types accept these props and nothing warns. Typical cost: `NumberInput` cannot be focused from a form library's ref, so "focus the first invalid field" skips it; a `className` on `SelectValue` works in single mode and silently stops when `multiple` is added.
- How verified: read end to end.
- Suggested change: merge refs with the helper already used in `alert-dialog.tsx:162-169`, compose handlers as the other parts do, and either forward or `Omit` the props the multiple Select ignores.
- Effort: M

### CAT-11 Command's `filter={false}` mode gives no way to read the search text

- Severity: should-fix
- Where: `packages/catalog/src/templates/command.tsx:25-41,88-97`, `packages/catalog/src/templates/base/command.tsx:55-101`; `docs/components/command.md:52`
- What happens: `filter` is documented as "set false when the items are already filtered, for example by a server". The search text lives in `Command`'s own state with only `defaultSearch` exposed, and `CommandInput` omits `value` and `onValueChange`. cmdk's input also overrides a caller's `onChange` (its own is spread last), so the only route left is a native `onInput`, which nothing documents. A server-filtered command menu cannot be built from the documented API.
- How verified: read end to end, including `cmdk/dist/index.mjs` 1.1.1 for the input's handler order.
- Suggested change: add `search` and `onSearchChange` to `Command` in both editions.
- Effort: S

### CAT-12 Custom form controls ignore form reset, and Combobox cannot be required

- Severity: should-fix
- Where: `packages/catalog/src/templates/combobox.tsx:113,184`, `tag-input.tsx:80,125`, `calendar.tsx:146,207-212` (DatePicker), `select.tsx:62,99-105` (multiple), `number-input.tsx:63,139`, `password-field.tsx:49` (strength); no template in either edition listens for `reset`
- What happens: these controls keep their value in React state and mirror it into hidden inputs. `<button type="reset">` or `form.reset()` clears the native fields beside them but not these: the chips, date and tags stay on screen and are submitted again. Separately, Combobox submits through `type="hidden"` inputs, which take no part in validation, and has no `required` prop, so `<Field required>` around it shows the asterisk and puts `required` on the text input, which is satisfied by any typed text whether or not an option was chosen.
- How verified: read end to end; `grep` for `reset` across both template directories finds only the `type` union in sidebar.
- Suggested change: listen for the owning form's `reset` event and return to the default value (Radix does this for its own controls), and give Combobox a `required` that validates the chosen value, as the multiple Select's hidden `<select>` does.
- Effort: M

### CAT-13 Visible and spoken English strings that no prop can change

- Severity: should-fix
- Where:
  - `packages/catalog/src/templates/data-table.tsx:45,51,59,232,276,286,295-299` ("Select all rows on this page", "Select row", "Actions", "Columns", "Clear filter", "… of … row(s) selected.", "Page … of …", "Previous page", "Next page")
  - `tag-input.tsx:98-99,106,141` ("… is already added", "You can add up to … tags", "Added …", "Removed …", "Remove …")
  - `field.tsx:355` ("Fix N fields before saving/submitting")
  - `combobox.tsx:201,384` ("Remove …", "Create “…”")
  - `carousel.tsx:191,271,301` ("N of M", "Slide N")
  - `sheet.tsx:56-57,168,262` ("Half height", "Full height", "Resize panel", "Close"), `dialog.tsx:51` ("Close")
  - `password-field.tsx:171-176,188` ("Weak", "Fair", "Strong", "Very strong", "to reach the last check"), `checkbox.tsx:193` ("N of M"), `calendar.tsx:81-82` ("Today, …", "…, selected"), `sidebar.tsx:132`
- What happens: most parts take a `label` prop or put their default `aria-label` before the spread, which is the right pattern. The strings above have no such door. Users own the source and can edit it, but each edit is then a modified file the installer reports as a conflict on the next update.
- How verified: read end to end.
- Suggested change: give each a prop (or one `labels` object per component), following `NumberInput`'s `decrementLabel`/`incrementLabel`.
- Effort: M

### CAT-14 Component docs disagree with the code on families, counts and one missing page

- Severity: nice-to-have
- Where: 28 files in `docs/components/` that say "available in all five families" (aspect-ratio, button-group, calendar, carousel, chip, code-block, collapsible, color-picker, combobox, command, context-menu, empty, field, hover-card, input-otp, item, kbd, meter, number-input, password-field, scroll-area, slider, spinner, stepper, tag-input, toggle, toggle-group, toolbar); `docs/decisions/0005-base-ui-edition.md:12,24` ("All 24 components", "Fourteen components have two sources"); no `docs/components/input.md`; `docs/components/context-menu.md` (omits `ContextMenuGroup`, `Label`, `CheckboxItem`, `RadioGroup`, `RadioItem`, `Portal`); `docs/components/color-picker.md` (16 exported helpers and types unmentioned)
- What happens: each of those 28 components ships styles for all eight families (seven stable plus liquid glass) in the built catalog. The catalog has 63 components and 39 Base UI templates. Input is the only component without a doc page. Exported names otherwise match the docs: a scripted cross-check of every export against its doc found only the gaps listed here plus a few helper types.
- How verified: `node docs.mjs` and a catalog query in the scratchpad; the decision file was read.
- Suggested change: generate the family sentence and the counts from the catalog, add `input.md`, and note in decision 0005 that its numbers are those of 7 November.
- Effort: S

### CAT-15 The Radix Calendar adds `date-fns` and `@date-fns/tz` to the user's dependencies without importing them

- Severity: nice-to-have
- Where: `packages/catalog/src/index.ts:89` (`calendar` in `extraDependencies`); `packages/catalog/src/templates/calendar.tsx:1-7`
- What happens: the template imports only `react-day-picker`, Radix Popover and `lucide-react`. `react-day-picker` 10.0.2 lists both date-fns packages as its own dependencies. The Radix edition still writes them into the user's `package.json`; the Base UI edition, which filters by import, does not. All other templates declare exactly what they import (scripted check, both editions, no missing dependency).
- How verified: `node deps.mjs` against `packages/catalog/dist`; `react-day-picker/package.json` read.
- Suggested change: drop the two entries, or apply the import filter to the Radix edition too. If they are kept so users can import a date-fns locale, say so in `calendar.md`.
- Effort: S

### CAT-16 Every Button measures its width on every render

- Severity: nice-to-have
- Where: `packages/catalog/src/templates/button.tsx:54-56`, `packages/catalog/src/templates/base/button.tsx:54-56`
- What happens: a `useLayoutEffect` with no dependency list calls `getBoundingClientRect()` after each render of each Button, so that `loading` can later keep the resting width. Any commit that renders a Button forces a synchronous layout, whether or not the app ever uses `loading`.
- How verified: read end to end.
- Suggested change: measure only when `loading` is about to turn on (read the width in the event that sets it, or in the layout effect keyed on `busy` before the spinner is shown), or only when a `loading` prop was ever passed.
- Effort: S

### CAT-17 Undocumented differences from shadcn's names

- Severity: nice-to-have
- Where: `packages/catalog/src/templates/button.tsx:6` (`buttonVariants` not exported), `dialog.tsx:6-8,27-56` (no `DialogPortal`, `DialogOverlay` or `showCloseButton`; the close button is always rendered), `navigation-menu.tsx` (no `navigationMenuTriggerStyle`; `NavigationMenuLink variant="trigger"` instead), `sidebar.tsx` (no `SidebarSeparator` or `SidebarMenuSkeleton`; `SidebarMenuButton` has `href` and no `variant`/`size`), `tooltip.tsx:30-45` (`Tooltip` needs a `TooltipProvider`, where shadcn's wraps its own); requirement at `docs/03-components-styles-accessibility.md:126`
- What happens: the requirement is to follow the shadcn edition's composition model and keep familiar names. These differences look deliberate, and several are documented by what the docs do show (the tooltip doc always shows the provider; the sidebar doc explains persistence). None is listed as a difference, so code that imports `buttonVariants` or `DialogOverlay` after replacing shadcn's file fails to compile with no pointer to the replacement.
- How verified: read end to end against the docs; shadcn's names are from its current templates, not re-fetched for this audit.
- Suggested change: add a short "Differences from shadcn" list to each affected doc, and export `buttonVariants`.
- Effort: S

## Unverified

- **React strict mode and the React Compiler.** Only `fixtures/shadcn/vite*/src/main.tsx` render under `StrictMode`; the preview and the shared scenarios do not, and nothing enables the compiler. I found no effect that looks unsafe when run twice, and one render-time ref write (`number-input.tsx:68-69`) that the compiler would refuse to optimise rather than break. Running the specimen suite once with `StrictMode` in `apps/preview/src/main.tsx`, and one consumer build with `babel-plugin-react-compiler`, would settle both.
- **Navigation Menu viewport clamping.** `navigation-menu.tsx:89-91` observes `wrapper.firstElementChild` once at mount, when Radix has not rendered the viewport, so the `ResizeObserver` never attaches and the position is recomputed only on `data-state` changes and window resizes. A panel that grows after it opens, or a wide second panel near the window's edge, may be clamped with a stale width. The preview specimen has two panels that both fit, so I could not provoke it; a specimen with a wide last panel at 480 px would.
- **The other ten templates of CAT-01** were not run in the Next.js probe, and neither was any Base UI template. The comparisons are the same; the visible consequences listed for Command, Toast and Breadcrumb are read from the code.
- **Popover arrow offset under a Server Component** (`popover.tsx:38,77`): `hasArrow` would be false, giving a 6px offset plus the arrow. Not measured.
- **Toast with a wrapped action**: `readContent` (`toast.tsx:43-50`) would miss an action rendered by the user's own component, so the toast would auto-dismiss after 6 s despite the WCAG note in the same file. Not run.
- **Pointer drag of the Sheet handle in RTL** did nothing in the probe; I did not find out whether that is the inverted sign meeting the clamp or a hit-target problem.

## Looked at and found sound

- **`'use client'` placement.** All 44 templates with hooks, context or primitives have it; the 19 without it (alert, badge, card, input, label, native-select, skeleton, table, textarea, input-group, pagination, spinner, kbd, empty, stepper, button-group, item, aspect-ratio, prose) use only `useId` and attach a handler only when the caller passes one, so they render from a Server Component.
- **Dependencies.** Scripted against the built catalog for both editions: no template imports a package it does not declare. Licences are MIT except `class-variance-authority` (Apache-2.0) and `lucide-react` (ISC); `@base-ui/react` 1.9.0 is MIT. Exact-version pinning and its effect on existing projects is CLI-01 and is not repeated here.
- **Edition parity.** Every name exported by a Radix template is exported by its Base UI template. The Base UI extras are prop types and the toast manager (`createToastManager`, `useToastManager`), which `docs/components/toast.md` documents.
- **Effects and cleanup.** Every listener, observer and timer I read is removed on unmount (sidebar shortcut and media query, tooltip document-leave, dialog body observers, toolbar and breadcrumb overflow observers, code-block copy timer, password-field submit listener). `ToastPromise` guards a late settle.
- **Ids and hydration elsewhere.** Ids come from `useId`; I found no `Math.random`, and `Date.now` only in an event handler. Sidebar's phone layout waits for hydration by design, and `CommandEmpty` waits for mount so the server does not print the empty text.
- **Controlled and uncontrolled state.** The hand-written controls (combobox, tag-input, chip, checkbox group, tooltip, sidebar, number-input, slider field) follow one pattern and call the change handler in both modes.
- **Native semantics in forms.** CardGroup uses native radios with a shared `name`; multiple Select mirrors into a hidden `<select multiple>` that carries `required`; TagInput relaxes `required` once a tag exists; `Form` reads each control's own constraints before the caller's `validate`.
- **RTL and reduced motion in CSS.** The component stylesheets of the ombelle family contain no physical `left`/`right` properties; six components carry explicit `:dir(rtl)` rules for icons that must mirror. Carousel and the glass filter read `prefers-reduced-motion` in script. The two RTL defects found are in script (CAT-03, CAT-04).
- **Docs versus exports.** Apart from CAT-14, every exported component and helper appears in its doc, and no doc names a part that does not exist.
