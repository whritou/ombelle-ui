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

## Not done

- **Board comparison by computed styles.** The design asks for each family's computed styles to be compared with its `*09Shell` and `*09Data` boards. Each component's family CSS instead starts from the same family's existing styles for the look it borrows (Toolbar, Dropdown Menu, Sheet, Tooltip, Input, Table), which the boards were drawn from; the comparison itself was not run. Differences from the boards are therefore not recorded here.
- The Workspace preview scene is type-checked but was not opened in the preset editor.
