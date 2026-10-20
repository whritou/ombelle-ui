# Yarn consumer support evidence

20 October 2026. The F11 Yarn slice adds real consumer coverage while keeping the repository on pnpm. The full foundation gate passed on Windows with Node 24.21.0, pnpm 11.25.0, npm 11.19.0, Yarn Classic 1.22.22, modern Yarn 4.18.1, and Microsoft Edge Chromium 155.0.4283.62. The repository pins Node 24.19.0; this local run used the available 24.21.0 patch release, so it does not replace the pinned-runtime CI result.

## Verified matrix

| Yarn | Linker | Fixture | Install, CLI flow, build, audit |
| --- | --- | --- | --- |
| 1.22.22 | `node_modules` | Vite | Pass |
| 4.18.1 | `node-modules` | Next.js | Pass |
| 4.18.1 | Plug'n'Play | Vite | Pass; no `node_modules` directory |

Each fixture was installed from its committed Yarn lockfile using frozen/immutable install behavior with lifecycle scripts disabled. The CLI initialized the saved flat preset, installed Button and Dialog, then added Input in a fresh process using the saved preset. Verification checked exact dependency installation, preserved unrelated CSS, lockfile ownership, no npm/pnpm lockfile, canonical installed-source hashes, production audit, and production build. The PnP build ran through Yarn. Modern Yarn uses `--mode=skip-build`; Classic uses `--ignore-scripts`.

The existing foundation run passed 67 unit tests, 36 integration tests, and 24 browser tests, with no failures, skips, or flaky results. All eleven consumer production builds and audits passed. The browser visual/keyboard matrix remains the existing preview + npm + pnpm matrix; Yarn is verified by real package installation and production build in all three linker rows.

Machine-readable local run output is written to `.artifacts/foundation-report.json` when running `pnpm check:foundation`. CI now prepares both pinned Yarn generations through Corepack before running the same gate. Bun and executing the CLI under Bun remain unsupported in this slice.

## Implementation notes

- The Yarn versions are pinned in each fixture's `packageManager` field and in CI setup.
- Classic consumers use the local CLI development-dependency route because Yarn Classic has no modern `dlx` command.
- Exact reviewed production dependencies are installed without package lifecycle scripts; theme-only and no-op paths do not invoke Yarn.
- The CLI preserves `yarn.lock`, does not create another manager's lockfile, and does not require `node_modules` under Plug'n'Play.
- The `OMBELLE_YARN_ENTRY` environment option provides an explicit, shell-free Yarn JavaScript entry for launchers that do not expose a usable inherited runner or PATH entry. Windows PATH lookup also recognizes direct JavaScript shims and the bounded Corepack form that targets `corepack.cjs`/`corepack.js` with the `yarn` argument; other command-script forms are not evaluated.
