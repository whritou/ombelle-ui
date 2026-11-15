# Papier style family (0.8.0)

Status: draft, awaiting approval. Size: project.

## Intent

Papier is the first new style family since Ombelle and the headline of release 0.8.0. It is a warm-paper,
ink-rule, serif-voiced look: a cream page, navy ink borders, one red accent, Fraunces headings and links,
Instrument Sans interface text, IBM Plex Mono for keys and code. Raised controls sit on a 2px ink shadow and
sink when pressed, like a stamp. Cards and popovers carry a double rule on top, dividers are dotted.

The look is already drawn and agreed in the design canvas, page "0.8.0 Papier" (9 boards: Foundations,
Actions, Text fields, Choice controls, Content, Status, Navigation, Overlays, Data), every component and
variant in light and dark. This work turns that design into a shipped, stable family.

## Goals

- `papier` is a stable style family in 0.8.0, supported by all 57 catalog components, in light and dark.
- Every variant, size and state in the design exists in the real component styles.
- It meets the same bar as the other stable families: contrast tests, `pnpm test:specimen-audit` (focus,
  clipping, overflow, label spacing, target size, forced colors, axe) clean for every Papier specimen, and
  compiler output that is deterministic.
- Papier is selectable wherever the other families are: preset editor, Button editor, preview gallery,
  documentation playground, recipes and component-preset fixtures, consumer matrix.
- A decision record (`docs/decisions/0006-papier-family.md`, written like `0004-ombelle-family.md`) states
  the look, the contract change, where it is offered and what was verified.

## Non-goals

- No Papier palettes in the editor. Per-style palettes live on `feat/style-palettes`, which is unmerged;
  Papier palettes follow once it lands.
- No new fonts. Fraunces, Instrument Sans and IBM Plex Mono are already in the font registry.
- No change to the three other stable families' output bytes, nor to liquid glass.
- No new components or variants. The catalog stays at 57.
- No claim of real-browser forced colors, human keyboard or screen reader review beyond the automated checks.

## Anti-goals

- A Papier that is "Ombelle in cream". The differences are structural (ruled inputs, double-underline
  outline buttons, serif italic links, dotted dividers, double-rule tops) and must survive in the CSS.
- A family that is registered while some component still lacks a Papier file.
- Evidence or documentation claims broader than what was actually run.

## Constraints

- Follow `AGENTS.md`: Conventional Commits, schemas edited in `schemas/` (then regenerated), catalog inputs
  edited in `templates/`, `styles/`, `presets/` and never in `generated.ts`, deterministic compiler output,
  `.js` import specifiers.
- `pnpm build:packages` fails on a catalog style rule that names no slot or marker, so each file must target
  real `data-slot` and marker attributes.
- The design needs tokens the preset must carry: radius 2px, border 1px, shadow offset 0 by 2px, status
  colours (success, warning, info, soft tints) taken from the design board, a destructive and a warning
  text-safe pair per mode. Text pairs must reach 4.5:1 (3:1 at large size).
- Branch `feat/style-papier`, cut from `feat/style-palettes`. It carries those palette commits until they
  merge; Papier must not depend on them.

## Approaches

1. Port the design group by group, audit after each group.
2. **Chosen:** write all 57 per-component stylesheets, then audit once. Fewer steps, with the risk that a shared
   decision (double-rule top, stamp shadow) is wrong and reworks many files; mitigated by writing the shared
   base (`styles/papier.css`) and Foundations-level rules first and by drawing every file from one set of
   rules lifted from the design CSS.
3. Copy `ombelle.css` per component and restyle. Rejected: Papier's differences are structural.

Why 2: the user chose it. Builder note: because the audit runs once at the end, expect one repair pass;
per the project convention, rerun only audits for components that changed, not passing ones.

## Design

Order of work on the branch, as separate commits:

1. **Preset and contract.** `presets/papier.json` (light and dark tokens from the design, Fraunces display,
   Instrument Sans body, IBM Plex Mono code, radius 0.125rem, border 1px, shadow 0/2). Add `papier` to the
   `styleFamily` enum in `schemas/preset.schema.json`, regenerate `preset-schema.ts`, add it to
   `supportedStyleFamilies` last and `styleSupport` stable for all components. Keep this registration
   uncommitted-in-effect until step 3 completes (a local flag or the same commit) so tests do not see a
   family with missing files.
2. **Styles.** `styles/papier.css` (family base: tokens to shared rules, focus ring, press, rules) and one
   `styles/<component>/papier.css` per component, 57 files, in the order of the design boards. The reference
   for every rule is the shared stylesheet inside any `project/Papier080*.dc.html` file of the design
   artifact (https://claude.ai/artifact/1FMRGWoyJSwht9wATT838U, page "0.8.0 Papier"); copy it into the
   repo under `docs/` first so the source survives.
3. **Registration and wiring**, following the Ombelle commit: family pickers and chips in the preset editor and
   Button editor, preview gallery generation and the `/papier/` route in `apps/preview`, recipe fixtures
   (`rc_papier_button`), recipe and component-preset evidence scripts, consumer matrix rows
   (`vite-papier`, `next-papier`, `npm-vite-papier`, `npm-next-papier`: 40 to 44 rows), snapshot store
   enum/migration if the store validates family names, the published-CLI gate for 0.8.0.
4. **Tests and fixtures.** Update catalog and compiler tests, `stable-families.test.ts`, the compiler
   `style-baseline.json` and `stable-family-hashes.json`, contrast tests (add Papier token pairs), contract
   and integration tests that count families.
5. **Verification.** `pnpm build:packages`, `pnpm generate:preview`, `pnpm typecheck`, `pnpm test:unit`,
   focused `pnpm test:integration`, then `pnpm test:specimen-audit` for Papier. Repair pass, then rerun only
   what changed. `pnpm check:foundation` only on a machine with the full toolchain.
6. **Docs.** Decision record 0006, docs pages and component docs listing Papier, release notes. The record
   states exactly what was run and what was not.

## Calls made after the builder check

- **Design source.** The full reference stylesheet is committed at
  `docs/superpowers/specs/assets/papier-080-board.css`. Its `.light` and `.dark` blocks are the token source
  for `presets/papier.json`, including success, warning, info and soft tints and the text-safe destructive
  pair. It covers rest, hover, pressed, focus, disabled and invalid for the main controls; the builder
  extends the same rules to any remaining state and to forced colors (as other families do).
- **Palettes.** `getPalettes(family)` returns `palettes[family] ?? []`, so a family with no entry offers no
  palettes. Papier needs no palette shape. When `feat/style-palettes` merges, rebase Papier onto `main`.
- **Commits.** Every commit passes `pnpm test:unit`. Registration in `supportedStyleFamilies` lands in the same
  commit as the last of the 57 style files; before that the files and preset sit unregistered.
- **Look versus accessibility.** Contrast and the audit win. Deviate from the design only as far as needed
  (adjust a tone or width first), and record each deviation in decision record 0006 with the reason.
- **Release scope.** Stop at a ready branch: gate constant and notes prepared, docs written. No version
  bump, no npm publish, no tag, no PR unless asked.
- **Counts and evidence.** Update test counts (families, 57 components, 44 matrix rows) with the code that
  changes them. Do not regenerate measured evidence files unless the full gate is run, and say so in 0006.

## Left to the builder

- Exact slot selectors per component (follow the Ombelle files for structure).
- Whether a rule needs a modern-CSS fallback; follow what other families do.
- File-by-file token tuning to reach contrast, as long as the look in the design is kept.
- Whether snapshot migrations are needed (check `apps/www/src/snapshots/server/`).
