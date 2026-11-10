# Overlays and search evidence (0.7.3)

Combobox, Command, Hover Card and Context Menu. Spec: `docs/superpowers/specs/2026-11-10-overlays-search-design.md`.

## Website size

First-load JavaScript of the editor routes, measured by `node scripts/measure-www-first-load.mjs` after `pnpm run build` in `apps/www`. It is the sum of the gzipped size (level 9) of every script a route's prerendered HTML loads. The limit for this work's editor changes is 20 kB gzip of growth per route.

The branch starts at `84aca6c`. No `apps/www` or `scripts` file has changed since the last form-controls measurement (`834406c`), so that measurement is the baseline.

| Route | Branch start | Before the editor changes | After the editor changes | Editor changes |
| --- | --- | --- | --- | --- |
| `/editor/preset` | 14 scripts, 756.6 kB | 14 scripts, 778.1 kB | 17 scripts, 781.2 kB | +3.1 kB |
| `/editor/component` | 9 scripts, 237.1 kB | 9 scripts, 238.1 kB | 10 scripts, 238.5 kB | +0.4 kB |
| `/editor/component/button` | 14 scripts, 748.5 kB | 14 scripts, 769.4 kB | 17 scripts, 786.2 kB | +16.8 kB |

All sizes are gzip, level 9.

- **Catalog growth (about 21 kB):** the editor runs the compiler and catalog in the browser, so the four new components' templates and stylesheets add to every editor route that compiles recipes.
- **Editor changes (up to 16.8 kB):** the Combobox pickers (the Button icon and the glass preset) and the Commands button. The command palette and cmdk load on first open (`next/dynamic`), so they are not in these totals. The Button route carries the most because it shows both pickers.

The editor changes stay within the 20 kB limit.

## Specimen audit

`pnpm test:specimen-audit` measures each catalog specimen in the five families, both editions and both colour modes, with Playwright's bundled Chromium. This work audited only its four components (`OMBELLE_AUDIT_COMPONENTS=combobox,command,hover-card,context-menu`); the other 40 were not re-run, since nothing they render changed. A limited run writes its findings to `.artifacts/specimen-audit/partial/` and leaves `.artifacts/specimen-audit.json` as the last full run wrote it.

The overlays are opened by the audit: a click for Combobox, keyboard focus for Hover Card and a right-click for Context Menu. The inline Command needs nothing opened.

| Run | Result |
| --- | --- |
| First run | 20 configurations failed on the harness: the Combobox close check found the inline Command's list box |
| Second run | Radix configurations timed out finding the Hover Card and Context Menu triggers (compiled specimens prefix their slots with `recipe-`); Base UI configurations reported Combobox and Command options as unable to take focus |
| Third run, after the harness fixes | 20 of 20 configurations passed |
| After the board fixes below | 20 of 20 configurations passed; 10 liquid glass findings, listed below |

Harness changes:

- Options of a list box that a combobox controls (`aria-controls`) are not focus targets: the field keeps focus and points at the active option with `aria-activedescendant`.
- The overlay map takes an optional trigger and a `contextmenu` opening.

Liquid glass findings, recorded and not blocking (liquid glass is experimental):

- The Context Menu shortcut and destructive item text fall below 4.5:1 over the glass menu in both editions.
- The Combobox input and the Context Menu zone draw a focus ring with about 80% of the 3:1 pixels the audit asks for, as the other glass text fields already do.
- The Combobox field keeps its backdrop filter under forced colours.

## Board comparison

The four components were compared with sections 04, 06, 08 and 09 of each family's `project/<Family>073Components.dc.html`. Fixed to match, and pinned in `packages/catalog/test/specimen-audit-fixes.test.ts`:

| Part | Board | Before | Now |
| --- | --- | --- | --- |
| Matched text | Underlined in the primary colour, 2px; minimalist in the text colour, 1px | Underlined in the text colour | As the board |
| Create row | `accent-foreground`, weight 600; neo-brutalism the text colour, weight 800 | `primary`, weight 700 | As the board |
| Command | The family's large radius, as Popover | Dropdown Menu's radius | Popover's radius |
| Hover Card | 16px padding, 10px between rows | 18px and 12px, from Popover | As the board |
| Context Menu zone | Neo-brutalism 2.5px dashed border on the card colour; minimalist transparent; liquid glass white at 6% | The muted surface with the family border in every family | As the board |

Differences that remain:

| Part | Board | Ours | Reason |
| --- | --- | --- | --- |
| Command search row | 46px tall | 44px | Matches the Input height of each family, which this work does not change |
| Command shadow | 5px offset | The family's popover shadow (4px in Ombelle) | Preset shadow tokens, as in sub-project 2 |
| Hover Card avatar and handle | Styled circle and mono handle | Consumer markup | The card's content belongs to the consumer; the parts are the card, trigger and arrow |
| Fonts | Board display fonts | Preset fonts | Preset-level difference, as in sub-project 2 |
