# 0.7.5 variants evidence

Sub-project 4 of 0.7.5: the board variants of Checkbox, Switch, Progress and Popover (batch 4a) and Dialog, Alert Dialog and Breadcrumb (batch 4b). Spec: `docs/superpowers/specs/2026-11-12-variants-075-design.md`. Plan: `docs/superpowers/plans/2026-11-12-variants-075.md`.

## Website size, before

Measured at `bfc78c2` (`docs: plan the 0.7.5 variants and record the planning rulings in the spec`), the base of this branch, which carries Code Block and its website changes.

Method: a temporary detached git worktree at `bfc78c2`; `corepack pnpm install --frozen-lockfile --ignore-scripts`, `corepack pnpm build:packages`, `corepack pnpm generate:preview`; `corepack pnpm run build` in `apps/www` (exit 0, Next.js 16.4.3 with Turbopack); then `node scripts/measure-www-first-load.mjs` (gzip level 9 of every script a route's prerendered HTML loads). Run on 2026-11-12 by an agent on Windows 11 Home 10.0.26300 with Node 24.19.0 and pnpm 11.25.0. The limit is 10 kB gzip of growth per route.

| Route | Scripts | First Load JS, gzip |
| --- | --- | --- |
| `/editor/preset` | 18 | 883.8 kB |
| `/editor/component` | 10 | 241.4 kB |
| `/editor/component/button` | 18 | 878.4 kB |
| `/docs` | 11 | 242.4 kB |
| `/docs/getting-started` | 12 | 249.6 kB |
| `/components` | 14 | 452.0 kB |
| `/components/accordion` | 16 | 849.9 kB |

The Code Block "after" table (`docs/evidence/code-block-075.md`) was measured at earlier commits; this sub-project compares against this table only.

## Website size, batch 4a

Measured after the batch 4a website change (the component editor's boolean fields as small Switches and its choice lists as `CheckboxOption` rows; Switch, Checkbox and Field compiled into the site): `corepack pnpm run build` in `apps/www` (exit 0), then `node scripts/measure-www-first-load.mjs`. Same machine, Node and pnpm, on 2026-11-12. The script prints one decimal, so each growth figure is within ±0.1 kB.

| Route | Scripts | Before, gzip | After batch 4a, gzip | Growth |
| --- | --- | --- | --- | --- |
| `/editor/preset` | 18 | 883.8 kB | 888.4 kB | +4.6 kB |
| `/editor/component` | 10 | 241.4 kB | 241.6 kB | +0.2 kB |
| `/editor/component/button` | 18 | 878.4 kB | 883.0 kB | +4.6 kB |
| `/docs` | 11 | 242.4 kB | 242.5 kB | +0.1 kB |
| `/docs/getting-started` | 12 | 249.6 kB | 249.8 kB | +0.2 kB |
| `/components` | 14 | 452.0 kB | 456.5 kB | +4.5 kB |
| `/components/accordion` | 16 | 849.9 kB | 854.5 kB | +4.6 kB |

Every route stays within the 10 kB limit.

## Batch 4a: Checkbox, Switch, Progress and Popover

Run on 2026-11-12 and 2026-11-13 by an agent on Windows 11 Home 10.0.26300 with Node 24.19.0, pnpm 11.25.0 (through corepack), Playwright 1.64.1 and its bundled Chromium, headless, reduced motion on. Local runs, not CI runs or a human review.

### Checks

| Check | Command | Result |
| --- | --- | --- |
| Build | `corepack pnpm build:packages`, then `corepack pnpm generate:preview` | Passed; the catalog style lint passed |
| Types | `corepack pnpm typecheck`; `tsc --noEmit -p apps/www` | Passed |
| Contracts and gate | `vitest run packages/contracts/test/component-recipe.test.ts apps/www/src/snapshots/install-compatibility.test.tsx` | Passed. The gate cases failed before the gate existed (8 of 12) |
| Catalog | `vitest run packages/catalog/test/{checkbox,switch,progress,popover}-variants.test.ts packages/catalog/test/specimen-audit-fixes.test.ts` | Passed |
| Compiler | `vitest run packages/compiler` | Passed, including `variants-075.test.ts`: every default recipe specimen of the seven 0.7.5 components, in all five families, equals the fixture recorded before any change (`variants-075-default-specimens.json`). Only the `checkbox`, `switch`, `progress` and `popover` stable-family hashes moved (32 entries) |
| Website units | `vitest run apps/www/src/editor apps/www/src/preset-editor/model.test.ts` | Passed |
| Variant browser tests, both editions | `playwright test -c playwright.specimen-audit.config.ts tests/e2e/variants-075.spec.ts` | Passed: Checkbox Option name, description and single toggle from the title, description, card padding and box, inside a form; disabled card; `sm` Switch hit area 24 × 24 px and Space; Progress named by its label with `aria-valuetext` equal to the readout; Popover arrow visible, `aria-hidden`, 10px ± 1 gap |
| Component editor end to end | `catalog-editors.spec.ts` with a temporary config serving only the website (port 3000) and the preview (port 4173) through corepack | 22 passed, 2 failed. The two failures are the consumer-install comparisons ("installed catalog recipes match the editor in vite" and "… in next"): npm reports `ETARGET` for the existing pin `@radix-ui/react-alert-dialog@1.2.1`, and the Vite consumer comparison fails. These need the prepared consumer apps, the recorded baseline in `primitives-075.md` and `editor-inputs-075.md`; they were not re-run at the branch point |

### Specimen audit

`OMBELLE_AUDIT_COMPONENTS=checkbox,switch,progress,popover corepack pnpm exec playwright test -c playwright.specimen-audit.config.ts tests/e2e/specimen-audit.spec.ts`, after `build:packages` and `generate:preview`.

| Run | Result |
| --- | --- |
| First run | 19 passed, 2 failed (8.7 min): neo-brutalism dark, both editions, "focus-visible: 0 focus pixels at 3:1" on the checked `checkbox~row` and `checkbox~card` |
| After the fix, the two failing configurations | 2 passed |
| After the Switch thumb fix, `OMBELLE_AUDIT_COMPONENTS=switch` | 21 passed |

Fixed: a checked neo-brutalism Checkbox Option is filled with `--secondary`, where the `--ring` outline fell under 3:1 in dark mode. Its checkbox now draws the ring in `--secondary-foreground`, as Radio Group options already do. Pinned in `specimen-audit-fixes.test.ts` "neo-brutalism draws the focus ring of a checked Checkbox Option in the option text colour".

### Board comparison

A probe (`board-compare.mjs` in the session workspace) read computed styles of the board elements in sections 01, 02, 03 and 06 of `<Family>08Variants.dc.html`, rendered from `file://` with web fonts unavailable, and of the audit specimens (`/audit/<family>/radix/?mode=light`, sections `checkbox~row`, `checkbox~card`, `switch~sm`, `switch`, `progress`, `progress~labelled`, `progress~destructive`). The Popover arrow was checked by screenshot on the edition pages, both editions (`docs/evidence/images/variants-075/popover-arrow-ombelle-*.png`). Board screenshots: `docs/evidence/images/variants-075/board-<family>-<section>.png`.

The five boards draw the same generic controls (a 46 × 26 switch, 12px bars, 22px checkboxes) in every family, not each family's own defaults; the specimens keep each family's defaults and apply the board's proportions to them.

Fixed:

| Part | Board | Before the fix | Test |
| --- | --- | --- | --- |
| Small Switch thumb | 13px in a 34 × 20 track | The thumb kept its default size when passed as a child (`<Switch size="sm"><SwitchThumb /></Switch>`, as the recipe specimen does): 19px in Ombelle, 21px in neo-brutalism | `switch-variants.test.ts` "sizes a thumb passed as a child" (both editions). The size now reaches the thumb through context. Measured after: 13, 12, 11, 15 and 14px thumbs in tracks of 34 × 20, 32 × 18, 32 × 18, 44 × 24 and 34 × 20 (Ombelle, flat, minimalist, neo-brutalism, liquid glass) |

Differences that remain:

| What | Board | Ours | Why it stays |
| --- | --- | --- | --- |
| Checkbox Option row | A bordered tile with a 22px box, 14px / 800 title, accent fill when checked (minimalist: a filled tile) | Each family's Radio Group option row: 24px box (26px neo-brutalism, 20px glass), 15px title at the family weight; minimalist rows are divided by a rule | The spec makes `CheckboxOption` mirror `RadioGroupOption`, so a form mixing both matches |
| Checked card | Accent fill and offset shadow (Ombelle) | `--primary` border and a 3px `--primary` halo at 25 % | The spec takes Card Option's checked treatment |
| Small Switch and Progress sizes | 34 × 20 switch; 6, 12 and 18px bars in every family | The board's ratios applied to each family's default (Progress `sm` and `lg` are half and one and a half times the default track; minimalist is 1, 2 and 4px) | Each family keeps its own default size |
| Progress readout colour | Foreground, 12px mono | 12px mono, inheriting the surrounding text colour | The glass Progress stylesheet must set no text colour (no contrast pair on glass); the header and readout inherit |
| Fonts | Hanken Grotesk, Archivo, JetBrains Mono | The preset's `--font-family` and `--font-mono` | The catalog ships no web fonts |

### Website

The component editor's boolean fields are small Switches in horizontal Field rows, and its choice lists (Accordion's expanded items, Table's numeric columns) are `CheckboxOption` rows. Size: see "Website size, batch 4a".

## Batch 4b: Dialog, Alert Dialog and Breadcrumb

Branch `feat/variants-dialogs-075`, stacked on batch 4a. Run on 2026-11-13 by an agent, same machine, Node, pnpm and Playwright as batch 4a. Local runs, not CI runs or a human review.

### Checks

| Check | Command | Result |
| --- | --- | --- |
| Build | `corepack pnpm build:packages`, then `corepack pnpm generate:preview` | Passed |
| Types | `corepack pnpm typecheck`; `tsc --noEmit -p apps/www` | Passed |
| Contracts and gate | `vitest run packages/contracts/test/component-recipe.test.ts apps/www/src/snapshots/install-compatibility.test.tsx` | Passed; the new cases failed first (12) |
| Catalog and compiler | `vitest run packages/catalog packages/compiler` | 2133 passed. `generated-types.test.ts` (it typechecks every Base UI component, the new Base Breadcrumb included) timed out at 60 s under the full run's load; alone with a 300 s timeout it passed 3 of 3 |
| Default specimens | `variants-075.test.ts` | Every default recipe specimen of the seven components, in all five families, still equals the fixture recorded before any change |
| Website units | `vitest run apps/www/src` | 633 passed |
| Variant browser tests, both editions | `playwright test -c playwright.specimen-audit.config.ts tests/e2e/variants-075.spec.ts` | Passed: Dialog footer on screen while the named body scrolls with Page Down, in all five families; a short body is no Tab stop until it overflows; `lg` fills a 375px screen with no radius and `default` does not; typed confirmation (focus in the field, near misses `ombelle-sit`, `Ombelle-site`, trailing and leading spaces, Enter on a mismatch, paste, Escape, empty on reopen); Breadcrumb at 320px folds into a "Show N more" menu whose links match the folded items in order, unfolds at 1280px, and measures again when the items change |

### Specimen audit

`OMBELLE_AUDIT_COMPONENTS=dialog,alert-dialog,breadcrumb corepack pnpm exec playwright test -c playwright.specimen-audit.config.ts tests/e2e/specimen-audit.spec.ts`, after the fixes below: 21 passed (11.8 min), all 20 family, edition and mode configurations plus the glass backdrop check. The audit variants are `dialog~lg-scrolling`, `dialog~fullscreen`, `alert-dialog~media` and `alert-dialog~destructive-confirm` (media only: the audit's drafts take props, and `confirmText` is content), and `breadcrumb~collapse`.

### Board comparison

A probe (`board-compare-4b.mjs` in the session workspace) read computed styles of board sections 04 (Dialog), 05 (Alert Dialog) and 07 (Breadcrumb) and of the edition-page fixtures opened in each family (Radix edition, 1280px; the Breadcrumb at 320px). Board screenshots: `docs/evidence/images/variants-075/board-<family>-{04,05,07}.png`.

These match: the icon tile is 40 × 40 in every family; the disabled action is at 50 % opacity; the typed-confirmation instruction sits above a field with the code in a muted pill; the "Show N more" menu repeats each family's Dropdown Menu (items 34 to 40px high).

Fixed: the Dialog column in neo-brutalism and liquid glass (see below).

Differences that remain:

| What | Board | Ours | Why it stays |
| --- | --- | --- | --- |
| Dialog frame, title and footer | One generic dialog (18px / 800 title, 6px offset shadow, footer on a white strip with an 18px inset) in every family | Each family's existing Dialog frame and title; the footer has no strip of its own and gains a top border only while the body overflows | The spec keeps every existing default; the border marks the scroll, as the spec asks |
| Ellipsis button | 28px circle | 32px round button | A larger target; it stays a circle |
| Destructive action colour | The confirm button is destructive on the board | The action keeps the family's Alert Dialog action colour | Alert Dialog has no destructive action variant; the consumer styles the action. The media tile carries the tone |
| Fonts | Hanken Grotesk, Archivo, JetBrains Mono | The preset's fonts | The catalog ships no web fonts |

### Defects found and fixed while testing

| Defect | Found by | Fix and test |
| --- | --- | --- |
| In neo-brutalism and liquid glass the dialog content is laid out as a block, so a `DialogBody` never scrolled and the footer was clipped below the screen | The batch 4b board probe (computed styles of the opened fixtures) | The 0.7.5 rule sets the column itself (`display: flex; flex-direction: column`). `dialog-variants.test.ts` failed in 5 families, then passed; the browser test "a scrolling Dialog body keeps the footer on screen in every family" passes in both editions |
| Recipe scoping renames `data-slot="breadcrumb-item"` inside the Breadcrumb's own `querySelectorAll` strings, so a recipe-compiled Breadcrumb threw and the audit pages did not render | `editors-glass.spec.ts` (the glass audit page never became ready) | The collapse finds items and separators by structure (separators are `role="presentation"`, the ellipsis item carries `data-breadcrumb-overflow`). `breadcrumb-variants.test.ts` "queries its parts without slot names" failed for both templates, then passed; the audit page renders again |
| The DialogBody's name was missing: Radix sets the dialog's `aria-labelledby` after the body's first effect | The browser test of the body's name | The body reads the label on every measure |
| The Breadcrumb menu read `--radix-dropdown-menu-content-available-height` with no fallback; the site does not load the Dropdown Menu stylesheet | `generated-ui.test.ts` | The copied rule falls back to `70vh` |

### Website

- The editor top bar's trail is a `Breadcrumb collapse="auto"` (Components is a link to `/editor/component`).
- The Get code dialog is a `Dialog` with `DialogContent size="lg"`, a `DialogBody` and the Copy command in a `DialogFooter`. It returns focus to the button that opened it unless an action (Show changes) moved focus on purpose.
- The preset editor's ID & revision dialog is a `Dialog` with a body and a Done footer. The family change and token reset confirmations are `AlertDialog`s with `AlertDialogMedia` (destructive for the reset), keeping the Collapsible list of changed values; Cancel has initial focus. Replacing saved recovery data asks with a destructive `AlertDialog` instead of `window.confirm`.
- The site does not load family stylesheets, and Dialog has no stylesheet of its own, so `apps/www/src/app/globals.css` carries the Ombelle family's Dialog rules (including the 0.7.5 block) between `/* catalog dialog */` markers; `generated-ui.test.ts` checks that the file parses and holds them.
- `@radix-ui/react-alert-dialog` 1.2.1 and `@radix-ui/react-dropdown-menu` 2.2.1 were added to `apps/www`.

Editors end to end (`editor.spec.ts`, `preset-editor.spec.ts`, `catalog-editors.spec.ts`, `recipe-snapshots.spec.ts`, `editors-glass.spec.ts`, `editors-matrix.spec.ts`, and `liquid-glass.spec.ts` "preset editor glass flow" and "bounded contrast"), with the temporary website and preview config:
- Fixed during the swap: the Get code dialog lost its name when its title took a fixed `id`; focus did not return to Get code; the top bar trail kept the site's list margin and indent, which made the bar wrap to two rows and cover the preview frame's dialog; the gallery Dialog grew with a footer (the footer was removed from the gallery); `editors-matrix.spec.ts` scanned `include('dialog')`, the old native element, now `[role="dialog"]`; `preset-editor.spec.ts` read the ID field of the closed native dialog, and now opens the ID & revision dialog first. No test was added or removed in a counted spec, so the 686 browser cases are unchanged.
- What still fails is the recorded baseline: the consumer installs (consumer apps not served; npm `ETARGET` for the existing pin `@radix-ui/react-alert-dialog@1.2.1`), "opens on the dashboard …" (axe `color-contrast`, 4), "restores raw draft …" and "edits numeric design values …" (the 0.5 radius), and "supports keyboard editing and 320 pixel reflow" and the glass flow (axe `label-content-name-mismatch` and `scrollable-region-focusable` on the gallery Date Picker trigger and the Projects table, the same nodes as in `code-block-075.md`).

## Website size, batch 4b: over the limit, accepted

Measured after the batch 4b website changes, with the same method (`corepack pnpm run build` in `apps/www`, exit 0, then `node scripts/measure-www-first-load.mjs`), on 2026-11-13.

| Route | Scripts | Before, gzip | After batch 4a | After batch 4b | Growth from before |
| --- | --- | --- | --- | --- | --- |
| `/editor/preset` | 18 | 883.8 kB | 888.4 kB | 907.1 kB | **+23.3 kB, over the limit, accepted** |
| `/editor/component` | 10 | 241.4 kB | 241.6 kB | 241.8 kB | +0.4 kB |
| `/editor/component/button` | 18 | 878.4 kB | 883.0 kB | 900.2 kB | **+21.8 kB, over the limit, accepted** |
| `/docs` | 11 | 242.4 kB | 242.5 kB | 242.8 kB | +0.4 kB |
| `/docs/getting-started` | 12 | 249.6 kB | 249.8 kB | 250.0 kB | +0.4 kB |
| `/components` | 14 | 452.0 kB | 456.5 kB | 468.4 kB | **+16.4 kB, over the limit, accepted** |
| `/components/accordion` | 16 | 849.9 kB | 854.5 kB | 866.6 kB | **+16.7 kB, over the limit, accepted** |

Where it comes from, read from the build's chunks: the shared chunk holding the catalog source (templates and stylesheets, which these routes ship to compile recipes) grew with the new templates and styles, the two Breadcrumb templates and their menu styles most; and the editor routes now load Radix Dropdown Menu (a chunk of about 22 kB gzip, partly shared with the Popover code they already load) through the top bar's Breadcrumb. The maintainer accepted this overrun on 2026-11-13, keeping the collapsing Breadcrumb in the top bar.

## Final review

A fresh reviewer read the whole range (`bfc78c2` to the batch 4b head) against the spec, the plan and its Review Focus, and ran the focused catalog tests. Fixed, each with a test that failed first:

| Finding | Fix and test |
| --- | --- |
| Critical: the typed confirmation survived a close, so reopening showed the old text with the action enabled. The confirmation state lives in the `AlertDialogContent` wrapper, which stays mounted when the primitive content closes; the browser test reopened through a page reload, so it missed this | The confirm input clears the text when it unmounts with the closed content. The browser test now reopens on the same page after Escape and after Cancel (both editions) |
| Important: a Radix Progress above its maximum was announced as indeterminate while its readout said 100% (Radix drops a value above `max`) | The Radix template clamps the value to `0`..`max`, as the readout and Base UI do. `progress-variants.test.ts` "is a complete bar whose value and readout agree" (on batch 4a too) |
| Important: Breadcrumb widths were measured once per text, so a web font that loads after mount left them stale and the trail overflowed | The trail is measured whenever it is fully shown, the items' own size is observed, and loaded fonts trigger a measure from the full trail. The browser test "measures again when its text grows after mount" (both editions) |

Deferred minor findings: the overflow menu lists only folded items that have links; Popover and Progress find their parts among direct children only; a user `id` on `ProgressLabel` breaks the bar's name; the preset editor's confirmation text blanks during the close animation; `DialogBody` does not watch text-node changes. After the fixes: `vitest run packages/catalog packages/compiler` 2155 passed, the whole `variants-075.spec.ts` 30 passed, `corepack pnpm typecheck` passed.
