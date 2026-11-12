# Evidence: Code Block (0.7.5)

Sub-project 3 of the 0.7.5 work. Spec: `docs/superpowers/specs/2026-11-12-code-block-075-design.md`.

## Website size, before

Measured at `894a0e4` (`test(compiler): record the Number Input and Color Picker hashes after the editor fixes`), the base of this branch, which carries the editor-inputs website changes (`7f6d87f`). The branch head could not be built for this: `code-block` had joined the catalog but not the website, so `apps/www` failed its type check.

Method: a temporary git worktree at `894a0e4`; `corepack pnpm install --frozen-lockfile --ignore-scripts`, `corepack pnpm build:packages`, `corepack pnpm generate:preview`; `corepack pnpm run build` in `apps/www` (exit 0, Next.js 16.4.3 with Turbopack); then `node scripts/measure-www-first-load.mjs` (gzip level 9 of every script a route's prerendered HTML loads). Run on 2026-11-12 by an agent on Windows 11 Home 10.0.26300 with Node 24.19.0 and pnpm 11.25.0; the worktree was removed afterwards. The limit is 10 kB gzip of growth per route.

| Route | Scripts | First Load JS, gzip |
| --- | --- | --- |
| `/editor/preset` | 18 | 871.8 kB |
| `/editor/component` | 10 | 241.1 kB |
| `/editor/component/button` | 18 | 864.9 kB |
| `/docs` | 11 | 242.1 kB |
| `/docs/getting-started` | 12 | 249.2 kB |
| `/components` | 14 | 440.5 kB |
| `/components/accordion` | 15 | 837.3 kB |

## Website size, after

Measured at `84e3c69` (`fix(www): load the Get code command block when the dialog opens`) with the same method: after `corepack pnpm generate:preview` (packages unchanged since `02fb028`), `corepack pnpm run build` in `apps/www` (exit 0), then `node scripts/measure-www-first-load.mjs`. Run on 2026-11-12 by an agent on Windows 11 Home 10.0.26300 with Node 24.19.0 and pnpm 11.25.0. The `02fb028` column is the interim measurement before the website swaps.

| Route | Scripts | Before, gzip | `02fb028`, gzip | After, gzip | Growth |
| --- | --- | --- | --- | --- | --- |
| `/editor/preset` | 18 | 871.8 kB | 880.7 kB | 880.7 kB | +8.9 kB |
| `/editor/component` | 10 | 241.1 kB | 241.4 kB | 241.4 kB | +0.3 kB |
| `/editor/component/button` | 18 | 864.9 kB | 873.5 kB | 875.2 kB | **+10.3 kB, over the limit** |
| `/docs` | 11 | 242.1 kB | 242.3 kB | 242.3 kB | +0.2 kB |
| `/docs/getting-started` | 12 | 249.2 kB | 249.4 kB | 249.5 kB | +0.3 kB |
| `/components` | 14 | 440.5 kB | 449.2 kB | 449.2 kB | +8.7 kB |
| `/components/accordion` | 15 / 16 | 837.3 kB | 846.2 kB | 847.1 kB | +9.9 kB |

### Accepted overage: `/editor/component/button`

`/editor/component/button` grows by 10.3 kB gzip, over the 10 kB limit. The overage is accepted by a controller ruling and is to be reported to the user; it is not resolved in this sub-project.

- Most of the growth on the four catalog routes (8.6 to 8.9 kB) came before the website swaps: the Code Block template source and recipe description the site ships in the catalog.
- The swaps add about 1.7 kB on this route. The generated `code-block` module is one file, so the artifact panel's `CodeBlockRoot`, `CodeBlockCopy` and `CodeBlockCode` bring along the Radix Tabs that only `CodeBlockCommand` uses. The deleted site code block, highlighter and Get code terminal offset part of it.
- The Get code dialog loads `CodeBlockCommand` with a dynamic `import()`, requested when the dialog opens, so it downloads while the code publishes. That keeps `/editor/preset` at +8.9 kB (a static import gave +11.0 kB). On the button route the panel already loads the module, so the loader only adds about 0.3 kB (the static import gave +10.0 kB here).
- Options not taken: split the Code Block template so the parts do not carry Radix Tabs (a catalog change, outside this sub-project); lazy-load the component editor's code view (it is visible on first paint, so it would flash).
- The unused `code-view.module.css` rules were removed; that is stylesheet, not First Load JS.

## Website e2e

The four website specs that read the Get code command or the install tabs, with a temporary Playwright config:
- servers: the website (`corepack pnpm exec tsx scripts/serve-snapshot-www.ts`, port 3000) and the preview (`corepack pnpm dev:preview`, port 4173) only, no consumer servers;
- run: two workers, bundled Chromium, headless, reduced motion;
- command: `corepack pnpm exec playwright test -c <scratchpad>/playwright.task7.config.ts`, with `testMatch` set to `editor.spec.ts`, `preset-editor.spec.ts`, `recipe-snapshots.spec.ts` and `liquid-glass.spec.ts`;
- order: after `corepack pnpm generate:preview`.

The specs read the consumer port map at import, so the main checkout's `.artifacts/consumers.json` was copied in for the run. Run on 2026-11-12 by an agent on Windows 11 Home 10.0.26300 with Node 24.19.0; not CI or a human review.

Full run at the swap commit: 58 passed, 34 failed of 92 (10.2 min).

Three failures were caused by the swaps:
- `editor.spec.ts` "artifact tabs support copy…" and "operates every Button editor control … by keyboard";
- `recipe-snapshots.spec.ts` "publishes a recipe when Get code opens…".

In each, `getByRole('status')` matched two elements: the Code Block's Copy announces in a status region of its own. The specs now read the page status without `[data-slot="code-block-status"]`, and all three pass. "operates every Button editor control … by keyboard" also failed once more, before reaching Get code: a Variant toggle on a cold dev server. It passes alone.

These failures are also in the `primitives-075` baseline, with the same causes:
- `preset-editor.spec.ts` "matches downloaded … preset in installed vite/next" (16): needs the prepared consumer apps.
- `editor.spec.ts` "editor and CLI-installed Button recipe…": consumer port 4180.
- `editor.spec.ts` "opens the saved Button draft…": the first test on a cold dev server; passes alone.
- `preset-editor.spec.ts` "opens on the dashboard … in" (4): baseline.
- `preset-editor.spec.ts` "restores raw draft and history after refresh" and "edits numeric design values with a slider …": baseline.
- `preset-editor.spec.ts` "supports keyboard editing and 320 pixel reflow": axe `label-content-name-mismatch` and `scrollable-region-focusable`, on the gallery Date Picker trigger and the Projects table. The test's Get code assertions before the axe scan pass.

These failures are not in that baseline:
- **`liquid-glass.spec.ts` "preset editor glass flow", light and dark.** Both fail at the final axe scan (line 709), after the Get code command assertion (line 686) passes. The scan finds `label-content-name-mismatch` and `scrollable-region-focusable` only inside the preset gallery iframe, on `button[aria-labelledby="gallery-due"]` (Date Picker trigger) and `section[aria-label="Projects table"] > div[data-slot="table-container"]`. These are the two elements the baseline found pre-existing in "supports keyboard editing and 320 pixel reflow", and the website swaps do not touch the gallery. Pre-existing at `da30a91`: not confirmed by a run at that commit.
- **`recipe-snapshots.spec.ts` "published … recipe matches installed Vite and Next Buttons…" (4).** All four stop in `tests/helpers/editor-preset-consumer.ts` while copying a prepared consumer root (`ENOENT`), before any comparison. The copied port map names consumer folders that this machine does not have. This is the same cause as the baseline's consumer cases.

After the dialog fix (`84e3c69`), the tests that open Get code were rerun:
- passed (5): `editor.spec.ts` "operates every Button editor control … by keyboard" and "the Get code dialog scrolls its long command…"; `recipe-snapshots.spec.ts` "publishes a recipe…", "keeps local exports usable…" and "recovers a lost recipe publication…";
- failed only at the gallery axe scan described above (3): `preset-editor.spec.ts` "supports keyboard editing and 320 pixel reflow" and both `liquid-glass.spec.ts` "preset editor glass flow" cases.

`editor.spec.ts` "the component page hydrates its server-rendered Code Block and install tabs without a hydration error" passed. It compares the `/components/button` server HTML from `request.get` with the hydrated page's `pre[data-slot='code-block-code']` inner HTML, and checks the yarn (`yarn dlx --quiet`) and npm tabs.

## Browser behaviour

`tests/e2e/code-block-075.spec.ts`, in `playwright.specimen-audit.config.ts` only (ignored by the default config). Command: `corepack pnpm exec playwright test -c playwright.specimen-audit.config.ts tests/e2e/code-block-075.spec.ts`, after `build:packages` and `generate:preview`, with the config's own preview server on port 4185 and Playwright's bundled Chromium (headless, reduced motion). Local run by an agent on Windows 11 Home 10.0.26300, Node 24.19.0, on 2026-11-12; not CI or a human review.

- Result: 16 passed, 8 per edition (radix and base), on `/editions/ombelle/<edition>/?mode=light`.
- Before the fix, the missing-clipboard case failed in both editions: a second Copy click made no change to the status region, so "Copy failed" was not announced again. The cleared status and the failure were set in the same render, because no `await` ran when `navigator.clipboard` was missing. `CodeBlockCopy` now awaits a rejected promise in that case, as it does for a rejecting write; the change sits in the shared `code-block-parts` block, byte-identical in both editions, and moves the four stable-family `code-block.tsx` hashes.
- `foundation-browser-inventory.test.ts` and `foundation-groups.test.ts` pass (50 tests), so the default config's browser count is unchanged.

## Token contrast

Task 4 (`packages/catalog/test/code-block-contrast.test.ts`). The surface is `oklch(0.2 0.012 275)` in every family and both modes; ratios are WCAG 2 contrast on it, from `parseColor` and `contrastRatio` in `templates/color-picker.tsx`. The board's `color-mix(in oklab, var(--code-fg) N%, transparent)` values are written as the sRGB blend over the surface. Keyword and tag keep the family preset primary's hue at lightness `max(0.78, primary L)` and chroma `min(0.12, primary C)`, which gives the board's `oklch(0.78 0.12 6)` in Ombelle; flat and liquid glass are cut to chroma 0.11 to stay inside sRGB. No board colour failed its floor, so none was lightened.

| Property | Families | Value | Ratio |
| --- | --- | --- | --- |
| `--code-block-foreground` | all | `oklch(0.93 0.005 275)` | 14.74 |
| `--code-block-comment` (board 55 %) | all | `oklch(0.631 0.007 275)` | 5.19 |
| `--code-block-string` (board green) | all | `oklch(0.82 0.11 150)` | 10.81 |
| `--code-block-punct` (70 %) | all | `oklch(0.734 0.006 275)` | 7.68 |
| `--code-block-line-number` (board 40 %, floor 3:1) | all | `oklch(0.524 0.008 275)` | 3.34 |
| `--code-block-keyword` (board) | Ombelle | `oklch(0.78 0.12 6)` | 8.58 |
| `--code-block-keyword` | flat, liquid glass | `oklch(0.78 0.11 264)` | 8.99 |
| `--code-block-keyword` | minimalist | `oklch(0.78 0 0)` | 9.05 |
| `--code-block-keyword` | neo-brutalism | `oklch(0.88 0.12 92)` | 12.63 |
| `--code-block-attr` | Ombelle, flat, minimalist, liquid glass | `oklch(0.82 0.1 70)` | 10.22 |
| `--code-block-attr` | neo-brutalism (apart from its yellow keyword) | `oklch(0.8 0.1 350)` | 9.28 |
| `--code-block-property` | Ombelle, minimalist, neo-brutalism | `oklch(0.82 0.08 210)` | 10.66 |
| `--code-block-property` | flat, liquid glass (apart from their blue keyword) | `oklch(0.8 0.1 300)` | 9.41 |

## Liquid glass focus ring and rim

- The glass root sets `--foreground` to `--code-block-foreground`, so the family's 2px `--foreground` focus ring shows on the always-dark code surface (the light-mode glass foreground is `#0F172A`).
- The root clips its rounded corners (`overflow: hidden`, as on the board), so the code `pre` and the command tab panel draw that 2px ring at `outline-offset: -2px`, as Combobox and Command do in glass; the header tabs and Copy keep offset 0.
- The glass root draws the board's rim, `1.5px solid` white at 50 %, instead of the preset's 14 % `--border`, which vanishes on the dark surface. Forced colours still replace it with a 1px `CanvasText` border.
