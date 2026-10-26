# Final M2 components verification

Checkbox, Switch, Tabs, and Tooltip complete the twelve-component catalog in flat, minimalist, and neo-brutalism. Their component-specific API and compiler checks precede this integration slice. On 26 October 2026, their fixtures, CLI tests, and browser specs were split into separate component files at the user's request. The user also instructed that tests must not be rerun, so the current split has not been automatically verified. Recorded passing outcomes below apply to the earlier combined layout. The single full foundation run was stopped during integration and did not complete. Liquid glass retains the existing experimental/unavailable compatibility matrix.

## Environment and reproducible commands

The 25 October 2026 run uses Windows x64 (10.0.26100), pinned Node 24.19.0 and pnpm 11.25.0, npm 11.19.0, Yarn Classic 1.22.22, modern Yarn 4.18.1, Bun 1.4.3, Playwright 1.64.1, and Chromium 156.0.4314.42 through the installed Edge channel. `OMBELLE_INTEGRATION_WORKERS=1` and the default two consumer workers limit concurrent framework/manager work.

The native Node executable is `.artifacts/toolchain/node-v24.19.0/node.exe`. Commands below use the pnpm entry `C:/Users/whrit/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/pnpm/bin/pnpm.mjs` through that executable. They name the current component-specific layout and are reproduction instructions, not a record of commands executed after the split. PATH exposes the pinned Node directory and npm's pinned `bin` directory; the CLI resolves `npm-cli.js` from PATH. The Node/Bun runtime overrides point to exact native binaries. `OMBELLE_NPM_ENTRY` below is a convenience for prerequisite commands, not a CLI resolver override. `npm_config_store_dir=D:/.pnpm-store` selects the existing authorized store. npm's error log level keeps the unrelated unknown `store-dir` environment warning out of strict version probes. All dependency operations retain lifecycle-script suppression.

```powershell
$env:PATH = (Join-Path $PWD '.artifacts/toolchain/node-v24.19.0') + ';' + $env:PATH
$env:OMBELLE_NODE_EXECUTABLE = Join-Path $PWD '.artifacts/toolchain/node-v24.19.0/node.exe'
$env:OMBELLE_NPM_ENTRY = Join-Path $PWD '.artifacts/toolchain/npm-11.19.0/node_modules/npm/bin/npm-cli.js'
$env:PATH = (Split-Path $env:OMBELLE_NPM_ENTRY) + ';' + $env:PATH
$env:OMBELLE_BUN_EXECUTABLE = Join-Path $PWD '.artifacts/toolchain/bun-1.4.3/package/bin/bun.exe'
$env:NODE_OPTIONS = '--use-system-ca --require="D:/Documents/GitHub/ombelle-ui/.artifacts/userinfo-shim.cjs"'
$env:NODE_USE_SYSTEM_CA = '1'
$env:NODE_EXTRA_CA_CERTS = Join-Path $PWD '.artifacts/toolchain/windows-system-ca.pem'
$env:OMBELLE_BROWSER_CHANNEL = 'msedge'
$env:OMBELLE_INTEGRATION_WORKERS = '1'
$env:npm_config_store_dir = 'D:/.pnpm-store'
$env:npm_config_loglevel = 'error'
function taskpnpm {
  & $env:OMBELLE_NODE_EXECUTABLE C:/Users/whrit/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/pnpm/bin/pnpm.mjs @args
}
taskpnpm build:packages
taskpnpm exec vitest run --config vitest.integration.config.ts tests/integration/checkbox-cli.test.ts tests/integration/switch-cli.test.ts tests/integration/tabs-cli.test.ts tests/integration/tooltip-cli.test.ts tests/integration/scenario-fixture.test.ts
taskpnpm generate:preview
taskpnpm prepare:consumers
taskpnpm build:preview
taskpnpm build:consumers
taskpnpm exec playwright test tests/e2e/checkbox.spec.ts tests/e2e/switch.spec.ts tests/e2e/tabs.spec.ts tests/e2e/tooltip.spec.ts
taskpnpm typecheck
taskpnpm test:unit
taskpnpm test:integration
taskpnpm check:foundation
```

The ignored `userinfo-shim.cjs` works around this machine's Windows `tsx`/`os.userInfo` ENOMEM by returning the username from the environment. TLS verification stays enabled: system CA support and an exported Windows trust-store PEM are supplied to child runtimes, including those that deliberately strip `NODE_OPTIONS`. No certificate check was disabled.

