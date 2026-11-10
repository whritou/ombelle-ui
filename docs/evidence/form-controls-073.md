# Form controls evidence

Evidence for Slider, Toggle Group, Chip, Tag Input and Input OTP (0.7.3), and for the website editor's switch to them. Design: [form controls](../superpowers/specs/2026-11-10-form-controls-design.md).

All runs are local runs by an agent on Windows 11 Home 10.0.26300 with Node 24.19.0. None is a CI run or a human review.

## Website size

First-load JavaScript of the editor routes, measured by `node scripts/measure-www-first-load.mjs` after `pnpm run build` in `apps/www`. Next.js 16 no longer prints First Load JS, so the script sums the gzipped size (level 9) of every script a route's prerendered HTML loads. The limit for this work is 10 kB gzip of growth per route.

| Route | Branch start (`67d9fbb`) | Before the editor swap (`94e7949`) | After the editor swap | Swap |
| --- | --- | --- | --- | --- |
| `/editor/preset` | 13 scripts, 725.8 kB | 13 scripts, 738.5 kB | 14 scripts, 756.6 kB | +18.1 kB |
| `/editor/component` | 9 scripts, 235.8 kB | 9 scripts, 237.1 kB | 9 scripts, 237.1 kB | 0 |
| `/editor/component/button` | 13 scripts, 718.1 kB | 13 scripts, 730.2 kB | 14 scripts, 748.5 kB | +18.3 kB |

All sizes are gzip, level 9.

- **Catalog growth (about 12 kB):** the editor runs the compiler and catalog in the browser, so the five new components' templates and stylesheets add to every editor route that compiles recipes.
- **Editor swap (about 18 kB):** one new script of 18.5 kB holds the Radix Slider and Toggle Group runtimes, roving focus and the three compiled components. The inspector renders them at once, so deferring the script would not help.

The swap exceeded the 10 kB limit. The work stopped for review, and the user accepted the 18 kB on 10 November 2026, about 2.5% of each editor route.

## Specimen audit

`pnpm test:specimen-audit` measures all 40 catalog components in the five families, both editions and both colour modes, with Playwright's bundled Chromium.

| Run | Result |
| --- | --- |
| All 20 configurations, before the fixes | 4 passed (liquid glass); 16 failed, all on the new components |
| The 16 failing configurations and the audit self-tests, after the fixes | Radix and self-tests passed; the 8 Base UI configurations failed on Dropdown Menu items (caused by the first version of the wrapper-ring change below) |
| The 8 Base UI configurations and the self-tests, after correcting that change | 27 passed |

Findings and fixes:

- **Input OTP, Radix:** input-otp types into one transparent input laid over every slot, so a ring on the active slot alone did not mark the focused control, and in forced colours the input had no outline. The whole code is now ringed while that input has focus, in every family, with a `Highlight` outline in forced colours. The boards ring only the active slot.
- **Tag Input:** the field box draws the ring, and the input sits among the tags, beyond the 8 pixels the focus check measured around it. The check now measures a ring drawn on a `:focus-within` wrapper around that wrapper. The forced-colours check already accepted such rings, and a self-test shows that a wrapper with no ring still fails. Only text fields are probed this way: probing every control left a Base UI menu item highlighted after blur, which spoiled the unfocused screenshot.
- **Tag Input and Chip remove buttons:** in flat dark mode the ring was below 3:1 on the tag. The ring now takes the tag's text colour in every stable family.
- **Toggle Group, minimalist:** the 1px ring was too thin to measure. It is now 2px.
- **Input OTP, minimalist, Base UI:** an underline from 1px to 2px was not enough change. The slots now also draw a 1px ring.
- **Slider, minimalist, Base UI:** the range input (16 by 15 pixels) overflowed the thumb's 14-pixel content box. The thumb now draws its edge as an inset shadow.

Each fix is pinned in `packages/catalog/test/specimen-audit-fixes.test.ts`. The board-match fixes below changed corner radii after these runs; the final verification reruns the audit.

## Board comparison

A probe read computed styles from the board files (sections 01, 02, 07 and 14) and from the audit page specimens (Radix, light), for the track, range and thumb; the segmented bar and items; the code slots and dash; the filter chips; and the tag field, tags, remove buttons and input.

Fixed:

| Component | Family | Board | Before the fix |
| --- | --- | --- | --- |
| Tag Input, Chip | all | Round remove buttons | The family's corner radius |
| Slider | minimalist | 4px radius on the hairline track and range | Square |

Differences that remain:

| What | Board | Ours | Why it stays |
| --- | --- | --- | --- |
| Remove button size | 20px | 24px | Every target is at least 24px |
| Tag colour | Pale `--acc` (flat `#E3EBFD`, neo-brutalism `#A6F4FF`) | The preset's `accent` (flat yellow, neo-brutalism pink) | Preset colours, as in sub-project 2 |
| Neo-brutalism shadows | 3px offset | The preset's 4px shadow offset | Preset value |
| Input OTP focus | Ring on the active slot | Ring on the active slot, plus the whole code in the Radix edition | See the specimen audit |
| Liquid glass palette | Primary `#0B6AA8`, text `#102038` | The glass preset's `#1D4ED8` and `#0F172A` | Preset colours; liquid glass is experimental |

The probe also reported the board's Tag Input field in its focused state (border colour), 1px rounding on 1.5px-bordered ranges, a 6px icon gap on our toggle items, and font values on thumbs that hold no text. None is a visible difference in the default state.
