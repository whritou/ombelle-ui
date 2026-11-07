# Base UI Edition Design

**Status:** Approved by the user section by section on 2026-11-07; awaiting review of this written spec before implementation planning.
**Date:** 2026-11-07
**Baseline:** `9da3d3c`; work branch `feat/base-ui-edition`.

## Intent and decisions

A user who creates an app with `shadcn init` and a Base UI preset (any `base-*` style, for example `base-sera`) must be able to apply an Ombelle theme and add Ombelle components. Today both fail:

- `add` rejects every component, including those without Radix imports, with `Component primitive edition is not supported` because `components.json` names a style other than `radix-nova` or `new-york` (`packages/cli/src/plan/components.ts`, `component-preset.ts`, `recipe.ts`).
- `theme add` deliberately writes only the palette on such projects (`packages/cli/src/plan/theme.ts`), so the shadcn components keep their own shape and the result does not look like Ombelle.

A second blocker affects Radix projects too: `shadcn init` writes `lib/utils.ts` and `components/ui/button.tsx`. Ombelle treats both as app-owned and stops with `FILE_CONFLICT`, so `shadcn init` followed by `add` never succeeds without manual deletion.

The user first chose staged delivery (Button only), then widened the scope during spec review to all 14 Radix components. Decisions:

| Topic | Decision |
| --- | --- |
| Scope of this release | Full theme on `base-*` projects; the 10 components without Radix imports for both editions; Base UI ports of all 14 Radix components. Button is implemented first to prove the shared machinery. |
| Template strategy | Separate reviewed template files per edition. Compile-time transformation and an Ombelle runtime abstraction were rejected. |
| Base component API | Follows the Base UI `render` prop convention instead of `asChild`. Variants, sizes, behaviour props such as `loading`, and `data-slot` values match the Radix components. |
| Styling Base components | Base templates also emit the Radix state attributes and `--radix-*` variables the shared CSS targets, so one reviewed CSS source serves both editions. Compiler CSS rewriting and duplicate Base stylesheets were rejected. |
| Known shadcn utility | Adopted when its bytes match a pinned known hash. |
| Other unowned existing files | Remain conflicts, resolved explicitly by **overwrite** or **beside**. |
| Beside styling | A beside component uses prefixed slots so Ombelle CSS never styles shadcn's components. |

### Approaches considered

| Approach | Benefit | Cost | Decision |
| --- | --- | --- | --- |
| Per-edition template files | Each file readable and reviewed on its own; shared CSS unchanged | Duplicated component logic per edition | Selected |
| One Radix template transformed to Base UI at compile time | No duplicate sources | Fragile codemod; generated source nobody reviewed | Rejected |
| Ombelle runtime package hiding the primitive library | One template | Breaks "generated source has no Ombelle runtime dependency" | Rejected |

## Scope and success

Success means that, on fresh projects produced by the pinned `shadcn` 4.22.1 with a `base-*` style, for Vite and Next.js:

1. `theme add <preset>` writes the full theme (not palette-only).
2. `add badge` succeeds, adopting the unmodified shadcn `lib/utils.ts`.
3. `add button` stops on shadcn's `components/ui/button.tsx` and succeeds with either `--overwrite` or `--beside`; the interactive flow offers the same choice.
4. A beside Button and shadcn's Button render together, and shadcn's Button receives no Ombelle styling.
5. Every one of the 24 catalog components can be added to a `base` project, and each of the 14 ported components renders with the same computed styles as its Radix counterpart for the same preset and state (closed and open, checked, unchecked and indeterminate, selected, disabled, highlighted, both orientations where applicable).
6. The Radix fixtures gain the same adopt/overwrite/beside behaviour without any change to existing compiled bytes for Radix inputs.

Out of scope: accepting React version ranges (Vite templates declare `^19.3.1`); removing the `--cwd APP` placeholder from the site and docs; remote registry behaviour; mixing editions in one project.

## Section 1: Edition model

### Detection

`inspectProject` derives `edition` from `components.json`:

- `radix-nova`, `new-york` → `radix`
- each `base-*` style listed by the pinned `shadcn` 4.22.1 → `base` (the exact list is recorded in the catalog alongside the pin and covered by a test that reads it from the pinned package)
- no `components.json` → `radix` (unchanged default for Ombelle-initialized projects)
- any other style → `UNSUPPORTED_PROJECT` for component commands: ``Style `<style>` isn't supported; Ombelle supports `radix-nova`, `new-york` and shadcn's `base-*` styles``

The three duplicated style checks in `plan/components.ts`, `plan/component-preset.ts` and `plan/recipe.ts` are replaced by the single detected edition. `plan/theme.ts` writes the full theme for `base` projects. For unknown styles, `theme add` keeps today's palette-only behaviour, because it writes only CSS; component commands reject them as above.

### Lock and config

`ui-library.lock.json` records `edition`. Lock files without the field mean `radix`. When the detected edition differs from the locked one, every plan reports a conflict naming both editions; editions are never mixed in one project.

