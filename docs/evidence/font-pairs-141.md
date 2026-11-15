# Font-pair deferred findings (#141)

Date: 2026-11-15. Each item was checked against current sources and the original
font-pairs design, rather than assuming the deferred list still described a bug.

| Item | Resolution |
| --- | --- |
| Unmanaged style notice omits rules | The notice now includes exact Fontsource imports plus the compiler's heading/mono rule block. |
| Older CLIs report 1.1 as resolution failure | Current CLI already supports 1.1; a real snapshot-resolution regression pins that. Unsupported future schemas now retain `UNSUPPORTED_RELEASE` and an upgrade action. Previously published binaries require upgrading; this PR cannot change their executable behavior. |
| System display font declares 1.1 | Correct by the accepted design: heading and mono fields are new, regardless of their values. Version 1.0 readers reject these fields. Added explicit system-heading/mono cases to preserve the contract. |
| Audit has stronger specificity | Audit rules now come from `fontRuleBlock` with the same specificity and render after specimen styles. Variable overrides only supply the selected audit fonts. |
| No real font installation test | Added a real CLI install from a project without fonts, checking exact package versions, CSS and woff2 assets, and that a postinstall marker never runs. |
| Missing font matrix rows | Added frozen `vite-fonts` and `next-fonts` pnpm rows after all existing rows, preserving prior IDs and ports. Source, physical dependencies, locks, audit and builds use the normal consumer path. |

The actual matrix before this change had 44 rows (including Papier), despite
older prose saying 40. It now has 46, with 44 stable rows and 220 component-preset
installs. Existing browser measurement inventories remain unchanged.

Verification on Windows, Node 24.19.0 and pnpm 11.25.0:

- Font notice, snapshot input, schema contract and preview-font checks: 86 tests passed.
- Explicit current-1.1 and unsupported-1.2/2.0 snapshot cases: 3 tests passed.
- Font CLI, matrix, consumer and recipe evidence files passed; component-preset
  evidence passed all 7 cases after updating the expected install count.
- Real font installation passed with lifecycle scripts disabled.
- Both font consumer preparations, production audits and framework builds passed
  through `foundation-consumers.test.ts` (2 selected tests, 372.12 seconds total).
- Both audit editions rendered Young Serif with the shipped rule specificity
  and 1.5 heading line height in Edge (2 browser tests).
- Package build and workspace typecheck passed.

This is focused evidence for the two new rows. The complete 46-consumer foundation
gate and Yarn/Bun font consumers were not run or claimed here. This record
supersedes the corresponding deferred entries in the original font-pairs evidence.
