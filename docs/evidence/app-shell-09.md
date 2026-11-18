# 0.9 app shell evidence

Evidence for the 0.9 app shell ([design](../superpowers/specs/2026-11-17-app-shell-09-design.md)). Track 1 adds Prose, Navigation Menu, Sidebar, Resizable, Menubar and Data Table to the catalog. Track 2 (the website rebuild) records its own section below when it lands.

## Environment

- Windows 11 Home 10.0.26300, Node 24.19.0, pnpm 11.25.0 through corepack.
- Browser checks ran in Microsoft Edge (`OMBELLE_BROWSER_CHANNEL=msedge`), not the bundled Chromium.
- Run on 17 and 18 November 2026, branch `feat/app-shell-09`.

## Dependencies pinned

| Package | Version | Why this version |
| --- | --- | --- |
| @radix-ui/react-navigation-menu | 1.4.1 | Current release, published 14 October 2026 |
| @radix-ui/react-menubar | 1.2.1 | Current release, published 14 October 2026 |
| react-resizable-panels | 4.17.0 | The newest release at least two weeks old; 4.24.0 was two days old |
| @tanstack/react-table | 9.3.1 | Current release, published 12 October 2026 |

Sidebar uses the Dialog, Tooltip and Collapsible primitives the catalog already pins; Data Table uses the pinned Dropdown Menu and Popover.

## Results

| Check | Result |
| --- | --- |
| `pnpm build:packages` (catalog style lint included) | Pass |
| `pnpm typecheck` | Pass |
| Unit tests, `packages` and `apps/www/src` | Pass, except `packages/cli/test/transaction.test.ts` "writes artifacts and final hashes, and rejects stale source", which fails because pnpm is reachable only through corepack on this machine ("Cannot locate a pnpm JavaScript entry"); it does not touch this work |
| Compiler: every new recipe in all eight families, deterministic, no shadowed names (`app-shell-09.test.ts`) | 54 pass |
| Stable hashes | Only entries for the six new components were added; no existing hash changed, Table's included |
| Browser tests, both editions (`tests/e2e/app-shell-09.spec.ts`) | 48 pass |
| Specimen audit, six components, eight families, both editions, light and dark (`OMBELLE_AUDIT_COMPONENTS`) | 33 pass, no findings |

### Audit findings fixed on the way

The first audit run reported findings in every opaque family. Each was fixed and re-run:

- Menubar triggers "could not take focus": the audit reached menu items with Up and Down, which in a menubar opens the menu. The audit helper now uses Left and Right inside `role="menubar"`.
- Prose h2 overflow: a line height of 1.1 to 1.2 let heavy heading glyphs rise 2px above the line box. Headings now use at least 1.3.
- Resizable focus ring clipped by the panel group: the ring is now drawn by a pseudo-element inside the handle's height; forced colors draw an outline on the handle itself.
- Sidebar rail overflowed the panel by 4px; it now sits inside the edge.
- Sidebar and Data Table focus rings below 3:1 on some fills: they ring in the element's text colour (ink in liquid glass), and the current Sidebar item has its own accent fill instead of the menu's highlighted look.
- Data Table checkbox rings cut by the container in Minimalist, whose first column had no start padding.

### Known failure outside this work

`code-block-075.spec.ts` "the code scrolls from the keyboard inside its height and the page does not" fails on the edition page: the 0.7.5 Breadcrumb fixture is 1131px wide at a 1100px viewport. No 0.9 element is wider than the viewport.

## The website on the 0.9 components

The site's own parts were rebuilt on the new components (`docs/superpowers/plans/2026-11-17-app-shell-09-site.md`):

| Part | Was | Now |
| --- | --- | --- |
| Docs and Components side navigation | A fixed list, a Dialog on phones | Sidebar, a sheet on phones with a "Documentation" or "Browse components" trigger |
| Guide text | `.prose-doc` styles | Prose |
| Header | A link row, a Dialog on phones | Navigation Menu with Docs and Components panels from 768px, a Sheet below |
| Desktop editors | A fixed grid | Resizable, with the layout saved per editor; one column below 1200px |
| Review drawer | A custom aside | Sidebar on the right, folding to an icon rail |
| Editor inspector | A fixed column | Sidebar on the left, folding to section icons |
| Editor top bar actions | The More actions menu | Menubar with File, Edit and View from 1200px; More actions below |
| Support matrix on the Components page | A static table | Data Table, loaded when the section opens; the static table stays as the server and no-JavaScript fallback |

