# Responsive editors design

The preset editor and the component editors (Button and the catalog editors) get a phone structure, a tablet structure, and keep today's desktop structure. Source of truth: the Editors page of the design canvas (https://claude.ai/artifact/1FMRGWoyJSwht9wATT838U): boards `PresetEditorPhone*`, `PresetEditorTablet`, `ButtonEditorPhone*`, `ButtonEditorTablet`, and `ResponsiveRules`.

## Problems measured on the live site (13 November 2026)

- Component editor at 375 px: the document is 563 px wide. The preview controls and the preview frame push it sideways.
- The top bar is 169 px (preset) or 202 px (component) on a phone, plus a 157 px component row.
- The preset inspector scrolls inside a box (610 of 1,349 px shown) with `overscroll-behavior: contain`, so the page stops scrolling under a thumb.
- On a phone the preset preview is far below the controls, and Checks and Export are at the very bottom.
- At 768 px the preset editor stacks the controls above the preview; the component editor still shows the phone tabs.

## Decisions (approved 13 November 2026)

- Breakpoints for both editors: phone below 768 px, tablet 768–1199 px, desktop from 1200 px.
- Phone: a floating bottom dock (Ombelle segmented toggle group) switches panes.
- Phone preset editor: the Customize pane keeps a pinned live preview card.
- The component row ("Button / Choose a component / Browse all components / Component editor guide") folds into a "Button ▾" switcher in the breadcrumb on every width, desktop included.
- On a phone, every desktop popover, menu and dialog opens as a bottom sheet.

## Structure

| Width | Preset editor | Component editor |
| --- | --- | --- |
| < 768 | One-row top bar (name, Undo, More, Get code) and a strip with revision and status. Dock: Customize, Preview, Checks. Customize has the pinned preview card; Checks holds the review tabs and Export. | One-row top bar (back, switcher, Undo, More, Get code) and a strip with the recipe ID, revision and status. Dock: Customize, Matrix, Code. Customize pins the specimen with a light/dark toggle and a state select. |
| 768–1199 | One-row top bar with a Checks button (badge) that opens Checks and Export in a bottom sheet. Inspector column 300 px beside the preview. | One-row top bar. Properties column 300 px beside the preview; generated output under the preview. |
| ≥ 1200 | Today's layout. | Today's layout with the component row folded into the switcher. |

## Rules

- Below 1200 px the editor fills the viewport (`100dvh`), the site header is not shown on editor routes, and each pane is the only scroller in it. No nested scroller with `overscroll-behavior: contain` below 1200 px.
- Nothing is wider than the viewport at 320 px: segmented rows that do not fit become a native select, and generated code wraps on a phone.
- Touch targets in the top bar, strip, dock and sheets are at least 44 px.
- Below 768 px the inspector's slider rows show only the number field with steppers, 44 px high.
- On a phone the More menu, the component switcher, the colour token popover, the colour picker, the style family confirmation, ID & revision and Get code open as bottom sheets.

## Deviation from the canvas

The phone component editor's second tab is the existing Matrix preview (named "Matrix"), not the canvas's six-state grid: forced states are not a matrix axis today, and adding one is outside this change.
