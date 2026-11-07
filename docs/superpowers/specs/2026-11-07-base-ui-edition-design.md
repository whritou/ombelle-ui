# Base UI Edition Design

**Status:** Approved by the user section by section on 2026-11-07; awaiting review of this written spec before implementation planning.
**Date:** 2026-11-07
**Baseline:** `9da3d3c`; work branch `feat/base-ui-edition`.

## Intent and decisions

A user who creates an app with `shadcn init` and a Base UI preset (any `base-*` style, for example `base-sera`) must be able to apply an Ombelle theme and add Ombelle components. Today both fail:

- `add` rejects every component, including those without Radix imports, with `Component primitive edition is not supported` because `components.json` names a style other than `radix-nova` or `new-york` (`packages/cli/src/plan/components.ts`, `component-preset.ts`, `recipe.ts`).
- `theme add` deliberately writes only the palette on such projects (`packages/cli/src/plan/theme.ts`), so the shadcn components keep their own shape and the result does not look like Ombelle.

A second blocker affects Radix projects too: `shadcn init` writes `lib/utils.ts` and `components/ui/button.tsx`. Ombelle treats both as app-owned and stops with `FILE_CONFLICT`, so `shadcn init` followed by `add` never succeeds without manual deletion.

The user selected staged delivery and the following decisions:

| Topic | Decision |
| --- | --- |
| Scope of this release | Full theme on `base-*` projects; the 10 components without Radix imports for both editions; a Base UI port of Button. The remaining 13 Radix components are ported in later batches. |
| Template strategy | Separate reviewed template files per edition. Compile-time transformation and an Ombelle runtime abstraction were rejected. |
| Base Button API | Follows the Base UI `render` prop convention instead of `asChild`. Variants, `loading`, and `data-slot` match the Radix Button. |
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
5. The Radix fixtures gain the same adopt/overwrite/beside behaviour without any change to existing compiled bytes for Radix inputs.

Out of scope: porting the other 13 Radix components; accepting React version ranges (Vite templates declare `^19.3.1`); removing the `--cwd APP` placeholder from the site and docs; remote registry behaviour; mixing editions in one project.

## Section 1: Edition model

### Detection

`inspectProject` derives `edition` from `components.json`:

- `radix-nova`, `new-york` → `radix`
- each `base-*` style listed by the pinned `shadcn` 4.22.1 → `base` (the exact list is recorded in the catalog alongside the pin and covered by a test that reads it from the pinned package)
- no `components.json` → `radix` (unchanged default for Ombelle-initialized projects)
- any other style → `UNSUPPORTED_PROJECT`: ``Style `<style>` isn't supported; Ombelle supports `radix-nova`, `new-york` and shadcn's `base-*` styles``

The three duplicated style checks in `plan/components.ts`, `plan/component-preset.ts` and `plan/recipe.ts` are replaced by the single detected edition. `plan/theme.ts` writes the full theme for `base` projects. For unknown styles, `theme add` keeps today's palette-only behaviour, because it writes only CSS; component commands reject them as above.

### Lock and config

`ui-library.lock.json` records `edition`. Lock files without the field mean `radix`. When the detected edition differs from the locked one, every plan reports a conflict naming both editions; editions are never mixed in one project.

### Compiler

`edition` is a compile input next to the preset and component ids. For a given (preset, edition, components) input, output is deterministic. The preset hash is unchanged by edition: the edition belongs to the project, not the theme. Radix output bytes for existing inputs do not change.

### Catalog

- Base templates live in `packages/catalog/src/templates/base/` (initially `button.tsx`). Components without primitive imports keep a single shared template.
- Each catalog component declares the editions it supports. A request for an unported component in a `base` project fails with ``Component `<id>` isn't available for Base UI yet; available: <ids>``.
- `@base-ui/react` is pinned exactly, like other runtime dependencies, and installed only by Base components, with lifecycle scripts disabled.
- Shared CSS is unchanged: it targets `data-slot`, which Base templates emit identically.

### Base Button

Built on `@base-ui/react/button` with the same variants, sizes, `loading` behaviour (`aria-busy`, disabled, spinner) and `data-slot="button"` as the Radix Button. Polymorphism uses Base UI's `render` prop; `asChild` does not exist in this edition. `docs/components/button.md` documents the difference.

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
| Unknown `components.json` style | `UNSUPPORTED_PROJECT` | Names the style and the supported ones |
| Unported component on `base` | `UNSUPPORTED_PROJECT` | Names the component and lists available ones |
| Edition differs from lock | `FILE_CONFLICT` | Names both editions |
| Unowned file without resolution | `FILE_CONFLICT` (exit 4) | Names `--overwrite` and `--beside` |
| Resolution flag for a non-conflicting path | `INVALID_DATA` | Names the path |

### Tests

- **Unit:** edition detection for each pinned `base-*` name, `radix-nova`, `new-york`, missing `components.json` and unknown styles; compiler template selection and determinism per (preset, edition); prefixed-slot variant output; plan cases for adopt, overwrite, beside, lock edition mismatch, stale resolution flags, and `--yes` never resolving an unowned conflict.
- **Integration:** new fixtures `fixtures/shadcn/vite-base` and `fixtures/shadcn/next-base`, the unmodified output of the pinned `shadcn` 4.22.1 with a `base-*` style, with regeneration commands in `fixtures/shadcn/README.md`. `shadcn-theme-merge.test.ts` is extended: full theme on base fixtures; `add badge` adopting `lib/utils.ts`; `add button --overwrite`; `add button --beside` followed by `theme add` keeping the beside path. The same adopt/overwrite/beside cases run on the existing Radix fixtures. Existing Radix byte expectations stay unchanged.
- **Browser:** two browser-tested npm consumers (Vite base, Next base) join the `check:foundation` matrix. Each renders the Base Button and a beside Button next to shadcn's Button, and asserts that shadcn's Button has no Ombelle-computed styles (for example border width and offset shadow match its own classes).

### Documentation and release

- New decision record `docs/decisions/0005-base-ui-edition.md`, superseding the Radix-only choice in `0002-registry-adapter.md` for editions.
- Updates to `docs/05-cli-specification.md`, `docs/foundation-local-usage.md`, `docs/10-installation-and-theme-merging.md` and `docs/components/button.md`.
- Measured evidence recorded with its environment, as for existing consumers; the consumer matrix keeps browser-tested and build-only rows separate.
- The CLI is released as 0.7.0.

## Risks

- **Base UI API drift.** Pinning `@base-ui/react` exactly and testing in browser consumers contains this; upgrades follow the existing pin-review process.
- **Known-hash list staleness.** A newer shadcn may emit a different `lib/utils.ts`; it then falls back to an ordinary unowned conflict with overwrite/beside, which is safe.
- **Prefixed variant scope.** Every shared rule that targets a component slot must also be emitted for prefixed slots; the determinism and browser tests check Button, and later ports reuse the same mechanism.
