# Style palettes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the editor's generic Accent/Base schemes with complete light-and-dark palettes authored per style, keeping the old accents as a "Primary" row.

**Architecture:** Palettes are `ColorScheme` values (same shape as today) tagged with a `family`, applied as explicit edits through the existing `applyColorScheme`, `resetColorScheme` and `schemeMatches`. `ThemeControls` shows a Palette row for the draft's family and the Primary row. Liquid glass keeps its tint control and gets no palettes.

**Tech Stack:** TypeScript, React, Vitest, Next.js app in `apps/www` (read `apps/www/AGENTS.md`: this Next.js differs from older versions).

**Spec:** `docs/superpowers/specs/2026-11-14-style-palettes-design.md`

## Global Constraints

- Branch `feat/style-palettes` from `main`-based work; Conventional Commits (`feat(www): ...`); no `codex` prefix.
- Only `apps/www/src/preset-editor/` (plus the spec) changes. No change to catalog presets, compiler, CLI or file formats.
- Palette values are 6-digit hex (the test measures them in Node, without a DOM).
- A palette never sets `destructive` or `destructiveForeground`.
- Run only the tests of files you changed (`pnpm exec vitest run <file>`); do not re-run unchanged suites.
- Final check: `pnpm typecheck`.

## Review Focus

- Light mode is a real light palette: light `background` is clearly lighter than dark `background` (the "everything is dark" complaint). Pinned in Task 1.
- Contrast holds in both modes for every text pair of every palette. Pinned in Task 1.
- A draft carrying another family's palette, or an old Slate/Stone/Zinc edit set from storage, shows "Custom", never throws, and "Style default" resets it. Pinned in Task 1.
- Palette then Primary then palette again: the Primary row only overrides `primary`, `primaryForeground`, `ring`; reapplying the palette restores its own primary. Pinned in Task 1.
- Switching family in the editor swaps the Palette row to the new family's palettes; glass shows none. Pinned in Task 5.

---

### Task 1: Palette model, helpers and tests (Flat palettes)

**Files:**
- Modify: `apps/www/src/preset-editor/schemes.ts`
- Modify: `apps/www/src/preset-editor/schemes.test.ts`
- Modify: `docs/superpowers/specs/2026-11-14-style-palettes-design.md` (contrast bullet, see Step 6)

**Interfaces:**
- Consumes: `StyleFamily` from `@ombelle/contracts`; `contrastRatio` from `./contrast`; `createPresetDraft`, `materializePreset`, `presetFieldValue` from `./model`.
- Produces:
  - `ColorScheme` gains `family?: StyleFamily` (set on palettes, absent on accents) and `swatchDark?: string`.
  - `export const accentSchemes: ColorScheme[]` unchanged.
  - `export function paletteSchemes(family: StyleFamily): ColorScheme[]` returns `[]` for `liquid-glass`.
  - `export const paletteTokenKeys: readonly string[]` is every `colorKeys` entry except `destructive` and `destructiveForeground`.
  - `baseSchemes` and the `base()` helper are removed.
  - Internal `palette(family, id, label, light: Tokens, dark: Tokens): ColorScheme` that sets `swatch = light.background`, `swatchDark = dark.background`.

- [ ] **Step 1: Write the failing tests** in `schemes.test.ts`, replacing the Base-based tests. Use `describe.each` over `['flat','minimalist','neo-brutalism','ombelle']` and `paletteSchemes(family)`:
  - `has at least 6 palettes per family, none for liquid-glass`: `paletteSchemes(f).length >= 6`; `paletteSchemes('liquid-glass')` equals `[]`.
  - `sets every palette token in both modes`: each palette's `light` and `dark` keys equal `paletteTokenKeys` (as sets) and every value matches `/^#[0-9A-F]{6}$/i`.
  - `never touches destructive tokens`.
  - `light is light and dark is dark`: relative luminance of `light.background` > 0.5 and of `dark.background` < 0.2 (compute via `contrastRatio` against white/black or a local `luminance`).
  - `text pairs reach 4.5:1 in both modes`: pairs `foreground/background`, `cardForeground/card`, `popoverForeground/popover`, `primaryForeground/primary`, `secondaryForeground/secondary`, `mutedForeground/muted`, `accentForeground/accent`; `ring` against `background` at least 3; `border` against `background` at least 1.1.
  - `validates as a preset`: `materializePreset(applyColorScheme(createPresetDraft(family), palette))` does not throw, and `schemeMatches` is true.
  - `resets to the style default`: apply then `resetColorScheme(draft, paletteSchemes(family))` gives `draft.edits` equal to `{}`.
  - `survives another family's palette and old base edits`: apply a Flat palette to a `neo-brutalism` draft; `schemeMatches` for a Neo-brutalism palette is false, `materializePreset` does not throw, reset empties edits. Also apply edits `/modes/dark/background = '#0F172A'` (old Slate) with `setPresetEdit` and check the same.
  - `primary row overrides only primary, primaryForeground and ring, and a palette restores them`: apply palette P, then `rose`; `/modes/light/primary` is `#E11D48` and `/modes/light/background` still equals P's; apply P again and primary equals P's.
  - Keep the two accent tests (`applies an accent scheme...`, and the family validity loop without bases).

