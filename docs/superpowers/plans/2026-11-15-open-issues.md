# Open issues implementation plan

**Goal:** Resolve the open issue backlog sequentially and submit one PR.

**Architecture:** Fix source templates and shared logic, regenerate derived
artifacts, and preserve installer transaction and compatibility contracts.
**Tech stack:** TypeScript, React, pnpm, Vitest, Playwright.
**Requirements:** GitHub issues #139–143 and #20; repository AGENTS.md.
**Execution:** Implement in this session, one issue at a time as requested.

- [x] #142: preserve preview selections; browser regression and typecheck; commit 3e5eeac1.
- [x] #143: budget unit workers and synchronize publication tests; full unit suite and typecheck; commit d18c647a.
- [x] #139: reproduce each deferred component finding against current sources;
  add focused regressions, fix templates/editor behavior, build packages and
  run the affected component/browser tests; commit independently.
- [x] #140: verify glass limitations, fix remaining source and public catalog
  behavior; verify theme transitions and recipe halo; check hosted snapshot
  support and deployment state; commit independently.
- [x] #141: fix remaining font notices/versioning/cascade behavior, exercise a
  real CLI font install, add font consumers and update gate inventories;
  verify focused CLI/compiler/consumer checks; commit independently.
- [x] #20: recheck the advisory and upstream tooling, remediate without
  suppressing audit findings, run registry compatibility and workspace audit;
  commit independently.
- [ ] Run final relevant checks, review the complete diff, push the branch,
  create and attach a PR with issue links and exact verification limits.

Review focus: nested React fragments, explicit accessibility IDs, changes after
mount, installer scope/conflicts, and measured consumer inventory counts.
