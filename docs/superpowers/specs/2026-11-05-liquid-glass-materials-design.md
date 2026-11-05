# Liquid glass materials

5 November 2026. Status: approved design, not yet implemented.

## Goal

Make liquid glass look like the user's material lab (`liquid-glass-lab`, the Cristal, Givré, Fumé and Relief profiles) and the chosen canvas materials (Clear, Prism and Liquid). Glass gains 3D relief, a pointer-tracking rim halo, rim-only refraction, rim dispersion, motion and a dark mode that keeps the glass. Eight presets are pickable as starting points in the preset editor, and every setting stays tweakable.

The visual references are the canvas boards "Liquid glass style family (experimental) — UI kit" (`LiquidGlassKit.dc.html`) and "Liquid glass — buttons, one ink, all glass" (`LiquidGlassButtons.dc.html`) on https://claude.ai/artifact/1FMRGWoyJSwht9wATT838U. Both run the target material with live controls. Read them with the Artifact tool, `action: "read"`.

Success means:

- the eight presets load in the preset editor and render like the boards in light and dark mode;
- every new setting changes glass output, and every existing control (radius, font, density, colours, border, shadow, motion) keeps working;
- each preset's accent colours (primary, ring, link) match its tint by default and stay editable;
- presets that leave the new settings out compile byte for byte as before;
- the contrast bound passes for each built-in preset, with every text pair evaluated on the surface it is painted on;
- catalog, compiler, CLI and website tests pass, and each PR records light and dark screenshots.

## Decisions

- **The lab is the reference.** Its ten controls, three tints and four profiles are the source of truth, plus a Dispersion setting from the canvas Prism material.
- **Cristal is the default.** It becomes the family base preset (`builtin-liquid-glass`).
- **New settings and starting points.** Glass gains new preset settings. The eight presets are starting points: picking one loads its values, and the draft saves and installs like any custom preset.
- **The halo needs `LiquidGlassFilter`.** The existing mount-once component also tracks the pointer. Without it, rims keep a static top-left light.
- **Dark mode keeps the glass.** All presets switch the veil to a light wash in dark mode.
- **Accent colours come from the preset.** No fixed blue.
- **Existing editor controls stay.** Nothing is removed or replaced.
- **Liquid glass stays experimental.**

## Presets

Values use the lab's units (0–100, blur in px, refraction width in %). The compiler stores them as fractions: opacity 40 is `glassOpacity: 0.40`.

| Preset | Opacity | Blur | Contrast | Shine | Refraction | Width | Rim | Halo | Relief | Motion | Dispersion | Tint |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Cristal (default) | 40 | 9 | 45 | 76 | 55 | 13 | 72 | 60 | 0 | 42 | 0 | Claire |
| Givré | 69 | 26 | 32 | 46 | 22 | 21 | 48 | 44 | 0 | 24 | 0 | Rosée |
| Fumé | 76 | 12 | 68 | 68 | 66 | 8 | 58 | 64 | 0 | 42 | 0 | Fumée |
| Relief | 39 | 17 | 18 | 13 | 33 | 8 | 73 | 76 | 90 | 24 | 0 | Rosée |
| Clear | 42 | 16 | 20 | 60 | 0 | 0 | 80 | 80 | 35 | 30 | 0 | Claire |
| Prism | 30 | 20 | 25 | 70 | 20 | 10 | 85 | 90 | 40 | 30 | 100 | Claire |
| Liquid | 18 | 3 | 30 | 70 | 100 | 22 | 70 | 80 | 50 | 40 | 30 | Claire |
| Liquid glass (0.5) | 57 | 3 | 45 | 25 | 0 | 0 | 60 | 0 | 0 | 0 | 0 | White |

