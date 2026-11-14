# Font pairs for presets

Status: draft for approval. Branch when built: `feat/font-pairs`. Size: a project, about 3 to 5 working days.

## Intent

A preset can pick one font today, from three system stacks (`system-sans`, `system-serif`, `system-mono`). Every built-in preset uses `system-sans`, so no style family has typography of its own. The 0.8 style families (Papier, Organic, Retro futuristic) are drawn with real display and body fonts, and the preset editor should offer a curated choice of fonts regardless of family.

This work lets a preset carry a display font, a body font and a mono font, chosen from a curated list of self-hosted fonts. It ships before the 0.8 families so each family can be reviewed with its real typography.

## Goals

- A preset may set `fontFamilyId` (body), `headingFontFamilyId` (display) and `monoFontFamilyId` (code) from a curated registry.
- The CLI installs the chosen fonts as pinned Fontsource packages and wires their CSS, in npm, pnpm, Yarn and Bun projects.
- The preset editor shows three pickers and previews the same self-hosted files an installed project loads.
- Display-only fonts cannot be used as body or mono fonts.

## Non-goals

- The new style families themselves.
- Changing the default fonts of any existing family or built-in preset.
- Per-component font overrides.
- Remote font services of any kind.

## Anti-goals (failure even if it technically works)

- Any byte change in `ui-tokens.css`, `ui-style.css` or component output for a preset that does not opt in.
- Any request to a third-party font host at install, build or run time (GDPR).
- A font that installs in one package manager and breaks in another.

## Constraints

- Node 24.19.0, pnpm 11.25.0. Source schemas live in `schemas/`; generated TypeScript copies are never edited. Run `pnpm build:packages` after source changes.
- Compiler output stays deterministic. Planning stays separate from applying. Dry-run behaviour and stale-plan, conflict and recovery safeguards are untouched.
- Dependency installs disable lifecycle scripts, so fonts must be plain package assets at exact pinned versions.
- Fonts are OFL-licensed, and each licence is recorded in the docs.
- Conventional Commits; branch `feat/font-pairs`.

## What exists today

- `schemas/preset.schema.json` line 30: `design.fontFamilyId` is an enum of the three system ids. `design` has `additionalProperties: false`, and `schemaVersion` is the constant `"1.0"`.
- The font stack is chosen in two places, both mapping the id to a stack: `packages/compiler/src/compile.ts` (around line 128) and `packages/compiler/src/recipe-styles.ts` (around line 232). The result becomes `--font-family` in `styles/ui-tokens.css`.
- Catalog styles read `var(--font-family)`.
- Dependencies are planned from components: each template lists `dependencies` (name and exact version), `compile.ts` collects them into a map, and `lucide-react` is the precedent.
- The editor reads the font through `apps/www/src/preset-editor/model.ts` (line 35) and `components/preset-controls.tsx` (line 249).
- The published `@ombelle-ui/cli@0.2.1` and the live hosted service validate presets with this strict schema.

## Approaches

### Font delivery

- **A. Pinned Fontsource packages (chosen).** The plan adds exact-version `@fontsource-variable/*` or `@fontsource/*` dependencies and prepends an `@import` to `ui-tokens.css`. It follows the `lucide-react` pattern and the existing dependency planning. Cost: import resolution varies by consumer setup, and a failed font install fails the build.
- **B. Woff2 files vendored in the catalog and copied into the project.** Deterministic, no install step. It adds roughly 1 to 1.5 MB to the catalog and needs the apply and transaction code to handle binary files, which is unconfirmed.
- Chosen: A.

### Keeping existing output identical

- **Conditional emit (chosen, my call).** The new variables and a small compiler-appended rule block are emitted only when a preset sets a heading or mono font, like the glass lab style is appended today. Old presets compile to the same bytes.
- Rewriting catalog styles to use `var(--font-heading, var(--font-family))` everywhere would change `ui-style.css` for all families. The docs already describe a migration step for that, but it contradicts the anti-goal.

### Schema compatibility

- **Conditional version (chosen, my call).** A preset that uses none of the new fields or ids keeps `schemaVersion: "1.0"` and works in old CLIs. A preset that uses any of them declares `"1.1"`, so an old CLI fails with a clear unsupported-version message instead of an obscure `additionalProperties` error. The compiler accepts both.
- Keeping `"1.0"` for everything is simplest but gives old CLIs an unhelpful error. Bumping everything to `"1.1"` would break old CLIs for presets that do not need it.

## Decisions made

- Fonts reach a project as pinned Fontsource dependencies (A).
- The registry is the single source of truth: id, label, stack with fallbacks, role (display, body, mono), available weights, licence, Fontsource package and pinned version.
- The three system ids stay valid and stay the defaults. Heading defaults to the body font. Mono defaults to `system-mono`.
- Young Serif, Michroma and Bricolage Grotesque are display-only and are refused as body or mono fonts at compile time.
- The fonts to add, with their intended pairings:

