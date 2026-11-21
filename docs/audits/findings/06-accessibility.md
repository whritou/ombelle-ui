# 06 — Accessibility

2026-11-21, commit `7045d93d` (0.9.1, branch `docs/1-0-audits-wave-1`).

**Covered.** The 63 catalog components (`packages/contracts/src/component-ids.ts`) in the seven stable families (`supportedStyleFamilies` in `packages/contracts/src/style-families.ts`), both editions (Radix and Base UI), on the preview's specimen audit pages (`/audit/<family>/<edition>/?mode=…&only=…`, 118 specimens per page). Method: Playwright scripts kept outside the repository, using the repository's `@playwright/test` and `@axe-core/playwright`, pressing real keys and reading the accessibility tree and ARIA attributes after each key; contrast computed from resolved computed styles (colours rasterised to sRGB, alpha composited over ancestors); focus indicators checked by pixel difference. `docs/accessibility-review.md`, `docs/03-components-styles-accessibility.md`, the specimen audit (`tests/helpers/specimen-audit.ts`, `tests/e2e/specimen-audit.spec.ts`) and the component specs were read. The website (`apps/www`) was audited from source only.

**Not covered, and why.**

- **No screen-reader review.** I cannot operate NVDA or VoiceOver. Everything below is keyboard, accessibility-tree and computed-style evidence. The manual NVDA/VoiceOver review is still owed (see A11Y-02 and "Manual review still owed").
- **Website and both editors were not exercised in a browser** (the site was not started). Website findings are source reading; they are marked as such.
- **Browser.** The repository's bundled Chromium build (1254) is not installed on this machine, so the scripts ran on the installed Chrome through `channel: 'chrome'` (the same switch as `OMBELLE_BROWSER_CHANNEL`). One engine only: no Firefox, no Safari.
- **Liquid glass** contrast and focus on glass are left to audit 09.
- **Depth by family.** Keyboard and tree checks ran on Ombelle (plus Flat and Neo-brutalism spot checks), since behaviour comes from the templates, not the styles. Contrast and focus-ring checks ran on all seven stable families in light and dark, Radix edition (the two editions share the family CSS by slot name).
- **Not rerun:** the repository's axe, target-size (2.5.8) and forced-colours checks. They exist for every specimen in `tests/e2e/specimen-audit.spec.ts`; I read them and did not repeat them.
- **Not tested:** 200% browser zoom and native text zoom (only the 320 px reflow and text-spacing overrides were scripted), touch, and mobile assistive technology.

## Summary

The catalog's keyboard behaviour is in good shape: of roughly forty interactive widgets driven in both editions, the roles, states, focus trap and focus return matched the APG pattern almost everywhere, and focus indicators are strong in every stable family. Two things block 1.0. The Radix Combobox loses the first character typed into a closed field, which is the normal keyboard path and is not covered by any test. And the site describes the components as "accessible" while the project's own acceptance criterion (PR5) for a manual keyboard and screen-reader review is unmet: all 88 result rows in `docs/accessibility-review.md` are blank, and the form has no columns for four of the seven stable families. Below that sit a set of should-fix items: Base UI edition gaps against the Radix edition (tooltip not exposed, Command pointing at a missing option, Toggle Group tab stop, Navigation Menu keys), three Flat inputs with a 1.1:1 boundary, a Base Input OTP layout that is 1,600 px wide when used without its group, and several website problems found in source (motion with no pause, a skip link that does not skip the sidebar, status messages hidden behind modals).

## Findings

### A11Y-01 Radix Combobox drops the first keystroke typed into a closed field

- Severity: blocker
- Where: `packages/catalog/src/templates/combobox.tsx:121-125` (`setOpen`), `:140-144` (`setQuery`), `:240-244` (input `onChange`)
- What happens: a keyboard user tabs to the Combobox and types. The first key is lost. With the field showing `gla`, select-all then typing `fl` leaves `l`. After choosing "Liquid glass — Givre", the first Backspace deletes nothing and typing `fl` over the selected text gives "Liquid glass — Givrel". Cause: `onChange` calls `setQuery(value)` (which sets `typing` true) and then `setOpen(true)`; opening from closed calls `setTyping(false)`, so the text falls back to the selected label (or empty) and the typed character is discarded. The Base UI edition types `fl` correctly. `tests/e2e/overlays-search.spec.ts:18-19` and `:67-68` always click the input first, which opens the list, so the suite never types into a closed field.
- How verified: reproduced in the preview (`/audit/ombelle/radix/?only=combobox`) with focus set by keyboard, then `Control+a`, `f`, `l`; and `ArrowDown ArrowDown Enter Backspace Backspace`. Code path read end to end.
- Suggested change: do not reset `typing` when the open is caused by typing (open first, then set the query, or pass a reason to `setOpen`). Add a test that focuses without clicking and types.
- Effort: S