Pinned Yarn runtimes were primed outside the pnpm project with the pinned Node executable invoking `C:/Program Files/nodejs/node_modules/corepack/dist/corepack.js yarn@1.22.22 --version` and `yarn@4.18.1 --version`. The official Bun native package was fetched with `npm pack @oven/bun-windows-x64@1.4.3 --ignore-scripts`, extracted in the ignored toolchain folder, and verified to report `1.4.3`. npm's integrity-checked package extraction does not run its install script.

## Coverage

Each component now owns its fixture and opt-in query. Preview generation copies all four files separately. Generated consumers select them through named fixture options, and a single-component fixture does not import any of the other three new primitives. Each fixture mounts on the client after reading its query.

| Component | Shared fixture | Scenario query | CLI integration | Browser spec |
| --- | --- | --- | --- | --- |
| Checkbox | `checkbox-fixture.tsx` | `?checkboxes=1` | `checkbox-cli.test.ts` | `checkbox.spec.ts` |
| Switch | `switch-fixture.tsx` | `?switches=1` | `switch-cli.test.ts` | `switch.spec.ts` |
| Tabs | `tabs-fixture.tsx` | `?tabs=1` | `tabs-cli.test.ts` | `tabs.spec.ts` |
| Tooltip | `tooltip-fixture.tsx` | `?tooltips=1` | `tooltip-cli.test.ts` | `tooltip.spec.ts` |

Each browser spec defines **30** cases: three standard families × light/dark × preview, pnpm Vite, pnpm Next.js, npm Vite, npm Next.js. The four independent specs define **120 new cases**. Their authored assertions cover:

- exact compiled TSX, CSS, and example bytes in preview and installed consumers;
- normalized DOM and computed component/portal styles against preview;
- checkbox mixed/disabled/invalid states and its own successful form values/reset, plus switch off/on/disabled states and its own successful form values/reset;
- Tabs roles, panel associations, selected state, disabled-item skipping, automatic keyboard activation, horizontal/vertical orientation, and RTL arrows;
- Tooltip focus entry, delayed hover entry, description association, Escape dismissal with focus retained, and force-mounted content still present with `data-state="closed"` after Escape;
- the relevant component's interactive target sizes (at least 24×24 CSS pixels), visible focus, invalid borders, disabled dimming, family shadow treatments, light/dark selection, reduced-motion styles, and mirrored RTL switch movement;
- an axe scan with no rule exclusions, and the fixture's opt-in query boundary.

Each CLI file contains six real built-CLI cases (Vite/Next × three families), for 24 cases across the four files. A case plans and applies only its own component ID, checks its three exact artifacts and missing runtime dependencies, records canonical bytes and ownership hashes, preserves edited existing Input source/theme/manager/preset/config/unrelated CSS, repeats as a no-op, and requires TSX/CSS edit conflicts despite `--yes` (48 authored conflict checks overall). Next cases use a custom UI alias. Dependency declarations are preseeded immediately before apply to keep ownership checks offline. Checkbox expects its Radix package plus Lucide; the other three expect only their own Radix package. Independent enable/disable/copy checks live in `scenario-fixture.test.ts`.

Both Node-manager and Bun-manager consumer preparation install all twelve component IDs. Exact pinned fixture inputs and all eleven manager lockfiles include the four new primitives. The existing 34-row consumer matrix checks npm/pnpm, Yarn Classic, modern Yarn node-modules/Plug'n'Play, and Bun text/binary locks with Node/Bun CLI runtimes. Framework production builds use Node. The strict foundation inventory now requires `checkbox.spec.ts`, `switch.spec.ts`, `tabs.spec.ts`, and `tooltip.spec.ts` at 30 each, for **298 total browser cases**. Each identity has its own omission regression so adjusted reporter totals cannot hide a missing component suite. These inventory changes have not been executed after the split.

| Consumer manager/layout | Frameworks | Families | CLI runtime | Rows |
| --- | --- | --- | --- | --- |
| pnpm | Vite, Next.js | flat, minimalist, neo-brutalism | Node | 6 |
| npm | Vite, Next.js | flat, minimalist, neo-brutalism | Node | 6 |
| Yarn Classic / node_modules | Vite | flat, minimalist | Node | 2 |
| modern Yarn / node-modules | Next.js | flat, minimalist | Node | 2 |
| modern Yarn / Plug'n'Play | Vite | flat, minimalist | Node | 2 |
| Bun / text and binary locks | Vite, Next.js | flat, minimalist | Node and Bun | 16 |

