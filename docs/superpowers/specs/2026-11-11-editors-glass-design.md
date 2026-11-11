# Editors and liquid glass, batch 7a: contrast-aware backdrop, dark-mode lab ink and the reduced-transparency toggle

Sub-project 7 is the last phase of the 0.7.3 work: the editors and liquid glass. It has six independent improvements from the 0.7.3 list, split in two batches, each with its own spec, plan and PR:

- **7a, liquid glass (this spec):** a contrast-aware backdrop pick, dark-mode lab ink, and a reduced-transparency toggle.
- **7b, editors (a later spec):** measured placeholders, the variant matrix, and the diff on Get code.

7a stacks on PR #107 (batches 6b and 6c), on branch `feat/editors-glass-073`.

## Intent

Liquid glass is experimental and non-blocking. Its previews sit over seven scenes: Kit, Brume, Aube, Trame, Pêche, Prisme and Nuit. Today:

- Each starting preset's scene, per mode, is a hand-tuned table (`presetBackdropsByMode` in `apps/www/src/site/glass-presets.ts`). It no longer fits once the user edits the preset.
- The lab presets' soft ink, which replaces the text plate, works only in light mode, and only for an unedited lab preset over its own scene (`hasLabPreviewInk` in `apps/preview/src/glass-backdrop-art.tsx`).
- `prefers-reduced-transparency` can be checked only by emulating the media query in Playwright. The editors offer no way to see it.

The 0.7.3 list names these as "glass contrast-aware backdrop", "dark-mode lab ink" and "reduced-transparency toggle". The design artifact has no board for them. Its liquid glass kit states the rule they serve: text pairs are checked against the darkest and brightest backdrop, and reduced transparency paints opaque surfaces.

Decisions taken in brainstorming (11 November 2026):

- **Split:** two batches, two PRs; 7a first.
- **Backdrop pick:** the editors both choose a default scene from measured contrast and show each scene's ratio in the backdrop menu. A manual choice still wins.
- **Lab ink (revised during Task 3, after a visual comparison):** the measured rule was dropped. Without its plate, no lab preset's text reaches 4.5:1 on any dark scene, and Fumé and Relief would lose the light ink they have today. The user chose the current rule, extended to dark mode: an unedited lab preset over its own scene for that mode. The measured ratios drive only the backdrop menu and the automatic scene.
- **Reduced transparency:** a preview-only mirror. The preview copies its own `prefers-reduced-transparency` rules under an attribute, and the toggle sets that attribute. Installed CSS does not change.
- **Toggle placement:** the preset, component and Button editors, beside "Preview mode", only when the family is liquid glass.
- **Scene data:** a measured table, checked by an end-to-end test that re-measures the scenes. It is not sampled live in the preview, and not declared by hand.

## The scene data and the contrast computation

### Measured scene ranges

`apps/www/src/site/glass-backdrops.ts` (new) exports:

- `glassSceneRanges: Record<PresetBackdrop, Record<'light' | 'dark', { low: number; high: number }>>`.
- `low` and `high` are the darkest and brightest sampled pixels, each as the gamma-encoded grey of the same relative luminance, from 0 to 1. The backdrop filter runs on that grey. A per-channel range was tried first: one high channel of a saturated dark pixel made every dark scene rate near 1:1.
- Kit uses the stylesheet's gradient, so it is measured like the others.

`tests/e2e/glass-scenes.spec.ts` (new) checks the table, and rewrites it when `OMBELLE_WRITE_GLASS_SCENES=1`:

- It renders each scene with `GlassBackdropArt`, and Kit with its CSS, in Playwright's bundled Chromium at 1280 × 800, in both modes.
- It reads the pixels of a 32 × 20 grid inside the area where the preview's surfaces sit, the central 80 % of the viewport.
- It writes `glass-backdrops.ts` with values rounded to four decimals.
- `pnpm measure:glass-scenes` runs it in write mode. It needs the preview build, like the specimen audit.

### Contrast on a scene

In `packages/compiler/src/glass-contrast.ts`:

- `glassContrastOnScene(data: Preset, mode: 'light' | 'dark', range: { low: number; high: number }): number` returns the worst ratio of the preset's glass text pairs (`glassContrastPairs`) for that mode.
- It rates the text without its outline plate. The plate reads on any scene, so with it every scene rates the same.
- It reuses the existing resolution and filtering. The scene's range enters the backdrop filter transfer in place of the full 0 to 1 range that `glassBackdrop` assumes. The text is then composited over the glass surface, over the two ends of the filtered range.
- With `design.transparency: 'reduced'`, the surface is opaque, the scene drops out, and the function returns the opaque ratio.
- The existing `glassContrastReport` output is unchanged. The stable hashes and the compiler's emitted CSS are unaffected.

