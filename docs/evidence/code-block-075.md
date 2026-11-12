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

Measured again at `6195b68` (`fix(catalog): match Code Block to the boards`), which changed the template by about 300 bytes after the `84e3c69` measurement: `corepack pnpm build:packages`, `corepack pnpm generate:preview`, `corepack pnpm run build` in `apps/www` (exit 0), then `node scripts/measure-www-first-load.mjs`. Same machine, Node and pnpm, on 2026-11-12. The `6195b68` column is from this run.

Measured a third time at `8ae6891` (the final-review fix wave: `23c754e` changed the Code Block template and stylesheets, `8ae6891` the Get code dialog), with the same steps on the same machine, on 2026-11-12. The "After" and "Growth" columns are from this run; the earlier columns are kept for comparison. The script prints one decimal, so each growth figure is within ±0.1 kB.

| Route | Scripts | Before, gzip | `02fb028`, gzip | `84e3c69`, gzip | `6195b68`, gzip | After (`8ae6891`), gzip | Growth |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `/editor/preset` | 18 | 871.8 kB | 880.7 kB | 880.7 kB | 880.8 kB | 881.2 kB | +9.4 kB |
| `/editor/component` | 10 | 241.1 kB | 241.4 kB | 241.4 kB | 241.4 kB | 241.4 kB | +0.3 kB |
| `/editor/component/button` | 18 | 864.9 kB | 873.5 kB | 875.2 kB | 875.3 kB | 875.8 kB | **+10.9 kB, over the limit** |
| `/docs` | 11 | 242.1 kB | 242.3 kB | 242.3 kB | 242.3 kB | 242.3 kB | +0.2 kB |
| `/docs/getting-started` | 12 | 249.2 kB | 249.4 kB | 249.5 kB | 249.5 kB | 249.6 kB | +0.4 kB |
| `/components` | 14 | 440.5 kB | 449.2 kB | 449.2 kB | 449.4 kB | 449.8 kB | +9.3 kB |
| `/components/accordion` | 15 / 16 | 837.3 kB | 846.2 kB | 847.1 kB | 847.3 kB | 847.7 kB | **+10.4 kB, over the limit** |

### Accepted overages, pending confirmation: `/editor/component/button` and `/components/accordion`

`/editor/component/button` grows by 10.9 kB gzip at `8ae6891` (10.4 kB at `6195b68`, 10.3 kB at `84e3c69`), over the 10 kB limit. The overage is accepted by the implementation controller, pending the user's confirmation; it is not resolved in this sub-project.

`/components/accordion` grows by 10.4 kB at `8ae6891` (10.0 kB at `6195b68`, 9.9 kB at `84e3c69`), over the limit. It is recorded here with the same cause: the Code Block template source the catalog routes ship, which `6195b68` grew by about 300 bytes (`role="region"` on the code `pre` and the keyword span around the command runner, in both editions, plus their stylesheet rules). This overage too is accepted by the implementation controller, pending the user's confirmation, with the button route's.

The final-review fixes (`23c754e`) add about 0.4 to 0.5 kB on the four catalog routes: the line-count helper, the gutter custom property, the CRLF handling and the Copied reset in the template's shared block (both editions), and the alt-text and gutter declarations in the five stylesheets. A first build with longer comments measured 0.3 kB more; the comments were shortened before this measurement.

- Most of the growth on the four catalog routes came before the website swaps: +8.6 to +8.9 kB at `02fb028`, from the Code Block template source and recipe description the site ships in the catalog. At `8ae6891` those routes are at +9.4 (`/editor/preset`), +10.9 (`/editor/component/button`), +9.3 (`/components`) and +10.4 kB (`/components/accordion`).
- Measured at `84e3c69`, the swaps add about 1.7 kB on the button route (873.5 to 875.2 kB). The generated `code-block` module is one file, so the artifact panel's `CodeBlockRoot`, `CodeBlockCopy` and `CodeBlockCode` bring along the Radix Tabs that only `CodeBlockCommand` uses. The deleted site code block, highlighter and Get code terminal offset part of it.
- The Get code dialog loads `CodeBlockCommand` with a dynamic `import()`, requested when the dialog opens, so it downloads while the code publishes. Measured at `84e3c69`, that kept `/editor/preset` at +8.9 kB (a static import gave +11.0 kB; +9.0 kB at `6195b68`). On the button route the panel already loads the module, so the loader only added about 0.3 kB at `84e3c69` (the static import gave +10.0 kB there).
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

## Specimen audit

`OMBELLE_AUDIT_COMPONENTS=code-block corepack pnpm exec playwright test -c playwright.specimen-audit.config.ts specimen-audit.spec.ts`, after `corepack pnpm build:packages` and `corepack pnpm generate:preview`. The config ran its own preview server on port 4185 and used Playwright's bundled Chromium (headless, reduced motion). The audit specimen is the titled file block (`button.tsx`, three lines, line numbers on). Local run by an agent on Windows 11 Home 10.0.26300 with Node 24.19.0, on 2026-11-12; not a CI run or a human review.