### A11Y-02 The site says "accessible" while the required manual review has not been done

- Severity: blocker
- Where: `apps/www/src/app/layout.tsx:18`, `apps/www/src/app/(home)/page.tsx:14` ("Editable, accessible React components…"); `apps/www/src/site/home/landing.tsx:105-107`; `docs/accessibility-review.md:5` ("No manual review has been performed"), results tables from `:256`; `docs/03-components-styles-accessibility.md:199` ("Run NVDA with Chrome on Windows and VoiceOver with Safari on macOS before stable web release"); `docs/web-alpha-readiness.md:27` (PR5 "Not met"), `:47`, `:56`
- What happens: the public metadata describes the components as accessible. The project's own acceptance criterion PR5 requires documented manual keyboard, NVDA and VoiceOver results for each stable entry, and the components doc requires them before a stable web release. All 88 result rows in the review file are empty (only the header rows and one "n/a" cell contain text). This audit found defects that the automated suites pass (A11Y-01, A11Y-04 to A11Y-11), which is what an unreviewed area looks like. The known gap in `docs/web-alpha-readiness.md` still holds.
- How verified: read end to end; result rows counted with a script.
- Suggested change: run the K, N and V passes (priority list below) and record them, or restrict the wording to what the evidence supports ("built on Radix UI or Base UI primitives; automated axe, keyboard and contrast checks; manual assistive-technology review pending").
- Effort: L (the review), S (the wording)

### A11Y-03 The review protocol cannot record four of the seven stable families and describes an older catalog

- Severity: should-fix
- Where: `docs/accessibility-review.md:3` ("twelve stable components in flat, minimalist and neo-brutalism: 36 entries"), `:28` ("four stable families"), `:51` ("all five families"), every results table (columns for Flat, Minimalist, Neo-brutalism only); `docs/web-alpha-readiness.md:56` ("48 stable entries")
- What happens: the code has 63 components and 7 stable families (441 stable entries). The results tables have no columns for Ombelle, Papier, Organic or Retro futurism, so a reviewer cannot record a pass for them, and the three counts in the file disagree with each other and with the code. The setup section points at `http://127.0.0.1:4173/<family>/?…&states=1`-style fixtures, while the newer components are only on the audit pages and scenes.
- How verified: read end to end; counts taken from `component-ids.ts` and `style-families.ts`.
- Suggested change: regenerate the tables from the component and family lists (one row per component, K/N/V per family or one family per behaviour pass plus a visual pass per family), and state one count.
- Effort: S

### A11Y-04 Base UI Input OTP is about 1,600 px wide when slots are not wrapped in a group, and the specimen audit does not notice

- Severity: should-fix
- Where: `packages/catalog/src/styles/input-otp/ombelle.css:98-107` (same block in every family file under `packages/catalog/src/styles/input-otp/`), `packages/catalog/src/templates/base/input-otp.tsx:84-93`; specimen rendered on `/audit/<family>/base/`
- What happens: the narrow-container rules set `[data-slot='input-otp-slot'] { inline-size: auto }` and rely on the parent `input-otp-group` grid for the width. In the Base edition each slot is an `<input>`; outside a group it takes the browser's default width. On the audit page the six slots are 258 px each, the field is 1,608 px wide and the page scrolls sideways at every viewport (document width 1,670 px at 1,100 px, 1,640 px at 320 px), in Ombelle, Flat and Neo-brutalism alike. The Radix edition is 256 px wide in total. This fails reflow (1.4.10) for that markup. The catalog usage example does use `InputOTPGroup`, so the documented markup is not affected; the audit specimen and any consumer who omits the group are. The specimen audit's overflow check measures text inside boxes, not page width, so it passes.
- How verified: reproduced (`/audit/ombelle/base/?only=input-otp` at 1,100, 480, 375 and 320 px; matching CSS rules listed from the page).
- Suggested change: give the slot a width that does not depend on the group (for example `inline-size: min(46px, 100%)` with the grid track still allowed to shrink it), and add a document-width assertion to the specimen audit.
- Effort: S

### A11Y-05 Flat: Combobox, Tag Input and Number Input have a boundary at about 1.1:1