### Picking a scene

In `apps/www/src/site/glass-backdrops.ts`:

- `glassSceneRatios(data: Preset, mode): Record<PresetBackdrop, number>` gives the ratio of every scene.
- `pickGlassScene(data: Preset, mode, startingPresetId?: StartingPresetId): PresetBackdrop`:
  - The starting preset's own scene, `glassPresetBackdrop(startingPresetId, mode)`, stays while the preset's ratio there is at least `min(4.5, the unedited starting preset's ratio there)`. An edit moves the scene only when it makes the text read worse than the curated choice, below 4.5:1.
  - Otherwise, and without a starting preset, it returns the scene with the highest ratio, compared at two decimals, ties in the order of `glassBackdropOptions`.
  - Unedited built-in starting presets therefore keep today's table in both modes; a unit test pins it.

## The backdrop pick in the editors

**Preset editor and site playground:**

- The default scene is `pickGlassScene(design, mode, startingPresetId)`. It is recomputed whenever the preset or the mode changes.
- `backdropOverride` keeps priority, as today, and resets when the starting preset changes.

**The "Preview backdrop" menu:**

- Each option's label carries its ratio, for example "Brume, 6.2:1".
- A scene below 4.5:1 adds "below 4.5:1" to its accessible name, not only a colour.
- The automatic choice adds "(auto)".
- When transparency is reduced, by the preset or by the toggle, the menu shows one shared ratio, because opaque surfaces no longer depend on the scene.

**Button and component editors:**

- They have no backdrop menu, and none is added.
- Their previews (`apps/preview/src/editor-preview.tsx`, `catalog-recipe-preview.tsx`) use the same automatic scene, computed from the recipe's preset, in place of the fixed `glassPresetBackdrop` scene.

## Dark-mode lab ink

`labInkFor(data: Preset, mode, scene): 'light' | 'dark' | null` replaces `hasLabPreviewInk`, in `apps/www/src/site/glass-backdrops.ts`:

- **Which presets:** an unedited lab preset (`defaultGlassPresetId`, Givré, Fumé, Relief), detected by comparing its design values and colours with the catalog, as `hasLabPreviewInk` did.
- **When it is on:** when the scene is that preset's own scene for the mode, `glassPresetBackdrop(id, mode)`; it returns the mode. Otherwise `null`, and the text plate stays. No measurement.
- **Reduced transparency:** it returns `null`. Opaque surfaces have no glow to replace.

`setGlassBackdrop(root, scene, labInk)` sets `data-glass-lab-ink="light"` or `"dark"`, or removes it.

In `apps/preview/src/glass-backdrop.css`, the three `html[data-glass-lab-ink]:not(.dark)` blocks become:

- **`[data-glass-lab-ink='light']`:** today's rules, unchanged.
- **`[data-glass-lab-ink='dark']`:** the same slots, with a dark glow, `color-mix(in srgb, var(--glass-lab-veil, var(--card)) 12%, transparent)` on the dark veil. Link and ghost buttons take `--glass-preview-ink` from the dark scene. Card descriptions take `--card-foreground`.
- Both sets stay off under `forced-colors: active`, under `prefers-reduced-transparency: reduce`, and under the toggle's attribute.

The `state.mode === 'light'` condition in `editor-preview.tsx` and the light-only comparison in `hasLabPreviewInk` go away. `preset-preview.tsx` passes the result of `labInkFor`.

## The reduced-transparency toggle

**The control:**

- A "Reduce transparency" switch, from the catalog's Switch in the editor shell, beside "Preview mode".
- It appears in `preset-editor.tsx`, `catalog-component-editor.tsx` and `button-editor.tsx`, and only when the family is liquid glass.
- It is preview state. It is not saved in the preset, the recipe or a snapshot, and it resets on reload.

**The protocol:**

- `PresetView` in `apps/www/src/preset-editor/preview-protocol.ts` gains an optional `reducedTransparency: true`.
- `sentPresetView` and the strict view validator accept it with each existing key set.
- The Button and catalog component preview messages gain the same optional flag.
- An old preview that receives no flag behaves as today.

**The mirror (revised in Task 8, after a parity check against CDP emulation):**

- The pure transform is `mirrorReducedTransparency(rules)` in `apps/www/src/site/reduced-transparency.ts`, so Vitest covers it. The DOM adapter is `startReducedTransparencyMirror(doc)` in `apps/preview/src/reduced-transparency-mirror.ts`.
- It walks `doc.styleSheets`, skipping cross-origin sheets, and handles each sheet once.
- **A `(prefers-reduced-transparency: reduce)` rule:**
  - It gets a copy inserted right after it in the same rule list, inside `@media all`.
  - Each copied selector is prefixed with `:where(html[data-reduced-transparency])`, which adds no specificity, so the copy keeps the original rule's specificity and source order.
  - The copy keeps the other conditions of the query, and the `@supports`, `@media` and `@layer` blocks around it.
