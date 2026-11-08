# Real-world installation report — 8 November 2026

The published Ombelle CLI successfully installed presets and ordinary components in six fresh Vite and Next.js projects after React versions were aligned. All 92 editor-recipe installations succeeded across the four Radix projects. All three Next.js production builds passed. All three Vite production builds failed on unused bindings in generated source. Reapplying a preset also produced a false ownership conflict in a plain Vite project.

This was a test and investigation task. No application or compiler fixes were made.

**Base UI is supported in 0.7.0.** All 23 ordinary catalog components tested here installed successfully in both Base UI projects, and their browser checks passed. The Next.js Base UI production build also passed. The Vite Base UI build failure is an unused-import defect in the generated Button, not an edition rejection. Only the separate editor-recipe (`add --recipe`) and scoped component-preset (`add button --preset`) paths remain Radix-only in the tested release. This distinction is explicit in `docs/decisions/0005-base-ui-edition.md` and enforced by `packages/cli/src/project/edition.ts`.

## Results

| Fresh project | Preset install | Ordinary components | Editor recipes | Default production build |
| --- | --- | --- | --- | --- |
| Next.js, without shadcn | Pass | 23/23 installed | 23/23 installed | Pass |
| Next.js, shadcn Radix | Pass | 23/23 installed | 23/23 installed | Pass |
| Next.js, shadcn Base UI | Pass | 23/23 installed | Unsupported; all 23 rejected safely | Pass |
| Vite, without shadcn | Pass | 23/23 installed | 23/23 installed | Fail: unused recipe bindings |
| Vite, shadcn Radix | Pass | 23/23 installed | 23/23 installed | Fail: unused recipe bindings |
| Vite, shadcn Base UI | Pass | 23/23 installed | Unsupported; all 23 rejected safely | Fail: unused React import |

Vite builds containing only ordinary components passed for the plain and shadcn Radix projects. The Base UI Button failed even without editor recipes.

The CLI matrix contained 188 checks: 187 matched their expected outcomes; the unexpected failure was the plain Vite preset reapply. Expected outcomes include compatibility rejections and file conflicts, so this count is not a count of successful installs. Production-build results are recorded separately above.

## Browser results

All 78 browser assertions passed across the six projects in Microsoft Edge 157.0.4341.42. The checks covered:

- Rendering every ordinary component and every successfully installed recipe in light and dark modes.
- Customized Badge text and background, and Button text and corner radius.
- Dialog opening, Escape dismissal, and focus restoration.
- Tabs keyboard navigation and checkbox interaction.
- Continued rendering of the original shadcn Button alongside Ombelle.
- A mobile smoke check at 390 × 844; no document-level horizontal overflow was observed.

No browser page exceptions were captured in these consumer runs. The hosted editor export run also captured no page exceptions.

**Vite qualification:** these browser checks used a separate `vite build` transpilation-only run after the default `tsc -b && vite build` command failed. They demonstrate runtime behavior; they do not make the default Vite production builds pass. No generated source was patched and the original TypeScript settings were restored after the isolated ordinary-component checks.

## Confirmed problems

### 1. Editor recipes fail the default Vite TypeScript build

With the scaffold's `noUnusedLocals` setting retained, `pnpm run build` reports:

```text
error TS6133: 'instanceId' is declared but its value is never read.
```

This affects 13 downloaded recipe components: Accordion, Alert, Avatar, Badge, Card, Dialog, Dropdown Menu, Progress, Separator, Skeleton, Table, Tabs, and Tooltip. Both plain Vite and Vite with shadcn Radix reproduce it.

The non-glass recipe wrapper unconditionally emits `const instanceId = React.useId()`, although these specimens do not use it. The corresponding source is `packages/compiler/src/component-recipe.ts:73`.

### 2. The Base UI Button fails the default Vite TypeScript build

With shadcn Base UI initialized and the upstream Button preserved using `--beside`, the generated Ombelle Button fails:

```text
src/components/ui/ombelle/button.tsx(2,13):
error TS6133: 'React' is declared but its value is never read.
```

This reproduces with ordinary components alone. The template is `packages/catalog/src/templates/base/button.tsx`.

### 3. Reapplying a preset falsely reports local edits

A minimal Vite project whose CSS initially contains only `@import "tailwindcss";` reproduces this immediately:

```powershell
npx @ombelle-ui/cli@0.7.0 init --preset PROJECT_PRESET --yes
npx @ombelle-ui/cli@0.7.0 theme add PROJECT_PRESET --dry-run --json
```

Initialization exits 0. The second command exits 4 with `Managed theme declaration was edited locally`, despite no intervening CSS changes. It identifies `:root/--shadow-y`, `.dark/--secondary-foreground`, and `@theme inline/--color-secondary-foreground`.

