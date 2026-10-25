# Foundation audit improvements

The user approved implementation of all nine ordered recommendations from the evidence-based audit of main 9288c33. This document records that approved scope; routine implementation choices are settled in the execution ledger.

Preserve deterministic artifacts, installer dry-run and transaction safety, all 34 consumer cases, all 118 existing browser tests, source/parity/accessibility/state checks, and rejection of skipped/flaky/incomplete evidence. Improve cancellation diagnostics and stable artifact capture; separate setup budgets; remediate the five fresh advisories without inventing exploitability; fix provenance/revision validation; cache package stores using all relevant locks; measure controlled browser concurrency and reuse redundant references; isolate consumer inputs before bounded concurrency; split independent CI validation with strict final aggregation; remove verified dead code/dependencies and split unwieldy tests/evidence modules.

Use pinned Node 24.19.0, pnpm 11.25.0, npm 11.19.0, Yarn 1.22.22/4.18.1, Bun 1.4.3. Disable install lifecycle scripts. Keep the normal local pnpm check:foundation complete. Do not push, merge, publish, weaken audits, remove test coverage, or claim Linux/CI speedups from Windows measurements. No arbitrary case sharding is required: first preserve file-level test ownership and split CI into quality and consumer jobs with a required aggregator.

The final verification must include package builds, typecheck, unit/integration tests, preview and consumer builds and complete browser evidence where the available toolchain allows. Record actual measurements and environmental limits. CI workflow execution after a push is outside this local implementation request.