- Severity: should-fix
- Where: `packages/catalog/src/styles/combobox/flat.css`, `styles/tag-input/flat.css`, `styles/number-input/flat.css` (field slots `combobox-field`, `tag-input`, `number-input`)
- What happens: Flat's Input, Textarea, Select, Native Select, Input OTP and Input Group draw a 2 px line in `#7c879b`, 3.32:1 against the page. The three fields below have no such line:

  | Field | Light | Dark |
  | --- | --- | --- |
  | Combobox field | fill `#ffffff` on `#f3f5f9`, 1.09:1, no border | fill `#151e32` on `#0b1120`, 1.13:1, no border |
  | Tag Input | fill `#ffffff` on `#f3f5f9`, 1.09:1, no border | fill `#151e32` on `#0b1120`, 1.13:1, no border |
  | Number Input | 1 px border `#e2e6ee` on `#f3f5f9`, 1.15:1 | 1 px border `#26314a` on `#0b1120`, 1.45:1 |

  The edge of the text field is below the 3:1 that 1.4.11 asks for, and the three controls do not look like the family's other inputs. The other six stable families pass (lowest input boundary measured elsewhere is above 3:1).
- How verified: computed from resolved styles on `/audit/flat/radix/` in both modes; confirmed on a screenshot.
- Suggested change: reuse the Flat input line (`2px` in the `--input` colour) on these three field slots.
- Effort: S

### A11Y-06 Base UI Tooltip text is not exposed to assistive technology

