# Design fidelity and consistency

21 November 2026, commit `7045d93d` (branch `docs/1-0-audits-wave-1`, version 0.9.1).

**Covered.** The seven stable style families in `packages/contracts/src/style-families.ts` (flat, minimalist, neo-brutalism, ombelle, papier, organic, retro-futurism), across the 65 component style folders in `packages/catalog/src/styles` plus the seven family base sheets (Button, Input, Dialog); the seven matching built-in presets; decisions 0003, 0004, 0006, 0007, 0008 and the family specs under `docs/superpowers/specs/`; `docs/03-components-styles-accessibility.md`; `docs/evidence/specimen-audit.md`.

**How it was looked at.**

- Source: a PostCSS scan of every stable family file (literal colours, radii, durations, border widths, focus outlines, disabled opacity, size rules, token definitions and uses).
- Rendered: the preview at `http://localhost:5183`, pages `/audit/<family>/radix/?mode=light|dark`, in headless Microsoft Edge through the repository's `@playwright/test` (the bundled Chromium build this Playwright version wants is not installed on this machine). All 118 specimens were captured in 7 families and 2 modes (1,652 section screenshots) with computed styles for every slot. Open overlays (Select, Dropdown Menu, Dialog, Popover, Alert Dialog, Sheet) were captured separately.
- Token probe: on each audit page one design token at a time was overridden for every element, and the slots that reacted were counted. Run on both the Radix (recipe) and Base UI pages; the two agree.

Evidence lives outside the repository. `<scratch>` below is `C:\Users\whrit\AppData\Local\Temp\claude\c11f90d355160dc4\7866825b-c5c3-4a31-a7be-d1201d693a83\scratchpad\audit-05`. Scripts: `scan.mjs` (source scan), `shoot.mjs` (screenshots and computed styles), `grid.mjs` (grids), `probe.mjs` (token probe), `overlays.mjs`, `invalid.mjs`. Contact sheets, one per specimen with seven family rows and light and dark columns: `<scratch>\sheets\radix\<specimen>.png`.

**Not covered, and why.**

- Liquid glass: left to audit 09.
- Base UI pages were measured by the token probe and the invalid-state script only; no Base UI screenshots were reviewed.
- Hover and pressed states were read in CSS, not captured. Tooltip, Hover Card, Context Menu, Menubar and Navigation Menu popups were not opened.
- The toast specimens were only seen as they overlapped other sections in a first pass; the dedicated toast shots are empty because the toast is fixed to the viewport.
- The preset editor palettes and custom presets: only the built-in preset of each family was rendered.
- `apps/www` was judged from source only. It was not seen rendered.
- `pnpm test:specimen-audit` was not run. `docs/evidence/specimen-audit.md` records full runs only at `7280c33` (20 configurations, before papier, organic and retro futurism existed); the three newer families' runs are recorded in their decision files.
- Fonts: the audit pages use each built-in preset's `system-sans`, so the families' design fonts (Fraunces, Young Serif, Michroma and so on) were not seen.

## Summary

The catalog is in better visual shape than its size suggests: every family is recognisable, the 0.9 app-shell components (Sidebar, Data Table, Menubar, Navigation Menu) received real per-family design, and no specimen was broken in either mode. The weak point is the token contract, not the drawing. Organic and retro futurism ignore the radius, shadow, border, density and motion tokens almost entirely while the preset editor still offers those controls; density reaches about a quarter of controls in every family; and "reduced motion" presets still animate. The second weak point is the later form controls (Combobox, Tag Input, Number Input, Password Field, Input Group), which were styled once and copied: in flat and minimalist they do not look like the family's Input, and in flat an invalid Combobox or Tag Input shows nothing at all. Dark mode has three real defects in the four older families: scrims that lighten the page, status colours that stay light, and native white checkboxes in Data Table. One finding is rated blocker because a stable family silently drops a state; everything else is shippable but several items are cheap and visible enough to fix before 1.0.

## Findings

Ranked by cost to a user of the library.

### DES-01 Flat: an invalid Combobox or Tag Input shows no invalid state

