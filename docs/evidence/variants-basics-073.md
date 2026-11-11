# Variants, batch 6a, evidence (0.7.3)

The 0.7.3 variants of Button, Badge, Alert, Card, Avatar and Accordion. Spec: `docs/superpowers/specs/2026-11-10-variants-basics-design.md`.

## Specimen audit

The audit pages now hold one section per variant beside each component's default specimen, named `component~variant`, for example `badge~soft` or `card~options`. `scripts/generate-audit.ts` lists them:

| Component | Variant sections |
| --- | --- |
| Button | `link-destructive`, `loading` |
| Badge | `soft` (warning), `soft-success` (small, with a dot), `outline` (destructive) |
| Alert | `dismissible` (with actions), `compact` |
| Card | `link`, `options`, `media` |
| Avatar | `square`, `overflow` |
| Accordion | `flush` (plus icon), `chevron` |

The harness filters and counts by component, so `OMBELLE_AUDIT_COMPONENTS=button,badge,alert,card,avatar,accordion` measured the defaults and the 15 variant sections in five families, both editions and both colour modes, with Playwright's bundled Chromium. The other 39 components were not re-run, because nothing they render changed.

| Run | Result |
| --- | --- |
| First run | Every configuration stopped: two Accordion sections gave their focus markers the same keys. The harness now keys them by section |
| Second run | Three findings in the stable families. The Card link's ring is drawn on the card, but the harness looked for it on the link. The Alert Dismiss ring was below 3:1 on the dark intent surfaces. In neo-brutalism light, the destructive link text and the outline destructive Badge failed axe `color-contrast` |
| After the fixes, all 20 configurations | 18 of 20 passed. Neo-brutalism light, both editions, still had the two contrast findings: a 75 % mix measured 4.49:1 on `--background` |
| After a 65 % mix, neo-brutalism only | 4 of 4 passed. No blocking findings remain in any stable configuration |
| After the final review, Badge and Avatar only | 20 of 20 passed with no findings, liquid glass included. These runs add the outline success, warning and info Badge sections, and measure the Avatar fallback, which now shows at once without an image |

Fixes, pinned in tests:

- **Destructive text:** `link-destructive` and the outline destructive Badge mix the destructive colour with the foreground at 65 %, which measures 5.5:1 on neo-brutalism's `--background`. The contrast can only rise in the other families, which had already passed at 75 %. Test: `packages/catalog/test/specimen-audit-fixes.test.ts`, "the 0.7.3 batch 6a variants".
- **Alert Dismiss ring:** a 2px `currentColor` ring with a 1px gap, in the Alert's own text colour, which contrasts with every intent surface. Liquid glass keeps its 2px `foreground` ring. Same test file.
- **Card link focus:** the harness measures a link that draws no ring of its own around the nearest ancestor that does, as it already did for text fields inside Input Group. The ring stays on the card. Test: `tests/helpers/specimen-audit.ts` (the ring-owner probe).

**Liquid glass (experimental, non-blocking):** the four glass configurations pass. Their remaining findings are the Card link ring (615 of the 1,422 focus pixels needed) and the Card option rings (157 and 55 of the 543 needed). The glass card surface is translucent, so the 2px foreground ring partly falls below 3:1 against the backdrop.

**Final review fixes:**

- **Outline success, warning and info Badges:** they were unreadable in dark mode, at about 1.9:1. The intent tokens are light surfaces that no preset redefines for dark, so outline intents now write their text in `--foreground` and keep the intent on the edge. The audit now measures all three.
- **Avatar fallback:** it now waits 600 ms only beside an `AvatarImage`. An initials-only Avatar renders at once, server-rendered too, as before. The Base UI edition accepts `delay` again.
- **Loading Button:** it measures its resting width on every render at rest, and keeps at most its container's width.

## Browser tests

`tests/e2e/variants-basics.spec.ts` runs under `playwright.specimen-audit.config.ts`, as `calendar.spec.ts` does, and passes 12 of 12 in both editions. The loading test also covers a label that grows at rest:

- **CardGroup:** one Tab stop, the arrow keys to move and choose, the name and description of each option, the value submitted under `name`, and the focus ring on the option card.
- **Card link:** a click anywhere on the card follows the link, its own Share button keeps its click, and the keyboard ring is on the card.
- **Alert:** the Dismiss button removes the alert, and the scene moves focus to the next heading.
- **Button:** a loading Button never gets narrower, and its `min-inline-size` goes when loading ends.
- **Avatar:** a broken image shows its initials after the delay, a fast image never shows them, and the overflow count is named.
- **Accordion:** the plus accordion shows one icon, a minus while open.

The first run failed only on three test defects: a radio group name shared with another section, a click aimed at the description, which the stretched link intercepts by design, and a rounded pixel value.

## Board comparison

Sections 01–04, 11 and 13 of each family's `project/<Family>073Variants.dc.html`, against the audit screenshots:

| Part | Board | Ours |
| --- | --- | --- |
| Button link-destructive | Destructive text, underline 4px below, 4px inline padding | As the board, with the text mixed at 65 % with the foreground for contrast |
| Badge soft | Intent tint over the card, darker intent text | The Alert surface and text pairs for success, warning and info; the board's tint for default and destructive |
| Badge outline destructive | Transparent, destructive edge and text | As the board, with the text mixed at 65 % |
| Alert dismiss | A 28px round button, column 3, spanning two rows | 28px round, placed in the corner, with the end padding reserved |
| Alert compact | One line, 18px icon, 8px × 12px padding | As the board |
| Card link | Lifted 2px on hover | As the board, with no movement under reduced motion |
| Card selected | `primary` edge, 3px halo at 25 %, 22px check circle | As the board |
| Card media | 96px cover, no card padding at the top | As the board |
| Avatar square | Small radius | `calc(var(--radius) * 0.5)` |
| Avatar overflow | Muted surface, 10px overlap, 2px card ring | The family's own avatar box, overlap and ring, on `--muted` |
| Accordion flush | No border or background, a divider per item, no inline padding | As the board |
| Accordion icon | One chevron or one plus that becomes a minus | As the board |

The remaining differences: soft success, warning and info Badges are paler than the board, because the catalog's semantic tokens are light surfaces, not the board's saturated colours. The display fonts differ at the preset level, as in earlier sub-projects.

## Website size

Measured by `node scripts/measure-www-first-load.mjs` (gzip, level 9), with no limit set:

The editor routes reach the catalog through the in-browser compiler. The editor's own code changed only in the Button variant picker and its sample.

| Route | After sub-project 5 | Now | Growth |
| --- | --- | --- | --- |
| `/editor/preset` | 789.7 kB | 796.6 kB | +6.9 kB |
| `/editor/component` | 238.8 kB | 239.1 kB | +0.3 kB |
| `/editor/component/button` | 794.5 kB | 801.1 kB | +6.6 kB |
