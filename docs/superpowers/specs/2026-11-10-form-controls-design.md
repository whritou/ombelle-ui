# Form controls

Sub-project 3 of the 0.7.3 work. It adds five catalog components: Slider, Toggle Group, Chip, Tag Input and Input OTP. They come in the Radix and Base UI editions and all five style families, with component-editor recipes. The website editor and the preview scenes then replace their hand-built controls with them. This work stacks on sub-project 2 (display components, PR #102).

## Intent

The 0.7.3 design artifact (https://claude.ai/artifact/1FMRGWoyJSwht9wATT838U, "0.7.3 new components" boards, sections 01, 02, 07 and 14) defines these controls in each family.

Our own apps build them by hand today:

- the editor's segmented button rows and range inputs;
- the family and variant pickers;
- the preview Sheet's checkbox status filters.

Shipping reviewed components lets consumers use them and lets our apps run the real catalog output.

Decisions taken in brainstorming (10 November 2026):

- **Chip and Tag Input** ship as two components: `chip` (pressable or removable chips, and ChipGroup) and `tag-input` (a field of removable tags, built from Chip).
- **Input OTP in the Base UI edition** uses Base UI's `OTPField`, and the Radix edition uses `input-otp`.
- **The website editor chrome** uses catalog components, not only the preview scenes.
- **The site compiles the components once, at build time** (deployment and `predev`), never when a page loads. First Load JS is measured before and after.

## Components

All five come in five families and both colour modes. Liquid glass is experimental, and its findings do not block the release. Installing needs CLI 0.7.3, and the catalog grows from 35 to 40 components.

### Slider (`slider`, client)

- **Parts:** `Slider` renders the root, track, range and one thumb per value. The optional `SliderTicks` takes `values: number[]` and renders the board's labelled tick row ("0 25 50 75 100").
- **Props:** `value` or `defaultValue` (`number[]`; one entry gives a single thumb, two give a range), `min` (default 0), `max` (default 100), `step` (default 1), `orientation` (`horizontal` or `vertical`), `disabled`, `name`, `onValueChange`, `onValueCommit`.
- **Accessibility:**
  - Each thumb is `role="slider"`, with `aria-valuenow`, `-valuemin` and `-valuemax`, `aria-orientation` and a name.
  - `thumbLabels?: string[]` names each thumb, for example "Minimum price" and "Maximum price". With one thumb and no `thumbLabels`, the thumb takes `aria-label` or `aria-labelledby` from the root.
  - `getValueText?: (value: number, index: number) => string` sets `aria-valuetext`, for example "12 pixels".
  - Keyboard: Arrow keys move one step, Page Up and Page Down move ten steps, Home and End jump to the ends. The primitive provides all of these.
  - The ticks are `aria-hidden`.
- **Primitives:** Radix `@radix-ui/react-slider` 1.6.1 (MIT) and Base UI `Slider` (`@base-ui/react` 1.9.0). Part names, `data-slot` values, the label props and the value text are the same in both editions.

### Toggle Group (`toggle-group`, client)

- **Parts:** `ToggleGroup` and `ToggleGroupItem`.
- **Props:** `type` (`single` or `multiple`), `value` or `defaultValue` (a string for `single`, `string[]` for `multiple`), `onValueChange`, `orientation`, `disabled`, and `variant` (`segmented` or `toolbar`, the board's two looks; default `segmented`).
- **Accessibility:** both types use roving focus, so the group takes one Tab stop and arrow keys move between items.
  - `single`: the group is a `radiogroup` and each item a `radio` with `aria-checked`, as on the board.
  - `multiple`: the group is a `group` and each item a button with `aria-pressed`.
  - The group needs `aria-label` or `aria-labelledby`, and an icon-only item needs `aria-label`.
- **Primitives:** Radix `@radix-ui/react-toggle-group` 1.2.1 (MIT) and Base UI `ToggleGroup` with `Toggle`.
  - If Base UI renders single mode as pressed buttons, the Base template sets the radio roles and `aria-checked` itself, so both editions announce the same.
  - A browser test checks the roles in both editions.

### Chip (`chip`, client, no new dependency)

- **Parts:** `Chip`, `ChipRemove` and `ChipGroup`. One template serves both editions.
- **Pressable chip:** a `Chip` with `pressed` and `onPressedChange` (or `defaultPressed`) renders a `button` with `aria-pressed`. These are the filter chips.
- **Static token:** a `Chip` without those props renders a `span`.
  - `ChipRemove` inside it renders a `button` named "Remove <chip text>". Pass `label` to set the name; the button calls `onRemove`.
  - Its icon is decorative (lucide-react `XIcon`).
- **ChipGroup:** a `div` with `role="group"` that needs `aria-label` or `aria-labelledby`.
- The pressable chip keeps its own pressed state, so the template carries `'use client'`. Its dependencies are lucide-react and the usual clsx and tailwind-merge, all already in the catalog.

### Tag Input (`tag-input`, client, no new dependency)

- **Parts:** `TagInput` (the field-like box), `TagInputList` (the tags, rendered from the value with `Chip` and `ChipRemove`) and `TagInputInput` (a native text input). Installing it installs `chip`.
- **Props:** `value` or `defaultValue` (`string[]`), `onValueChange`, `separators` (default `['Enter', ',']`), `max`, `allowDuplicates` (default false), `disabled`, `name`, `placeholder`.
- **Behaviour:**
  - A separator key adds the trimmed input text. Empty text, a duplicate (unless allowed) or a tag past `max` is not added, and the text stays.
  - Pasting text that contains separators adds each part.
  - Backspace in an empty input removes the last tag.
  - Each tag's remove button removes that tag, and focus moves back to the input.
- **Forms:** with `name`, each tag submits as a hidden input with that name.
- **Accessibility:**
  - The input is the labelled control, and it works inside Field (FieldControl wraps `TagInputInput`).
  - The tag list is a `ul` described as "Selected tags".
  - A visually hidden polite live region announces "Added <tag>", "Removed <tag>" and "<tag> is already added".

### Input OTP (`input-otp`, client)

- **Parts:** `InputOTP`, `InputOTPGroup`, `InputOTPSlot` (taking `index`) and `InputOTPSeparator`, with the same names in both editions.
- **Props:** `maxLength`, `value` or `onChange` (or `defaultValue`), `pattern` (default digits only), `disabled`, `name`, `autoComplete` (default `one-time-code`), `onComplete`.
- **Behaviour:** typing moves to the next slot, Backspace moves back, and pasting a code fills every slot. Slots show the active and filled states, plus a caret in the active slot.
- **Accessibility:**
  - Assistive technology sees one input named by its label.
  - Slots are decorative, except where a primitive exposes per-slot inputs. Base UI `OTPField` does; there, each input is named "Digit n of N".
  - A browser test checks that each edition exposes a named field and that pasting fills it.
  - The caret blink stops under reduced motion.
- **Primitives:** Radix edition `input-otp` 1.5.0 (MIT); Base UI edition `OTPField` (`@base-ui/react` 1.9.0).

## Styles

Each component gets `packages/catalog/src/styles/<id>/<family>.css` for every family, taken from its board.

- **Slider:** track, range, thumbs and ticks, for single and range. Disabled is dimmed.
- **Toggle Group:** segmented (a single bar with a raised checked item) and toolbar (separate square icon buttons).
- **Chip:** default, pressed and removable states, plus the remove button.
- **Tag Input:** the family's Input look around chips and the inner input, and the focus-within ring.
- **Input OTP:** slots in the active, filled and invalid states, plus the separator and caret.

Rules that apply to all five:

- One `data-slot` per selector; the parts expose their state, as in sub-project 2.
- Forced colours keep borders and outlines, and the checked, pressed and active states use `Highlight`.
- Every interactive target is at least 24px.
- Reduced motion removes the thumb and caret transitions.

Board fidelity is checked from the start, by comparing computed styles from the board files with the audit specimens. Each difference is either fixed with a test or recorded in the evidence.

## Recipes and the component editor

The recipe schema gains these branches:

| Component | Props | Content |
| --- | --- | --- |
| Slider | `mode` (`single` or `range`), `min`, `max`, `step`, `ticks` (boolean), `value`, `rangeValue` | `label`, `thumbLabels` |
| Toggle Group | `type`, `variant` | `label`, up to six `items` (`value`, `label`, `iconOnly`) |
| Chip | `mode` (`pressable` or `removable`) | `label`, up to six `chips` |
| Tag Input | `max` | `label`, `placeholder`, `tags` (up to eight) |
| Input OTP | `length` (4 to 8), `separatorAfter` (0 for none) | `label` |

- `validateComposition` rejects a Slider value outside `min`..`max`, a range whose first value exceeds its second, and a Toggle Group `single` default that is not one of its items.
- The compiler specimens, the 0.7.3 install gate, the website catalog entries and the expansion docs follow sub-project 2.

## Website editor chrome

- **Build step.** `scripts/generate-www-ui.mjs` compiles Slider, Toggle Group and Chip with the Ombelle family into `apps/www/src/generated/ui/`, which is gitignored.
  - `build-hosted-www.mjs` runs it after `build.mjs`, and `predev` runs it too.
  - The compiled components read the site's existing tokens. `apps/www/src/app/globals.css` gains only the catalog tokens it lacks, such as control height, shadow offsets and motion duration.
  - `apps/www` adds `@radix-ui/react-slider` 1.6.1 and `@radix-ui/react-toggle-group` 1.2.1.
  - Nothing compiles at request time.
- **Swaps:**
  - `SegmentedControl` (`apps/www/src/editor-shell/inspector.tsx`, 15 uses) renders a single, segmented Toggle Group. Its props stay the same.
  - `SliderRow` (same file) renders Slider in place of its range input. Its number field and reset button stay.
  - The style-family pickers (`preset-editor/components/preset-controls.tsx`, `editor/components/family-picker.tsx`), the properties panel's variant picker and the glass starting-point picker become single Toggle Groups that keep their rich item content.
- **Semantics change:** these single choices become radio groups with one Tab stop and arrow keys, replacing rows of pressed buttons. Editor tests that assert `aria-pressed` move to `aria-checked`.
- **Not changed:** the home page journey's range input, colour inputs, menus and tabs.
- **Size:** First Load JS of the editor routes is recorded from `next build` before and after. If any route grows by more than 10 kB gzipped, the work stops for review before merging.

## Preview scenes and gallery

- The Projects Sheet status filters become a filter `ChipGroup` in place of Checkbox and Label rows.
- The Settings scene gains:
  - a theme and density Toggle Group;
  - a corner-radius Slider;
  - an Input OTP in a security card;
  - a Tag Input for project topics.
- `fixtures/shared/preset-gallery.tsx` gets a section for each of the five.

## Verification

Run and record the environment of each:

- `pnpm build:packages`, `pnpm typecheck`, `pnpm test:unit` and `pnpm test:integration`.
- `pnpm generate:preview` and `pnpm test:specimen-audit`: all 20 configurations. The five join automatically, because specimens are counted from the catalog.
- Browser tests in both editions:
  - Slider: arrow, Home and End keys change `aria-valuenow`.
  - Toggle Group: single mode exposes checked radios and moves with arrows.
  - Tag Input: Enter, comma and Backspace work, and the live region text updates.
  - Input OTP: paste fills the value, and the field is named.
  - Website editor: a swapped `SegmentedControl` takes one Tab stop and moves with arrows, and `SliderRow` keeps its number field in sync.
- The existing editor e2e tests, updated for the new semantics.
- Board comparison by computed styles in every family.
- `next build` First Load JS for the editor routes, before and after.

## Documentation

- `docs/components/{slider,toggle-group,chip,tag-input,input-otp}.md`.
- `docs/accessibility-review.md`: check rows for the five.
- docs/03, the README count (40), the CHANGELOG under Unreleased, and `docs/evidence/form-controls.md`. The evidence doc covers the board comparison, audit runs, browser tests and the size measurement.

## Out of scope

- Slider marks beyond the tick row.
- Vertical-slider editor controls.
- Tag suggestions or autocomplete (Combobox, sub-project 4).
- The editor's colour inputs, menus and tabs.
- Releases and the CLI version bump.