### Compiler

`edition` is a compile input next to the preset and component ids. For a given (preset, edition, components) input, output is deterministic. The preset hash is unchanged by edition: the edition belongs to the project, not the theme. Radix output bytes for existing inputs do not change.

### Catalog

- Base templates live in `packages/catalog/src/templates/base/`, one per Radix template: accordion, avatar, button, checkbox, dialog, dropdown-menu, popover, progress, radio-group, select, separator, switch, tabs, tooltip. Components without primitive imports keep a single shared template.
- Each catalog component declares the editions it supports. All 24 support both editions at release; the check stays so future components can ship for one edition first, failing with ``Component `<id>` isn't available for Base UI yet; available: <ids>``.
- `@base-ui/react` is pinned exactly, like other runtime dependencies, and installed only by Base components, with lifecycle scripts disabled. Base components declare no `@radix-ui/*` dependency; Radix components declare no `@base-ui/react`.
- Shared CSS source is unchanged. The compiler emits the same stylesheets for both editions; only the beside variant (Section 2) changes selectors.

### Base components

Each Base template is built on the matching `@base-ui/react` part (Dropdown Menu on Base UI Menu; Radio Group on Radio Group and Radio). Public exports, part names, variants, sizes and behaviour props match the Radix template, with these rules:

- **Polymorphism** uses Base UI's `render` prop; `asChild` does not exist in this edition. Each component doc in `docs/components/` documents the difference.
- **Slots:** every part emits the same `data-slot` value as its Radix counterpart.
- **State bridge:** each part that the shared CSS styles by state also emits the Radix attribute derived from Base UI state, alongside Base UI's own attributes:

  | Base UI state | Emitted Radix attribute |
  | --- | --- |
  | open / closed (accordion item and panel, dialog, popover, tooltip, menu, select) | `data-state="open"` / `"closed"` |
  | checked / unchecked / indeterminate (checkbox, radio, switch, menu checkbox and radio items) | `data-state="checked"` / `"unchecked"` / `"indeterminate"` |
  | tab selected / not selected | `data-state="active"` / `"inactive"` |
  | select item selected | `data-state="checked"` / `"unchecked"`, as Radix Select emits |
  | progress complete / loading / indeterminate | `data-state="complete"` / `"loading"` / `"indeterminate"` |
  | placeholder shown (select value) | `data-placeholder` |

  `data-disabled`, `data-highlighted` and `data-orientation` already share names and need no bridge. The exact per-part mapping for each component is fixed during implementation from the current selectors in `packages/catalog/src/styles/<component>/` and recorded in that component's doc.
- **Variable bridge:** parts whose CSS reads `--radix-*` variables set them in `style` from the Base UI variables: `--radix-accordion-content-height` ← `--accordion-panel-height`; `--radix-{popover,dropdown-menu,select}-content-available-height` ← `--available-height`; `--radix-{popover,tooltip}-content-available-width` ← `--available-width`; `--radix-select-trigger-width` ← `--anchor-width`.
- The bridge uses Base UI's `render` and state-aware props only; no wrapper component or runtime helper is shared across templates, keeping each file self-contained.
- **Button** is built on `@base-ui/react/button` with the same variants, sizes, `loading` behaviour (`aria-busy`, disabled, spinner) and `data-slot="button"`.

## Section 2: Existing files Ombelle does not own

When `add` would write a path that exists and has no record in Ombelle's lock:

1. **Known shadcn utility.** If `lib/utils.ts` (at the configured utils alias) is byte-identical to a hash in a pinned catalog list of known shadcn outputs (initially the 4.22.1 `export { cn } from "cn"` file), the plan shows `adopt` with a notice that it was generated by shadcn. `--yes` may apply it. Component files are never adopted by hash, because shadcn presets rewrite their classes.
2. **Any other unowned file** remains a `FILE_CONFLICT` whose message now names both resolutions.
   - **Overwrite** replaces the file and records it in the lock as Ombelle-owned.
   - **Beside** writes Ombelle's component and stylesheet under `<ui dir>/ombelle/` (for example `components/ui/ombelle/button.tsx` and `button.css`), leaves the existing file untouched, and records the beside path in the lock. Later `add` and `theme add` runs keep using it. Templates import only `utils`, so beside placement is per file.
3. **Ombelle-owned files the user modified** keep today's behaviour: an explicit-migration conflict.

### Beside styling

A beside component is compiled with prefixed slots (`data-slot="ombelle-button"` and prefixed sub-slots), and its stylesheet selectors are compiled with the same prefix. Shared style rules that target that component's slots are emitted for the prefixed slots too. shadcn components keep their `data-slot` values and receive no Ombelle rules. This is a second compile variant per component and is covered by determinism tests.

### Choosing a resolution