- **A rule under `not (prefers-reduced-transparency: reduce)` or `(prefers-reduced-transparency: no-preference)`:**
  - Adding rules cannot switch it off, so its selectors are gated in place with `:where(html:not([data-reduced-transparency]))`.
  - It keeps following the real preference too.
- **CSS nesting:** nested rules are resolved against their parent selector with `:is()`. A style rule with the media feature nested inside gets its copy after the whole rule.
- It runs when the preview mounts, on every style mutation in the document, and on capture-phase `load` events of linked sheets.
- The toggle sets or removes `data-reduced-transparency` on the preview's `html`.
- The editor's own page, outside the iframe, is not affected.
- **Parity:** on the top-level audit page, every `[data-slot]` element's backdrop filter, background colour and background image under the mirror equal those under CDP-emulated `prefers-reduced-transparency: reduce`. In the sandboxed editor preview, the emulation reaches `matchMedia` but not the cascade, so the editor test checks that the toggle makes the Card opaque and restores it.

## Styles

- Only `apps/preview/src/glass-backdrop.css` changes, as described above.
- The catalog styles, the compiler's emitted CSS and the stable family hashes do not change.
- The specimen audit is re-run only for the liquid glass configurations of the components whose preview ink changes: Card, Button, Badge, Input, Select and Tabs. The audit uses the preview CSS.

## Testing

**Unit (Vitest):**

- `glassContrastOnScene`:
  - a narrower range never gives a lower ratio than the full range;
  - `transparency: 'reduced'` ignores the range;
  - the full 0 to 1 range gives the existing worst-case ratio.
- `pickGlassScene`:
  - unedited built-in starting presets get today's table in both modes;
  - a preset edited to dark text on a light surface moves to a light scene;
  - ties follow the documented order.
- `labInkFor`:
  - a lab preset on its own light scene returns `'light'`, as today;
  - a lab preset on a passing dark scene returns `'dark'`;
  - a failing scene, a non-lab preset, or reduced transparency returns `null`.
- `mirrorReducedTransparency`, on a document with constructed sheets:
  - it copies a `reduce` rule under the attribute;
  - it inverts a `not (…)` rule;
  - it keeps nesting;
  - it rebuilds instead of appending.
- The preview protocol accepts `reducedTransparency` and rejects unknown keys.

**End to end, `tests/e2e/editors-glass.spec.ts`, under the specimen-audit config:**

- Re-measuring the scenes matches `glassSceneRanges` to within 0.02 per value.
- The preset editor's backdrop menu names each option with its ratio. The "(auto)" option follows an edit that darkens the text.
- In dark mode, the lab ink attribute is `dark` for a lab preset on a passing scene. The audit's contrast and focus checks pass on that page.
- With the toggle on, a glass Card's computed `backdrop-filter` and background equal those under CDP-emulated `prefers-reduced-transparency: reduce`. Off, they equal the default.
- The toggle is absent in a non-glass family, and appears in all three editors in glass.
- It runs on the site's editor routes, in the edition each editor already uses. The mirror itself is edition-independent, and its unit tests cover it.

**Specimen audit:** limited to the six components above, liquid glass configurations only, with `OMBELLE_AUDIT_COMPONENTS`. Glass remains non-blocking. Findings are recorded, not hidden.

## Docs

- `docs/evidence/editors-glass-073.md` (new), with:
  - the measured scene table and how it was measured;
  - each built-in preset's ratios and pick;
  - the dark lab ink measurements;
  - the toggle's parity with CDP emulation;
  - the audit run.
- The liquid glass docs (`docs/components/` and the site's liquid glass guide in `apps/www/src/site/docs/`) explain the automatic backdrop, the ratios in the menu, the dark lab ink, and the toggle being a preview simulation.
- `CHANGELOG.md` under Unreleased: the three editor features. None of them changes installed output.

## Out of scope

- Batch 7b: measured placeholders, the variant matrix and the diff on Get code.
- Live sampling of the preview's pixels.
- APCA, or contrast models other than WCAG 2 ratios.
- A backdrop menu in the Button and component editors.
- Saving the toggle or the backdrop choice.
- Changes to the catalog's reduced-transparency CSS.
- Releases, deployment and pushes without asking.

## Delivery

- Branch `feat/editors-glass-073`, from `feat/variants-more-073`. The PR stacks on #107.
- Conventional Commits.
- The execution method is chosen with the plan. One fresh reviewer then checks the whole branch, and its minor findings are fixed before the PR, as in batch 6.
- Only the tests and audits of what changed are run.
