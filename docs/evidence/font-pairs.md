# Font pairs evidence

Date: 2026-11-14. Branch `feat/font-pairs`, cut from `feat/components-076`. Design: [font pairs design](../internal/superpowers/specs/2026-11-14-font-pairs-design.md). Plan: [font pairs plan](../internal/superpowers/plans/2026-11-14-font-pairs.md). This records what ran, what passed, and what did not run.

## Environment

- Windows 11 Home, Node 24.19.0, npm 11.19.0, pnpm 11.25.0 (through Corepack, and a scratch install put on `PATH` for the CLI tests), Yarn Classic 1.22.22 and Bun 1.4.4 (through `npx`, spike only).
- Browser: the Chromium headless shell bundled with Playwright 1.64.1 (build 1248). No other browser or channel.
- All 19 registry fonts are `@fontsource` or `@fontsource-variable` packages at 5.3.0, licence OFL-1.1 (read from the npm registry the same day).

## What passed

| Check | Result |
|---|---|
| Import spike (npm, pnpm, Yarn Classic, Bun by Vite and Next) | 8 of 8 builds passed. See [font spike](font-spike.md). |
| `pnpm typecheck` | Clean. |
| Compiler unit tests including the stable-hash fixture (`stable family artifacts are byte-identical`) | 52 files, 1204 tests passed. Presets without fonts compile to identical bytes. |
| Font registry, schema enum and version-rule tests | Passed (`packages/catalog/test/fonts.test.ts`, `packages/contracts/test`). |
| Editor model and controls tests | Passed (`apps/www/src/preset-editor`). |
| CLI integration through `init` and `theme add` (`tests/integration/font-pairs-cli.test.ts`) | 5 of 5 passed. |
| Preview loader and audit style tests (`tests/integration/preview-fonts.test.ts`) | 5 of 5 passed. |
| Consumer matrix, foundation groups and browser inventory tests | Passed unchanged (no consumer rows were added; see below). |
| `pnpm build:preview` | Built. It emits 79 `.woff2` files (every unicode subset of the 19 fonts), loaded lazily per selected font. |

### End to end with the built CLI

The built CLI ran `init --preset <inter, fraunces, jetbrains-mono, schemaVersion 1.1>` and then `add card kbd` in copies of `fixtures/vite` and `fixtures/next` with npm, and the projects were built.

- `init` planned and installed `@fontsource-variable/fraunces`, `inter` and `jetbrains-mono` at exactly 5.3.0, with lifecycle scripts disabled.
- `package.json` pinned the three versions. The installed `src/styles/ui-style.css` started with the three `@import` lines, and `src/index.css` carried the font tokens.
- Vite built with 15 font files emitted; Next built with 16. Both built CSS files contained `--font-heading`.

### Specimen audit with the intended pairings

Command, per pairing: `OMBELLE_AUDIT_FONTS=<body>,<heading>,<mono> OMBELLE_AUDIT_FAMILIES=<family> OMBELLE_AUDIT_COMPONENTS=<18 components> playwright test -c playwright.specimen-audit.config.ts tests/e2e/specimen-audit.spec.ts`. The 18 components are the ones that show titles, code, or most of the label text: button, badge, input, tabs, card, dialog, alert-dialog, alert, sheet, popover, empty, item, toast, stepper, kbd, input-otp, code-block, number-input. Each run covers Radix and Base, light and dark.

| Family audited | Body / display / code | Result |
|---|---|---|
| ombelle | figtree / bricolage-grotesque / geist-mono | 0 findings |
| flat | dm-sans / dm-sans / geist-mono | 0 findings |
| minimalist | geist / geist / geist-mono | 0 findings |
| neo-brutalism | work-sans / space-grotesk / space-mono | 0 findings |
| liquid-glass (experimental) | inter / inter-tight / jetbrains-mono | 50 non-blocking findings (24 focus-visible, 26 forced-colors), identical to the same run without fonts |
| minimalist (stand-in for Papier) | instrument-sans / fraunces / ibm-plex-mono | 0 findings |
| ombelle (stand-in for Organic) | nunito / young-serif / geist-mono | 0 findings after the fix below |
| flat (stand-in for Retro futuristic) | exo-2 / michroma / share-tech-mono | 0 findings after the fix below |
| flat (neutral) | inter / inter / jetbrains-mono | 0 findings |

The three planned families do not exist yet, so their pairings were audited under the closest existing family. This says whether the fonts fit the catalog components; it does not replace auditing the families once they exist.

## Findings and fixes

- **Young Serif and Michroma overflowed titles.** The first audit of those two pairings failed with `overflow` on the alert-dialog, dialog, empty, popover and sheet titles ("text extends past its box"). Their glyph box is taller than the catalog's 1.25 to 1.3 title line height. Fix: the registry carries `displayLineHeight: 1.5` for those two fonts, and the font rule block adds that line height to the heading slots. Family styles are unchanged.
- **The rule block needed more specificity.** A component's own title rule has the same specificity and can load after the font rules, so the first version of the fix did not apply. The heading and code rules now use `:not([hidden])`, which only raises specificity. The audit page's override adds one more step because each recipe specimen renders its own `<style>` after it.
- **First audit attempt was a cold-server failure.** Four parallel workers against a freshly started Vite server failed to mount the page. A warmed server with two workers passed. That was not a product defect.