- Severity: should-fix
- Where: `packages/catalog/src/templates/base/tooltip.tsx` (trigger and content parts); compare `packages/catalog/src/templates/tooltip.tsx`
- What happens: in the Radix edition a focused trigger gets `aria-describedby` and the popup has `role="tooltip"` ("View project details" is read after the button's name). In the Base edition the same specimen shows the popup as plain text with no role, and the trigger has no `aria-describedby`. A screen-reader user of a Base UI project never hears the tooltip, and the two editions, which the catalog presents as equivalent, differ in what they announce. The review protocol's Tooltip checks (`docs/accessibility-review.md:129`) assume the association.
- How verified: reproduced with keyboard focus on `/audit/ombelle/radix/?only=tooltip` and `/audit/ombelle/base/?only=tooltip`; accessibility tree and trigger attributes read in both.
- Suggested change: in the Base template, give the popup an id and `role="tooltip"` and set `aria-describedby` on the trigger while open, or document that Base tooltips are visual only and every trigger needs its own full name.
- Effort: S

### A11Y-07 Base UI Command points `aria-activedescendant` at an element that does not exist when there are no results

- Severity: should-fix
- Where: `packages/catalog/src/templates/base/command.tsx:141-142` (input), list part in the same file
- What happens: type a query with no match (`zzz`). The input keeps `aria-expanded="true"` and `aria-activedescendant="<id>-0"`, but no element with that id is in the document. The Radix edition removes the attribute. Also in the Base edition the listbox has no accessible name (Radix: "Suggestions") and no option is marked selected on first render.
- How verified: reproduced on `/audit/ombelle/base/?only=command`; `document.getElementById` of the referenced id returned null.
- Suggested change: clear `aria-activedescendant` when the filtered list is empty; pass the list label through as in the Radix template.
- Effort: S

### A11Y-08 Data Table row checkboxes all have the same name

- Severity: should-fix
- Where: `packages/catalog/src/templates/data-table.tsx:51` (`aria-label="Select row"`), same in `packages/catalog/src/templates/base/data-table.tsx`
- What happens: every row checkbox is "Select row". In a screen reader's form-control list, or when tabbing down the column, twelve identical names cannot be told apart (2.4.6, and voice control cannot target one). The review protocol's own line for Data Table says row checkboxes "are named" (`docs/accessibility-review.md:251`), which is true but not enough.
- How verified: accessibility tree read on `/audit/ombelle/radix/?only=data-table` and the Base page; code read.
- Suggested change: let `selectColumn` take a label function and default to the row's first cell or id ("Select Accordion").
- Effort: S

### A11Y-09 Base UI single Toggle Group puts its tab stop on the first item, not the checked one

- Severity: should-fix
- Where: `packages/catalog/src/templates/base/toggle-group.tsx:48`, `:65`
- What happens: the template turns a single-choice group into `role="radiogroup"` with `role="radio"` items. With "Week" checked, Tab enters on "Day" (unchecked). The APG radio group pattern, and the Radix edition, put the tab stop on the checked radio. A keyboard user lands on the wrong option and must hunt for the current value.
- How verified: reproduced with Tab on `/audit/ombelle/base/?only=toggle-group` and the Radix page.
- Suggested change: make the checked item the roving tab stop when the group is a radio group.
- Effort: S

### A11Y-10 Base UI Navigation Menu: Home and End do nothing, Down does not enter an open panel, and an unnamed second navigation landmark appears

- Severity: should-fix
- Where: `packages/catalog/src/templates/base/navigation-menu.tsx`
- What happens: in the Radix edition Home and End move to the first and last top-level item, and ArrowDown on an open trigger moves into the panel. In the Base edition Home and End leave focus where it is and ArrowDown stays on the trigger; only Tab enters the panel. While a panel is open the accessibility tree also gains a second `navigation` landmark with no name (the portalled popup). Escape and focus return work in both.
- How verified: reproduced on `/audit/ombelle/base/?only=navigation-menu` and the Radix page (same key sequence in both).
- Suggested change: add the missing keys in the Base template or record the difference in the component notes; give the popup a non-landmark element or a label.
- Effort: M

### A11Y-11 Right-to-left: arrow keys are not mirrored, and nothing tells the consumer how to make them

- Severity: should-fix
- Where: all composite templates (Tabs, Slider, Menubar, Toggle Group, Toolbar, Resizable); `docs/03-components-styles-accessibility.md:197` lists right-to-left as required evidence
- What happens: with `dir="rtl"` on the document, ArrowLeft still means "previous" in Tabs, Toggle Group, Toolbar and Menubar and "decrease" in Slider and Resizable, in both editions. Radix and Base UI take direction from a `dir` prop or a direction provider, not from the DOM. The catalog exports no direction provider and no page documents the step. The existing RTL tests (`tests/e2e/tabs.spec.ts:66`, `checkbox.spec.ts:77`, `switch.spec.ts:61`) set `dir` on a fixture for three early components; nothing covers the other composites.
- How verified: reproduced by setting `dir="rtl"` on `<html>` after load and pressing ArrowLeft on each widget in both editions. Limit: direction was set after mount, so this shows only that the DOM attribute is not read; the `dir`-prop path was not exercised.
- Suggested change: document the provider step in the install guide, and add one RTL keyboard test for a Slider and a Menubar.
- Effort: S

### A11Y-12 Organic: the selected segment of a Toggle Group or default Tabs differs by 1.2:1 only

- Severity: should-fix
- Where: `packages/catalog/src/styles/toggle-group/organic.css`, `styles/tabs/organic.css`
- What happens: the selected Toggle Group item has the same text colour as the others (`#26301f`), a lighter font weight (600 against 700), a fill of `#f8f6ea` on a `#dce3c4` track (1.22:1; dark `#232b1f` on `#33402c`, 1.33:1) and a soft drop shadow. Default Tabs use the same fill pair; their inactive text is slightly greyer. The state is carried by a difference well under 3:1 (1.4.11). Flat's Toggle Group has a similar fill (1.15:1) but changes the text to the primary colour as well.
- How verified: computed from resolved styles on `/audit/organic/radix/?only=toggle-group,tabs` in both modes; confirmed on a screenshot.
- Suggested change: add a non-colour or higher-contrast cue to the selected segment (a 2 px ring in the foreground colour, as the Organic Chip already has, or the primary fill used by the pill Tabs).
- Effort: S

### A11Y-13 Website: landing page motion cannot be paused from the keyboard or by touch

- Severity: should-fix
- Where: `apps/www/src/site/home/landing.css:1462` (`animation: ol-marq 70s linear infinite`), `:1470-1472` (pause on `:hover` only); other infinite loops at `:722`, `:1127`, `:1197`, `:1376`, `:1386`; `apps/www/src/site/home/landing-state.tsx:76-84` (auto re-skin starts on load unless reduced motion); `apps/www/src/site/home/landing.tsx:167` ("Cycle" toggle, last control in `main`)
- What happens: the component marquee scrolls forever and stops only under a mouse pointer. The page also re-skins itself through every family once on load (one lap is longer than five seconds); its stop control is the last element of the page. People who have not set the reduced-motion preference and do not use a mouse cannot pause moving content that runs beside the text (2.2.2). Reduced motion is honoured (`landing.css:2320-2330`).
- How verified: read end to end (source only; site not run).
- Suggested change: pause the marquee on focus within and add a visible pause button near it; move the "Cycle" control next to the hero, or do not auto-start.
- Effort: S

### A11Y-14 Website: the skip link does not skip the sidebar and disappears in the editors below 1,200 px

- Severity: should-fix
- Where: `apps/www/src/site/header.tsx:26-27`, `apps/www/src/app/layout.tsx:30`, `apps/www/src/app/components/layout.tsx:10-11`, `apps/www/src/app/docs/layout.tsx:10-11`
- What happens: the link targets `<div id="main">`, which wraps the whole route. On `/components` and `/docs` the sidebar is the first thing inside it, so the next Tab lands on the first sidebar link and the user still tabs through the whole navigation (2.4.1). The target has no `tabIndex`. On `/editor/*` the header that contains the link is `max-[1199px]:hidden`, and the editor top bar has no skip link.
- How verified: read end to end (source only).
- Suggested change: point the link at each route's `<main>` (give it an id and `tabIndex={-1}`), and render it outside the header.
- Effort: S

### A11Y-15 Website: editor status messages are sent to a region that the open dialog hides

- Severity: should-fix
- Where: `apps/www/src/editor-shell/top-bar.tsx:150` (the editors' only `role="status"`), `apps/www/src/snapshots/components/get-code-dialog.tsx:110-112` and `:200-211`, `apps/www/src/snapshots/use-publication.ts:207`
- What happens: "Install command copied.", "Clipboard unavailable…" and "Preset published…" are written to the top bar's status region while the Get code dialog is open. The dialog is a Radix modal, which hides everything outside it from assistive technology, so these messages are not exposed (4.1.3). Inside the dialog, the change from "Generating…" to the command is a `<pre aria-busy>` with no live region. The failure message in the dialog is a `role="alert"` and is fine. Related: the landing page copy buttons only swap their label for two seconds (`apps/www/src/site/home/landing-state.tsx:167-181`), and the editors' preview and compile state is plain text (`apps/www/src/editor/components/button-editor.tsx:298`, `catalog-component-editor.tsx:174`, `artifact-panel.tsx:93`).
- How verified: read end to end (source only). Not confirmed with a screen reader.
- Suggested change: put a status region inside the dialog and announce there while it is open.
- Effort: S

### A11Y-16 Website: errors in the preset "ID & revision" dialog cannot be reached from the dialog

- Severity: should-fix
- Where: `apps/www/src/preset-editor/components/preset-editor.tsx:740` (`aria-invalid`, no `aria-describedby`), `:470` (`<div role="alert" id="preset-error">` outside the dialog), `apps/www/src/preset-editor/components/preset-controls.tsx:76-82`
- What happens: an invalid id or revision marks the input invalid, but the message is rendered in the page behind the modal, where it is hidden from assistive technology and covered visually (3.3.1). The "Review" link calls `revealPresetField`, which looks for a native `<dialog>` (`field?.closest('dialog')`, `dialog.showModal()`); the dialog is a Radix one and is unmounted when closed, so the lookup finds nothing and the link does nothing. Smaller cases of the same kind: `apps/www/src/editor/components/properties-panel.tsx:314-315` and `apps/www/src/editor-shell/top-bar.tsx:143` set `aria-invalid` without pointing at the message.
- How verified: read end to end (source only).
- Suggested change: render the field error inside the dialog and reference it with `aria-describedby`; make the reveal helper open the Radix dialog through its state.
- Effort: S

### A11Y-17 Website: five routes have no title of their own

- Severity: should-fix
- Where: `apps/www/src/app/editor/preset/page.tsx`, `app/editor/component/button/page.tsx`, `app/editor/component/[id]/page.tsx`, `app/presets/[id]/[revision]/page.tsx`, `app/recipes/[id]/[revision]/page.tsx` (no `metadata` or `generateMetadata`); fallback `apps/www/src/app/layout.tsx:16`
- What happens: both editors and every published preset and recipe page are titled "Ombelle UI". Tabs, history and screen-reader page announcements cannot tell them apart (2.4.2).
- How verified: searched the five files for `metadata`; none.
- Suggested change: add `generateMetadata` with the preset or component name.
- Effort: S

### A11Y-18 Coverage gap: which catalog entries have a keyboard test and an axe scan of their own

- Severity: should-fix
- Where: `tests/e2e/*.spec.ts`, `tests/e2e/specimen-audit.spec.ts:22-42`, `playwright.specimen-audit.config.ts`
- What happens: every one of the 63 components gets an axe scan (WCAG 2.2 A and AA tags, no exclusions) of its closed specimen in every family, edition and mode from the specimen audit, plus a Tab-driven focus-visible check. Open states are scanned only for the twelve overlays listed at `specimen-audit.spec.ts:23-41`. Behavioural keyboard tests are per component and uneven. The table lists, for each interactive component, the specs with a test that names it and sends keys. It was built with a script over test titles and test ids, then checked by hand for the rows marked "none".

  | Component | Keyboard behaviour test | Notes |
  | --- | --- | --- |
  | accordion | none | only an icon test in `variants-basics`; arrow, Home and End untested |
  | alert-dialog | `catalog-expansion`, `variants-075` | |
  | breadcrumb | `catalog-expansion`, `variants-075` | |
  | button, button-group | none of their own | Button activation is exercised indirectly everywhere |
  | calendar | `calendar` | |
  | card (CardGroup) | `variants-basics` | |
  | carousel | `components-076` | |
  | checkbox | `checkbox`, `components-076` | |
  | chip | none | |
  | code-block | `code-block-075` | |
  | collapsible | `primitives-075` | |
  | color-picker | `editor-inputs-075` | |
  | combobox | `overlays-search`, `variants-more` | never types without clicking first (A11Y-01) |
  | command | `overlays-search` | empty-result state not asserted (A11Y-07) |
  | context-menu | `overlays-search` | |
  | data-table | `app-shell-09` | |
  | dialog | `keyboard`, `variants-075` | |
  | dropdown-menu | none of its own | reached through Toolbar "More" and Breadcrumb menus; typeahead untested |
  | field / form | `components-076` | |
  | hover-card | `overlays-search` | |
  | input-otp | none | `form-controls` tests naming and paste only; Backspace and arrows untested |
  | menubar | `app-shell-09` | open menus not scanned by axe |
  | native-select | `forms` (one key) | |
  | navigation-menu | `app-shell-09` | open panel not scanned by axe |
  | number-input | `editor-inputs-075` | |
  | pagination | `catalog-expansion`, `variants-more` | |
  | password-field | `components-076` | |
  | popover | `editor-inputs-075`, `variants-075` (arrow drawing) | no Tab or focus-return test of its own beyond the specimen audit |
  | radio-group | `form-controls` (via Toggle Group), `variants-basics` (CardGroup) | plain Radio Group arrows untested |
  | resizable | `app-shell-09` | |
  | scroll-area | `primitives-075` | |
  | select | `variants-more` (multiple only) | single Select typeahead, Home and End untested |
  | sheet | `catalog-expansion`, `variants-more`, `app-shell-09` | |
  | sidebar | `app-shell-09` | phone sheet not scanned by axe |
  | slider | `form-controls` | |
  | stepper | none | not interactive |
  | switch | `switch`, `variants-075` | |
  | tabs | `tabs`, `catalog-expansion`, `variants-more` | |
  | tag-input | `form-controls` | |
  | toast | `catalog-expansion`, `variants-more` | |
  | toggle, toggle-group | `primitives-075`, `form-controls` | Base tab stop not asserted (A11Y-09) |
  | toolbar | `components-076` | |
  | tooltip | `tooltip` | Base association not asserted (A11Y-06) |

  Not interactive, static axe only: alert, aspect-ratio, avatar, badge, empty, item, kbd, label, meter, progress, prose, separator, skeleton, spinner, table.

  Open states with no axe scan in the repository, which I scanned once (Ombelle, light, both editions): Menubar menu, Navigation Menu panel, Data Table filter popover and View menu, Color Picker popover, multiple Select list, Command, Sheet snap and resizable, Sidebar phone sheet. Results: no WCAG-tagged violation that affects users. The reported ones were `aria-hidden-focus` on the libraries' focus guards and on the page hidden behind a modal Radix menu (expected for that pattern), and best-practice `aria-dialog-name` (see A11Y-19).

  Website routes with no axe scan (from the subagent's reading of `tests/e2e/site-shell.spec.ts:327-341`, `inline-previews.spec.ts:418-447` and the editor specs; I did not re-derive the list): `/presets/[id]/[revision]` and `/recipes/[id]/[revision]` including withdrawn and not-found states, `/privacy`, `/security`, `/demo`, `/docs/[slug]` other than getting-started, `/components/[id]` other than five, and every `/editor/component/[id]` as a full page.
- How verified: script over the specs plus manual reading of the test titles; open-state scans reproduced in the preview.
- Suggested change: add the missing open states to the specimen audit's overlay table, and one arrow/Home/End/typeahead test each for Accordion, Dropdown Menu, single Select and Radio Group.
- Effort: M

### A11Y-19 Radix Combobox and multiple Select wrap their list in an unnamed `role="dialog"`

- Severity: nice-to-have
- Where: `packages/catalog/src/templates/combobox.tsx` (Popover content around the listbox), `packages/catalog/src/templates/select.tsx:262` and its Popover content
- What happens: the open list is a `listbox` inside a Popover whose content keeps Radix's default `role="dialog"` and has no name. Focus stays on the combobox, so the dialog is rarely announced, but it is an unnamed dialog in the tree (axe best-practice `aria-dialog-name`). The Base edition exposes the listbox directly.
- How verified: reproduced; axe run on the open state of `/audit/ombelle/radix/?only=combobox` and `?only=select`.
- Suggested change: set `role={undefined}` or `role="presentation"` on the Popover content for these two.
- Effort: S

### A11Y-20 Smaller APG deviations

- Severity: nice-to-have
- Where and what happens:
  - **Radio Group, Radix edition** (`packages/catalog/src/templates/radio-group.tsx:11-18`): with `orientation="horizontal"` (as in the audit specimen) ArrowUp and ArrowDown do nothing; only Left and Right move. The Base edition moves on all four, as the APG pattern says.
  - **Menubar, both editions** (`templates/menubar.tsx`, `templates/base/menubar.tsx`): ArrowRight from inside an open menu opens the neighbour but leaves focus on the menu container, not its first item; one more ArrowDown is needed. Library behaviour.
  - **Resizable** (`packages/catalog/src/templates/resizable.tsx:67-74`, usage example at `packages/catalog/src/expansion-examples.ts:55`): the separator is focusable and has value, minimum and maximum, but no accessible name in the usage example or the specimen. The review doc says "named when there are several"; the APG window splitter asks for a name always.
  - **Carousel** (`packages/catalog/src/templates/carousel.tsx`, `carousel-content` slot): the scrolling viewport is a tab stop with `tabindex="0"` and no role or name; arrow keys work on it.
  - **Context Menu, Radix edition**: the open menu has no accessible name.
  - **Sidebar trigger** (`packages/catalog/src/templates/sidebar.tsx:130`): `aria-expanded` with no `aria-controls`.
  - **Website Edit menu** (`apps/www/src/editor-shell/top-bar.tsx:213-214`): shows `Ctrl+Z` and `Shift+Ctrl+Z` beside Undo and Redo, but no key handler for them exists in `apps/www/src` (the only editor shortcut is Ctrl+K).
- How verified: each reproduced with keys or tree reading in the preview, except the website item (searched the source).
- Suggested change: fix opportunistically; name the Resizable handle in the example.
- Effort: S each

## Manual review still owed

A manual NVDA (Windows, Chrome) and VoiceOver (macOS, Safari) review has not been performed by anyone, including this audit. Suggested order for the reviewer, based on what was found:

1. **Combobox, Command, multiple Select** in both editions: what is announced as the highlight moves (`aria-activedescendant`), the "no results" message, and typing after A11Y-01 is fixed.
2. **Tooltip and collapsed Sidebar items in the Base edition**: whether the tooltip text is ever read (A11Y-06).
3. **Menubar, Navigation Menu, Dropdown and Context Menu**: menu entry and exit announcements, the container-focus step in Menubar, and behaviour in NVDA browse mode against focus mode.
4. **Data Table**: sort announcements (`aria-sort` is set), the polite selection count, the facet popover, identical checkbox names (A11Y-08).
5. **Toast in both editions**: announced once, the F8 (Radix) and F6 (Base) landmark keys, focus after dismiss.
6. **Dialog, Alert Dialog, Sheet (including snap and resizable handles) and the Sidebar phone sheet**: title and description on open, containment, focus return. VoiceOver on Safari first, since the pattern differs most there.
7. **Input OTP**: one input (Radix) against six inputs named "Digit N of 6" (Base).
8. **Color Picker 2D area** (`aria-roledescription="2D slider"`), Slider readout (`role="status"` updates on every step), Number Input value text.
9. **Calendar**: grid navigation announcements and the selected and today states.
10. **Forms**: error summary focus, `aria-invalid` and descriptions, Password Field strength and Caps Lock message, Tag Input add and remove announcements.
11. **Website**: both editors with a modal open (A11Y-15, A11Y-16), the sandboxed preview iframes (focus entering and leaving, whether Ctrl+K works from inside), the landing page with motion on.
12. **One pass per stable family** for the visual checks under Windows forced colours and 200% zoom; behaviour does not change by family.

## Unverified

- **Website Combobox border contrast.** A source reading reports `border: 1.5px solid var(--input)` at about 1.75:1 on `--card` (`apps/www/src/generated/ui/components/ui/combobox.css:10`, `apps/www/src/app/globals.css:76`). Not computed in a browser. Settle by loading `/components` and measuring the directory filter.
- **All website findings (A11Y-13 to A11Y-17)** were read in source and not exercised. A browser pass with a screen reader would confirm what is and is not announced.
- **Loading Button and focus.** `packages/catalog/src/templates/button.tsx:82` sets native `disabled` while loading. In Chrome a focused button that becomes disabled kept focus and Tab continued from it. Safari and Firefox, and what a screen reader says at that moment, were not checked.
- **Sidebar Ctrl/Cmd+B** was pressed but its effect was not asserted.
- **Right-to-left with a `dir` prop or provider** (A11Y-11) was not exercised.
- **Text spacing and reflow** checks were scripted heuristics (see below); they can miss clipping that does not change box geometry.
- **Low-contrast tracks.** Slider and Progress tracks are 1.06:1 to 1.5:1 against the page in Flat, Minimalist and Organic (for example Flat light `#eceff5` on `#f3f5f9`). The thumb and the filled part are visible, so this may not fail 1.4.11; a designer should decide.
- **Firefox and Safari** behaviour for everything above.

## Looked at and found sound

- **Keyboard models, both editions, driven with real keys:** Menubar (Left, Right, Home, End, Enter, Space, Down, Escape with focus back on the trigger), Tabs (arrows wrap, Home, End, panel is a tab stop), Toolbar (one tab stop, arrows, Home, End), Slider (arrows, Page keys, Home, End, Shift step; editable value field), Number Input (arrows, Shift, Page, Home, End, `aria-valuetext` "12 pixels", invalid on bad input), Calendar (arrows, Home, End, Page, Shift+Page), Dropdown and Context Menu (Shift+F10 on a focusable trigger), single Select, multiple Select (`aria-activedescendant`, stays open), Command, Accordion, Collapsible, Toggle, Chip, Tag Input (announces "Added" and "Removed"), Color Picker (2D area with value text, hue slider, format select, swatches with pressed state, contrast readout), Carousel, Password Field (toggle keeps one name and flips `aria-pressed`), Code Block copy ("Copied" in a status region), Resizable (arrows, Home, End; value, minimum and maximum exposed), Sheet handles ("Half height", "Full height" value text).
- **Focus management:** Dialog, Alert Dialog (opens on Cancel), Sheet and its variants, Popover, Sidebar phone sheet (named dialog) all trap or release focus as their pattern says and return focus to the trigger on Escape.
- **Names and states:** icon-only controls in the specimens have names; Data Table headers set `aria-sort`; Pagination and Sidebar mark the current item with `aria-current`; Stepper marks `aria-current="step"`; Meter and Progress expose value text; Field and the form error summary link errors to fields; Skeleton and Spinner are named status regions.
- **Focus indicators:** in all seven stable families and both modes, the ring on Button, Sidebar item, Menubar trigger, Tab, Data Table sort button, Switch and Navigation Menu trigger measured at least 3:1 against its surroundings. Where no outline is used (Resizable handle) or the outline colour matched the cell (Retro futurism sort button), a pixel comparison of unfocused and focused states showed far more than a perimeter's worth of pixels changing by 3:1 or more.
- **Input boundaries** in the six families other than Flat, and Flat's own Input, Textarea, Select, Checkbox, Radio and Switch: 3:1 or better. Placeholder text: 6.1:1 or better where a placeholder exists.
- **Reflow at 320 px** (Radix edition, Ombelle and Flat): no page-level horizontal scroll; wide content (Data Table, Carousel) scrolls inside its own box. Base edition: sound apart from A11Y-04.
- **Text-spacing overrides** (line height 1.5, letter spacing 0.12em, word spacing 0.16em): no newly clipped text in Ombelle, Flat (Radix) or Neo-brutalism (Base).
- **Reduced motion:** with the preference set, no animation was running on the full audit page in three family and edition combinations.
- **Website structure (source):** `lang`, one `main` per route, labelled navigation landmarks, one `h1` per page, labelled editor controls, a keyboard alternative for reordering, titled sandboxed iframes that the parent never focuses, reduced-motion rules, theme toggle with name and state.
- **The specimen audit itself** (`tests/e2e/specimen-audit.spec.ts`): no axe rule exclusions, all families, editions and modes, and it fails on any stable-family finding. Its limits are the open states listed in A11Y-18 and page-width overflow (A11Y-04).
