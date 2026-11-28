# Ombelle UI

Source-distributed React components with persistent, shareable presets. You pick a style, tune its tokens in the
[hosted editors](https://ombelle-ui.com), and a guarded CLI writes plain TSX and CSS into your project. You own
the installed source; nothing from Ombelle runs in your app.

- **63 components**, each in two editions (Radix and Base UI).
- **8 style families**: flat, minimalist, neo brutalism, ombelle, papier, organic, retro futurism and liquid glass.
  Every family covers every component. Liquid glass is stable, and its accessibility is not guaranteed because text
  contrast depends on the background behind it; see [liquid glass](docs/components/liquid-glass.md).
- **Presets and recipes** that you publish from the editors and install by an immutable code
  (`ps_<32 hex>@1` for presets, `rc_<32 hex>@1` for component recipes) or from a JSON file.
- A CLI with `init`, `add`, `update`, `preset apply`, `theme add`, `preset show`, `info`, `doctor` and `diff`
  ([CLI specification](docs/05-cli-specification.md)). It plans first, shows every file and dependency change, and
  refuses to overwrite edited files.

The six workspace packages are version **1.1.3**. The installer is published as `@ombelle-ui/cli@1.1.2` on
[npm](https://www.npmjs.com/package/@ombelle-ui/cli). What is promised to stay stable at 1.0 is
written down in the [1.0 public contract](docs/1.0-public-contract.md); the open decisions are in
[1.0 decisions](docs/1.0-decisions.md).

## Use it

You need Node 24.19.0 or a newer Node 24, a Vite React TSX or Next.js App Router TSX app with Tailwind v4, and
`react` and `react-dom` declared at the version the CLI accepts (see [CLI specification](docs/05-cli-specification.md);
the CLI refuses unsupported projects before writing anything). npm, pnpm, Yarn (Classic 1.22 and 4) and Bun 1.4.3 are
supported package managers. Workspaces are not supported. Evidence is measured in Chromium only; see
[support and evidence](#what-is-measured).

```powershell
npx @ombelle-ui/cli init --preset ps_<code>@1 --cwd . --dry-run
npx @ombelle-ui/cli init --preset ps_<code>@1 --cwd .
npx @ombelle-ui/cli add button dialog --cwd .
```

Copy the exact command, with your code, from a published code page or editor. Without a hosted code, pass a local
JSON file from the editor's download instead of the code, with a path that starts `./` so it is not read as a code. Existing shadcn projects: `theme add` merges the palette
and tokens into your stylesheet; `add` of a component that shadcn already installed (for example `button`) conflicts with
shadcn's file unless you install beside it. See [local usage](docs/foundation-local-usage.md) and
[installation and theme merging](docs/10-installation-and-theme-merging.md).

Supported shadcn `components.json` styles: `radix-nova`, `new-york`, and the eight `base-*` styles. Other
`radix-*` styles and the React Aria base are read for palette themes only; `add` refuses them.

Hosted codes resolve at `https://ombelle-ui.com` through a read API documented in
[Hosted API v1](docs/hosted-api-v1.md). Installed components need no Ombelle service.

## Repository map

| Path | Contents |
| --- | --- |
| `packages/contracts` | Schemas, shared types, validation |
| `packages/catalog` | Reviewed component templates, styles and built-in presets |
| `packages/compiler` | Resolves presets and compiles deterministic artifacts |
| `packages/cli` | The installer: inspect, plan, apply |
| `apps/www` | The website, both editors and the hosted snapshot API |
| `apps/preview`, `fixtures/` | Generated previews and consumer fixtures |
| `docs/` | Product docs, contracts, CLI behavior, decisions, operations |

Only `@ombelle-ui/cli` is published. The `@ombelle/*` workspace packages are private and have no public JavaScript API.

## Develop

Use Node **24.19.0** and pnpm **11.25.0** (`corepack enable`).

```powershell
pnpm install --frozen-lockfile --ignore-scripts
pnpm build:packages
pnpm generate:preview
pnpm dev:preview   # generated components at http://127.0.0.1:4173
pnpm dev:www       # the website and editors at http://127.0.0.1:3000
```

`pnpm typecheck`, `pnpm test:unit` and `pnpm test:integration` are the quick checks. Unit tests default to at most four
workers (`OMBELLE_TEST_WORKERS`), integration tests to four (`OMBELLE_INTEGRATION_WORKERS`). `pnpm test:specimen-audit`
measures every component specimen. See [AGENTS.md](AGENTS.md) for the source and generated-file rules.

## What is measured

`pnpm check:foundation` is the complete evidence gate. It builds packages, runs unit and integration tests, builds the
preview, prepares and builds **54** standalone consumers (npm and pnpm on Vite and Next.js for every stable family, Yarn
Classic, modern Yarn and Bun rows for flat and minimalist, two liquid glass rows and two font rows), and runs a
**1,185-case** browser matrix across 21 specs plus the specimen audit. It needs registry access and the toolchain
below. The quality group installs the published 1.0 CLI from npm for `tests/integration/blocks-older-cli.test.ts`, so it
needs npm registry access too.

- Browser evidence is Chromium only (Windows, and bundled Chromium in Linux CI). No Firefox, Safari, native text zoom,
  NVDA or VoiceOver results exist, and no manual assistive-technology review has been recorded
  ([accessibility review](docs/accessibility-review.md)).
- Browser parity covers npm and pnpm consumers. Yarn and Bun rows are installation, source parity, audit and production
  build checks.
- The specimen audit covers all 8 families, both editions and both modes
  ([evidence](docs/evidence/specimen-audit.md)).
- Evidence is recorded per run with its environment in `docs/evidence/`. Counts above come from
  `scripts/consumer-matrix.ts` and `scripts/foundation-evidence.mjs`.

For the full gate also install [Bun 1.4.3](https://github.com/oven-sh/bun/releases/tag/bun-v1.4.3), npm 11.19.0, both
pinned Yarn versions and the test browser:

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

On a machine with Microsoft Edge, set `OMBELLE_BROWSER_CHANNEL=msedge` for a local run; otherwise the gate uses
Playwright's bundled Chromium. `OMBELLE_BUN_EXECUTABLE` and `OMBELLE_NODE_EXECUTABLE` point at explicit executables.

## Documentation

- [1.0 public contract](docs/1.0-public-contract.md) and [1.0 decisions](docs/1.0-decisions.md)
- [CLI specification](docs/05-cli-specification.md) and [local usage](docs/foundation-local-usage.md)
- [Presets and contracts](docs/04-presets-and-contracts.md), [Hosted API v1](docs/hosted-api-v1.md)
- [Component docs](docs/components/usage-examples.md), [liquid glass](docs/components/liquid-glass.md),
  [fonts](docs/fonts.md)
- [Installation and theme merging](docs/10-installation-and-theme-merging.md)
- [CLI release procedure](docs/cli-release.md) and [changelog](CHANGELOG.md)
- [Hosted deployment](docs/hosted-deployment.md), [production operations and runbooks](docs/production-operations.md),
  [snapshot service operations](docs/snapshot-service-operations.md)
- [Decisions](docs/decisions), [evidence](docs/evidence) and [local playground](docs/local-playground.md)
- [Agent evals](docs/agent-evals.md): the opt-in measurement of coding agents installing Ombelle

## Contributing and license

Contributions are welcome. Read [CONTRIBUTING.md](CONTRIBUTING.md) and the [Code of Conduct](CODE_OF_CONDUCT.md)
first. Ask questions in [Discussions](https://github.com/whritou/ombelle-ui/discussions), and report security issues
privately as described in [SECURITY.md](SECURITY.md). Ombelle UI is released under the [MIT License](LICENSE); see
[NOTICE](NOTICE.md) for attribution.
