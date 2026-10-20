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

For the complete check, use npm **11.19.0** as well. Install that version and the pinned test browser, then run:

~~~powershell
npm install --global npm@11.19.0 --ignore-scripts
pnpm exec playwright install chromium
pnpm check:foundation
~~~

On a machine with Microsoft Edge already installed, set OMBELLE_BROWSER_CHANNEL to msedge for a local run. CI uses Playwright's bundled Chromium. The gate builds packages, runs unit/subprocess checks, prepares eight standalone consumers using frozen fixture locks, checks types, builds all apps, and compares pixels, normalized DOM, computed styles, hashes, keyboard behavior, and axe results. It needs npm registry access for installation/audit; installed components need no Ombelle service.

- [npm consumer support](docs/evidence/npm-consumer-support.md)
- [Local CLI usage](docs/foundation-local-usage.md)
- [Foundation design](docs/superpowers/specs/2026-10-20-technical-foundation-design.md)
- [Implementation plan](docs/superpowers/plans/2026-10-20-technical-foundation.md)
- [Verification evidence](docs/evidence/foundation.md)
- [Registry adapter decision and development advisory](docs/decisions/0002-registry-adapter.md)
- [Product requirements and alpha roadmap](docs/01-product-requirements.md)

The CLI is local and private; its npm namespace and public registry domain are not published. npm and pnpm are verified consumer managers. Yarn, Bun, the third stable style, the wider catalog, and broader browser/screen-reader review remain alpha work. React Native, accounts, remote snapshots, and the production editor are separate milestones.

The development-only upstream shadcn probe has an acknowledged unpatched braces advisory. Ombelle's production installer uses a narrow independent application path, preserving upstream registry format compatibility. Read the adapter decision before treating a full dependency audit as clean.
