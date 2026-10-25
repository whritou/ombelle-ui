# Card verification

The Card work is based on current `main` at `295d048ec3a2eb1eda8f185e3f4ad3a62e8afe02`. Its foundation-audit integration was verified on Windows with Node 24.19.0 and pnpm 11.25.0. The run covered the rebased Card implementation and test updates at `205096a7b58d95c3cd67fc5f972cb86f827681ca`; the final evidence validator timeout fix is `31f046614bd710456e7bcaae84b7958af0b141f8`.

## Foundation verification

The normal `pnpm check:foundation` launcher failed before starting a stage because this machine's `tsx` preload called `os.userInfo()` and received `uv_os_get_passwd ENOMEM`. The unchanged `scripts/check-foundation.mjs` then ran through the local esbuild loader workaround. The temporary ignored `tsx.cmd` and `tsx.ps1` launchers were restored byte-for-byte after the run.

All ten foundation stages passed: package build, 201 unit tests, 242 integration tests, preview generation, preparation of 34 consumer projects, typecheck, preview build, all 34 consumer builds, 148 browser tests, and workspace audit. The browser suite had zero skipped, flaky, or failed cases. Its complete details and raw result hashes are in the [machine-readable run record](card-run.json).

The first gate process exited 1 during its final evidence aggregation: the separate `vitest list packages` inventory subprocess exceeded its original 60-second bound after all stages had passed. I raised that bounded subprocess timeout to 180 seconds. Re-running the exact quality and consumer evidence validators against the saved stage outputs passed with 201 unit assertions, 242 integration assertions, and all 148 browser cases. The stage run was not repeated after this timeout-only change, so this record distinguishes the completed stage run from the successful post-run evidence revalidation.

The browser runner completed all assertions, then required stopping the 13 identified run-owned preview/consumer listeners before it exited cleanly. No tests were skipped and the raw Playwright result reports exit 0. The normal pnpm launcher limitation remains specific to this Windows environment; the workaround ran the same foundation script and stages.

## Card coverage

The full browser matrix includes 30 Card cases: three style families × light/dark × preview, pnpm Vite, pnpm Next, npm Vite, and npm Next. It verifies compiled source and generated artifact parity, fixture DOM and computed style parity, default/dense spacing, forced colors, escaped text, the `?cards=1` query gate, and 320 CSS pixel reflow. The Card suite uses the foundation audit's worker-local serialized browser-reference cache and render-condition keys. It retains page-local locators for each assertion.

The six focused real-CLI cases cover Vite and Next across all three families. They verify no-write dry-runs, default/custom aliases, artifact bytes and ownership hashes, existing file preservation, repeat no-ops, and separate TSX/CSS edit conflicts even with `--yes`. The complete consumer matrix also prepared and built npm, pnpm, Yarn Classic/modern/PnP, and Bun text/binary lockfile consumers. Card added no dependency versions and no generated consumer references to the supplied logos.

## Assets and limits

The three supplied logo PNGs remain byte-identical repository assets under `assets/`. They are not imported by Card or copied to preview/consumer outputs. SHA-256 hashes are recorded in `card-run.json`.

Card is a presentational container with native props, no built-in interaction, and no client boundary. The run does not establish application-specific accessibility certification, manual keyboard or screen-reader review, contrast assurance for arbitrary preset colors, broader browser-engine coverage, publishing, editor integration, or support for liquid glass. Card recipes and component-scoped presets remain outside this slice.

See [Card API and installation](../components/card.md), the [approved design](../superpowers/specs/2026-10-25-card-design.md), and the [implementation plan](../superpowers/plans/2026-10-25-card-catalog-extension.md).