Yarn/Bun rows cover installation, canonical source, audits and production builds. The browser comparison covers the twelve npm/pnpm rows plus preview; it does not expand Yarn/Bun browser support.

## Dependency versions

| Dependency | Version | Component scope |
| --- | --- | --- |
| `@radix-ui/react-checkbox` | 1.4.1 | Checkbox |
| `@radix-ui/react-switch` | 1.4.1 | Switch |
| `@radix-ui/react-tabs` | 1.2.1 | Tabs |
| `@radix-ui/react-tooltip` | 1.4.1 | Tooltip |
| `lucide-react` | 1.55.0 | Checkbox and previously importing Dialog/Native Select |
| `react` / `react-dom` | 19.3.1 | Shared runtime |
| `clsx` | 2.1.1 | Shared utility |
| `tailwind-merge` | 3.7.0 | Shared utility |

The new primitives retain the component reviews' MIT metadata; Lucide retains ISC metadata. This slice synchronizes already reviewed versions into preview and consumer inputs rather than adding further runtime libraries.

## Recorded outcomes

Before the component-specific split, focused verification passed package build, preview generation, typecheck, all 255 unit tests in 35 files, all seven combined CLI/fixture checks, preview build, preparation/audit/build of all 34 consumers, and all 30 combined browser cases. That browser reporter records 30 expected outcomes, zero unexpected, zero skipped, zero flaky, no reporter errors, and zero axe violations. Installed DOM, computed styles and canonical source matched preview in that earlier layout. Those results do not establish that the current four-file suites pass; no tests, builds, typechecks, or gates were rerun after the user's instruction.

The initial standalone `pnpm test:integration` run completed with **274 passed and one failed** across 39 files (275 tests). The sole failed test was `tests/integration/component-preset-preservation.test.ts > records and preserves existing usage files across successful scoped preset installs`: `Test timed out in 60000ms`, followed by `EBUSY` while removing `C:\Users\whrit\AppData\Local\Temp\ombelle-gAgIos`. That run overlapped consumer preparation. After both jobs finished, the unchanged test passed alone:

```powershell
pnpm exec vitest run --config vitest.integration.config.ts tests/integration/component-preset-preservation.test.ts
# 1 passed; duration 51.80s
```

The earlier failure remains a failed standalone run; the focused recheck does not turn it into a successful full integration run. Its raw report is preserved as `.artifacts/task5-standalone-integration-results.json`, with logs in `.artifacts/task5-integration.log` and `.artifacts/task5-preset-preservation-recheck.log`. The failed test's exact owned temporary directory was removed only after its processes exited and its resolved location/package marker were checked.

The first `pnpm prepare:consumers` attempt stopped at the first npm row with `Expected npm 11.19.0; found ... 11.4.1`. `OMBELLE_NPM_ENTRY` is not a supported CLI resolver override. Prepending npm 11.19.0's `bin` directory to PATH fixed selection; a direct `managerEntry('npm')` probe and `--version` confirmed the exact entry/version before the successful 34-row retry. The exact failed preparation output is retained in `.artifacts/task5-prepare-consumers.log`; the successful retry is `.artifacts/task5-prepare-consumers-retry.log`. The initial standalone integration run began before this PATH correction; it is separate from the final gate's pinned environment. npm regeneration also emitted the six known writer-only nested `@tailwindcss/oxide-wasm32-wasi` entries per npm lock. Those unrelated entries were removed, as in the native-form-controls slice; frozen `npm ci` and all npm consumer builds then passed with only the new component dependency graph added.

The single full `pnpm check:foundation` run started at `2026-10-25T21:48:22.026Z`, after focused checks and server cleanup, with no competing test/preparation job. It was stopped at the user's request while `test:integration` was active. `build:packages` and `test:unit` (255/255) had completed successfully; integration and later stages did not complete, so this is an interrupted gate rather than a passing full run. Existing logs are retained in `.artifacts/task5-foundation.log` and `.artifacts/logs/`. Static review covered the split files, independent query/copy paths, component-scoped CLI dependencies, and exact browser identities without running verification commands.

## Limits

Automated axe, keyboard, form, style and target checks are measured in one Windows Chromium build. Human NVDA/VoiceOver review, native browser text zoom, human visual review, Firefox/Safari, previous-major browsers, touch behavior and application-level accessibility review remain pending. Tooltip content stays non-interactive and does not carry essential instructions. Arbitrary preset color contrast, component-scoped presets beyond Button, remote registry publishing and glass are not established by this run.