Inspection found that the CSS parser returns the last declaration value in each newly created block with a trailing newline, such as `"0px\n"`. The lock records `"0px"`. The exact value comparison in `packages/cli/src/plan/theme.ts:161` therefore reports a conflict. This failure did not occur in the tested shadcn CSS or Next.js CSS layouts. The rejected operation left CSS unchanged.

### 4. Fresh framework defaults require manual React alignment

All six projects were initially rejected with:

```text
Foundation requires exact react and react-dom 19.3.1 declarations;
align both versions before installing (ranges are not verified)
```

The Vite scaffold declares `^19.3.1`; the Next.js scaffold declares `19.3.0`. Testing continued after setting both declarations explicitly to `19.3.1` and reinstalling. In the Vite projects, `pnpm add --save-exact react@19.3.1 react-dom@19.3.1` alone preserved the existing ranges, so the manifest declarations were edited explicitly.

This is a documented installer restriction and a real onboarding obstacle, rather than an unexpected compatibility-policy failure.

## Compatibility and file safety

Existing shadcn Buttons were retained byte-for-byte in all four shadcn projects. An ordinary addition without a resolution first returned the expected conflict and left the source tree unchanged. Installing with `--beside src/components/ui/button.tsx` then succeeded.

Repeated ordinary additions and repeated Badge recipe additions left the source tree unchanged. Recipe installations preserved the saved project preset. Base UI recipe and scoped-preset attempts returned the documented unsupported-project error without source-tree changes. Scoped Button presets installed successfully in the four Radix projects.

## Environment and method

| Item | Tested version or scope |
| --- | --- |
| Operating system | Windows |
| Node used by the orchestration scripts | 24.19.0 |
| Package manager | pnpm 11.25.0 |
| Published installer | `@ombelle-ui/cli@0.7.0` |
| Vite scaffolder / installed Vite | `create-vite@9.3.4` / Vite 8.3.6 |
| Next.js scaffolder / installed Next.js | `create-next-app@16.4.5` / Next.js 16.4.5 |
| shadcn CLI | 4.23.0 |
| Editor source | `https://ombelle-ui.vercel.app` |
| Local checkout inspected | `432913b3558314f065cd78b4e47acb36d7b3d482` |

Two framework projects were scaffolded, then copied before installation to create plain, shadcn Radix, and shadcn Base UI variants. shadcn was actually initialized in each comparison project and its own Button was installed. The standalone projects live outside the Ombelle workspace and each has its own Git repository and committed test state.

The preset and all 23 recipes were downloaded through the live browser editors. The preset name and radius were customized; selected component content and appearance controls were also customized. The test invoked the independently installed published CLI package's JavaScript entry. It did not substitute the checkout's development CLI.

Dependency installations disabled lifecycle scripts. shadcn's initial certificate validation failure was resolved using Node's `--use-system-ca`; TLS verification remained enabled. The initial repository build invoked the app-bundled pnpm launcher, which reported Node 24.22.1; the subsequent orchestration scripts explicitly launched Node 24.19.0. shadcn's own child package-manager invocations may use the bundled launcher.

## Retained files

The complete logs, exported JSON, screenshots, and orchestration scripts are retained locally under:

```text
D:\Documents\GitHub\ombelle-ui\.artifacts\realworld-20261108
```

Key evidence files are `matrix.json` (Next.js rows), `matrix-vite.json`, `browser.json`, `vite-diagnostics.json`, `theme-diagnostic.json`, `repositories.json`, and `exports/index.json`. `matrix.json` also retains the initial Vite attempts where the package manager had left React ranges unchanged; the completed Vite results are in `matrix-vite.json`. These local artifacts are Git-ignored.

Each test repository is under this directory:

```text
C:\Users\whrit\.codex\visualizations\2026\11\08\01a1bbd4-18c5-73e0-ba99-6b0cad85a604\realworld-apps
```

| Repository directory | Committed test state |
| --- | --- |
| `vite-plain` | `efd79b008500c7ca889f6909df3cd03fb56c87cd` |
| `vite-shadcn-radix` | `fadf1b1065d730c8c43011310de90d7e45296f53` |
| `vite-shadcn-base` | `d93a649e6ea87babb1724267af2d2f623bc992dd` |
| `next-plain` | `c129c823f2a3f0812e047bf02ca45f3097c5e615` |
| `next-shadcn-radix` | `06f87f336f4000ce3b7976bb0779c9fbb8d3adc8` |
| `next-shadcn-base` | `4420c1a65d19919986ed588bd627d43038821cfc` |

The additional `vite-theme-repro` directory contains the minimal theme-conflict reproduction. No GitHub repositories or deployments were created.

## Limits

This run covers pnpm on Windows, one customized flat project preset, a neo-brutalism Button recipe, and flat recipes for the other 22 components. It does not establish parity for every style family, package manager, browser, or operating system. Browser assertions cover selected interactions and customized styles, not exhaustive accessibility or pixel parity. Immutable-code publication and installation were not tested; the editor path used downloaded JSON. The full foundation gate was not run.