- Severity: blocker
- Where: `packages/catalog/src/styles/combobox/flat.css:10` (`border: 0`) and `:21-23`; `packages/catalog/src/styles/tag-input/flat.css:10` and `:21-23`
- What happens: the only invalid rule is `border-color: var(--destructive)`, on a field whose border is `0`. With `aria-invalid="true"` on the input, a flat Combobox or Tag Input is pixel-identical to a valid one, while Input, Select, Native Select, Textarea, Password Field and Input Group on the same page turn red. The other six families have a real border, so the same rule works there. A form that relies on the control's own invalid styling gives no cue in flat.
- How verified: reproduced with `invalid.mjs` (sets `aria-invalid` on every text-entry specimen); screenshot `<scratch>\invalid\flat-radix-invalid.png`. Rule read end to end.
- Suggested change: give the flat field the family's invalid treatment (destructive bottom rule and tinted fill, as `flat.css:30` does for Input). Rated blocker because a stable family drops a state the stylesheet plainly intends; the fix is a few lines.
- Effort: S

### DES-02 Organic and retro futurism ignore the shape, depth, density and motion tokens the preset editor offers

- Severity: should-fix
- Where: `packages/catalog/src/styles/organic.css:131-151` and `packages/catalog/src/styles/retro-futurism.css:131` (fixed `--o-r*`, `--o-e*`, `--rf-r*`, `--rf-e*`, `--rf-pill`), and every `organic.css` / `retro-futurism.css` component layer; `apps/www/src/preset-editor/components/preset-controls.tsx:264-300` (the control list changes only for liquid glass); `docs/decisions/0007-organic-family.md` ("`radiusRem` is a nominal 1.25") and `0008-retro-futurism-family.md` ("nominal 0.875")
- What happens: token probe on the built-in presets, slots that reacted out of slots that could:

  | Token | flat | minimalist | neo-brutalism | ombelle | papier | organic | retro futurism |
  | --- | --- | --- | --- | --- | --- | --- | --- |
  | `--radius` | 60/87 | 53/73 | 0/2 (square) | 48/62 | 86/91 | **3/107** | **3/61** |
  | `--shadow-x/y` | 0/18 | 0/13 | 46/50 | 21/37 | 11/41 | **0/50** | **0/67** |
  | `--border-width` | 7/42 | 42/80 | 72/104 | 57/95 | 69/102 | **12/44** | **12/54** |
  | `--control-height` | 7/24 | 6/24 | 4/24 | 7/24 | 6/24 | **3/24** | **3/24** |

  In organic and retro futurism the three slots that follow `--radius` are the checkbox option, the checkbox group parent and the password toggle. Setting `--motion-duration` to `0ms` still leaves 23 organic slots (Button, Input, Select, Checkbox, Tabs, Switch and others, 0.2s to 0.4s) and 10 retro futurism slots animating. A user who picks Organic in the preset editor and drags Corner radius, Shadow offset or Border width, or chooses Compact or Reduced motion, sees almost nothing change, and the exported preset carries values that do nothing. The decisions call the values nominal, but the editor and `docs/04-presets-and-contracts.md:21` present them as working design choices.
- How verified: reproduced with `probe.mjs` on `/audit/<family>/radix/` and `/base/` (results in `<scratch>\probe.json` for Radix, `<scratch>\probe-base.json` for Base UI); editor control list read end to end.
- Suggested change: either derive the fixed shape and elevation properties from the tokens (scale `--o-r*` and `--rf-r*` from `--radius`, read `--shadow-y` and `--border-width`), or hide the controls for these two families and say so in the editor and the decisions.
- Effort: M

### DES-03 Density reaches about a quarter of controls in every family

- Severity: should-fix
- Where: fixed heights in all seven families, for example `packages/catalog/src/styles/combobox/*.css:8` and `tag-input/*.css:8` (`42px`), `toggle/flat.css:25-35` (`32px`/`40px`/`48px`), `toggle-group/flat.css:43,55` (`34px`/`40px`), `tabs/flat.css:40` (`2.75rem`), `accordion/flat.css:29`, `command/flat.css:99`; `packages/compiler/src/preview-styles.ts:51` (the token)
- What happens: `density: compact` sets `--control-height` to 2.25rem. With that value, Button, Input, Native Select, Select trigger, Number Input and the Color Picker trigger shrink (in neo-brutalism only four of them; in organic and retro futurism only three, not Button or Input). Combobox, Tag Input, Password Field, Input Group, Input OTP, Toggle, Toggle Group, Tabs, Toolbar, Menubar, Navigation Menu, Pagination, Chip, Accordion, Collapsible, Command and the Sidebar menu button keep their height. A compact form therefore has a 38px Input beside a 42px Combobox and a 42px Password Field.
- How verified: reproduced with `probe.mjs` (`controlHeight` lists in the probe JSON); fixed values read in source.
- Suggested change: express control heights as `var(--control-height)` plus a per-family offset in every text-entry and button-like control.
- Effort: M

