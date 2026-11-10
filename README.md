# Ombelle UI foundation

The catalog now includes **44 components**. The unreleased 0.7.3 work adds
Spinner, Kbd, Empty, Field, Meter (with segmented progress), Stepper, Slider,
Toggle Group, Chip, Tag Input, Input OTP, Combobox, Command, Hover Card and
Context Menu, with
recipe editors and both editions; installing them needs CLI 0.7.3, which is not
yet published. See the [display components design](docs/superpowers/specs/2026-11-09-display-components-design.md).
Release 0.7.2 adds
Input Group, Sheet, Alert Dialog, Breadcrumb, Pagination and Toast, plus Tabs
underline/contained appearances, compact/striped Tables, semantic Alert intents,
outlined/subtle Cards and small/dotted Badges. These additions have recipe editor
controls and source exports. Install the new APIs with **0.7.2** or later. Source
components support both editions; CLI recipe installation remains Radix-only.
See the [batch design](docs/superpowers/specs/2026-11-08-forms-navigation-overlays-design.md)
and [implementation plan](docs/superpowers/plans/2026-11-08-forms-navigation-overlays.md).

A local technical foundation for source-distributed React components with persistent presets. It includes Button, Badge, Card, Checkbox, Dialog, Input, Label, Native Select, Switch, Tabs, Textarea, and Tooltip in flat, minimalist, neo brutalist, and ombelle styles, generated previews, a local installer, and independent Vite/Next.js consumer checks.

The six workspace packages are version **0.7.2**. The standalone public installer is published as `@ombelle-ui/cli@0.7.2` (run it with `npx @ombelle-ui/cli@0.7.2`); 0.2.0 is deprecated because it does not run through POSIX bin symlinks. Catalog/compiler compatibility remains **0.1.0**. Presets and Button recipes retain format **1.0**. The other 39 local catalog components use recipe format **2.0**; 29 components are available in CLI 0.7.2, and the eleven 0.7.3 components need 0.7.3.

Use Node **24.19.0** and pnpm **11.25.0**.

```powershell
pnpm install --frozen-lockfile --ignore-scripts
pnpm build:packages
pnpm generate:preview
pnpm dev:preview
```

