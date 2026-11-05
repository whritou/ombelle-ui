# Liquid glass kit parity

5 November 2026. Status: approved design, not yet implemented.

## Goal

The installed liquid glass family looks exactly like the "Liquid glass style family (experimental) — UI kit" board on the design canvas (`LiquidGlassKit.dc.html` and `LiquidGlassButtons.dc.html` on https://claude.ai/artifact/1FMRGWoyJSwht9wATT838U). The kit is the source of truth for every glass component, including ones that already exist.

Success means:

- every catalog component (all 23) installs in liquid glass through the CLI and matches the kit in light and dark mode;
- the compiler's contrast bound still passes for the built-in glass preset, with every text pair the kit introduces declared;
- the preset editor and Button editor controls that glass ignores today visibly change glass output;
- every glass preview (both editors and the website's component playgrounds) uses the kit's backdrop;
- catalog, compiler, CLI and website tests pass, and each PR records screenshot evidence.

## Decisions

- **Kit wins over current code.** Existing glass components that differ from the kit are restyled. That includes Button (to "one ink, all glass") and Input (from the card surface in #71 to the kit's background surface).
- **The contrast guarantee stays.** When an exact kit style makes the built-in preset fail a pair, the built-in preset is tuned (opacity, a token value), not the component.
- **Ignored controls are repurposed.** They are not hidden or disabled.
- **The kit backdrop replaces the photo everywhere glass is previewed.**
- **Liquid glass stays experimental.** Nothing here moves it to stable.

## Delivery

One spec, three PRs, in order. Each branches off `main` after the previous one merges.

1. **PR A, glass foundation:** repurposed controls, built-in preset values, the tinted-surface contrast model, the one-ink Button, and the backdrop.
2. **PR B, form controls:** Label, Textarea, Native Select, Checkbox, Switch, Select and Radio Group, plus moving Input to the kit surface.
3. **PR C, display components:** Avatar, Separator, Table, Accordion, Progress and Skeleton.

## PR A: glass foundation

### Repurposed controls

| Control (preset and Button editor) | Today in glass | After |
| --- | --- | --- |
| Shadow X / Shadow Y (`shadowOffsetXPx`, `shadowOffsetYPx`) | Unused | Offset of the glass drop shadow on floating surfaces (Card, Dialog, Popover, Dropdown Menu, Tooltip, Select content). Blur and spread scale from the offsets, so the built-in look is unchanged. |
| Border width (`borderWidthPx`) | Read only by Input | Thickness of every glass edge hairline. Input's field border keeps the `input` colour. |
| Border colour (`border` token, light and dark) | Unused | Edge colour: every glass edge uses `var(--border)` as is, replacing the fixed `color-mix(in srgb, var(--foreground) 14%, transparent)`. Preset colours may carry alpha (`oklch(L C H / A)`), so a preset sets the edge's strength through the token. |

- For glass drafts, the editors label these "Glass shadow X", "Glass shadow Y", "Glass edge width" and "Glass edge colour", with a one-line hint each.
- Values are kept when a draft switches family, as today.

### Built-in preset

- `packages/catalog/src/presets/liquid-glass.json` gets values that reproduce the kit: shadow offset 0 / 12 (today's `0 .75rem` drop shadow), border width 1, and `border` set to today's hairline, the foreground at 14% alpha: `oklch(…/ 14%)` of `#0F172A` in light and of `#F1F5F9` in dark, converted exactly when implemented. The `border` token has no other use in glass, so this changes nothing else.
- The preset hash and `styles/ui-tokens.css` change; the changelog states it. Liquid glass has no stable-hash fixture, so `stable-family-hashes.json` and the style baseline do not move.

### Tinted-surface contrast model

- `packages/compiler/src/glass-contrast.ts` declares pairs only on token surfaces today.
- It gains tinted surfaces: a token surface mixed with a tint token at a fixed percentage per mode, for example `card` + `primary` 18% (light) / 22% (dark).
- A tinted pair is evaluated like any other: darkest and brightest filtered backdrop, with and without sheen, and the opaque fallback.
- PR A declares the Button pairs: `foreground` on `card` + `primary` at the resting and hover tints, and the same for `destructive`.
- The editor's readout lists tinted pairs with their tint, for example "foreground on card + primary 26%".

### One-ink Button

- The glass Button rules in `packages/catalog/src/styles/liquid-glass.css` match the kit's spec table:
  - every label is `var(--foreground)` at weight 600;
  - default is card glass tinted `primary` 18% (22% dark), with a primary rim at 55% and a primary glow;
  - secondary is neutral card glass;
  - outline is background glass at 60% of glass opacity with the `input` border;
  - ghost has no surface until hover;
  - destructive is tinted `destructive` 16% (20% dark) with a destructive rim at 60%;
  - link is foreground text with a 2px `primary` underline;
  - hover adds 8 tint points; pressed moves 1px down with an inner shade;
  - focus is a 3px ring offset by 3px; disabled is 50% opacity;
  - forced colours: ButtonFace with a ButtonText border, and the default gets a 3px border.
- The scoped Button preset and recipe CSS for glass (`packages/compiler/src/recipe-styles.ts`) use the same rules. Recipe colour overrides still apply on top.

### Backdrop

- One declaration of the kit gradient lives in the preview app and is used by:
  - the preset preview (gallery and the three scenes);
  - the Button editor preview, which today has no backdrop for glass;
  - the website component playgrounds.
- It replaces `glass-backdrop.webp`, which is removed if nothing else references it.
- The gallery rule that puts forms on a card surface over the backdrop (from #71) stays.

## PR B: form controls

New `styles/<component>/liquid-glass.css` files drawn from the kit's "Proposed for glass" tiles:

- **Fields: Input, Textarea, Native Select, Select trigger.**
  - Background glass at 55% coverage with the `input` border; foreground value; `mutedForeground` placeholder.
  - Focus is the ring plus a ring-coloured border. Invalid is a 2px `destructive` border. Disabled is dashed at 50%.
  - The chevron is `mutedForeground`.
  - Input moves from the card surface to this surface.
- **Selection: Checkbox, Radio Group, Switch, Select options.**
  - Checked or on states use `card` + `primary` at the resting tint + 8 points, with a `primary` rim at 60% and a glow.
  - The check mark and radio dot stay foreground.
  - The Switch thumb is solid white with a shadow.
  - Radio option rows are glass rows, tinted when checked and dashed when disabled.
  - The Select list uses the Dropdown Menu glass surface: highlighted options are tinted, and the selected one is bold with a check.
- **Label:** 14px, weight 500, foreground.

New contrast pairs:

- `mutedForeground` on `background` (placeholders). It failed at 4.449:1 in light mode with the built-in preset, so the preset is tuned: first opacity 0.5 → 0.51, otherwise a darker light `mutedForeground`.
- `destructive` on `card` (error messages).
- `foreground` on each tinted selection surface.

The "form controls other than Input are unavailable" limitation is removed from the editor glass panel and the docs.

## PR C: display components

- **Avatar:**
  - foreground initials on glass discs, with a white rim at 55% and a soft shadow;
  - the primary variant is `card` + `primary` 18% with a primary rim; secondary is neutral;
  - a green status dot with a white ring;
  - groups overlap with a white rim instead of an opaque ring.
- **Separator:** an etched hairline (the edge tint plus the rim highlight 1px beside it). The labelled form has `mutedForeground` text. Vertical separators use logical properties.
- **Table:**
  - one glass container with the shared edge, drop shadow and radius;
  - a muted glass header with `mutedForeground` labels and edge hairlines between rows;
  - the selected row adds `primary` 12% and keeps foreground text;
  - numeric cells keep tabular digits.
- **Accordion:** a glass container with edge hairlines. The open trigger takes `primary` 12%. The chevron turns. The open-only height animation is kept.
- **Progress:** a glass track and a solid glossy `primary` fill with a glow; complete is green. Indeterminate rests as a faded full fill under reduced motion.
- **Skeleton:** a 10% foreground film with a white sheen and rim. The pulse follows the preset motion duration.

New contrast pairs: foreground initials on the tinted Avatar disc, `mutedForeground` on the muted table header, foreground on the tinted selected row and open trigger, and `mutedForeground` on the separator label surface.

After PR C, `componentsWithStyleSupport('liquid-glass', ['unavailable'])` is empty. The mechanism stays for future families.

## Rules every glass stylesheet follows

- At most one `[data-slot]` per selector (`packages/compiler/test/liquid-glass.test.ts`). Parent states use `:has([data-state=…])`.
- Inside `@supports (backdrop-filter)`: the glass filter chain through `--glass-inner-filter`, so nested glass drops its own blur and uses `--glass-nested-opacity`.
- `prefers-reduced-transparency: reduce` and missing backdrop filters fall back to opaque token surfaces.
- Forced colours use system colours (`Canvas`, `CanvasText`, `Field`, `FieldText`, `ButtonFace`, `ButtonText`, `Highlight`, `GrayText`), and states never depend on colour alone.
- Overlay content animates only on `[data-state='open']` (from #66).
- Logical properties only; reduced motion removes animations.

## Website, editors and release

- **Website gating:** each component that newly gains glass gets `glassMinimumCli: '0.5.0'`. `glassOnSite()` keeps public glass claims off until the published installer is 0.5.0.
- **Known gap:** site previews render current catalog source, so glass Button previews show one-ink before 0.4.1 users can install it. The Button page notes "restyled in 0.5.0".
- **Editor glass panel:** its component list already derives from the support table.
- **Gallery placeholders:** "Unavailable in liquid glass" placeholders disappear as components gain glass.
- **Docs:** `docs/components/liquid-glass.md` (coverage, the control mapping, declared pairs, fallbacks), a glass paragraph in each component doc, `docs/03` counts, and the changelog, including preset value changes.
- **Evidence:** one record per PR, with Playwright screenshots of every affected component in light and dark on the new backdrop. The checks are `typecheck`, `test:unit`, and the `preset-gallery-generation`, `preview-routing`, `hosted-preview-build`, `liquid-glass-cli` and `www-route` integration tests.
- **Release:** nothing is published by this work. Users get it with `@ombelle-ui/cli` 0.5.0.

## Out of scope

- Stable status for liquid glass.
- The browser e2e suite, which does not run in CI or on this machine.
- Consumer-matrix rows.
- Human screen-reader and visual review.