- The table holds the lab's starting values. When a preset fails the contrast bound, it is tuned, and the tuned values are recorded in the preset file and the PR.
- "Liquid glass (0.5)" keeps today's look as a starting point.
- **Tints.** A tint is the surface colour (the lab's `--glass-veil`) and its ink. It maps onto existing colour tokens (`card`, `cardForeground`, `popover`, `popoverForeground`), so it adds no schema field.

  | Tint | Veil (RGB) | Ink |
  | --- | --- | --- |
  | Claire | `218 246 255` | `#102038` |
  | Rosée | `255 215 235` | `#102038` |
  | Fumée | `9 17 39` | `#F0F7FF`, in both modes |
  | White | `255 255 255` | `#0F172A` |

  Relief's Rosée uses the warmer `244 165 179` with ink `#301B22`, as in the lab's Pêche rule.
- **Accents.** Each preset sets `primary`, `ring` and `primaryForeground` from its tint:

  | Tint | Light | Dark (and Fumée in light) |
  | --- | --- | --- |
  | Claire | `#0B6AA8` | `#7DD3FC` |
  | Rosée | `#A3245A` | `#F9A8D4` |
  | Relief | `#8C1D3A` | `#FECDD3` |
  | Fumée | `#7DD3FC` | `#7DD3FC` |
  | White | `#1D4ED8` | `#93C5FD` |

  `destructive` stays as in the current built-in.

## Settings

| Control (lab) | Preset field | Range | Default when absent |
| --- | --- | --- | --- |
| Opacity | `glassOpacity` | existing | — |
| Backdrop blur | `glassBlurPx` | existing | — |
| Contrast | `glassBackdropContrast` | existing | — |
| Shine | `glassSheen` | existing | — |
| Rim | `glassRim` | existing | — |
| Refraction | `glassRefraction` | 0–1 | 0 |
| Refraction width | `glassRefractionWidth` | 0–0.3 | 0 |
| Pointer halo | `glassHalo` | 0–1 | 0 |
| Relief | `glassDepth` | 0–1 | 0 |
| Motion | `glassMotion` | 0–1 | 0 |
| Dispersion | `glassDispersion` | 0–1 | 0 |

- **Schema.** The new fields are optional in `schemas/preset.schema.json`, edited in the schema source and not in the generated contracts.
- **Defaults.** With every new field absent, the compiled output is byte for byte today's.
- **Contrast semantics.** The lab's Contrast and `glassBackdropContrast` are the same CSS `contrast()` factor. The lab only uses values above 1 (`1 + contrast / 180`), while today's presets compress the backdrop (0.45). So the field's range widens from 0.3–1 to 0.3–1.6, and presets store `1 + contrast / 180`, for example Cristal 1.25. The contrast bound already models any factor, because it filters the darkest and brightest backdrop through `contrast()`. The lab ties an extra drop shadow to contrast. It is derived without a new field: alpha `max(0, (glassBackdropContrast − 1) × 0.545)`, added to PR A's offset-driven drop shadow.

## Components: one shared material

- **One definition.** `liquid-glass.css` defines the material once as custom properties: veil, rim, relief shadows, dispersion fringe, shine (following the pointer by Motion) and the halo ring.
- **Three recipes.** Component sheets pick one:

  | Recipe | Layers | Used by |
  | --- | --- | --- |
  | Surface | All layers, including hover lift and press | Card, Dialog, Popover, Dropdown Menu, Select content, Tooltip, Alert, the Table and Accordion containers |
  | Control | Veil, rim, relief, dispersion, halo, press (no hover lift) | Button, Badge, Tabs list, fields, Select trigger |
  | Mark | Veil and rim | Checkbox, Switch, Radio, Avatar, Progress track, Skeleton |

- **Pseudo-elements.** `::before` holds the shine and `::after` the halo ring. Sheets that use them today move that content to a child element or a background layer.
- **Variants.** One ink, as in the buttons board. Default and destructive tint the veil (24% / 26%), raise coverage by 8 points and add a glow. Secondary, outline and ghost lower the veil's coverage (64%, 26%, 14%; ghost 50% on hover). Link has no surface and a 2px primary underline. Hover adds 8 tint points; pressed adds an inner shade; focus is a ring in `ring`; disabled is dashed at 50%.
- **Dark mode.** The veil becomes a light wash, `226 236 255`, at 38% of the glass opacity. Fumée keeps its dark veil. Rim, relief and halo stay, and the shine is scaled to 60%.
- **Rules every glass sheet keeps.** At most one `[data-slot=` per selector; glass inside `@supports ((backdrop-filter: blur(1px)) or (-webkit-backdrop-filter: blur(1px)))`; logical properties; overlay animations only on `[data-state='open']`.

## LiquidGlassFilter

- **Pointer.** One document-level pointer listener. On move it writes `--pointer-x` and `--pointer-y` (percentages) and `data-halo-active` onto the glass surface under the pointer, and clears them when the pointer leaves. Touch shows the halo while pressed.
- **Refraction.** The edge map is replaced by the lab's rim map (`createRimMap`: a rounded-rectangle distance field confined to the rim). The filter reads the refraction strength and width from the compiled tokens. Strength maps to the displacement scale as `glassRefraction / 6.9` in object-bounding-box units.
- **Fallbacks.** Chromium only, as today. Without the component, halo is off and the shine stays at the top left.

## Fallbacks

| Condition | Behaviour |
| --- | --- |
| Not Chromium | Blur only, no refraction |
| `LiquidGlassFilter` not mounted | No halo; shine fixed at the top left |
| `prefers-reduced-motion: reduce` | Motion 0: no lift, no light travel; halo fixed at the top |
| `prefers-reduced-transparency: reduce`, or `transparency: "reduced"` | Opaque surfaces; no blur, refraction or halo |
| Forced colours | System colours; effects off; states shown by borders and indicators |

## Contrast bound

- **Evaluated surface.** Text pairs are evaluated on the veil, using each recipe's coverage, and in dark mode on the light wash.
- **Tuning.** A built-in preset that fails is tuned (opacity, tint values or accent). The component is not changed. Each preset's lowest passing opacity is recorded in the docs.
- **Dispersion.** It adds colour only on the rim, outside text areas. The bound ignores it.

## Editors and website

- **Preset editor, kept as is.** Every current control stays: radius, font, density, colours including accents, border, shadow, motion, transparency, and the glass panel's contrast readout.
- **Preset editor, added for liquid glass drafts:**
  - a Starting point picker with the eight presets, Cristal first and marked default, showing "Custom" after any change;
  - the six new sliders, in the lab's order with one-line hints;
  - Claire, Rosée, Fumée and White tint chips, which fill the card, popover, foreground and accent colours for both modes;
  - a preview that mounts `LiquidGlassFilter`, so halo and refraction are live;
  - preview backdrops Prisme, Trame, Nuit and Pêche, with Pêche selected automatically for Relief (preview only);
  - refraction sliders labelled "Chromium only" in other browsers but still editable.
- **Button editor.** Glass recipes get the same sliders as overrides, and the preview mounts `LiquidGlassFilter`.
- **Website.** The presets list shows the eight starting points. Component pages claim the new look only once the published installer is 0.5.0, through `glassMinimumCli`.

## Delivery

Three PRs, in order, each branched off `main` after the previous one merges.

1. **Material.** The six settings (schema, defaults that keep today's output), compiler tokens, `LiquidGlassFilter` (pointer, rim map), and the shared material with its three recipes on every glass sheet.
2. **Presets.** The eight preset files, with Cristal as `builtin-liquid-glass`. Tints and accents, the dark-mode veil, contrast tuning per preset, and the upgrade note for 0.4.x projects.
3. **Editors.** Picker, sliders, tint chips, backdrops, live preview, Button editor overrides, website presets list, docs and evidence.

Each PR runs:

- `corepack pnpm typecheck`;
- `VITEST_MAX_WORKERS=4 corepack pnpm test:unit`;
- the `preset-gallery-generation`, `preview-routing`, `hosted-preview-build`, `liquid-glass-cli` and `www-route` integration tests;
- light and dark Playwright screenshots of every preset.

The PR body states that `test:e2e` was not run.

## Amendments during implementation

- **Family base (PR 2).** `builtin-liquid-glass` keeps today's look and Cristal ships as `builtin-liquid-glass-cristal`, the editor's default. `resolvePreset` fills saved presets' missing fields from the base, so a Cristal base would change every saved 0.5 project.
- **Dark mode (PR 2).** The light wash (a 38% white card) fails its opaque fallback; dark mode uses tinted dark veils (Claire `#1B2540`, Rosée `#2A1D33`, Relief `#2E1A24`, Fumée `#091127`) with rims, relief and halo kept.
- **Text outline and solid marks (PR 2, chosen by the user).** With the material on, glass text sits on an opaque 1px ring in its surface colour, and checked Checkbox, Radio and Switch fills paint solid; the contrast bound counts both, so thin presets keep the 4.5:1 guarantee within 1px of every glyph.
- **Motion and surfaces (PR 1 review).** Only Card lifts, on hover-capable devices; nothing presses. Surfaces that scroll or clip carry the material on their own shadow with no halo; fields keep veil and rim.

## Out of scope

- Stable status for liquid glass.
- Refraction outside Chromium.
- Running `test:e2e`.
- The consumer matrix.