The components directory is grouped by category, then alphabetical. The home page matrix is unchanged.

### Checks

| Check | Result |
| --- | --- |
| `pnpm typecheck` | Pass |
| `pnpm test:unit` | Pass |
| `pnpm test:integration` | Pass for this work after three tests were brought up to date (below). The rest of the failures are this machine: no Bun ("Cannot resolve a supported native bun executable"), pnpm only through corepack ("Cannot locate a pnpm JavaScript entry"), Windows `tar` in `packed-cli`, and the shared snapshot cache in `snapshot-journey` and `component-recipe-cli` |
| Site browser tests (`playwright.site.config.ts`: site shell, responsive editors, axe) | 69 pass |
| axe, at 1440 px with the header's Components panel open and at 375 px: `/`, `/docs`, `/docs/getting-started`, `/components`, `/components/data-table`, `/editor/preset`, `/editor/component/button` | 14 pass |

Integration tests brought up to date for the 0.9 components:

- `liquid-glass-cli`: the experimental glass list has 63 ids, the six new components included.
- `www-route`: the landing page's glass note says some components need a newer installer until CLI 0.9.0 is published.
- `audit-page-generation`: one generation now takes 131 s on this machine and the test runs two to check determinism, so its limit went from 240 s to 480 s.

`site-shell.spec.ts` runs only from `playwright.site.config.ts`; the main config ignores it, as it does the other site-only specs, so the foundation browser inventory is unchanged.

axe first reported two things, both fixed or scoped:

- The Components pages nested a `<main>` inside the Sidebar inset, which is the page's `<main>`; they now use a `<div>`.
- Radix Navigation Menu renders a hidden focus proxy (`aria-hidden`, `tabindex="0"`) after an open trigger to move Tab into the panel. axe reports it as `aria-hidden-focus`. The site check leaves out only that element.

### First Load JS

Measured with `scripts/measure-www-first-load.mjs` after `next build`, gzip, before the site work (at 82721017) and after:

| Route | Before | After | Change |
| --- | --- | --- | --- |
| `/` | 608.0 kB | 615.5 kB | +7.5 kB |
| `/editor/preset` | 1070.5 kB | 1107.9 kB | +37.4 kB |
| `/editor/component` | 245.0 kB | 255.0 kB | +10.0 kB |
| `/editor/component/button` | 1053.9 kB | 1091.6 kB | +37.7 kB |
| `/docs` | 246.0 kB | 270.2 kB | +24.2 kB |
| `/docs/getting-started` | 253.7 kB | 275.3 kB | +21.6 kB |
| `/components` | 607.0 kB | 622.5 kB | +15.5 kB |
| `/components/accordion` | 1016.1 kB | 1026.4 kB | +10.3 kB |

Six routes are over the 10 kB budget. The first measurement had `/docs` at +368 kB: the header's Components panel imported the whole component catalog to list names. It now reads a names-only map that a unit test keeps equal to the catalog. What remains is the shell itself, rendered on first paint: Sidebar (with its Tooltip, Dialog and Collapsible primitives) on the docs and component pages, and Resizable, two Sidebars and Menubar in the editors. Splitting them out would delay the page layout, so they were not split. The support matrix's Data Table is split and loads only when its section opens.

## Not done

- **Board comparison by computed styles.** The design asks for each family's computed styles to be compared with its `*09Shell` and `*09Data` boards. Each component's family CSS instead starts from the same family's existing styles for the look it borrows (Toolbar, Dropdown Menu, Sheet, Tooltip, Input, Table), which the boards were drawn from; the comparison itself was not run. Differences from the boards are therefore not recorded here.
- The Workspace preview scene is type-checked but was not opened in the preset editor.
