# Upgrading to 1.0

This page is for projects installed with an Ombelle CLI from the 0.x series. Run the 1.0 CLI in the project; it reads every 0.x config, preset and lock (`configVersion` 1, `lockVersion` 1), so nothing needs converting first.

## Short version

```bash
npx @ombelle-ui/cli@<version> info            # what is installed and what changed
npx @ombelle-ui/cli@<version> update --dry-run
npx @ombelle-ui/cli@<version> update --yes
```

`update` refreshes every installed file you have not edited to today's catalog bytes, in one transaction, and installs any new dependency the components now declare. Files you edited are reported as conflicts and stay untouched until you decide.

## 1. Managed component files

Before 1.0, a managed file whose catalog bytes changed was an unresolvable `Existing source requires an explicit migration` conflict, even when you had never edited it, and `--overwrite` refused managed files. The only route was to delete the file and `add` the component again.

From 1.0 the CLI compares three things for each file: the bytes the lock recorded at install, the bytes on disk, and the bytes today's catalog produces.

| `info` / `diff` state | Meaning | What `update` (and `add` of the same component) does |
| --- | --- | --- |
| `current` | Unedited, and the catalog still produces it | Nothing |
| `update-available` | Unedited; the catalog changed it | Replaces it (`refresh <path>` notice) |
| `edited` | You changed it; the catalog did not | Conflict |
| `edited-update-available` | You changed it, and the catalog changed it | Conflict |
| `missing` | Recorded but deleted | Creates it again |

For an edited file, look at the difference first:

```bash
npx @ombelle-ui/cli@<version> diff meter
```

Then either keep your version (leave that component out: `update <other components>`), or replace it with the catalog source and re-apply your change by hand:

```bash
npx @ombelle-ui/cli@<version> update meter --overwrite src/components/ui/meter.tsx --yes
```

`--overwrite` takes only a managed file you edited or a file Ombelle does not manage; it never applies to anything else, and `--yes` never resolves a conflict on its own.

The same rules apply to Button recipes (`add --recipe`) and component-scoped Button presets (`add button --preset`): `update` without component names refreshes their unedited files too. A 0.x lock whose component-preset row was installed by an older catalog no longer blocks the project.

## 2. Shared stylesheet

`ui-style.css` follows the same rules. `add` now refreshes an unedited stale stylesheet itself instead of stopping with `Shared style rules changed in this catalog; run theme add …`. `theme add <presetFile>` still refreshes it too.

## 3. Operation lock and recovery

`.ombelle-operation.lock` is now a JSON owner record instead of an empty file. A 0.9 empty lock older than ten minutes is recovered automatically by the next applying command, which restores the interrupted transaction's files, then asks you to run your command again. Ctrl-C during an apply now rolls back. See [interrupted operations](foundation-local-usage.md#interrupted-operations).

## 4. Dependencies

Declared versions are no longer re-pinned: a declaration at or above the catalog version is kept with a notice (`keep lucide-react@^1.77.0, …`), and only an older declaration is raised. Plans show the replaced range (`(replaces ^1.10.0)`). Installs still pin exact versions and disable lifecycle scripts.

## 5. Liquid glass

Liquid glass is a stable family labelled "Accessibility not guaranteed": its text contrast depends on the background behind it. The CLI notice `liquid-glass is experimental for …` becomes one accessibility caveat per plan. The eight material presets are revision 2 with retuned token values; re-applying one changes your tokens, while existing codes and `id@1` still resolve. Glass CSS for several components and `ui-style.css` changed; `update` brings them in. See [liquid glass](components/liquid-glass.md), including "Upgrading from 0.4.x".

## 6. Markup your CSS may target

- Meter's ring now carries `data-mode="circle"` (0.9.1); it read `bar`.
- 1.0 changes the order of `data-slot` attributes in component templates and adds props to some components. Selectors on `data-slot` values keep working; selectors that depend on attribute order or on markup you copied do not.

Run `diff` before `update` if your own CSS targets component internals.

## 7. New dependencies

The Radix Sidebar now uses `@radix-ui/react-slot`. `update` installs it; `doctor` reports any component dependency your `package.json` lacks.

## 8. Appearance changes in family CSS

Family stylesheets changed timing (now driven by `--motion-duration`), scrims and fields. These arrive with `update` as ordinary refreshes of unedited files.

## 9. Supported projects

The CLI now accepts any React 19 declaration (`^19.3.1`, `19.3.0`, …) instead of exactly `19.3.1`; React 18 and older are refused; React 20 and newer are accepted untested with a notice. Node 24.19.0 to below 27 and Bun 1.4.3 to below 2 are tested; newer majors run with a notice. `pnpm dlx` and `yarn dlx` install dependencies without a launcher on `PATH`. See [supported projects](05-cli-specification.md#supported-projects).

## 10. Older routes still in force

- Projects from before the native form controls: [the migration route](foundation-local-usage.md#migrating-installs-created-before-native-form-controls). `update` now does the stylesheet part; the Dialog delete-and-re-add step is still how to drop the text close button if you edited the file.
- Glass "Upgrading from 0.4.x" in [liquid glass](components/liquid-glass.md).
- Neo Brutalism `shadowColor` codes and Flat Button recipe codes from before 4 November verify again ([decision 0009](decisions/0009-snapshot-identity-and-contract-version.md)).

## Scripts and tools that read `--json`

- Every record now has `outputVersion: 1`.
- `notices` are objects `{ code, message }` instead of strings; match on `code`.
- `theme add` reports `command: "theme add"` (it was `theme`).
- A parse error reports `command: ""` instead of the first argument.
- `INVALID_REFERENCE` exits 2 (it was 1).
- A preset, recipe, config or lock from a newer release fails with `UNSUPPORTED_RELEASE` (exit 3) instead of `INVALID_DATA` (exit 2).
- Text output prints `Next: …` for every error.

See [the CLI specification](05-cli-specification.md#output) for every field.
