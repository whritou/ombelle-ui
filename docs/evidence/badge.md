# Badge verification

23 October 2026. This records one M2 catalog extension, without awarding stable status to the full alpha catalog or certifying consumer applications.

## Source and environment

The complete final gate ran from clean committed source `0eb525d756f18847dffc0fa6f4ee30ac1c98eaa8` on Windows using Node v24.19.0, pnpm 11.25.0, npm 11.19.0, Yarn 1.22.22/4.18.1, and Bun 1.4.3. Browser checks used chromium 155.0.4283.62 through msedge.

Command: `pnpm check:foundation`. The local run set `OMBELLE_NODE_EXECUTABLE`, `OMBELLE_BUN_EXECUTABLE`, `COREPACK_HOME`, `OMBELLE_BROWSER_CHANNEL=msedge`, `NODE_EXTRA_CA_CERTS` to an ignored PEM containing public Windows trusted certificates, and `VITEST_MAX_WORKERS=4`. The ignored local npm 11.19.0 bin directory was prepended to PATH and its actual installer resolution was verified. Certificate validation stayed enabled. Earlier attempts exposed registry certificate trust failures, one parallel fixture timeout, and a system npm 11.4.1 mismatch. All required tool pins were checked before this complete final run; the trust-sensitive paths passed after preserving the certificate bundle through runtime sanitization and limiting workers.

The [machine-readable summary](badge-run.json) retains timestamps, source provenance, counts, each consumer's Badge artifact hashes, browser measurements, screenshot hashes, and the SHA-256 of the full local foundation report. This evidence and the image files were added after the run; product source was unchanged during verification. Full logs and broader foundation data remain under `.artifacts/`, with browser reports in `playwright-report/` and `test-results/`.

## Complete gate

All nine stages passed: 179 unit tests, 170 integration tests, and 118 browser tests. The final run had zero failed, skipped, or flaky checks. All 34 standalone consumers completed their production builds and audits.

| Stage | Exit | Duration |
| --- | --- | --- |
| build:packages | 0 | 2.0 s |
| test:unit | 0 | 16.0 s |
| test:integration | 0 | 232.5 s |
| generate:preview | 0 | 3.2 s |
| prepare:consumers | 0 | 1430.4 s |
| typecheck | 0 | 2.8 s |
| build:preview | 0 | 3.9 s |
| build:consumers | 0 | 190.4 s |
| test:e2e | 0 | 1133.7 s |

## Badge scope and results

- All 34 npm/pnpm/Yarn/Bun consumer descriptors installed Badge through the actual CLI runtime after ordinary components. The generated TSX, colocated CSS, and usage source matched canonical compiler bytes and recorded ownership hashes. Framework builds used Node; Bun retained the existing text/binary lock and runtime combinations, and Yarn retained Classic/modern linker ownership.
- Thirty Badge browser cases covered flat, minimalist, and neo brutalism in light/dark, across preview plus npm/pnpm Vite and Next.js. DOM, computed styling, and specimen pixels matched exactly. Yarn/Bun evidence covers installation, source parity, audit, and build; these rows are not described as browser tested.
- Rendered Badge source used native spans, forwarded class/title and React 19 refs, and escaped text. All measured normal-text contrast ratios met 4.5:1; the lowest recorded ratio was 6.47:1 for the exact built-in defaults. Each fixture's axe scan had no violations.
- Forced colors removed decorative shadows and showed the destructive variant with a double border at least 3px wide. The reviewer identified that the original 1px border was too thin; its new width assertion failed at 1px, then passed after the CSS correction across all six preview family/mode cases.
- Synthetic text enlargement doubled all four Badge labels at 320 CSS pixels, with no clipped Badge text or page overflow. This check exposed existing demo navigation overflow; wrapping the shared header fixed the measured failure while preserving desktop layout. Synthetic enlargement is distinct from native browser text zoom.
- Focused real CLI cases cover both frameworks and all three families with a custom component alias, no-write dry-run, repeat no-op, unchanged adjacent source/project defaults/manager files, and conflict stops after edits to either Badge TSX or CSS, including `--yes`.
- Legacy compiler artifact hash regressions passed. The separate Badge stylesheet leaves the established shared family stylesheet, utility, and existing component bytes intact. Standard registry output passed the pinned schema and retained exact component/CSS bytes.

## Review and limits

An independent read-only code reviewer found no Critical or Important defect. The thin forced-colors border finding was fixed and verified before the final committed run. Optional future coverage includes direct consumption from a Next.js server component and an actual upstream Badge installation before public registry release; current consumer fixtures use a client scenario, while the Badge template itself has no client boundary or hooks. Badge-specific upstream verification currently covers schema, artifact bytes, and reviewed pinned installer path handling.

The agent also opened all six generated family/mode preview views in the in-app browser and visually inspected the labels, long text, borders, rounding, and shadows. Its browser version was not captured; the automated browser version above was captured. This operator and screenshot review is not a human accessibility or screen-reader audit. Broader Chrome/Firefox/Safari/Edge coverage, native text zoom, NVDA, VoiceOver, arbitrary preset overrides, and consuming application accessibility remain separate review requirements. Public publishing, editor integration, Badge recipes, and independently scoped Badge presets are outside this slice.

## Screenshots

These images render generated Badge source and CSS, rather than separately styled mockups.

- [flat light](images/badge-flat-light.png)
- [flat dark](images/badge-flat-dark.png)
- [minimalist light](images/badge-minimalist-light.png)
- [minimalist dark](images/badge-minimalist-dark.png)
- [neo-brutalism light](images/badge-neo-brutalism-light.png)
- [neo-brutalism dark](images/badge-neo-brutalism-dark.png)
