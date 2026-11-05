# Changelog

## Unreleased

- Add Select (Radix Select 2.4.1), Radio Group (Radix Radio Group 1.5.1), Dropdown Menu (Radix Dropdown Menu 2.2.1) and Alert to the catalog in flat, minimalist, neo-brutalism and ombelle, each with colocated component CSS, a usage example and light and dark styles. Alert and Dropdown Menu are experimental in liquid glass; Select and Radio Group are unavailable there.
- Existing artifacts are byte-identical: the stable family hashes gain 48 entries for the new files and change none, so the style baseline declares no new intentional change.
- Preview: the preset gallery shows the four components; the dashboard gains an alert and per-project action menus, settings gains a role Select and a digest Radio Group, and sign-in gains a status alert.
- Website: the components pages list the new components only once the published installer can add them (`minimumCli` 0.5.0).
- Add Popover (Radix Popover 1.3.1), Avatar (Radix Avatar 1.3.1) and Separator (Radix Separator 1.2.0) in the four stable families. Popover is experimental in liquid glass; Avatar and Separator are unavailable there. The stable family hashes gain 36 entries and change none.
- Add Table (native table with caption, footer, numeric columns and selected rows) and Accordion (Radix Accordion 1.3.1) in the four stable families. Both are unavailable in liquid glass. The stable family hashes gain 24 entries and change none.
- Preview: the dashboard Activity tab lists recent deploys in a Table, and the settings Billing tab answers questions in an Accordion.
- Preview: dashboard rows show owner avatars, the projects card a reviewer stack, and Invite opens a popover; sign-in separates its options with "or" and the settings Members tab uses a separator.

## 0.4.1 — 5 November 2026

- Publish `@ombelle-ui/cli@0.4.1` to npm; website commands use `npx @ombelle-ui/cli@0.4.1`.
- Align all six workspace packages at 0.4.1. Schema 1.0 and catalog/compiler compatibility 0.1.0 are unchanged; the preset and recipe schemas gain optional fields. Installers at 0.4.0 or older reject presets that set `shadowColor` (the built-in ombelle and neo-brutalism presets now do) and recipes that use the new Button fields, so install those with 0.4.1.
- Restyle every component of the flat, minimalist, neo-brutalism and ombelle families to match their UI kits: colours, borders, radii, shadows, weights, type and every state (hover, pressed, focus, disabled, invalid, checked, selected, open). Control and touch-target sizes are kept where a kit draws them smaller. Neo-brutalism disabled controls are dashed, flat and grey instead of faded; ombelle fields keep a 2.5px focus outline. Catalog 0.1.0 bytes change in place; see `intentionalChanges` in the compiler style baseline. Existing installs keep their files until `theme add` or `add` is rerun.
- Add an optional `shadowColor` preset colour (`--shadow-color`); offset shadows fall back to `--border`. The built-in ombelle preset uses rose and neo-brutalism pink shadows in dark mode.
- Map `system-sans` to the system-ui stack (`system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif`) instead of Arial.
- Badge gains `secondary`, `outline` and `accent` variants. Button gains a `loading` prop with a spinner and an `icon-sm` size, and keeps its `data-slot` inside asChild triggers such as Tooltip. Dialog gains `DialogHeader`, and its title and description render `data-slot`s. Button and Input templates no longer force disabled opacity; each family styles its own disabled state.
- Button recipes gain optional padding and gap, typography (weight, size, letter spacing, uppercase), hover and pressed colours per mode, and a reviewed lucide-react icon (leading, trailing or icon-only). Recipes without them compile to the same bytes. Outline colour overrides map to `card`/`cardForeground` and apply in every family; loading recipes render a spinner.
- Website: the preset editor previews pages in a browser frame on a dotted stage with corrected spacing, drops the Gallery page from the picker (`?page=gallery` still opens it), and fixes the review rail and its tooltips, the overflow menu position, the export drawer layout and the shared top bar size. The Button editor moves the family picker into the inspector, adds Reset recipe, Disabled and Loading preview states, forced states that use each family's real `:hover`, `:focus-visible` and `:active` rules, a code-editor output view, and the new recipe controls. Site controls gain hover, press and focus states.
- Build: the website redeploys when the preview app changes.

