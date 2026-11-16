# Open issue backlog: final verification

Date: 2026-11-16. Rebased on main cd5ae3caa3715a99942501e292da685babca3157, retaining its dependency updates.

Passing final checks under Node 24.19.0:

- Schema/catalog regeneration, package build and workspace TypeScript check.
- Six compiler baseline files: 70 tests passed after recording only the intentional Dialog observer source change.
- Five integration files: 21 tests passed (upstream schema/transport, audit policy, consumer matrix, preview fonts, component-preset evidence).
- Unsuppressed pnpm 11.25.0 audit: no known vulnerabilities.
- Full diff whitespace check.
- Final review: its unmanaged system-font notice finding was reproduced, fixed, verified by all four planner tests, and confirmed resolved by the reviewer.

Per-issue records preserve earlier CLI/consumer/browser runs, including 85 component cases, two glass cases and both font audit editions. Those browser runs preceded the dependency-only rebase.

## Windows verification limits

The initial post-rebase full run recorded 4,535 passed, 12 failed and four skipped. Eleven failures were older Dialog baseline hashes, now corrected and verified. The remaining cache-capacity test exceeded 60 seconds.

Ordinary PowerShell execution then stalled. Native cmd and pinned Node execution worked. The desktop pnpm launcher selected Node 24.22.1, so final checks used Node 24.19.0 directly, including pnpm's JavaScript entry point for the audit.

A fresh unit sweep excluding the 27-test snapshot-cache.test.ts file completed in 369.19 seconds: **4,515 passed, five failed, four skipped; 250 files passed and three failed**. All five failures came from the existing Windows cache ACL PowerShell subprocess:

- hosted-code-input.test.ts: explicit pinned offline recipe use.
- recipe-cache.test.ts: verified keys and shared capacity accounting.
- snapshot-input.test.ts: explicit offline hit and corrupt offline envelope.

The excluded cache file was attempted separately; live ACL subprocess checks also failed/stalled, and that diagnostic run was stopped. No cache safeguards were weakened or production cache code changed. A healthy PowerShell runtime is required before claiming a green full suite.

Full foundation and specimen audit gates were not run. No public glass snapshot publication round trip is claimed: automatic approval review rejected a persistent production POST/read-back; read-only deployment/site/API evidence was collected.

The PR is a draft pending clean Windows cache verification.