| Run | Result |
| --- | --- |
| First run, before any fix | 21 passed (1.8 min): all 20 configurations (five families × Radix and Base UI × light and dark) and the backdrop check. No measured finding: focus, clipping, overflow, label spacing, target size, forced colours and axe (colour contrast of the token spans included). |
| After the fixes below, with `code-block-075.spec.ts` | 37 passed (2.5 min): the same 21, plus Task 6's 16 browser cases |

The audit fails only on axe violations. A separate axe run on the same section, with the audit's tags, also listed what axe could not decide. Before the fix it returned `aria-prohibited-attr` as "needs review" on the scrollable `pre`, in both editions: the `pre` has no role (generic), and ARIA 1.2 prohibits naming a generic element, so a screen reader may not read "button.tsx source".

- **Fix:** `CodeBlockCode` gives the focusable `pre` `role="region"`, in both editions. The name stays "<title> source", or "Code" without a title, and `aria-labelledby` still replaces `aria-label`. A `role` prop passed by the consumer still wins, because it is spread after the default.
- **Result:** after the fix, `aria-prohibited-attr` passes on the `pre` in both editions, with no violation and nothing left for review.
- **Tests:** the three naming tests in `packages/catalog/test/code-block.test.ts` now also expect `role="region"`. They failed before the change in both editions (6 cases).
- **Hashes:** the four stable-family `code-block.tsx` hashes moved.

## Board comparison

