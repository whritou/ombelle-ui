# Technical foundation evidence

20 October 2026. This is the local foundation support record, not an alpha release or an accessibility certification.

## Verified scope

Button, Dialog, and Input; flat and neo brutalism; light/dark; pnpm consumers in independent Vite and Next.js App Router applications. Windows local execution uses Node 24.19.0, pnpm 11.25.0, and Microsoft Edge's Chromium engine 155.0.4283.62 through Playwright 1.64.1. CI is configured for Ubuntu and the pinned Playwright Chromium browser, but a hosted CI run has not been performed because this branch has not been pushed.

## Latest complete local gate

Command: `pnpm check:foundation`, with `OMBELLE_BROWSER_CHANNEL=msedge` locally. All nine stages passed: package build, unit tests, subprocess integration, preview generation, consumer preparation, typecheck, preview build, four consumer builds, and browser checks.

- 61 unit tests passed; zero failed or skipped.
- 6 integration tests passed; zero failed or skipped.
- 16 browser tests passed; zero failed, skipped, or flaky.
- Four independent consumer applications built and passed production dependency audits.
- Installed component, utility, usage, and style files matched canonical compiler bytes and recorded hashes. Consumer source and manifests contained no Ombelle workspace imports/dependencies.

[Machine-readable run](latest-run.json) records exact timing, source HEAD at run start, runtime/browser versions, stage exits, and counts. The saved final run records clean committed source 3c4093f after all review fixes; later documentation commits only preserve this evidence. Temporary raw logs, install provenance and audit reports live under `.artifacts/`; HTML/trace output lives under `playwright-report/` and `test-results/`.

| Requirement | Evidence |
| --- | --- |
| Schema/semantic validation | `packages/contracts/test/validate.test.ts`; CLI invalid-JSON and missing-field subprocess cases |
| Deterministic normalized artifacts | `packages/compiler/test/compile.test.ts`; key order, default resolution, duplicate IDs, selected styles, input-boundary rejection |
| Browser/Node hashing | Every browser parity case recomputes the canonical manifest hashes using browser Web Crypto |
| Preview and installed parity | Four family/mode cases compare exact specimen PNG bytes, normalized DOM and computed styles across preview, Vite, and Next |
| Preset persistence | Separate executable processes initialize a neo brutalist project, add Button/Dialog, then add Input without another preset flag |
| Source ownership | Edited installed source conflicts with exit 4 even with --yes; untracked files are not silently adopted |
| CSS preservation | Theme tests retain unrelated declarations, comments, selectors and imports; repeated application is a no-op; modified managed values or !important priorities conflict; an edit during planning is rejected without erasure |
| Dry-run | Subprocess fixture-tree comparison confirms no writes; planner paths do not invoke the package manager |
| Paths and concurrency | Real Windows junction escape, traversal/collision, stale metadata/source, and independent child-process lock-holder checks |
| Recovery | Injected mid-write and subprocess dependency failures restore owned source/config, preserve evidence and distinguish dependency uncertainty |
| Runtime independence | Consumer preparation/builds use ordinary local source and registry-independent runtime packages |
| Accessibility behavior | 12 app/family/mode keyboard flows with closed/open axe scans, portal colors, focus entry/trapping/restoration, Escape, Input labels and focus rings |

## Direct operator browser review

In addition to the test runner, Codex operated the in-app browser against the live preview. In all four style/mode combinations, accessibility observations confirmed initial focus on Confirm, Tab to Close, Tab wrapping back to Confirm, Shift+Tab wrapping to Close, Escape dismissal, and focus returning to Open dialog. A screenshot review confirmed the visible focus ring and themed form. This is agent-operated interactive review, not a human or screen-reader audit. The in-app browser version was not captured; the automated browser version above was captured from the running browser.

## Screenshots

The screenshots are generated test evidence, not separately styled mockups.

- [Flat light](images/flat-light.png)
- [Flat dark](images/flat-dark.png)
- [Neo brutalism light](images/neo-brutalism-light.png)
- [Neo brutalism dark](images/neo-brutalism-dark.png)

## Distribution and dependency boundaries

The pinned shadcn 4.22.1 API installed a generated standard registry item in a disposable fixture. It also performed dependency operations directly, so the production CLI uses the narrow independent planner/application fallback. See [adapter decision](../decisions/0002-registry-adapter.md).

The root development graph contains one acknowledged high advisory: braces 3.0.3, [GHSA-vfj7-8cjw-p6xm](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm), with no published patch at verification. It is reached through the development-only upstream shadcn probe. The probe uses fixed reviewed local inputs and is not imported by the production CLI. The four standalone consumer production audits passed. A clean consumer audit must not be described as a clean full development dependency tree. No npmscan maintainer/provenance coverage is claimed because that connector was unavailable.

## Limits and review status

Only the declared foundation matrix is verified. Other package managers, minimalist/glass, JSX, React Native, a production editor/site, public snapshots and package publication remain future work. No NVDA, VoiceOver, TalkBack, broader browser matrix or hosted CI evidence is claimed. Vite emits a non-blocking warning when bundling React server/client directives into browser-only output; Next.js preserves its client boundary and builds successfully.

The independent whole-branch review identified four Important findings. All were reproduced by failing tests and fixed in one pass: CSS snapshot consistency, React/ReactDOM compatibility, managed priority provenance, and component path/import consistency. Eight new regression cases passed with the full gate. No Critical findings or deferred minors remain from that review. See [review and decision record](foundation-review.md). Exact React/ReactDOM 19.3.1 declarations are the supported baseline; ranges and older or mismatched versions are rejected before writes.

Local Button recipe installation has separate [verification evidence](local-button-recipes.md), covering the complete existing matrix plus pinned component appearance across themes.