- [ ] **Step 2: Run to verify failure**

Run: `pnpm exec vitest run apps/www/src/preset-editor/schemes.test.ts`
Expected: FAIL (`paletteSchemes` is not exported).

- [ ] **Step 3: Implement in `schemes.ts`:** add the types and helpers above, remove `baseSchemes`, and write `paletteSchemes(family)` over a `palettes: Record<'flat' | 'minimalist' | 'neo-brutalism' | 'ombelle', ColorScheme[]>` table returning `[]` for other families. Fill the Flat table with 6 palettes: **Sage, Sand, Lilac, Clay, Ocean, Graphite**. Flat character: cool tinted light background (like `#F3F5F9`), white `card`, soft tinted `secondary`/`muted`/`accent`, a light `border` slightly darker than the background, deep-navy-tinted dark surfaces (like `#0B1120`). Each palette tints those surfaces toward its hue in both modes; primary is a saturated mid-dark hue in light and a pale tint in dark. Start from `packages/catalog/src/presets/flat.json` and keep its relationships (surface steps, border step). Adjust values until the Step 1 tests pass.

- [ ] **Step 4: Run to verify pass**

Run: `pnpm exec vitest run apps/www/src/preset-editor/schemes.test.ts`
Expected: PASS for Flat; other families fail only the "at least 6" check until Tasks 2-4. To keep the suite green per task, make the `describe.each` list a `const familiesWithPalettes` array in the test and add each family as its task lands.

- [ ] **Step 5: Commit**

```bash
git switch -c feat/style-palettes
git add apps/www/src/preset-editor/schemes.ts apps/www/src/preset-editor/schemes.test.ts
git commit -m "feat(www): add per-style palettes model with Flat palettes"
```

- [ ] **Step 6: Align the spec.** In the spec's Tests section change the `ring` and `border` line to: `ring` at least 3:1 and `border` at least 1.1:1 against `background` (the style defaults' own borders sit below 3:1). Commit with `docs(www): align palette contrast bounds`.

---

### Task 2: Minimalist palettes

**Files:**
- Modify: `apps/www/src/preset-editor/schemes.ts`, `apps/www/src/preset-editor/schemes.test.ts` (add `'minimalist'` to `familiesWithPalettes`)

**Interfaces:**
- Consumes: `palette()` and the `palettes` table from Task 1.
- Produces: `paletteSchemes('minimalist')` with 6 palettes.

- [ ] **Step 1:** Add `'minimalist'` to `familiesWithPalettes`; run `pnpm exec vitest run apps/www/src/preset-editor/schemes.test.ts`. Expected: FAIL (no palettes yet).
- [ ] **Step 2:** Add 6 palettes: **Sand, Sage, Stone Blue, Clay, Moss, Ink**. Minimalist character: warm near-neutral surfaces (`#FAFAF9` background family), `primary` is near-ink (like `#111111`) rather than a colour in every palette except where the name says so, `secondary`/`muted`/`accent` are one quiet step from the background, hairline `border`, warm near-black dark mode (like `#0E0E0D`). Palettes differ by the temperature and tint of the neutrals, with one restrained accent hue in `ring` and `primary` where named. Base on `minimalist.json`.
- [ ] **Step 3:** Run the same command. Expected: PASS.
- [ ] **Step 4: Commit** `feat(www): add Minimalist palettes`.

---

### Task 3: Neo-brutalism palettes

**Files:**
- Modify: `apps/www/src/preset-editor/schemes.ts`, `apps/www/src/preset-editor/schemes.test.ts` (add `'neo-brutalism'`)

**Interfaces:**
- Consumes/Produces: as Task 2, for `'neo-brutalism'`.

- [ ] **Step 1:** Add `'neo-brutalism'` to `familiesWithPalettes`; run the schemes test. Expected: FAIL.
- [ ] **Step 2:** Add 6 palettes: **Pink, Cyan, Lime, Orange, Lilac, Mono**. Character from `neo-brutalism.json`: cream light background (like `#F4F4EF`), white card, near-black `border` and `foreground` in light and near-white `border` in dark, flat vivid fills for `primary`, `secondary` and `accent` (distinct hues per palette, dark ink text on them), `ring` equal to the border ink. Dark mode keeps vivid primaries on near-black surfaces (like `#141414`). Mono uses grey/ink primaries with a single bright accent.
- [ ] **Step 3:** Run the schemes test. Expected: PASS.
- [ ] **Step 4: Commit** `feat(www): add Neo-brutalism palettes`.