A probe read computed styles in section 03 of each board (`<Family>08Components.dc.html`, rendered from `file://`, with web fonts and the board's support script blocked) and in the Code Block fixtures on the edition pages (`/editions/<family>/<edition>/?mode=light`, the Code Block section: the command block, then the `release.tsx` file block). Both editions were probed at device scale 1 and 2. Colours were resolved to sRGB through a canvas. The probe covered:
- the frame: border, radius, shadow, surface and text colour, font;
- the bar: padding, gap and bottom rule;
- the unselected and selected tab, the title pill and Copy: height, padding, border, radius, colour, fill and font;
- the command and code `pre`: padding and font;
- the keyword, string and comment tokens, and the line numbers.

This Chromium floors computed border widths to whole pixels (1.5px reads as 1px, 2.5px as 2px), so border widths were compared through the declared values (`--border-width` and the literal widths in the stylesheets) instead. The board screenshots are in `docs/evidence/images/code-block-075/board-<family>-03.png`. Run on 2026-11-12 by an agent, same machine as above; not a human review.

These match the board in every family and in both editions:

| Part | Ombelle | Flat | Minimalist | Neo-brutalism | Liquid glass |
| --- | --- | --- | --- | --- | --- |
| Frame border | 1.5px `--line` | none | 1px `--bd` (`#E5E5E1`) | 2.5px `#111` | 1.5px white at 50 % |
| Frame radius | 16px | 12px | 4px | 0 | 16px |
| Frame shadow | `4px 4px 0` ink | the `--sho` pair | `0 12px 28px -16px` at 22 % | `6px 6px 0 #111` | none (the board's is transparent) |

The other parts are the same in all five families:
- surface `oklch(0.2 0.012 275)` and text `oklch(0.93 0.005 275)`;
- bar padding `6px 6px 6px 10px`, gap 4px, and a 1px bottom rule at 18 %;
- tab, title and Copy: 28px high, `0 10px` padding, 999px radius, weight 600, 12px;
- unselected tab at 70 %, and the selected tab and title filled at 16 %;
- Copy with a 1.5px border at 35 %;
- code: `14px 16px` padding, `400 13px / 1.6`, and the string token `oklch(0.82 0.11 150)`.

Fixed in this task:

| Part | Family | Board | Before the fix | Test |
| --- | --- | --- | --- | --- |
| Command runner (`pnpm dlx`, `npx`, …) | all | In the keyword colour (`.p`) | Plain foreground | `code-block.test.ts` "renders a command block…" and "…takes custom runners" (the runner is a `data-token="keyword"` span); `specimen-audit-fixes.test.ts` "colours the command runner as a keyword, as the board does" |

`CodeBlockCommand` now renders `<span data-token="keyword">{runner}</span>` and then the arguments, with the same text content as before (copy and `toHaveText` are unchanged). Each family stylesheet colours `[data-slot='code-block-command'] [data-token='keyword']` with `--code-block-keyword`, which is at least 8.58:1 on the surface (Task 4), and forced colours turn it into `CanvasText`. An axe run of the edition pages' Code Block section found no violation and nothing left for review, in every family, both editions and both modes. The stable-family `code-block.tsx` and `code-block.css` hashes moved.

Differences that remain:

| What | Board | Ours | Why it stays |
| --- | --- | --- | --- |
| Fonts | JetBrains Mono for pills and code; Hanken Grotesk for Copy, in every family | The preset's `--font-mono` (a system monospace stack) and `--font-family` | The catalog ships no web fonts; the preset sets the family. Copy uses the sans font and the rest the mono font, as on the board |
| Pill widths | Copy 52px, `button.tsx` 86px | Copy 50px, `button.tsx` 92.6px | Font metrics of the fallback fonts; heights and padding match |
| Keyword colour | Ombelle's `oklch(0.78 0.12 6)` on all five boards | Each family's primary hue (flat and liquid glass blue, minimalist grey, neo-brutalism yellow) | Task 4 decision: keyword and tag follow the family primary |
| Comment and line-number colours | `color-mix` of the code foreground at 55 % and 40 % over the surface | Opaque `oklch` values | The same colour once blended on the surface (sRGB 136, 137, 142 for comments and 104, 106, 111 for line numbers, both ways, within rounding); token colours are literal per family |
| Line-number column | `inline-block`, 22px wide | A CSS counter, `min-inline-size: max(2ch, var(--code-block-gutter, 2ch))` plus a `1ch` gap (22.1px at 13px) | Same offset for files under 100 lines; from 100 lines the column is `--code-block-gutter` wide (the last number's digit count, set by `CodeBlockCode`), so every line's code still starts at the same x |
| Pill line height | `normal` | `1` (title `28px`) | Height (28px) and vertical centring are the same |
| Liquid glass text shadow | The scene's `0 1px 2px` dark text shadow is inherited by the code | None | Barely visible on the dark surface; experimental family |
| Dark mode | Boards are light only | Same surface in both modes; the frame border and shadow follow the preset's dark tokens (for example, Ombelle: border at 80 % white, pink offset shadow) | The audit measured both modes |
| Frame and code size | Three-line sample | The fixtures' longer sources, inside `maxHeight` | Board content |

The board probe covered light mode only. The specimen audit and the axe runs covered dark mode and both editions.

The board-comparison probe and the separate axe scripts (the "needs review" run in the specimen audit section and the edition-page Code Block run above) lived in the session scratchpad and are not committed; only their results are recorded here. The committed checks are the specimen audit, `code-block-075.spec.ts` and the unit tests.

### Landmark names

Every Code Block's code `pre` is a named `region` landmark ("<title> source", or "Code" without a title). Several untitled blocks on one page therefore share the name "Code". axe's `landmark-unique` rule, which reports this, is a best practice and is not in the WCAG-tag runs above, so those runs would not show it. The component page advises passing a `title` (or `label`) to each block.

## Checks after the board fixes (`6195b68`)

`6195b68` changed the template markup (`role="region"` on the code `pre`, the runner as a keyword span) after the website e2e above, so the website tests that read that markup were run again. Run on 2026-11-12 by an agent on Windows 11 Home 10.0.26300 with Node 24.19.0 and pnpm 11.25.0, after `corepack pnpm build:packages`, `corepack pnpm generate:preview` and `corepack pnpm run build` in `apps/www`; ports 3000, 4173 and 4185 were free (`netstat -ano`) before each run. Not CI or a human review.

- **Website e2e, `editor.spec.ts`:** the temporary config described under "Website e2e" (website on 3000 and preview on 4173 through corepack, no consumer servers, bundled Chromium, headless, reduced motion, the main checkout's `.artifacts/consumers.json` copied in and removed afterwards), with `-g` selecting four tests: "artifact tabs support copy…", "operates every Button editor control, artifact tab, download and publish dialog by keyboard", "the component page hydrates its server-rendered Code Block and install tabs without a hydration error" and "the Get code dialog scrolls its long command…". Result: 4 passed (1.6 min).
- **Browser behaviour:** `corepack pnpm exec playwright test -c playwright.specimen-audit.config.ts tests/e2e/code-block-075.spec.ts` (its own preview server on 4185). Result: 16 passed (47 s), 8 per edition.
- **Integration:** `corepack pnpm exec vitest run --config vitest.integration.config.ts tests/integration/liquid-glass-cli.test.ts tests/integration/www-route.test.ts`. The first run failed 2 of 26, both in `www-route.test.ts` ("lists the catalog and offers install commands…" and "offers the lab glass presets … installs Select…"): they looked for `pnpm dlx @ombelle-ui/cli@0.7.4 add <id>` in the server HTML, which `6195b68` splits into `<span data-token="keyword">pnpm dlx</span> @ombelle-ui/cli@0.7.4 add <id>`. The two tests now read the command from the HTML's text, with the tags removed. After that, `www-route.test.ts` passed 9 of 9; `liquid-glass-cli.test.ts` passed 17 of 17 in the first run, with `number-input`, `color-picker` and `code-block` added to its id list and install order.
- **Types:** `corepack pnpm typecheck`, exit 0, before and after the test change.

## Final-review fixes (`23c754e`, `8ae6891`)

Run on 2026-11-12 by an agent on Windows 11 Home 10.0.26300 with Node 24.19.0 and pnpm 11.25.0; ports 3000, 4173 and 4185 were free (`netstat -ano`) before each browser run. Not CI or a human review.

- **Line numbers in the accessibility tree.** Chromium exposed each `::before` counter as StaticText ("1", "2", …) inside the code region. The five stylesheets now declare `content: counter(code-block-line)` and then `content: counter(code-block-line) / ''` (empty alt text; the first declaration is the fallback). `code-block-075.spec.ts` "line numbers stay out of the accessible text" reads the full AX tree over CDP and checks the `pre` region's StaticText holds no bare number and starts with the source's first line. Failed before the fix in both editions (32 numeric StaticText nodes), passes after.
- **Gutter from line 100.** The `::before` was `min-inline-size: 2ch` per line, so line 100's code started 1ch (7.2 px) right of line 1's. `CodeBlockCode` sets `--code-block-gutter` to the digit count of its line count, and the stylesheets read `min-inline-size: max(2ch, var(--code-block-gutter, 2ch))`, so short files keep the board's 2ch. New fixture `code-block-long` (`lines.ts`, 120 lines) on the edition pages; "line 100 starts its code where line 1 does" compares lines 1, 9, 100 and 120 (failed by 7.17 px before, passes after). Unit test "sizes the line-number gutter from the line count" (1, 2, 3 and 4 digits).
- **CRLF source.** `highlightCode` left `\r` at each line end, so `renderToString` emitted `a\r<!-- -->\n` and the HTML parser drew a blank line after every line. It now strips the `\r` before highlighting and emits the ending (`\r\n` or `\n`) as one text node; the text still equals the source. Unit test "server-renders CRLF source with one line break per line and no lone carriage return" (every language, four CRLF samples) failed before and passes after; the text-equality tests still pass.
- **Copied across a content change.** `CodeBlockCopy` resets "Copied" and its status when `text` changes. "Copied resets when the copied content changes" (copy pnpm, switch to npm under a paused clock) failed before in both editions and passes after.
- **Get code while publishing.** `editor.spec.ts` "the Get code dialog scrolls its long command…" now holds `/api/v1/recipes`, checks `get-code-command` shows "Generating" with no "Package manager" tab list, then, with `ombelle:get-code:manager` = `yarn` saved before opening, checks the yarn tab is selected once the command is ready (the 320 px checks now read the yarn panel). No test was added, so `browserSpecCounts` is unchanged.
- **Minor:** the Get code fallback `pre` is `role="region"` named "Install command"; the specimen-audit config gains its missing space; `packages/compiler/test/code-block-075.test.ts` checks the scoped primitives return `highlightCode` (with `packageCommand`, `commandRunners` and the parts) and keep no `export type {…}`.
- **Hashes:** `scripts/record-stable-hashes.ts` moved only the eight stable-family `code-block.tsx` and `code-block.css` entries.

| Check | Command | Result |
| --- | --- | --- |
| Catalog and compiler units | `corepack pnpm exec vitest run packages/catalog packages/compiler/test/code-block-075.test.ts packages/compiler/test/stable-families.test.ts` | 72 files, 974 tests passed |
| Types | `corepack pnpm typecheck` | exit 0 |
| Code Block browser cases | `corepack pnpm exec playwright test -c playwright.specimen-audit.config.ts tests/e2e/code-block-075.spec.ts` | 22 passed (11 per edition), on the final template |
| Website e2e | temporary config (website on 3000 and preview on 4173 through corepack, no consumer servers, the main checkout's `.artifacts/consumers.json` copied in and removed afterwards), `editor.spec.ts` with `-g` "Get code dialog scrolls", "hydrates its server-rendered Code Block" and "artifact tabs support copy" | 3 passed (47.5 s) |
| Website size | `corepack pnpm run build` in `apps/www`, then `node scripts/measure-www-first-load.mjs` | see "Website size, after" |

The website e2e ran before the template comments were shortened and the CRLF ending was written more compactly; the rendered markup is the same, and the unit tests and `code-block-075.spec.ts` ran again on the final template. The Get code fallback `pre` appears only while the command block's chunk loads, so no browser test reaches it.

### Suites not run

The spec lists the full `pnpm test:unit` and `pnpm test:integration`. Per the user's instruction to run only the tests a change affects, they were not run in this task. The focused suites earlier tasks ran are recorded in their sections and commits; this task ran only the commands above. The full `pnpm check:foundation` gate and `pnpm test:specimen-audit` for every component were not run either.