### DES-04 Presets that ask for reduced motion still animate

- Severity: should-fix
- Where: in every family, `button-group/<family>.css` (`transition: background-color 0.15s`, flat line 90), `card/<family>.css` (flat 104), `collapsible/<family>.css` (flat 28, 49, 64), `item/<family>.css` (flat 30), `scroll-area/<family>.css` (flat 74), `sheet/<family>.css` (flat 232), `toast/<family>.css` (flat 194), `toggle/<family>.css` (flat 16); plus the organic and retro futurism layers (DES-02)
- What happens: `design.motion: reduced` compiles to `--motion-duration: 0ms`, and the flat, minimalist and neo-brutalism built-in presets all ship `reduced`. Fifteen rules per family hard-code 0.15s to 0.2s instead of reading the token, so Toggle, Collapsible, Item, Button Group, linked Cards, the scroll bar and stacked toasts animate in a preset that says they should not. The OS `prefers-reduced-motion` rule in each base sheet still works; it is the preset setting that is bypassed.
- How verified: reproduced with `probe.mjs` (five to six slots still report non-zero `transition-duration` with the token at `0ms` in every family); source scan (`scan.mjs duration`).
- Suggested change: replace the literals with `var(--motion-duration)` (or a multiple of it); leave spinner and skeleton loops alone.
- Effort: S

### DES-05 Dark mode: Alert Dialog, Sheet and the Sidebar sheet lighten the page instead of dimming it

- Severity: should-fix
- Where: `packages/catalog/src/styles/alert-dialog/{flat,minimalist,neo-brutalism,ombelle}.css:6`, `sheet/{flat,minimalist,neo-brutalism,ombelle}.css:6`, `sidebar/{flat,minimalist,neo-brutalism,ombelle}.css` (`sidebar-sheet-overlay`), all `color-mix(in oklab, var(--foreground) 48%, transparent)`; `packages/catalog/src/styles/flat.css:15` (Dialog, 55%)
- What happens: the scrim is the foreground colour at 48%. In dark mode the foreground is near white, so opening an Alert Dialog or Sheet turns the dark page mid-grey and brighter than the dialog. Papier, organic and retro futurism use a fixed dark tint and dim correctly (decision 0006 records this as fixed for papier only). Within a family the scrims also disagree: in neo-brutalism a Dialog has the opaque cyan hatch (`neo-brutalism.css:16`) while an Alert Dialog and a Sheet have the grey veil; in minimalist a Dialog fades the page to the background colour and an Alert Dialog greys it; in ombelle a Dialog uses dark ink (`oklch(22% …/0.45)`) and an Alert Dialog uses the foreground. Command uses a third value (`black 40%`).
- How verified: reproduced; screenshots `<scratch>\overlays\sheet-alert-dialog.png` (dark, all families) and `<scratch>\overlays\sheet-dialog.png` (flat dark Dialog shows the same lightening). Rules read.
- Suggested change: one scrim definition per family, used by Dialog, Alert Dialog, Sheet, Sidebar sheet and Command dialog, built from a colour that is dark in both modes.
- Effort: S

### DES-06 Status colours stay light in dark mode in the four older families, and `--success` means two things

- Severity: should-fix
- Where: `packages/catalog/src/styles/alert/{flat,minimalist,neo-brutalism,ombelle}.css` (flat 47-59), `badge/…` (flat 74-126), `toast/…` (flat 45-61), `meter/…` (flat 51-71), `progress/…` (flat 21, 70-73, 163-166); `password-field/{flat,minimalist,neo-brutalism,ombelle}.css` (flat 232, 239); presets `flat.json`, `minimalist.json`, `neo-brutalism.json`, `ombelle.json` (no `success`, `warning` or `info` keys)
- What happens: those four presets define no status tokens, so every status surface falls back to a literal light pastel (`var(--success, #dcfce7)` and so on) in both modes. In dark mode a soft success Badge, a success Alert or Toast is a bright mint or cream block on a dark page, while papier, organic and retro futurism (which ship the tokens) adapt. Separately, Alert, Badge and Toast treat `--success` as a soft surface and `--success-foreground` as the ink, but the Password Field strength bar in these four families fills with `--success` and `--warning` themselves. A preset that defines `success` the way the other components expect (schema allows it, `schemas/preset.schema.json:102`) gets a near-invisible strength bar. The newer three families already fixed this by using `--success-foreground` (`password-field/papier.css:255`).
- How verified: dark rendering seen in `<scratch>\sheets\radix\badge_soft-success.png`; presets and rules read end to end. The strength-bar consequence is by reading, not rendered.
- Suggested change: add the six status tokens (light and dark) to the four presets, and make the strength bar read `--success-foreground` / `--warning-foreground` everywhere.
- Effort: M