## 0.4.0 — 4 November 2026

- Publish `@ombelle-ui/cli@0.4.0` to npm; website commands use `npx @ombelle-ui/cli@0.4.0`, and the editors now offer the ombelle family.
- Align all six workspace packages at 0.4.0, the next release after 0.3.1. Schema 1.0 and catalog/compiler compatibility 0.1.0 are unchanged.
- Website: rebuild the preset editor on a shared editor shell with a top bar and inspector, sliders that keep focus and clamp the thumb, and a review drawer that holds contrast checks and export. Contrast pairs that were not evaluated are listed apart from passing ones, and the draft contrast notice stays visible. Download JSON stays disabled while export is blocked (stale draft or glass below the contrast bound).
- Website: add dashboard, settings and sign-in preview scenes for presets.
- Website: rebuild the Button editor on the same shell. This reintroduces the forced-state selector that 0.3.0 removed, now with Rest/Hover/Focus/Active preview states (the forced state gains `active`, `editor-force-active`), alongside a top bar (recipe ID shown read-only, revision, family chip, overflow menu), a shell-based inspector, Light/Dark and Wide/Narrow controls. Button output shrinks to five tabs with a metadata line.
- Website: restore a level-1 heading in both editors.
- Add `pnpm version:set <x.y.z>`, `--published <x.y.z>`, `--check` and `--check --published` to align workspace and published-installer version sites, and test that the packed CLI version matches the workspace CLI version.
- Refresh the flat, minimalist and neo-brutalism style families: flat gains tone surfaces, filled fields and a forced-colors boundary; minimalist gains hairlines and underlined fields; neo-brutalism gains key-press depth and stickers. Catalog 0.1.0 bytes change in place for those families' `ui-style.css`, component CSS and scoped Button CSS; see `intentionalChanges` in the compiler style baseline. Existing installs keep their files until `theme add` or `add` is rerun.
- Change the built-in flat, minimalist and neo-brutalism preset values: flat changes its palette and `borderWidthPx` 1 → 0; minimalist changes its palette and `radiusRem` 0.375 → 0.25; neo-brutalism changes its palette and `borderWidthPx` 2 → 2.5. Their `presetHash`, `styles/ui-tokens.css` and scoped Button scope hash move, so re-adding an installed recipe or scoped preset built from them at the same revision is now a conflict: bump the revision.
- Add `ombelle` as a stable style family beside flat, minimalist and neo-brutalism: a pink-and-ink look with pill-shaped controls, ink outlines, hard offset shadows and key-press states. The `styleFamily` enum in the preset schema gains `ombelle`, and the catalog gains the family stylesheet, a built-in preset and per-component styles. Adding it does not change the other families' output. Installers at 0.3.1 or older reject `ombelle` presets and codes, so install them with 0.4.0.
- Website: the preset editor, Button editor, preview and documentation playground support Ombelle, and the recipe and component-preset fixtures include it. The preset editor family picker and Button editor family chip offer it only once the published installer is 0.4.0 or later (`ombelleMinimumCli`).
- Liquid glass output is as in 0.3.1 (refraction filter, 3px default blur); this release does not change it further.
- Grow the standalone consumer matrix from 36 to 40 rows with four ombelle consumers (pnpm and npm, Vite and Next), and the browser coverage contract to 534 cases across 17 specs.
- Compare computed colours in the browser parity helpers as sRGB within one channel step and 0.01 alpha, because Next lowers `oklch()` to `lab()`; every other property is still compared exactly.

## 0.3.1 — 4 November 2026