- **Interactive** (TTY, no `--yes`): before `Apply these changes? [y/N]`, the CLI asks per unowned file: ``components/ui/button.tsx exists and is not managed by Ombelle: [o]verwrite, [b]eside, [c]ancel``. Answers become plan inputs; the CLI re-plans and shows the new plan before the apply prompt. Planning and applying stay separate.
- **Non-interactive:** `--overwrite <path>` and `--beside <path>`, repeatable, one per file. `--yes` alone never resolves these conflicts, preserving the rule that `--yes` does not bypass modified-file conflicts. Without a resolution the command exits with code 4 and the conflict message lists both flags. A flag naming a path that is not an unowned conflict in the plan is rejected as `INVALID_DATA`, so a stale command cannot silently overwrite.
- Dry runs accept the same flags and show the resolved plan.

## Section 3: Errors, testing, evidence

### Errors

| Situation | Code | Message |
| --- | --- | --- |
| Unknown `components.json` style (component commands; `theme add` stays palette-only) | `UNSUPPORTED_PROJECT` | Names the style and the supported ones |
| Component without support for the project's edition (none at release; kept for future one-edition components) | `UNSUPPORTED_PROJECT` | Names the component and lists available ones |
| Edition differs from lock | `FILE_CONFLICT` | Names both editions |
| Unowned file without resolution | `FILE_CONFLICT` (exit 4) | Names `--overwrite` and `--beside` |
| Resolution flag for a non-conflicting path | `INVALID_DATA` | Names the path |

### Tests

- **Unit:** edition detection for each pinned `base-*` name, `radix-nova`, `new-york`, missing `components.json` and unknown styles; compiler template selection and determinism per (preset, edition) for all 24 components; Base templates import no `@radix-ui/*` and Radix templates import no `@base-ui/react`; every `data-slot` value in a Radix template appears in its Base counterpart; prefixed-slot variant output; plan cases for adopt, overwrite, beside, lock edition mismatch, stale resolution flags, and `--yes` never resolving an unowned conflict.
- **Integration:** new fixtures `fixtures/shadcn/vite-base` and `fixtures/shadcn/next-base`, the unmodified output of the pinned `shadcn` 4.22.1 with a `base-*` style, with regeneration commands in `fixtures/shadcn/README.md`. `shadcn-theme-merge.test.ts` is extended: full theme on base fixtures; `add badge` adopting `lib/utils.ts`; `add button --overwrite`; `add button --beside` followed by `theme add` keeping the beside path. The same adopt/overwrite/beside cases run on the existing Radix fixtures. Existing Radix byte expectations stay unchanged.
- **Browser:** two browser-tested npm consumers (Vite base, Next base) join the `check:foundation` matrix. Each renders all 24 components, a beside Button next to shadcn's Button, and asserts that shadcn's Button has no Ombelle-computed styles (for example border width and offset shadow match its own classes).
- **Parity:** a browser test renders each of the 14 ported components in both editions with the same preset, drives each through its states (closed/open, checked/unchecked/indeterminate, selected, disabled, highlighted, each orientation, select placeholder, progress states), and compares the computed styles of every `data-slot` element between editions. Differences fail the test unless listed with a reason in the component doc. Keyboard interaction and axe checks run on the Base editions as they do on Radix.

### Documentation and release

- New decision record `docs/decisions/0005-base-ui-edition.md`, superseding the Radix-only choice in `0002-registry-adapter.md` for editions.
- Updates to `docs/05-cli-specification.md`, `docs/foundation-local-usage.md`, `docs/10-installation-and-theme-merging.md`, and the 14 ported component docs in `docs/components/` (Base UI part used, `render` instead of `asChild`, the state bridge, Base dependency versions).
- Implementation order: edition model and shadcn file handling with Button first; then the 13 remaining ports, each landing with its parity test.
- Measured evidence recorded with its environment, as for existing consumers; the consumer matrix keeps browser-tested and build-only rows separate.
- The CLI is released as 0.7.0.

## Risks

- **Base UI API drift.** Pinning `@base-ui/react` exactly and testing in browser consumers contains this; upgrades follow the existing pin-review process.
- **Known-hash list staleness.** A newer shadcn may emit a different `lib/utils.ts`; it then falls back to an ordinary unowned conflict with overwrite/beside, which is safe.
- **Prefixed variant scope.** Every shared rule that targets a component slot must also be emitted for prefixed slots; determinism tests cover all components and the browser test checks the beside Button.
- **DOM structure differences.** Base UI overlays add parts Radix does not have (Portal, Positioner, Backdrop) and may nest elements differently. Selectors that rely on parent/child relationships can stop matching; the parity test catches this, and fixes stay in the Base template (placing `data-slot` on the part that matches the Radix element), not in the shared CSS.
- **Bridge drift.** If a later change adds a new state selector to the shared CSS, the Base template must bridge it. The parity test fails until it does.
- **Release size.** Fourteen ports make 0.7.0 large. Landing Button and the machinery first, then each port with its own parity test, keeps every step reviewable.
