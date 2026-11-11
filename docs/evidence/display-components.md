# Display components evidence

Evidence for Spinner, Kbd, Empty, Field, Meter and Stepper (0.7.3): how each family's default appearance compares with the 0.7.3 design boards, and what the [specimen audit](specimen-audit.md) measured. Design: [display components](../superpowers/specs/2026-11-09-display-components-design.md).

All runs were local runs by an agent on Windows 11 Home 10.0.26300, with Node 24.19.0 and Playwright's bundled Chromium, headless at device scale factor 1. None is a CI run or a human review.

## Board comparison

The boards are the 0.7.3 sections of the design artifact, rendered locally. The board images are in [images/display-components](images/display-components/). Each was compared with the audit page specimen in the same family and light mode (Radix edition) in two ways:

- **Side by side:** board screenshot next to specimen screenshot.
- **Computed styles:** a probe reads font size, weight, letter case, colours, padding, borders, radius, shadow and size from matching elements on the board and on the specimen, and lists every property that differs.

Screenshots alone misled. Each board card is about 370px wide and shows several states, while the audit specimen is the recipe default at 640px. The board's Empty card is also drawn at a smaller scale; its computed sizes match ours.

### Differences found and fixed

| Component | Family | Board | Before the fix |
| --- | --- | --- | --- |
| Meter | all | Reading beside the label ("128 / 200"); a cell lights once reached, so 128 of 200 lights seven | No reading; rounded, so six lit |
| Meter | neo-brutalism | Uppercase label and reading, tracked | Mixed case |
| Stepper | all | Full width of its container | Shrank to its content in the preview, whose `nav` is a flex box |
| Stepper | all | Every title bold (700) | Normal weight; current step 600 |
| Stepper | all | A complete step keeps the line-coloured border | Primary border (yellow in neo-brutalism) |
| Stepper | flat | No borders on indicators | Bordered |
| Stepper, Spinner, Meter | ombelle | Light hairlines (12% ink on card) for connectors, the spinner track and empty cells | Full `border` colour |
| Empty | all | Secondary action, then primary | Primary first |
| Empty | neo-brutalism | Uppercase title, weight 900 | Mixed case, 800 |
| Empty, Field (recipe preview) | all | Actions and input look like the family's Button and Input | Unstyled native controls |
| Field (recipe preview) | flat | Filled input: muted fill, underline, square bottom corners | Outlined box |

Each fix is pinned in `packages/catalog/test/specimen-audit-fixes.test.ts` or the component's own test.

### Differences that remain

| What | Board | Ours | Why it stays |
| --- | --- | --- | --- |
| Fonts | Archivo headings, Hanken Grotesk body | The preset's font, `system-sans` in every built-in preset | Fonts belong to the preset, for all 35 components |
| Control size in the Empty and Field previews | 42px tall, 20px side padding | The catalog Button and Input: 36–44px, 16px padding | They copy the real Button and Input, which this work does not change (decision, 10 November 2026) |
| neo-brutalism Field preview input | No offset shadow | The neo-brutalism Input's 4px offset shadow | Same reason |
| Empty media in the recipe preview | Bag icon | A "+" glyph | The recipe has no icon dependency; real use passes its own icon |
| Liquid glass palette | Primary `rgb(11, 106, 168)`, text `rgb(16, 32, 56)` | The glass preset: primary `#1d4ed8`, text `#0f172a` | Preset colours; liquid glass is experimental |

Spinner sizes (16, 24 and 32px, 3px stroke) and Kbd match every board.

## Specimen audit

| Scope | Result |
| --- | --- |
| All 20 configurations, after the board fixes | 38 of 40 passed. `minimalist/radix/light` and `minimalist/base/light`: the Field preview input had no focus outline in forced colors |
| Both `minimalist/*/light`, after the forced-colors fix | Passed |
| The four flat configurations, after the flat Field input fix | Passed |
| All 20 configurations, after the Stepper, Empty and Meter weight and border fixes | 20 passed, no findings |

After the last run, the computed-style probe found no remaining difference in the fixed properties in any family. The differences it still lists are the ones in the table above.

The forced-colors finding was real: the minimalist focus style removes the outline and draws an underline, and forced colors drops the underline colour. Every family's Field preview input now draws a 2px `Highlight` outline in forced colors.

Field wiring (label, hint and required state reaching the control) is checked in a browser in both editions by `tests/e2e/display-components.spec.ts`.