- Publish `@ombelle-ui/cli@0.3.1` to npm; website commands use `npx @ombelle-ui/cli@0.3.1`.
- Align all six workspace packages at 0.3.1. Schemas 1.0 and catalog/compiler compatibility 0.1.0 are unchanged.
- Add liquid-glass refraction: `add` installs `components/ui/liquid-glass-filter.tsx`. Mounted once, `<LiquidGlassFilter />` bends the backdrop at each rim with a slight prism edge in Chromium browsers, keeping the contrast bound. Other browsers keep the blurred glass, and the CLI prints a mount notice. The built-in glass preset's default blur drops from 8px to 3px so the refraction shows.
- Website: the preset editor previews a liquid-glass draft below the contrast bound instead of freezing on the last valid one (`compile()` gains `glassContrast: 'report'`; installers and publication still enforce the bound); the glass notes become one quiet status bar; the family-change and reset dialogs are centred and explain what changes in plain words.
- Keep generated schema and catalog files LF in checkouts, so a Windows release build no longer marks the tree dirty.

## 0.3.0 — 4 November 2026

- Publish `@ombelle-ui/cli@0.3.0` to npm; website commands use `npx @ombelle-ui/cli@0.3.0`.
- Align all six workspace packages at 0.3.0. Schema 1.0 and catalog/compiler compatibility 0.1.0 are unchanged; recipe schema 1.0 gains an optional field.
- Add optional Button recipe color overrides: `overrides.colors.{light,dark}.{background,foreground,border}`, mapped onto the tokens the chosen variant reads, with the preset color syntax and bounds. CLI 0.2.1 rejects recipes that use them; install those with 0.3.0.
- Add hover and pressed states to flat and neo-brutalism Buttons, and hover to inactive Tabs triggers in the three stable families. Catalog 0.1.0 bytes change in place for those families' `ui-style.css`, `tabs.css` and scoped Button CSS; see `intentionalChanges` in the compiler style baseline.
- Website: Get code publishes the current draft and shows a one-line command for pnpm, npm, Yarn or Bun; publication quotas rise to 30 attempts per minute, 200 per client and 5,000 globally per UTC day.
- Website: full-width preset editor with one-click accent and base color schemes, sliders for numeric design values, a compact liquid-glass strip, and Button editor color controls. The Button editor no longer has a forced-state selector because previews respond to the pointer directly.

- Fix `theme add`, `init` and `add` rejecting projects created by `shadcn init` with pnpm. The settings-only `pnpm-workspace.yaml` it writes (`packages: []`) in the app root is no longer treated as a workspace. Workspaces that declare packages, and any `pnpm-workspace.yaml` in a parent directory, are still rejected.
- Fix Tailwind v4 detection for bare major ranges such as `tailwindcss: "^4"`, which shadcn templates declare.
- Add genuine `shadcn init` Vite and Next.js fixtures and an integration test of the theme-only merge on them.
- Add the experimental `liquid-glass` style family for Button, Badge, Card, Dialog, Tabs and Tooltip, with a built-in preset (blur 12px, opacity 0.87), opaque fallbacks, and a compile-time contrast bound that rejects a `glassOpacity` below the smallest passing value with `INVALID_DATA`. Flat, minimalist and neo-brutalism output is byte-identical.
- Refuse the six form controls with a glass preset: compile and CLI planning fail with `STYLE_UNAVAILABLE` (exit 2) before any write, and `--yes` does not bypass it. Plan and dry-run output for experimental entries add a `Notice:` line and a `notices` JSON array, which is empty for stable families.
- Offer liquid glass in the preset editor with transparency, blur and opacity controls, a limitations panel, and a live contrast readout that blocks export and publication; the Button editor shows the experimental notice beside its export. The snapshot service accepts glass presets once redeployed.
- Make liquid glass look like glass: the backdrop filter now compresses the backdrop with `contrast()` and `brightness()`, and the contrast bound models that filter exactly, so the built-in preset drops from opacity 0.87 to 0.5 (light needs 0.5, dark 0.28) while keeping 4.5:1 over any backdrop. Add a specular sheen (inside the bound), a two-sided edge light and inner depth shadows. New preset fields `glassSaturation`, `glassBackdropContrast`, `glassBackdropTone`, `glassSheen` and `glassRim` are editable in the preset editor; `glassBlurPx` now reaches 40 and `glassOpacity` starts at 0.25. Nested glass drops its filter and uses a separately bounded `--glass-nested-opacity`. The built-in glass palette's muted tokens change to reach these opacities.
- Render the preset editor's liquid glass preview over a bluebell wood photo, and make every family's preview follow the site's light or dark theme.
- Add a liquid-glass browser spec (24 preview and 16 consumer cases) and pnpm Vite and Next.js glass consumers, raising the consumer matrix to 36 and the browser contract to 402 cases. See [liquid glass evidence](docs/evidence/liquid-glass.md) for what ran.

