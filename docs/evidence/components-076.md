# Components 0.7.6 evidence

Track 1 of the 0.7.6 work: Password Field, Carousel, Aspect Ratio and Toolbar, and the Form, Fieldset and Checkbox Group parts of Field and Checkbox. Design: `docs/superpowers/specs/2026-11-13-components-076-design.md`. Plan: `docs/superpowers/plans/2026-11-13-components-076.md`.

## Website size, before

Measured at `8a06cd5d` (branch `docs/specs-076`, same code as `main` at `0b4f3e10`) in a clean worktree, with Node 24.19.0 and pnpm 11.25.0 on Windows 11: `corepack pnpm run build` in `apps/www`, then `node scripts/measure-www-first-load.mjs`.

| Route | Scripts | Raw | Gzip |
| --- | --- | --- | --- |
| `/editor/preset` | 18 | 4294.1 kB | 907.9 kB |
| `/editor/component` | 10 | 815.0 kB | 241.8 kB |
| `/editor/component/button` | 18 | 4269.5 kB | 901.1 kB |
| `/docs` | 11 | 817.1 kB | 242.8 kB |
| `/docs/getting-started` | 12 | 837.1 kB | 250.0 kB |
| `/components` | 14 | 2628.9 kB | 469.1 kB |
| `/components/accordion` | 16 | 4172.0 kB | 867.3 kB |

## Website size, after

Measured at `cb25d34` with the same method, on 2026-11-13.

| Route | Before | After | Change | Within 10 kB |
| --- | --- | --- | --- | --- |
| `/editor/preset` | 907.9 kB | 935.2 kB | +27.3 kB | no |
| `/editor/component` | 241.8 kB | 242.6 kB | +0.8 kB | yes |
| `/editor/component/button` | 901.1 kB | 927.9 kB | +26.8 kB | no |
| `/docs` | 242.8 kB | 243.6 kB | +0.8 kB | yes |
| `/docs/getting-started` | 250.0 kB | 250.8 kB | +0.8 kB | yes |
| `/components` | 469.1 kB | 494.5 kB | +25.4 kB | no |
| `/components/accordion` | 867.3 kB | 893.8 kB | +26.5 kB | no |

