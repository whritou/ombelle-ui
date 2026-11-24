# Liquid glass issue #140 review

Date: 2026-11-15. Every checklist item was checked against current sources.

| Item | Status |
| --- | --- |
| Opaque Tooltip arrow beside translucent content | Fixed: arrow fill uses the content's resolved material opacity, with opaque reduced-transparency and forced-color fallbacks. |
| Scoped Button halo depends on root tokens | Fixed: the shared listener checks the hovered surface's computed material, including recipe overrides. |
| Stable family switches strand colocated CSS | Fixed: planning refuses switches with installed CSS that differs in the target family, before writes. Existing source is preserved; the diagnostic explains removal/reinstallation. |
| Homepage says glass is soon/not yet | Already fixed before this branch: showcase says experimental and the homepage sample matrix uses contract-derived status. No homepage copy change was needed. |
| Hosted service needs redeployment | The old deployment instruction is stale: current main has a successful Vercel deployment and the public site serves the current glass/Papier catalog. Read-only API health is confirmed; public glass publication was not measured. |
| No public full support matrix | The homepage sample and per-card glass badges already existed. Added a full component-by-family table on `/components`, derived from contract status values. |

Verification on Windows with Node 24.19.0 and pnpm 11.25.0:

- Focused theme, filter and support-table unit files: 21 tests passed.
- Glass compiler, site family and support-table checks: 44 tests passed.
- Built CLI glass exit/reapply safeguards: 4 selected npm/pnpm integration tests passed.
- Edge browser: scoped halo with root halo/motion at zero and matching translucent
  Tooltip arrow opacity both passed (2 tests).
- Package build, preview regeneration and workspace typecheck passed.

Read-only production evidence:

- `https://ombelle-ui.vercel.app/components`: HTTP 200, glass experimental copy and Papier present.
- Missing snapshot read: HTTP 404 `SNAPSHOT_NOT_FOUND`, rather than storage-unavailable.
- GitHub reports Vercel success for main `cd5ae3caa3715a99942501e292da685babca3157`:
  https://vercel.com/<vercel-team>/ombelle-ui/CCa4MB77NceUA5C4SHnUwW1bELLJ

Automatic approval review rejected a proposed production POST/read-back because
it would create a persistent public snapshot. No snapshot was published and no
deployment was changed. The hosted evidence above is read-only; it does not claim
a measured public glass snapshot round trip.