## 0.2.1 — 2 November 2026

- Fix the standalone installer doing nothing when run through a package-manager bin symlink. On Linux and macOS, `npx`, `npm exec` and Bun exited 0 without output with `@ombelle-ui/cli@0.2.0`; Windows shims and direct `node dist/main.js` were unaffected.
- Align all six workspace packages at 0.2.1. Schema 1.0 and catalog/compiler compatibility 0.1.0 are unchanged.
- Show `npx @ombelle-ui/cli@0.2.1` commands on published preset and recipe pages after verifying real production codes.
- Show the same npx runner in the editor export panels for downloaded preset and recipe JSON files.

## 0.2.0 — 2 November 2026

- `@ombelle-ui/cli@0.2.0` was published to npm on 2 November 2026. Use 0.2.1 or later: 0.2.0 does not run through POSIX bin symlinks.
- Align all six workspace packages at 0.2.0 and prepare the standalone installer as `@ombelle-ui/cli@0.2.0` under the project's reserved npm organization.
- Add immutable hosted preset and Button recipe codes, shared Postgres/SQLite publication quotas, and guarded code installation with saved provenance.
- Add explicit editor publication, recovery, share pages and isolated production previews for Vercel.
- Preserve schema 1.0 and catalog/compiler compatibility 0.1.0, existing generated output, project defaults and installer transaction safeguards.
- Public npm publication and Vercel launch remain pending their measured acceptance checks. Earlier entries below describe documentation revisions, not published package versions.

## Unreleased — 23 October 2026

- Add Badge with native span props/ref, default/destructive variants, and flat/minimalist/neo brutalist styling.
- Generate and install independently owned colocated Badge CSS, retaining the existing shared style pack and component bytes.
- Add Badge examples to the generated preview and consumer flow, with API and installation documentation.

## Unreleased — 21 October 2026

- Add local Button recipe installation with separate source, scoped light/dark CSS, saved props/content, and accessible loading behavior.
- Preserve project presets, ordinary components, and recipe provenance through later additions and compatible theme changes; retain conflict and transaction safeguards.

- Define `add button --preset <code-or-file>` as component-scoped preset selection, preserving project defaults, global styling, and other installed components.
- Use the same immutable preset reference for a scoped component or a project-wide `theme add`; saved codes are argument values, not flag names.
- Retain local JSON as an offline product workflow and distinguish presets from recipes that also save props, content, and overrides.
- Specify Button-first scope, provenance, conflict handling, editor export, and validation requirements. These commands remain planned; the current CLI rejects `--preset` on `add`.

## Version 0.2 on 19 October 2026

- Make npm, pnpm, Yarn and Bun mandatory for the first release.
- Add an existing-shadcn installation path using `theme add <preset>` and a direct merge into the configured global CSS file.
- Preserve upstream initialization, aliases, component source, unrelated CSS and the project's package manager and lockfile.
- Save the resolved preset during theme application so future library components inherit it.
- Add package-runner examples, a registry theme example, CSS before and after examples, and release criteria for the merge behavior.
- Distinguish a compatible token update from a full visual-family conversion that needs component changes.

The updated commands and guarantees remain development requirements, not an implemented CLI.
