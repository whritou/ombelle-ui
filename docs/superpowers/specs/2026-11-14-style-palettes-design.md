# Style palettes for the preset editor

Status: draft, awaiting approval. Size: small-to-medium change (editor only).

## Intent

The editor's one-click colours are the same for every style and barely change light mode.
Base (Slate, Stone, Zinc) sets light `background`, `card` and `popover` to `#FFFFFF`, so only dark
mode visibly changes, and its swatch is the dark background, so every option looks black. Accent
only sets `primary`, `primaryForeground` and `ring`, with identical values in every style, and no
scheme touches `border`, `secondary` or `accent`, so a style's character (Neo-brutalism's black
borders and cyan/pink, Ombelle's rose tint) fights the choice.

Goal: each style offers palettes designed for it, complete in light and dark.

## Goals

- One-click palettes per style family: Flat, Minimalist, Neo-brutalism, Ombelle. About 6-8 each,
  named by character (for example "Sage", "Lilac"), not by raw colour.
- A palette sets the full light and dark pair: `background`, `card`, `popover`, `secondary`,
  `muted`, `accent`, `border`, `input`, `ring`, `primary` and every matching foreground.
- Light mode is a real designed palette (tinted surfaces where the style calls for it), not white
  plus dark text.
- Swatches show both modes (light half, dark half) so the preview is honest.
- Every palette passes a contrast test in both modes for each foreground/surface pair.
- Per-token editing (TokenList) and "Style default" reset keep working.

## Non-goals

- No change to catalog presets, the compiler, the CLI or exported file formats. Palettes are edits
  on top of a style, exactly like today's schemes.
- Liquid glass keeps its existing tint control (`applyGlassTint`); it gets no palettes here.
- No hue-based generation and no free-form palette creation.

## Anti-goals

- Palettes that look the same across styles, or erase a style's character.
- A pairing that works in one mode and fails in the other.
- Losing today's quick primary-only recolour.

## Constraints

- Only the editor in `apps/www/src/preset-editor/` changes; palettes live in `schemes.ts`.
- Values are hex or OKLCH, as the colour pickers accept (`storableFormats`).
- `destructive` and `destructiveForeground` stay with the style (existing test asserts this).
- Deterministic data only, no runtime colour generation.

## Approaches considered

- **A. One complete palette per style (chosen).** Art-directed, can't clash, simple model. Costs
  hand-tuned values for about 4 styles x 7 palettes.
- B. Keep Accent and Base rows, made style-aware and mode-complete. Keeps mix-and-match but every
  pairing needs testing and still looks uneven.
- C. Generate from a seed hue. Most choice and least tuning, but less art-directed and needs
  special rules for Neo-brutalism.

## Design

- `ColorScheme` gains `family` (which style it belongs to). `schemes.ts` exports
  `paletteSchemes(family)`; `applyColorScheme`, `resetColorScheme` and `schemeMatches` are
  reused unchanged.
- The Colors section shows one "Palette" row for the active family, plus "Style default". The
  existing accent colours stay as a secondary "Primary" row (primary, foreground and ring only),
  which is the current accent behaviour.
- `resetColorScheme` for a palette resets every token palettes can touch for that family.
- Glass families show no Palette row and keep the tint control.
- Swatch: two-tone dot, light `background` over dark `background`, with the primary as a small
  inner mark. CSS in `preset-editor.module.css` next to `.preset-scheme-dot`.

## Tests

- Update `schemes.test.ts`: every palette validates via `materializePreset` for its family;
  applying then resetting returns the draft to the style default.
- New contrast test: for each palette and mode, WCAG AA (4.5:1) for text pairs
  (`foreground/background`, `cardForeground/card`, `primaryForeground/primary`,
  `secondaryForeground/secondary`, `mutedForeground/muted`, `accentForeground/accent`); `ring` at least 3:1 and `border` at least 1.1:1 against `background`
  (the style defaults' own borders sit below 3:1). The contrast helper is `contrast.ts`.
- Keep the check that palettes never touch `destructive` or `destructiveForeground`.

## Left to the builder

- The actual palette names and values. Start from each family's current JSON in
  `packages/catalog/src/presets/` and keep its surface and border logic (Minimalist stays warm
  neutral, Neo-brutalism keeps near-black borders and flat vivid fills, Ombelle stays OKLCH).
- Exact swatch styling and whether the Primary row is collapsed by default.
- Verify visually in the editor in light and dark for each style.