| Family | Display | Body | Mono |
|---|---|---|---|
| Flat | DM Sans | DM Sans | Geist Mono |
| Minimalist | Geist | Geist | Geist Mono |
| Neo brutalism | Space Grotesk | Work Sans | Space Mono |
| Ombelle | Bricolage Grotesque | Figtree | Geist Mono |
| Liquid glass | Inter Tight | Inter | JetBrains Mono |
| Papier (planned) | Fraunces | Instrument Sans | IBM Plex Mono |
| Organic (planned) | Young Serif | Nunito | Geist Mono |
| Retro futuristic (planned) | Michroma | Exo 2 | Share Tech Mono |

- Inter and JetBrains Mono are also offered as neutral picks.
- Any font that is not OFL or has no pinned Fontsource package is dropped, and the drop is reported.
- Existing families keep their current look. The new fonts are opt-in picks in the editor, not defaults.

## Calls made after the builder check (the author's calls, open to correction)

1. **Spike first.** Before any other work, a short spike proves approach A in the Vite and Next fixtures with all four package managers. It uses a bare specifier, `@fontsource-variable/<name>` where the font has a variable build and the static `@fontsource/<name>` files otherwise. The `@import` goes at the very top of `ui-tokens.css`, which the compiler fully generates, so ordering is under its control. If the spike fails in any manager, work stops and the failure is reported before approach B is considered.
2. **The conditional rule block.** It is appended to `ui-style.css` after the family styles, only when a preset sets a heading or mono font. Heading targets are the title slots (card, dialog, alert dialog, sheet, alert, empty, item and similar), found through the existing `data-slot` markers. Mono targets are code-block, kbd, input-otp slots and number displays. The builder lists the exact slots from the catalog and records them next to the block. Nothing here touches the family base styles.
3. **Version rule.** A shared helper in `packages/contracts` decides the version: `"1.1"` if the preset uses any new field or registry id, otherwise `"1.0"`. The compiler, the editor export and the hosted service all use that helper. A `"1.0"` preset that sets a new field is rejected. A `"1.1"` preset that uses none is accepted. Rollout order: the hosted service accepts `"1.1"` first, then the CLI release, then the editor offers the new fonts. Deploying the live service is the maintainer's step, not part of the build.
4. **Fonts and the installer.** Fonts come only from the global preset saved by `init` or `theme add`; `add` follows the saved defaults. Component-scoped recipes, including local Button `add --recipe`, cannot carry fonts. When a later `theme add` changes fonts, `ui-tokens.css` is rewritten with only the current imports, and the old font packages stay installed. The installer never removes dependencies, and the plan lists them as unused.
5. **Registry roles.** `role` is a set. Display-only fonts are Young Serif, Michroma and Bricolage Grotesque. Fraunces can serve as display and body. `monoFontFamilyId` accepts only fonts with the mono role.
6. **Packages and weights.** Variable builds are preferred where they exist; single-weight fonts (Young Serif, Michroma) use static files. Weights are taken from the font-weight values the catalog styles actually use. If a font fails the licence or package check, work stops and reports two replacement candidates before any substitution.
7. **Editor preview.** The `www` app is deployed, so the GDPR rule applies and the fonts are bundled and self-hosted. Only the fonts currently selected in the pickers load, and they load lazily.
8. **Specimen audit.** It runs for each family's intended pairing and for the neutral picks, not the full font-by-family matrix. If a font fails, the fix goes in a font-scoped adjustment inside the conditional rule block, never in family base styles. If that is not enough, the font is dropped or the failure is recorded as a documented exception.

## Work, in order

0. Spike for approach A (call 1), with a stop-and-report gate.

1. Registry and licence check.
2. Schema (`schemas/preset.schema.json`) and regenerated contracts, including the conditional version rule.
3. Compiler: both font-stack sites, `--font-heading` and `--font-mono`, the conditional rule block, the display-only guard, and the font dependencies in the plan.
4. CLI: plan output shows the font dependencies, apply installs them with lifecycle scripts disabled, and the `@import` lands at the top of `ui-tokens.css`.
5. Editor and preview: three pickers, and the preview loads the same self-hosted files.
6. Tests and evidence.

## Verification

- Unit tests: registry resolution, the display-only guard, and the conditional version rule.
- Integration: an unchanged preset compiles to identical bytes in every family; a preset with fonts produces the expected tokens, rule block, dependencies and `@import`.
- Consumer builds with at least one non-system font in the Vite and Next fixtures, using npm, pnpm, Yarn and Bun.
- A specimen-audit pass for each non-system font, because font metrics change clipping and label spacing.
- `pnpm build:packages`, `pnpm typecheck`, `pnpm test:unit` and `pnpm test:integration` pass.
- An evidence file under `docs/evidence/` records the environment, what ran and what did not.

## Left to the builder

- The exact registry file format and where it lives in the catalog.
- Weight subsets per font, within the constraint that body fonts include the weights the styles use.
- How the preview resolves font files in the editor app.
- Test fixture names and the layout of the evidence file.
