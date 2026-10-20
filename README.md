# Ombelle UI foundation

A local technical foundation for source-distributed React components with persistent presets. It includes Button, Dialog, and Input in flat and neo brutalist styles, generated previews, a local installer, and independent Vite/Next.js consumer checks.

Use Node **24.19.0** and pnpm **11.25.0**.

~~~powershell
pnpm install --frozen-lockfile --ignore-scripts
pnpm build:packages
pnpm generate:preview
pnpm dev:preview
~~~

Open [neo brutalism](http://127.0.0.1:4173/neo-brutalism/?mode=light) or [flat](http://127.0.0.1:4173/flat/?mode=light). The demo renders generated component source; change the local preset and regenerate to update it. This is a foundation preview, not the production editor.

For the complete check, also install [Bun **1.4.3**](https://github.com/oven-sh/bun/releases/tag/bun-v1.4.3), npm **11.19.0**, both pinned Yarn versions, and the test browser. Bun must be on PATH, or set `OMBELLE_BUN_EXECUTABLE` to its absolute native executable path. Prime Yarn outside this pnpm project:

~~~powershell
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
~~~

On a machine with Microsoft Edge already installed, set OMBELLE_BROWSER_CHANNEL to msedge for a local run. CI uses Playwright's bundled Chromium. The gate builds packages, runs unit/subprocess checks, prepares nineteen standalone consumers using frozen fixture locks (pnpm, npm, Yarn Classic, Yarn modern `node-modules`/Plug'n'Play, and eight Bun framework/lockfile/CLI-runtime combinations), checks types, and builds all apps. The existing browser matrix compares pixels, normalized DOM, computed styles, hashes, keyboard behavior, and axe results for preview/npm/pnpm. Bun coverage verifies real installs, source parity, and Node-based production builds. Bun's audit checks its whole dependency graph, including production dependencies. The gate needs registry access; installed components need no Ombelle service.

- [npm consumer support](docs/evidence/npm-consumer-support.md)
- [Yarn consumer support](docs/evidence/yarn-consumer-support.md)
- [Bun consumer and runtime support](docs/evidence/bun-consumer-support.md)
- [Local CLI usage](docs/foundation-local-usage.md)
- [Foundation design](docs/superpowers/specs/2026-10-20-technical-foundation-design.md)
- [Implementation plan](docs/superpowers/plans/2026-10-20-technical-foundation.md)
- [Verification evidence](docs/evidence/foundation.md)
- [Registry adapter decision and development advisory](docs/decisions/0002-registry-adapter.md)
- [Product requirements and alpha roadmap](docs/01-product-requirements.md)

The CLI is local and private; its npm namespace and public registry domain are not published. npm, pnpm, Yarn Classic 1.22.22, modern Yarn 4.18.1, and Bun 1.4.3 are verified consumer managers. Modern Yarn supports the verified `node-modules` and Plug'n'Play layouts. The built CLI runs under Node or Bun; existing npm/pnpm/Yarn manager scripts still require Node 24.19.0 or newer Node 24. Use `OMBELLE_NODE_EXECUTABLE` for an explicit absolute Node path. Bun retains text or binary lockfiles and rejects incompatible settings or dependencies that first need moving from a development-only group into production. Workspaces remain unsupported. The third stable style, wider catalog, and broader browser/screen-reader review remain alpha work. React Native, accounts, snapshots, and the production editor are separate milestones.

The development-only upstream shadcn probe has an acknowledged unpatched braces advisory. Ombelle's production installer uses a narrow independent application path, preserving upstream registry format compatibility. Read the adapter decision before treating a full dependency audit as clean.