### DES-07 Data Table row checkboxes are unstyled native boxes in four families, white in dark mode

- Severity: should-fix
- Where: `packages/catalog/src/styles/data-table/ombelle.css:432-439` and the same rule in `data-table/papier.css`, `data-table/organic.css`, `data-table/retro-futurism.css` (only `accent-color`; no `appearance: none`). Compare `data-table/flat.css:431-452`. No stable family sheet or compiler output sets `color-scheme`.
- What happens: in ombelle, papier, organic and retro futurism the select-row and select-all checkboxes are the browser's default control. They do not match the family's Checkbox (no ink outline, offset shadow or pebble shape), and because nothing declares `color-scheme: dark` they render as solid white squares on the dark table, reading as checked. Flat, minimalist and neo-brutalism restyle the same inputs. The missing `color-scheme` also leaves Native Select option lists and scrollbars light in dark mode for every family.
- How verified: seen in `<scratch>\sheets\radix\data-table.png` (dark column, rows 4 to 7); rules read end to end; `grep color-scheme` over `packages/catalog/src/styles`, `packages/compiler/src`, `packages/cli/src` returns nothing.
- Suggested change: port the flat-style `appearance: none` checkbox to the four families using each family's Checkbox look, and emit `color-scheme` with the light and dark token blocks.
- Effort: M

### DES-08 Later text-entry controls do not follow their family's field treatment

- Severity: should-fix
- Where: `packages/catalog/src/styles/combobox/flat.css:8-13`, `tag-input/flat.css:8-13` (card fill, `border: 0`, literal `border-radius: 8px`); `number-input/flat.css`, `color-picker/flat.css:17` (1px outline, 10px radius); `combobox/minimalist.css:10-11`, `tag-input/minimalist.css`, `number-input/minimalist.css`, `password-field/minimalist.css`, `input-group/minimalist.css` (boxed, literal `1px` and `2px`/`4px`); `combobox/neo-brutalism.css:8`, `tag-input/neo-brutalism.css` (no offset shadow)
- What happens:
  - **Flat** (decision 0003: "filled fields"): Input, Select, Native Select, Textarea, Password Field, Input Group and OTP are a tinted fill with a 2px bottom rule and top-only corners. Combobox and Tag Input are a white card, fully rounded, no rule. Number Input and the Color Picker trigger are a 1px outlined box with a 10px radius. Three treatments in one form.
  - **Minimalist** (decision 0003: "hairlines and underlined fields"): Input, Select, Native Select and OTP are underlined with no box. Password Field, Number Input, Input Group, Combobox and Tag Input are full 1px boxes on a card fill. A sign-in form has an underlined email field above a boxed password field.
  - **Neo-brutalism**: every field carries the 4px hard shadow except Combobox and Tag Input (and Chip, where Badge has one).
- How verified: seen in `<scratch>\invalid\flat-radix-invalid.png`, `<scratch>\sheets\radix\input.png`, `combobox.png`, `password-field.png`, `number-input.png`; computed styles from `grid.mjs controls`.
- Suggested change: define the field treatment once per family and apply it to every text-entry wrapper; replace the literal radii and widths with the tokens.
- Effort: M

### DES-09 Default control heights disagree inside each family

