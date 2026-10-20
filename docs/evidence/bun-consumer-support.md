# Bun consumer and runtime support evidence

20 October 2026. The full local foundation gate passed on Windows using Node 24.21.0, Bun 1.4.3, pnpm 11.25.0, npm 11.19.0, Yarn Classic 1.22.22, modern Yarn 4.18.1, and Microsoft Edge Chromium 155.0.4283.62. CI pins Node 24.19.0 and bundled Chromium; this local result does not establish a hosted CI result.

The retained [machine-readable run](bun-consumer-run.json) records source revision `3f9e35f6bdd311dad86365edb5a1e28f56b904e9` with `workingTreeDirty: true`: Task 5 changes were present during the run and committed afterward. Native executable paths have been reduced to filenames and relative log paths normalized to `/`; statuses, hashes, versions, timing, and source provenance are unchanged. Referenced `.artifacts` logs are local run outputs, not files embedded in the retained report.

| Framework | Owned lockfile | CLI runtime | Install, source parity, audit, Node build |
| --- | --- | --- | --- |
| Vite | `bun.lock` | Node / Bun | Pass in both cases |
| Vite | `bun.lockb` | Node / Bun | Pass in both cases |
| Next.js | `bun.lock` | Node / Bun | Pass in both cases |
| Next.js | `bun.lockb` | Node / Bun | Pass in both cases |

Each of the eight cases installed from a real committed Bun lockfile with frozen, script-free preparation, then ran the built JavaScript CLI directly through the recorded native runtime. The flow initializes a saved flat preset, adds Button and Dialog, and adds Input in a fresh process. It verifies canonical source hashes, preserved unrelated CSS, exact physically installed production dependencies, preset reuse, and exclusive ownership of the selected Bun lockfile. Frozen re-reading after additions proves both lockfile formats remain usable. Builds use Node, not Bun.

All nine gate stages passed: 67 unit tests, 96 integration tests, 24 browser tests, and nineteen consumer production builds and audits. No failures, skips, or flaky browser results were reported. The integration results include eight Bun matrix cases, one Node/Bun JSON/error parity case, one evidence-contract case, three Bun-hosted CLI cases installing through npm/pnpm/Yarn under verified Node, and thirteen native-runtime selection cases. Other Bun suites cover eleven detection, three metadata, seven installation/lifecycle, and thirteen configuration/recovery cases.

Bun 1.4.3 does not expose a production-only audit filter in its native command help. Each Bun case therefore uses `bun audit --json` against the entire dependency graph, including production dependencies, and requires exit zero with an empty advisory report. Both lockfile formats remain byte-identical across audit. This scope can also fail for development advisories. The existing browser scope remains preview/npm/pnpm; Bun and Yarn are covered by real installs and production builds.

## Support boundary

- Bun dependency installation is deliberately restricted to verified Bun 1.4.3. The built CLI can run under Node or Bun; JavaScript npm/pnpm/Yarn manager entries require native Node 24 at version 24.19.0 or newer. Explicit absolute overrides are `OMBELLE_BUN_EXECUTABLE` and `OMBELLE_NODE_EXECUTABLE`.
- Existing `bun.lock` or `bun.lockb` ownership is preserved. Ambiguous managers, workspaces, unsafe effective configuration, foreign lock emission, and requested dependencies confined to development/optional/peer groups are rejected. Bun 1.4.3 cannot reliably promote those groups with the planned flag, so move such a dependency into `dependencies` before retrying.
- Lifecycle positive controls independently confirm root and trusted-package hooks run normally; the adapter suppresses both without changing `trustedDependencies`.
- Raw-byte metadata detects binary lockfile changes. Dependency failures restore owned source and honestly report that package state may have changed, naming the selected Bun lockfile.
- Dry-run, theme-only, and no-op operations work with Bun unavailable. Public publication, `bunx` distribution, workspaces, and running framework builds exclusively under Bun are outside this evidence.

CI installs pinned Bun before the same gate and archives the Bun version/matrix alongside existing reports. Hosted success must be checked separately after a push.