## Not run, or failing here

- **Failures that come from this machine, not from the change.**
  - Unit suite: 3 of 3643 tests failed in the full run. Two (`snapshot-cache` and `preview-protocol` glass backdrop) hit the 60 second limit under load and pass when run alone. The third file, `component-preset-plan.test.ts`, failed here with "Cannot locate a pnpm JavaScript entry without shell evaluation". That message hid a real regression from the theme planner (see the CI note below); with `npm_execpath` pointing at pnpm's entry file it runs, and the whole `packages/cli` unit folder then passes (31 files, 292 tests).
  - Integration suite: 35 of 654 tests failed. 25 need a native Bun executable that is not installed here; one is a Windows `tar` path error in `packed-cli.test.ts`; the rest are 60 second timeouts or a snapshot-cache `ENOENT` warning on this Windows profile, and four of them still fail when run alone, with the same pnpm-entry, snapshot-cache and `EBUSY` errors.
  - I did not run the suite on the base commit to prove these fail there too. The error messages name the missing launcher, Bun, or the Windows cache path, none of which the font work touches.
- **Consumer matrix rows.** The plan added `vite-fonts` and `next-fonts` consumer rows. I did not add them: the matrix size cascades into the foundation gate counts, the browser inventory and the CI evidence, and this machine cannot run that gate (it needs Yarn, Bun and the browser toolchain). The end-to-end check above, the spike and the CLI integration test cover the same chain for npm. This is a follow-up for the maintainer.
- **Not covered:** Yarn Classic, modern Yarn, Plug'n'Play and Bun through the real CLI (only the spike's bare import build covers them), the pnpm CLI path (the pnpm launcher could not be resolved by the CLI here), macOS and Linux, any browser except Chromium, and any manual assistive-technology review. The full foundation gate (`pnpm check:foundation`) was not run.
- **Deploying the live service and releasing the CLI** are maintainer steps; see the rollout order in `docs/snapshot-service-operations.md`.

## After the branch review and the rebase onto 0.7.7

The branch was rebased onto `origin/main` (0.7.7, `69dc9344`) with no conflicts. A fresh reviewer then read the whole branch and found one critical and several important problems. All were fixed with a test that failed first. To save time, only the focused tests were re-run for these changes, not the full suites.

- **Rebase check (focused, not full suites):** `pnpm build:packages`, `pnpm typecheck` (after `pnpm generate:preview` regenerated the site's generated UI files), the compiler byte-identity guard, the font, contract, editor and preview-protocol unit tests, and the two font integration files all passed.
- **Critical, fixed:** the hosted publish endpoint (`apps/www/src/snapshots/server/service.ts`) and the editor's retry store (`publication-storage.ts`) rejected `schemaVersion` 1.1, so publishing a font preset failed. Both now accept 1.0 and 1.1. Tests: a new case in `tests/integration/snapshot-api.test.ts` (publishes a font preset and returns it), a round trip in `publication-storage.test.ts`, and the existing check that `2.0` still returns 422.
- **Important, fixed:**
  - The site now holds the install command for a font preset until the published CLI is at least 0.7.8 (`fontsMinimumCli`, `fontsInstallBlocked`), on the export panel, Get code and the published page.
  - `compileButtonPreset` rejects registry fonts at `/design/<field>`, because a component preset installs no packages.
  - **Note (2026-11-23).** The rejection above is what was measured. From 1.0 the scoped install carries the body font (its Fontsource package is installed, heading and mono fonts are dropped); see `tests/integration/font-pairs-cli.test.ts` from PR #193.
  - `theme add` removes the `--font-heading` and `--font-mono` tokens the new preset no longer sets, unless the user edited them or they existed before Ombelle managed them.
  - The plan names the font packages the previous theme imported and the new one does not.
  - The docs that said theme commands never install anything now name the font exception.
- **Static fonts:** a static Fontsource package built through a bare CSS `@import` in all eight manager and framework combinations (see [font spike](font-spike.md)).
- **Still open, and a release blocker for CLI 0.7.8:** font consumer rows in the matrix, the real CLI through pnpm, Yarn (including modern and Plug'n'Play) and Bun, and the foundation gate. These need a machine that can run the full gate.
- **Deferred minors:** the unmanaged-style-file notice omits the missing rule block, older CLIs report a 1.1 snapshot as a resolution failure, a system id as display font declares 1.1, the audit override is stronger than the shipped cascade, no CLI test does a real font install, and pnpm re-sorted two `package.json` files.

## CI note on PR 131

The first CI run failed `packages/cli/test/component-preset-plan.test.ts` ("plans custom destinations and imports without writing or changing global source"). The cause was mine: `planTheme` planned every dependency in the compile result, and that test (like any caller that compiles with components) passes one that lists a Button's dependencies, so the theme step installed them. `planTheme` now plans only `@fontsource` packages. New tests in `packages/cli/test/theme-font-plan.test.ts` failed first and pass now. The local failure had been masked by the pnpm launcher message above, so the earlier statement that the unit failures were all environment was wrong for that file.
