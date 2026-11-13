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