- Severity: should-fix
- Where: the base sheet and the `select`, `native-select`, `number-input`, `combobox`, `password-field`, `input-group`, `toggle`, `tabs`, `pagination`, `toolbar`, `menubar` files of each family
- What happens: rendered heights in pixels at default size, light mode:

  | Control | flat | minimalist | neo | ombelle | papier | organic | retro |
  | --- | --- | --- | --- | --- | --- | --- | --- |
  | Button | 40 | 40 | 44 | 40 | 40 | 46 | 46 |
  | Input | 42 | 40 | 44 | 40 | 40 | 44 | 44 |
  | Select trigger | 42 | 40 | **42** | 40 | 40 | **40** | **40** |
  | Native Select | 42 | 40 | 44 | 40 | 40 | **40** | **40** |
  | Number Input | **40** | 40 | **40.3** | 40 | 40 | **40.3** | **40.3** |
  | Combobox, Tag Input | 42 | **42** | 44 | **42** | **42** | 44 | 44 |
  | Password Field, Input Group | 42.3 | **42.3** | **45.8** | **42.3** | **42.3** | 44.3 | 44.3 |
  | Toggle | 40 | 40 | 40 | 40 | 40 | 42 | 42 |
  | Tabs trigger | 44 | 44 | 44 | 44 | 44 | 44 | 44 |

  Bold cells differ from the family's Input. A neo-brutalism form row has fields at 40.3, 42, 44 and 45.8px; organic and retro futurism have a 44px Input beside a 40px Select. Font sizes and weights follow the same split (neo-brutalism Input 15px/600, Select 15px/700, Number Input 14px/600, Combobox 14px/500).