Open [neo brutalism](http://127.0.0.1:4173/neo-brutalism/?mode=light) or [flat](http://127.0.0.1:4173/flat/?mode=light). The demo renders generated component source; change the local preset and regenerate to update it. This is a foundation preview, not the production editor.

The local Button editor runs in the product app with an isolated static preview. After building packages, run `pnpm dev:www`, then open [the Button editor](http://127.0.0.1:3000/editor/component/button). It offers flat, minimalist, neo brutalism, and ombelle presets at catalog/compiler 0.1.0; light and dark preview modes; Button variant, size, type, disabled, loading, and text controls; and bounded radius, border, minimum-height, and shadow-offset overrides. Only recipe fields are exported. Drafts and undo history stay in local browser storage, and invalid saved drafts can be downloaded for recovery. The output panel shows generated usage, component TSX, scoped CSS, dependencies, and a CLI command; **Download recipe JSON** saves the validated local recipe. To install, first initialize a project, then run the existing `add --recipe <local.json>` CLI command separately. An installed recipe ID and revision are immutable; increase the revision before installing changed content under the same ID. The editor also offers explicit public recipe publication, retry recovery and read-only sharing by immutable code; local exports remain available when the service is unavailable. Accounts remain outside this milestone. The hosted service runs at `https://ombelle-ui.vercel.app` and the installer is published as `@ombelle-ui/cli`; see the [CLI release](docs/cli-release.md). Editor-to-CLI export bytes and lock identity pass the focused integration check. The installed-browser parity case was measured passing for flat, minimalist and neo brutalism in light and dark modes using offline CLI-installed Vite consumers (ombelle's browser parity has not been measured yet); the latest full consumer-group result and the separate combined-gate failure are recorded in the [global preset editor evidence](docs/evidence/global-preset-editor.md).

The [minimalist preview](http://127.0.0.1:4173/minimalist/?mode=light) supports both `?mode=light` and `?mode=dark`. Add `&states=1` to inspect Button variants/sizes, Input states, and a long Dialog. Theme-only installation updates shared tokens and saved defaults; existing upstream component source retains its own styling.

The local [global preset editor](http://127.0.0.1:3000/editor/preset) uses the same product app and isolated preview runtime. Edit both palettes and project design tokens, inspect the forty-four-component gallery, and download `project-preset.json`. Apply it with the private local CLI's `init --preset` or `theme add`; later component additions inherit the saved preset. Draft recovery and undo/redo are local to this editor. JSON and CSS exports require a successful compile of the current draft; valid exports remain available if the preview server is unavailable. The editor also has explicit immutable snapshot publication and read-only sharing; published snapshots remain drafts and are publicly readable by exact reference. See [preset editor usage](docs/foundation-local-usage.md#local-global-preset-editor), [snapshot operations](docs/snapshot-service-operations.md), and [measured snapshot evidence](docs/evidence/immutable-preset-snapshots.md). Production hosting and the public CLI are recorded in [hosted deployment](docs/hosted-deployment.md) and the [CLI release](docs/cli-release.md).

For the complete check, also install [Bun **1.4.3**](https://github.com/oven-sh/bun/releases/tag/bun-v1.4.3), npm **11.19.0**, both pinned Yarn versions, and the test browser. Bun must be on PATH, or set `OMBELLE_BUN_EXECUTABLE` to its absolute native executable path. Prime Yarn outside this pnpm project:

```powershell
npm install --global npm@11.19.0 --ignore-scripts
corepack enable
Push-Location $env:TEMP
try {
  corepack yarn@1.22.22 --version
  corepack yarn@4.18.1 --version
} finally { Pop-Location }
bun --version # must report 1.4.3
pnpm exec playwright install chromium
pnpm check:foundation
```

On a machine with Microsoft Edge already installed, set OMBELLE_BROWSER_CHANNEL to msedge for a local run; otherwise the gate uses Playwright's bundled Chromium. The gate builds packages, runs unit/subprocess checks, prepares **40** standalone consumers using frozen fixture locks, checks types, audits, and builds the preview and consumer apps. The product app production build is checked separately. It retains the previous nineteen cases and adds fifteen minimalist cases: two npm, two pnpm, three Yarn (Classic and modern `node-modules`/Plug'n'Play), and eight Bun framework/lockfile/CLI-runtime combinations, plus four ombelle consumers (npm and pnpm, Vite and Next.js) and two pnpm liquid-glass consumers (Vite and Next.js). All framework builds use Node. The gate expects 676 browser cases across twenty specs, including sixteen downloaded-preset comparisons against private npm Vite/Next.js copies. Browser coverage compares pixels, normalized DOM, computed styles, hashes, keyboard behavior, and axe results for preview/npm/pnpm in both modes, measured for flat, minimalist and neo brutalism at the recorded evidence run; ombelle's full browser and consumer coverage is pending the foundation gate. Yarn/Bun coverage is installation, source parity, audit, and production builds. Bun's audit checks its whole dependency graph; other managers audit production dependencies. The gate needs registry access; installed components need no Ombelle service.

The gate also runs `pnpm test:specimen-audit`, which measures every catalog component as installed in all five families, both editions and both modes; see [specimen audit evidence](docs/evidence/specimen-audit.md).

Minimalist checks also measure rendered contrast, focus, disabled/invalid states, reduced motion, forced colors, and synthetic 200% font enlargement at 1100 and 320 CSS pixels. Synthetic enlargement is separate from pending native browser text zoom and human/screen-reader review. `.artifacts/consumer-matrix.json` records finalized per-consumer outcomes; `.artifacts/minimalist-measurements.json` retains the measured app/mode samples. The foundation report includes both, with local logs, screenshots, and traces under `.artifacts/`.

- [npm consumer support](docs/evidence/npm-consumer-support.md)
- [Yarn consumer support](docs/evidence/yarn-consumer-support.md)
- [Bun consumer and runtime support](docs/evidence/bun-consumer-support.md)
- [Minimalist scope and verification](docs/evidence/minimalist-style-support.md)
- [Component-scoped Button preset evidence](docs/evidence/component-scoped-button-presets.md)
- [Local CLI usage](docs/foundation-local-usage.md)
- [Badge API and installation](docs/components/badge.md)
- [Badge verification evidence](docs/evidence/badge.md)
- [Card API and installation](docs/components/card.md)
- [Label API and installation](docs/components/label.md)
- [Textarea API and installation](docs/components/textarea.md)
- [Native Select API and installation](docs/components/native-select.md)
- [Local Button recipe design](docs/superpowers/specs/2026-10-21-local-button-recipes-design.md)
- [Foundation design](docs/superpowers/specs/2026-10-20-technical-foundation-design.md)
- [Implementation plan](docs/superpowers/plans/2026-10-20-technical-foundation.md)
- [Verification evidence](docs/evidence/foundation.md)
- [Registry adapter decision and development advisory](docs/decisions/0002-registry-adapter.md)
- [Product requirements and alpha roadmap](docs/01-product-requirements.md)

The installer is published on npm as `@ombelle-ui/cli` (run `npx @ombelle-ui/cli@0.7.2`), and hosted codes resolve at `https://ombelle-ui.vercel.app`; see the [CLI release](docs/cli-release.md) for verified runners. The commands below use the repository checkout. npm, pnpm, Yarn Classic 1.22.22, modern Yarn 4.18.1, and Bun 1.4.3 are verified consumer managers. Modern Yarn supports the verified `node-modules` and Plug'n'Play layouts. The built CLI runs under Node or Bun; existing npm/pnpm/Yarn manager scripts still require Node 24.19.0 or newer Node 24. Use `OMBELLE_NODE_EXECUTABLE` for an explicit absolute Node path. Bun retains text or binary lockfiles and rejects incompatible settings or dependencies that first need moving from a development-only group into production. Workspaces remain unsupported. The local catalog includes forty-four components (twenty-nine in published CLI 0.7.2); wider catalog support and broader browser/screen-reader review remain alpha work. Liquid glass is experimental for all forty-four local components, and none is unavailable; see [liquid glass](docs/components/liquid-glass.md) for its limitations and [evidence](docs/evidence/liquid-glass.md). React Native and accounts remain separate milestones. See the [global preset editor evidence](docs/evidence/global-preset-editor.md) and [snapshot evidence](docs/evidence/immutable-preset-snapshots.md) for current verification outcomes.

The braces advisory affecting the development-only upstream shadcn probe was withdrawn on 23 October 2026 and is no longer active. Ombelle's production installer uses a narrow independent application path, preserving upstream registry format compatibility. Read the [adapter decision](docs/decisions/0002-registry-adapter.md) for the current workspace audit scope and limitations before treating a full dependency audit as clean.

Local component-scoped Button preset installation is available through the private built CLI after project initialization:

```powershell
pnpm exec node packages/cli/dist/main.js add button --preset ./examples/preset.example.json --cwd APP --dry-run --json
pnpm exec node packages/cli/dist/main.js add button --preset ./examples/preset.example.json --cwd APP --yes
```

The preset path is local JSON, resolved from the invoking directory. This installs a separate scoped Button and usage example while preserving the saved project preset, global theme, ordinary Button, and other components. It does not apply a global style pack. The implemented scope is one Button using flat, minimalist, or neo-brutalism tokens in the supported Tailwind v4 React TSX projects. Remote and saved preset codes, arbitrary CSS overrides, and portal components remain pending. See [local usage](docs/foundation-local-usage.md#component-scoped-button-presets) and [component-scoped Button evidence](docs/evidence/component-scoped-button-presets.md).

Local Button recipe installation is also available through the private built CLI after project initialization:

```powershell
pnpm exec node packages/cli/dist/main.js add --recipe ./examples/recipe.example.json --cwd APP --dry-run --json
pnpm exec node packages/cli/dist/main.js add --recipe ./examples/recipe.example.json --cwd APP --yes
```

A recipe installs its own `RecipeButton`, colocated CSS, and usage example. It preserves project defaults and the ordinary Button; importing the recipe component loads its styling. Only local recipes referencing exact built-in flat/minimalist/neo-brutalism presets are implemented. Remote recipe codes remain planned. Read the [local recipe usage and ownership rules](docs/foundation-local-usage.md#local-button-recipes) before installing into an existing project.

The [local Button recipe evidence](docs/evidence/local-button-recipes.md) records 102 installations across 34 consumers and 90 browser outcomes across host styles, recipe styles, modes, and applications.

Local component-scoped Button presets are also available after initialization:

```powershell
pnpm exec node packages/cli/dist/main.js add button --preset ./examples/preset.example.json --cwd APP --dry-run --json
pnpm exec node packages/cli/dist/main.js add button --preset ./examples/preset.example.json --cwd APP --yes
```

This installs a separate native `Button`, its scoped CSS, and an example under preset ID/revision paths. It preserves saved project defaults, global theme, ordinary components, and recipes. Import the generated preset Button to use it; later ordinary additions continue to use project defaults. The local JSON slice supports flat, minimalist, and neo brutalism with exact catalog/compiler 0.1.0. Saved remote codes, an editor flow for component-only presets, other scoped components, portals, nested independently themed subtrees, and arbitrary consumer CSS/style overrides remain outside this slice. See [local usage and conflicts](docs/foundation-local-usage.md#component-scoped-button-presets) and [measured evidence](docs/evidence/component-scoped-button-presets.md).