Four routes exceed the limit. Comparing the scripts of `/components` in the two builds, the growth is the chunk that carries the catalog data (every component's template and stylesheet, both editions, five families): 200.2 kB to 224.2 kB gzip. The four components and the Field and Checkbox parts add that much catalog source. The editor top bar's Toolbar adds about 0.8 kB, the growth of `/docs`, which loads no catalog data. The project owner accepted the overrun on 13 November 2026: the website's bundle size, including loading component data on demand, will be addressed in a later optimisation of the whole site, not as a condition of this release.

## Browser tests

Playwright with its bundled Chromium, headless, reduced motion, Windows 11, Node 24.19.0 and pnpm 11.25.0 through corepack. Each run used a temporary config in the session scratchpad with its own preview server, so it never reused the other 0.7.6 track's servers.

| Check | Result |
| --- | --- |
| `tests/e2e/components-076.spec.ts`, both editions (preview on port 4186) | 36 passed (18 per edition), after the final review's fixes |
| Editor specs (`editor.spec.ts`, `preset-editor.spec.ts`, `editor-commands.spec.ts`; website on 3000, preview on 4173, no consumer servers) | The cases the Toolbar swap touches pass: Ctrl+K from the name field, the palette switching the family, the mobile workspace tabs, stale exports blocked in the menu, and the menu keyboard pattern with focus returning after "ID & revision". What still fails is the recorded baseline (consumer installs, the port 4180 consumer, dashboard axe contrast, the 0.5 radius, the 320 pixel reflow, the cold-server first test) and two cases that fail identically at the branch point `8a06cd5d` in a clean worktree: "Ctrl+K … choosing a component opens its editor" (it opens Alert Dialog) and "operates every Button editor control … by keyboard" (the padding number field's outline). |

Two things found on the way, both fixed: the first full editor run reported "Preview failed" because the packages were rebuilt after `generate:preview` (a stale preview manifest); and the editor's toolbar shrank beside the primary action and moved Commands into the menu, which led to measuring overflow on the real layout and keeping the editor's toolbar at full width.

## Specimen audit

`OMBELLE_AUDIT_COMPONENTS=password-field,carousel,aspect-ratio,toolbar,field,checkbox`, the audit spec with a scratchpad config on port 4187. The audit pages gained `field~form` and `checkbox~group` sections.

The first run passed ombelle, liquid glass and most of flat. It found, and these were fixed with a pinned declaration each in `specimen-audit-fixes.test.ts`:

| Finding | Fix |
| --- | --- |
| Minimalist: a focused invalid Field input showed the destructive border instead of the ring (an existing gap the Form specimen exposed) | The ring colour wins on a focused invalid input |
| Minimalist: Carousel dot ring 84 of 86 pixels | A 2px ring |
| Neo-brutalism dark: no ring on a grouped checkbox (the checked option recolours the outline for its filled background; grouped rows are transparent) | Grouped checkboxes keep the ring colour |
| Neo-brutalism: error summary links below 4.5:1 on the tinted summary | The links use the text colour |

The audit also exposed two crashes on the recipe pages, fixed before the run above: recipe scoping rewrites every `data-slot` literal, including selectors inside Toolbar and Carousel scripts, so they now select by marker attributes; and the Checkbox group specimen used Field's FieldSet, which a Checkbox recipe does not compile, so it draws a marked native fieldset.

## Board comparison

A probe (`board-compare-076.mjs` in the plan workspace) read computed styles of the board parts in `<Family>076Components.dc.html`, rendered from `file://` with web fonts unavailable, and of the audit specimens (`/audit/<family>/radix/?mode=light`). Fixed with pinned tests: ombelle frames take `--radius` (the board's 12px; they used `--radius` + 4px), flat frames draw a 1px border (flat controls are borderless; the board's frames are not), and the Carousel arrows are 34px.

| What | Board | Ours | Why it stays |
| --- | --- | --- | --- |
| Password input text and padding | 500 weight, 14px inset, square inner corners | Each family's Input Group input (400 weight, 12px inset; neo-brutalism 15px/600) | Password Field repeats the family's Input Group so the two read the same |
| Carousel arrow glyph | Text-sized controls (13px, family weight) | Icon buttons with a 16px chevron | The arrows hold an icon, not text |
| Neo-brutalism legend and group parent weight | 700 | 800, the family's label weight | Neo-brutalism labels are 800 everywhere |
| Liquid glass radii | 18–24px | 12–14px from the family's radius | Liquid glass is experimental; recorded, not blocking |
| Flat frame radius | 10–12px | 8px, the family's radius | Flat keeps one radius |
| Heights of a few pixels | Board fonts | Fallback fonts in the probe | Web fonts were not loaded on the board |

## Final review

A fresh reviewer read the whole branch. It found no critical issue and five important ones, each fixed with a browser case that failed first:

- Form checked only the Fields it found while rendering, so a Field inside a wrapper component, or a composite control whose constraint sits on a hidden input, submitted invalid data. Form now checks every named control through `form.elements`, and Fields register with it, so wrapped Fields also get summary links.
- The Toolbar's More menu showed a toggle's old pressed state after it was chosen from the menu. The menu now reads each item when it opens (and again after a choice in Base UI, whose checkbox item keeps the menu open).
- The last overflowed Toolbar item did not come back when it fitted without More. More now takes no room until something overflows. A first version of this fix left More hidden for a menu with its own items, caught by the editor tests and pinned by a new case.
- The Toolbar did not re-measure when items were added, removed or relabelled without a resize. It now also watches its own tree and text.
- The Base UI Checkbox dropped the caller's ref, and a Carousel with two or three slides per view never marked its last slide current. Both are fixed.

The reviewer's minor findings are deferred: server errors passed as a new object on every parent render reappear; the strength meter does not follow a value set without an input event; a password stays shown when the browser blocks a submit before the submit event; a Toolbar without ToolbarOverflow still hides items; an empty toggle group keeps its gaps; sanitised Form ids can collide; CarouselContent replaces the caller's ref; an invalid check pattern throws; and pressing a parent that is mixed only because of a disabled child clears instead of checking.

## Accessibility review

`docs/accessibility-review.md` has the checks for the 0.7.6 components and an empty results table. The manual screen reader pass has not been run.