- How verified: computed from the rendered audit pages (`grid.mjs controls`, source `metrics.json` under `<scratch>\shots\radix\<family>-light\`).
- Suggested change: fix together with DES-03; one height per family for everything that sits in a form row.
- Effort: M

### DES-10 Neo-brutalism's disabled signature covers only the early components, and a dashed border also means "enabled filter"

- Severity: should-fix
- Where: signature: `packages/catalog/src/styles/neo-brutalism.css:47-49` ("disabled: dashed, flat, grey"), also `checkbox/neo-brutalism.css:69`, `native-select/…:59`, `textarea/…:36`, `tabs/…:91`, `sidebar/…:357`, `data-table/…:473`. Opacity fade instead: `toggle/neo-brutalism.css:52`, `toggle-group/…:75`, `chip/…:44`, `combobox/…:25`, `tag-input/…:25`, `number-input/…:90`, `input-otp/…:14`, `slider/…:24,153`, `button-group/…:130,148`, `input-group/…:135`, `password-field/…:92`, `collapsible/…:42`, `toolbar/…:67`, `toast/…:100`, `alert-dialog/…:83,170`, `color-picker/…:41`, `field/…:84`, `data-table/…:443` (0.5); `switch/…:61`, `card/…:191`, `calendar/…:171` (0.6); `calendar/…:64,134`, `carousel/…:72` (0.45). Dashed facet trigger: `data-table/neo-brutalism.css:325`, `data-table/retro-futurism.css:251,632`, `data-table/papier.css:238`
- What happens: a disabled neo-brutalism Button, Input, Checkbox, Textarea or Tab is opaque grey with a dashed border and no shadow. A disabled Toggle, Chip, Combobox, Tag Input, Number Input, Slider or Switch is the normal control at 50 to 60 percent opacity, shadow included. In the same family the Data Table's enabled "Status" filter button is drawn with a dashed border and no shadow, the same vocabulary as disabled. Retro futurism and papier have the same clash (their disabled Button and filter Input are dashed, `retro-futurism.css:15`, `data-table/papier.css:332`).
- How verified: rules read end to end (`scan.mjs disabledOpacity`); the dashed enabled filter seen in `<scratch>\sheets\radix\data-table.png`; the disabled Button seen in `<scratch>\sheets\radix\button_loading.png`. Disabled Toggle, Chip and the rest were not rendered (no disabled specimens).
- Suggested change: apply the dashed-grey treatment to every neo-brutalism control and give the facet trigger a mark that is not the disabled mark (dotted, or a solid outline with a plus icon).
- Effort: M

### DES-11 Focus rings vary inside every family

- Severity: should-fix
- Where: for example `packages/catalog/src/styles/button-group/neo-brutalism.css:153`, `toolbar/neo-brutalism.css:74,199`, `carousel/neo-brutalism.css:32,78,112`, `alert/neo-brutalism.css:123`, `password-field/neo-brutalism.css:83`, `number-input/neo-brutalism.css:94`; `organic.css:19` against `:151`; `breadcrumb/organic.css:49,145`
- What happens: focused controls measured in light mode (distinct outlines, number of slots):
  - neo-brutalism: the signature is `3px dashed` at 4px (30 slots), but Button Group, Carousel, Toolbar and the error-summary link use `3px solid`, and Alert dismiss, Password toggle, Number Input steppers, Breadcrumb link and the Color Picker preview use `2px solid`. Offsets run from -6px to 4px.
  - organic and retro futurism: half the controls have `2px` at 3px (20 slots, the ported Ombelle body) and half `3px` at 2px (19 to 20 slots, the family layer); Button is `3px` at 3px in organic and at 4px in retro futurism.
  - minimalist: `1px` at 4px (24 slots), `1px` at 2px (11), and `2px` rings on about 19 others.
  - flat, ombelle and papier are mostly uniform (43, 39 and 33 slots on the main ring) with the same handful of exceptions. Decision 0006 already lists papier's 2.5px rings as a leftover.
  - In every family `sidebar-rail` has no `:focus-visible` rule and shows the browser default outline.
- How verified: computed after focusing each control on the rendered pages (`grid.mjs focus`, `metrics.json`); `sidebar-rail` confirmed by `grep` over all `sidebar/*.css`.
- Suggested change: one ring declaration per family (width, style, offset), with inset variants only where clipping forces it.
- Effort: M

### DES-12 Sizes: `sm` and `lg` exist on a few controls and mean different things

- Severity: should-fix
- Where: `packages/catalog/src/styles/<family>.css` (Button and Input sizes; flat 8-11, 54-60), `select/<family>.css` (flat 29, `sm` only), `native-select/<family>.css` (flat 27, `sm` only), `textarea/<family>.css` (flat 65-71), `toggle/<family>.css` (flat 25-35, pixels), `switch/<family>.css` (`sm` only); templates with a `size` prop: avatar, badge, button, dialog, input, item, native-select, progress, select, sheet, spinner, switch, textarea, toggle
- What happens: Button, Input and Toggle have `sm`, default and `lg` (32/40/48px in the older families). Select and Native Select have `sm` only, so a `lg` row cannot be completed. Combobox, Number Input, Password Field, Input Group, Tag Input, Tabs and Toggle Group have no size at all. In organic and retro futurism Input `sm`/`lg` render at 36/52px while Select `sm` is declared at `2rem` (`select/organic.css:29`, not rendered). Toggle sizes are literal pixels, the rest rem.
- How verified: read end to end (`scan.mjs sizes`, template `size` props); Input sizes also measured on the rendered pages.
- Suggested change: decide the size set for form-row controls and implement it for all of them, or document that only Button, Input and Toggle are sized.
- Effort: L

### DES-13 Disabled opacity uses six values inside a family

- Severity: nice-to-have
- Where: all families; for example flat `checkbox/flat.css:50` and `switch/flat.css:51` (0.45), the 36 rules at 0.5, `flat.css:49`, `native-select/flat.css:67`, `textarea/flat.css:45` (0.55), `card/flat.css:177`, `field/flat.css:26` (0.6)
- What happens: disabled controls fade to 0.4, 0.45, 0.5, 0.55, 0.6 or 0.7 depending on the component (ombelle and its descendants: 0.45 ×12, 0.5 ×21, 0.55 ×3, 0.6 ×10, 0.7 ×5). A disabled Input (0.55 or 0.7), Checkbox (0.45) and Toggle (0.5) side by side fade by different amounts. Decision 0006 notes the 0.5/0.45 split for papier only.
- How verified: read end to end (`scan.mjs disabledOpacity`).
- Suggested change: one disabled opacity per family, as a custom property on the base sheet.
- Effort: S

### DES-14 Hard-coded shapes that break the family or ignore `--radius`

- Severity: nice-to-have
- Where: `packages/catalog/src/styles/toggle/papier.css:10` (`border-radius: 12px`, inherited from `toggle/ombelle.css:10`); `hover-card/neo-brutalism.css:25` (`0.25rem`), `meter/neo-brutalism.css:98` (`3px`), `alert-dialog/neo-brutalism.css:147` (`6px`); ombelle slots that ignore `--radius`: Checkbox, Combobox field, Tag Input, Input OTP slot, Toggle, Item, Kbd, Empty, Collapsible
- What happens: papier is a 2px-corner family and its Toggle renders with 12px corners, visibly rounder than every sibling. Neo-brutalism is square and has three small rounded elements. In ombelle 14 of 62 radius-bearing slots keep their shape when the radius token changes.
- How verified: papier Toggle seen in `<scratch>\sheets\radix\toggle.png` and measured (`12px`); the rest from `probe.mjs` (`radius.same`) and source.
- Suggested change: replace the literals with `var(--radius)` expressions.
- Effort: S

### DES-15 State gaps: Input OTP has no invalid state, and loading looks disabled

- Severity: nice-to-have
- Where: `packages/catalog/src/templates/input-otp.tsx:18-46` and every `input-otp/<family>.css` (no `invalid` selector); loading: `packages/catalog/src/styles/flat.css:47`, `minimalist.css`, `neo-brutalism.css:48` (`:disabled` rule also styles a busy button)
- What happens: Input OTP exposes no invalid attribute and no family styles one, so a wrong code can only be signalled by text outside the control. A loading Button in flat, minimalist and neo-brutalism is drawn exactly as a disabled one (grey, and dashed in neo-brutalism) with a spinner; the other four families keep the button's colour at reduced opacity.
- How verified: OTP read end to end and confirmed by `invalid.mjs` (no change in any family); loading seen in `<scratch>\sheets\radix\button_loading.png`.
- Suggested change: add `aria-invalid` handling to Input OTP in every family; keep the variant colour for busy buttons in the three older families.
- Effort: S

### DES-16 Literal colours and repeated values where a token or one definition would do

- Severity: nice-to-have
- Where: `packages/catalog/src/styles/switch/flat.css:14,23,27` (`#FFFFFF`); flat overlay shadows `rgb(15 23 42 / …)` in about 20 files (for example `popover/flat.css:19`) while `--shadow-color` exists; `avatar/flat.css:64` and `progress/flat.css:21` (`#15803d`), `avatar/neo-brutalism.css:70` (`#7ce38b`), `avatar/retro-futurism.css:65` (`oklch(62% 0.15 150)`); `resizable/retro-futurism.css:98` (`#2a1b00`); the `--warning-foreground` fallback written as `#78350f` (`alert/flat.css:53`), `#b45309` (`meter/flat.css:51`, `progress/flat.css:73`) and `oklch(60% 0.14 75)` (`progress/flat.css:166`); retro futurism scrims left from the Organic port and overridden later in the same file (`alert-dialog/retro-futurism.css:195` against `:207`, `sheet/retro-futurism.css:238` against `:248`, `sidebar/retro-futurism.css:84,89,765`, `command/retro-futurism.css:178,258,261`)
- What happens: no visible defect on the built-in presets, but a custom palette cannot recolour these, flat shadows are invisible in dark mode by construction, and the same fallback has three values. The papier, organic and retro futurism files carry a ported body plus an override layer, so many declarations are dead; that is for audit 10.
- How verified: read end to end (`scan.mjs color`, `colorMixed`).
- Suggested change: route the online-status green and the flat switch thumb through tokens, and pick one fallback per status token.
- Effort: S

### DES-17 The site hand-rolls controls the library ships, and carries an unused showcase kit

- Severity: nice-to-have
- Where: `apps/www/src/site/home/landing.css:603-691` (`.ol-btn`) used in `landing.tsx:42-99`, `journey.tsx`, `detail-sections.tsx`, `style-tiles.tsx`; `apps/www/src/site/home/kit.tsx:9` (`.ol-sw`, `role="switch"`); hand-written tab lists in `apps/www/src/editor/components/artifact-panel.tsx:99`, `apps/www/src/editor-shell/review-drawer.tsx:104`, `apps/www/src/snapshots/components/get-code-dialog.tsx:143`; `apps/www/src/app/globals.css:173-290` (`.o-kit`, `.o-card`, `.o-btn`, `.o-input` and 114 `[data-style]` rules)
- What happens: the site compiles 27 catalog components into `src/generated/ui` and uses them well for the shell (Navigation Menu, Sheet, Sidebar, Code Block, Combobox, Number Input, Color Picker). But its primary buttons, its switches and three tab lists are separate hand-written implementations, although Button and Switch are already in `generated/ui` and Tabs is in the catalog. The landing page's "try on a style" demo is a variable-driven imitation of each family (`landing.css`, 71 `[data-family]` blocks; every family's input is 44px tall, `landing.css:755`), not the compiled components, so it can drift from what `add` installs. The older showcase kit in `globals.css` is referenced by no component (only `.o-glass` is used, `site/components/directory.tsx:35`) and ships on every page.
- How verified: read end to end; `grep` for the class names over `apps/www/src`. Not seen rendered.
- Suggested change: use the generated Button, Switch and Tabs on the site, delete the `.o-kit` block, and consider rendering the style demo from the compiled preview sheets (`presetPreviewSheets`) that the editors already use.
- Effort: M

### DES-18 The style documentation stops at four families

- Severity: nice-to-have
- Where: `docs/03-components-styles-accessibility.md:152-159` (table lists Flat, Minimalist, Neo brutalism, Ombelle, Liquid glass) against `:148` and `packages/contracts/src/style-families.ts:4`; `docs/evidence/specimen-audit.md` (recorded runs)
- What happens: the style families table has no row for papier, organic or retro futurism, and the minimalist row does not mention underlined fields. The specimen audit evidence file records full runs for the first five families only and still counts 580 specimens; the three newer families' runs are recorded only in decisions 0006 to 0008.
- How verified: read end to end.
- Suggested change: add the three rows with their defining traits and customisation surface (which, per DES-02, is currently colour only), and record the newer runs in the evidence file.
- Effort: S

## Unverified

- **Hover and pressed feedback.** Read in the base sheets only (each family has hover and active rules for Button). Whether every later component has both, and whether the neo-brutalism and ombelle key-press shadows apply beyond Button, Checkbox and Switch, would need a hover and pointer-down capture per control.
- **Disabled look of the later controls** (Toggle, Chip, Combobox, Tag Input, Slider, Number Input). The audit page has disabled specimens for Button, Carousel and Data Table only. Adding `disabled` to those specimens, or a script that sets it, would settle DES-10 and DES-13 visually.
- **Palette recolouring.** DES-16 says literals do not follow a custom palette; no palette other than the built-in one was rendered. Rendering one preset-editor palette per family through `/preset-preview/` would show it.
- **Design fonts.** Michroma is described as much wider than the other display faces (decision 0008). Whether headings overflow with the design fonts was not checked; `?fonts=<body>,<heading>,<mono>` on the audit page does it.
- **Minimalist switch and card boundaries** look below 3:1 against the page in both modes in `<scratch>\sheets\radix\switch.png` and `card.png`. Contrast was not measured here; audit 06 owns it.
- **Neo-brutalism radio.** The radio item is round (50%) in a square family whose checkbox, switch and slider thumb are square. No spec text says which is intended.
- **Toast** in each family was seen only where it overlapped other sections in the first capture pass.
- **`apps/www` rendering**: nothing in DES-17 was seen in a browser.

## Looked at and found sound

- **Family identity on the built-in presets.** Button, Card, Tabs, Alert, Badge, Slider, Switch, Progress, Calendar, Select, Dialog, Field forms, Sidebar and Data Table all read as their family in light and dark: flat's tone fills, minimalist's hairlines and underlines, neo-brutalism's ink borders and 4px shadows, ombelle's pills on offset shadows, papier's double rules and 2px corners, organic's uneven radii and corner tint, retro futurism's two-tone buttons, sunset bands and striped fills (`<scratch>\sheets\radix\button.png`, `card.png`, `tabs.png`, `slider.png`, `calendar.png`, `sidebar.png`, `data-table.png`).
- **The 0.9 app-shell components.** Sidebar and Data Table have a distinct, deliberate design in every family (active item, group labels, header band, pagination), not a generic fallback. The only lapse found is the native checkbox (DES-07).
- **Invalid state** on Input, Select, Native Select, Textarea, Password Field and Input Group in all seven families and both modes (`<scratch>\sheets\radix\field_form.png`), and on Combobox and Tag Input in the six families other than flat.
- **Open overlays** (Select and Dialog seen rendered; Dropdown Menu and Popover captured but judged from computed styles and source only, not looked at) keep a visible boundary in dark mode in every family (`<scratch>\overlays\sheet-select.png`, `sheet-dialog.png`).
- **Hard-shadow discipline.** No blurred shadow in neo-brutalism or ombelle component files apart from the sticky Data Table header (`data-table/neo-brutalism.css:122`); neo-brutalism shadows all derive from `--shadow-x`, `--shadow-y` and `--shadow-color` (46 of 50 slots react to the token).
- **Retro futurism signature colours** are derived from tokens in the base sheet (`--rf-pri2`, `--rf-band`, `--rf-sun`, `--rf-key`), as decision 0008 states.
- **Built-in presets.** Each of the seven is coherent with its family's decision (colours, border width, shadow offset, radius) and none produced a broken specimen. The nine liquid glass presets were not reviewed.
- **Rendering health.** All 14 radix audit pages loaded with zero page errors and 118 sections each.
