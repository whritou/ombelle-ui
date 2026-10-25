# Native form controls verification

The native form controls work adds Label, Textarea, and Native Select, styles invalid Input in every implemented family, and gives Dialog an icon close control. It was verified on branch `feat/native-form-controls` at `619414ad96aadc5ee0890491abde74270db72523` with a clean working tree. The run used Windows, Node 24.19.0, pnpm 11.25.0, npm 11.19.0, Yarn 1.22.22 and 4.18.1, Bun 1.4.3, and Playwright 1.64.1. The commit that follows `619414a` changed only the stale-stylesheet message text, its tests, and docs. It was verified by focused runs (`tests/integration/form-controls-cli.test.ts`, `packages/cli/test`, and `pnpm typecheck`), not by a new full `pnpm check:foundation` run.

## Foundation verification

`pnpm check:foundation` ran through the normal pnpm launcher. On this machine, `tsx` started normally: there was no `os.userInfo` ENOMEM, and no loader workaround or shim change was needed.

All ten foundation stages passed in 50 minutes with exit code 0:

- package build;
- 233 unit tests in 31 files;
- 266 integration tests in 38 files;
- preview generation;
- preparation of 34 consumer projects;
- typecheck;
- preview build;
- all 34 consumer builds;
- 178 browser tests;
- workspace audit.

Nothing was skipped or flaky, and nothing failed. All 34 consumer production audits exited 0. The [machine-readable run record](form-controls-run.json) has stage durations, per-file browser counts, and raw result hashes. The unit stage included `packages/cli/test/transaction.test.ts`, which passed when launched through `pnpm run`.

The browser stage used `OMBELLE_BROWSER_CHANNEL=msedge`, which reported Chromium 156.0.4314.42, because Playwright's bundled Chromium headless shell is not installed here. CI uses bundled Chromium, and this run did not exercise it. Playwright exited by itself. No preview or consumer listeners remained on ports 4173–4207, so none had to be stopped.

An earlier attempt on the same commit used the default four integration workers. Unit tests passed, but one integration test failed. The Yarn 4.18.1 `modern-next` install exceeded its 60-second test timeout under that load, followed by `EBUSY` while removing its temporary directory. The gate stopped at that stage. The full gate was then re-run unchanged with `OMBELLE_INTEGRATION_WORKERS=1`, the setting the Card evidence also used, and every stage passed. No source or test changed between the attempts.

## Form controls coverage

The browser matrix adds 30 Forms cases: three style families × light/dark × preview, pnpm Vite, pnpm Next, npm Vite, and npm Next. The `?forms=1` fixture has 14 labelled controls. Each case checks:

- installed source against the compiled manifest, and preview DOM and computed styles against each consumer;
- Textarea and Native Select borders, radius, and focus ring against Input in the same family and mode;
- that invalid Textarea, Native Select, and Input borders all use `--destructive` at 2px or more;
- that clicking any of the 11 enabled labels focuses its control;
- that ArrowDown changes a Native Select value;
- that the chevron is `aria-hidden` and does not intercept pointer input;
- disabled and `fieldset`-disabled dimming;
- that `multiple` hides the icon;
- that the icon mirrors in right-to-left layout;
- required-marker and error-text contrast of at least 4.5:1;
- forced colors, with `double` invalid borders and no shadows;
- the query gate and reflow at 320 CSS pixels.

The existing 30 keyboard cases now also check the Dialog close control:

- its accessible name is "Close", and it contains one `aria-hidden` SVG;
- its `sr-only` label is visually hidden in preview and in every consumer;
- its target is at least 24×24 CSS pixels;
- at 320 CSS pixels the target still meets that size, and the title does not overlap it;
- focus entry, Tab containment, Escape, and focus return pass as before, and the axe scan reports no violations.

The integration suite adds 21 real-CLI cases (`tests/integration/form-controls-cli.test.ts`). Eighteen cover each new component in Vite and Next across all three families:

- dry-run writes nothing;
- `lucide-react@1.55.0` appears in the dependency plan only for Native Select;
- applying writes the compiled bytes with ownership hashes;
- an identical repeat is a no-op;
- a custom UI alias works (exercised by the 9 Next.js cases only);
- TSX and CSS edits each conflict, even with `--yes`;
- `package.json` and the lockfile are unchanged.

Three cases cover migration:

- When `ui-style.css` is stale but unedited, `add textarea` exits 4 with a message naming `theme add` with the absolute path of the project's `ui-preset.json`. That printed path works as pasted, including from outside the project with `--cwd`. That command restores the exact compiled stylesheet, and `add textarea` then succeeds.
- An edited stylesheet remains a plain conflict.
- A legacy text-close `dialog.tsx` conflicts, and deleting it before `add dialog` installs the `XIcon` version.

The consumer matrix installed `label`, `textarea`, and `native-select` after the existing components. It then built every npm, pnpm, Yarn Classic, modern Yarn (node-modules and Plug'n'Play), and Bun text and binary lockfile consumer. Plug'n'Play builds therefore resolved `lucide-react` through Native Select and Dialog.

## Dependency and lockfiles

`lucide-react` is pinned exactly to 1.55.0 under the ISC license, with React peer range `^16.5.1 || ^17.0.0 || ^18.0.0 || ^19.0.0`. Only Dialog and Native Select declare it. It is pinned in the catalog, preview, and both framework fixtures, and all 11 fixture lockfiles were updated.

Every text lockfile diff adds only `lucide-react`. npm 11.19.0 writes six `@tailwindcss/oxide-wasm32-wasi` nested entries even when it regenerates from unchanged inputs. Those entries were removed, so the npm locks differ only by `lucide-react`, and `npm ci` passes with them. The two `bun.lockb` files changed in binary form.

## Intentional byte changes

Catalog release `0.1.0` was changed in place, and `packages/compiler/test/fixtures/style-baseline.json` records the update under `intentionalChanges`:

- `components/ui/dialog.tsx` is identical in every family. Its hash changed from `a0de9903…` to `0bc4bfc0…` when it adopted `XIcon` and a Tailwind `sr-only` "Close" label. Supported projects use Tailwind v4, which provides `sr-only`.
- Each family's `styles/ui-style.css` changed:
  - flat gained Input invalid styling and the icon close control, changing from `74b995d9…` to `a7572bd7…`;
  - neo-brutalism gained the same two changes, changing from `17b2401a…` to `c1fb3f65…`;
  - minimalist gained only the icon close control. It is now `9947e718…`, and its earlier hash is not in the baseline fixture.

Byte hashes are pinned for the flat and neo-brutalism baseline artifacts and for recipe output. Badge and Card TSX and CSS, and the minimalist and component-preset artifacts, are shown unaffected by compiling the new components alongside them and by their sources being unchanged. Full hashes for the changed and new artifacts are in `form-controls-run.json`. Existing installations migrate as described in [local usage](../foundation-local-usage.md#migrating-installs-created-before-native-form-controls).

## Limits

The run measured automated checks in one Chromium build, version 156 through the Edge channel, on Windows. It did not cover:

- manual assistive-technology review, such as NVDA, VoiceOver, or human keyboard review;
- application-level accessibility certification;
- contrast for arbitrary preset colors;
- bundled Chromium, Firefox, or Safari;
- the Native Select option popup, which the browser renders. It follows the page's `color-scheme` and was not styled or measured.

Liquid glass is unavailable for Label, Textarea, and Native Select. Component-scoped presets and recipes remain Button-only.

See the [Label](../components/label.md), [Textarea](../components/textarea.md), and [Native Select](../components/native-select.md) documents, the [approved design](../superpowers/specs/2026-10-25-native-form-controls-design.md), and the [implementation plan](../superpowers/plans/2026-10-25-native-form-controls.md).