---

### Task 4: Ombelle palettes

**Files:**
- Modify: `apps/www/src/preset-editor/schemes.ts`, `apps/www/src/preset-editor/schemes.test.ts` (add `'ombelle'`)

**Interfaces:**
- Consumes/Produces: as Task 2, for `'ombelle'`.

- [ ] **Step 1:** Add `'ombelle'` to `familiesWithPalettes`; run the schemes test. Expected: FAIL.
- [ ] **Step 2:** Add 6 palettes: **Peach, Lilac, Sage, Sky, Plum, Amber** (the rose default stays "Style default"). Character from `ombelle.json`: faintly tinted near-white light background, white card, a tinted `secondary`/`accent` of the palette's hue, strong saturated `primary`, ink-coloured `border`, and dark mode with deep tinted surfaces and a brighter primary. Values are hex approximations of the OKLCH relationships (the default stays OKLCH when untouched).
- [ ] **Step 3:** Run the schemes test. Expected: PASS.
- [ ] **Step 4: Commit** `feat(www): add Ombelle palettes`.

---

### Task 5: Editor UI wiring

**Files:**
- Modify: `apps/www/src/preset-editor/components/preset-controls.tsx` (`schemeSwatches` ~line 42, `ThemeControls` ~line 442)
- Modify: `apps/www/src/preset-editor/components/preset-editor.tsx` (~line 500)
- Modify: `apps/www/src/preset-editor/components/preset-editor.module.css` (next to `.preset-scheme-dot`, ~line 573)
- Test: a new `apps/www/src/preset-editor/components/theme-controls.test.tsx`

**Interfaces:**
- Consumes: `paletteSchemes`, `accentSchemes`, `applyColorScheme`, `resetColorScheme`, `schemeMatches`, `ColorScheme.swatchDark`.
- Produces: `ThemeControls({ draft, onApply, onResetGroup })` with `group: 'palette' | 'accent'` (replacing `'base'`); `schemeSwatches(key, mode, family)` taking the draft's family.

- [ ] **Step 1: Write the failing test** `theme-controls.test.tsx` (follow the render style of `glass-panel.test.tsx` in the same folder): for a `flat` draft, `ThemeControls` shows a group labelled "Palette color" with one button per Flat palette plus "Style default palette", and a group "Primary color"; clicking a palette calls `onApply(scheme, 'palette')`. For a `liquid-glass` draft, there is no "Palette color" group. Re-rendering with a `neo-brutalism` draft shows Neo-brutalism palette names.
- [ ] **Step 2: Run** `pnpm exec vitest run apps/www/src/preset-editor/components/theme-controls.test.tsx`. Expected: FAIL.
- [ ] **Step 3: Implement.** In `ThemeControls`, build groups `[{ id:'palette', label:'Palette', schemes: paletteSchemes(draft.family) }, { id:'accent', label:'Primary', schemes: accentSchemes }]`, omitting a group whose schemes are empty. Update `aria-label` to `${label} color`. In `preset-editor.tsx`, `onResetGroup` resets `paletteSchemes(draft.family)` for `'palette'` and `accentSchemes` for `'accent'` (if a draft holds another family's palette edits, `resetColorScheme` on all four families' palettes so "Style default" fully clears them: pass `styleFamilies` flattened). `schemeSwatches` uses accents plus the draft family's palettes. Swatch: when `scheme.swatchDark` exists, render the dot as a diagonal two-tone (`linear-gradient(135deg, light 50%, dark 50%)` set via inline style), with the primary as a small inner mark (a `::after` using a CSS variable set inline).
- [ ] **Step 4: Run** the theme-controls test and `pnpm exec vitest run apps/www/src/preset-editor/schemes.test.ts`. Expected: PASS.
- [ ] **Step 5: Commit** `feat(www): show per-style palettes in the preset editor`.

---

### Task 6: Verify in the editor

**Files:** none.

- [ ] **Step 1:** `pnpm typecheck`. Expected: no errors.
- [ ] **Step 2:** Start `www-3100` with `preview_start`, open `/editor/preset`. If the browser pane refuses `localhost`, ask the user to allow it.
- [ ] **Step 3:** For each of Flat, Minimalist, Neo-brutalism, Ombelle: apply two palettes, toggle light and dark, and confirm that backgrounds, cards, borders and primaries visibly change in both modes, swatches read light/dark, and "Style default" restores. Switch to Liquid glass and confirm there is no Palette row. Capture one screenshot per family.
- [ ] **Step 4:** Report what was verified and what was not. Open a PR from `feat/style-palettes` only if the user asks.
