# Upstream probe dependency remediation (#20)

Date: 2026-11-15. Node 24.19.0, pnpm 11.25.0, Windows.

The primary [deepmerge advisory](https://github.com/advisories/GHSA-gcqx-w48m-w2h4)
still lists no patched release. Registry metadata reports deepmerge 4.3.1 as
latest; shadcn 4.23.0 and `@shadcn/registry` 0.2.1 still require `^4.3.1`.
Downgrading or forcing an incompatible version was not used.

The development-only shadcn dependency and runtime adapter were removed.
Compatibility checks now use the published upstream registry JSON Schemas with
recorded sources, hashes and MIT license. The loopback check validates index,
components and theme payloads, preserves exact source bytes, and rejects planted
malformed payloads. The existing genuine shadcn Vite/Next Radix/Base fixture checks
continue to exercise installation paths, source, alias/CSS preservation and
conflicts. This verifies the standard registry/source contract without claiming
execution of the removed upstream installer implementation.

Both old advisory exclusions were removed. Before pruning the dependency chain,
the unsuppressed workspace audit failed with 9 findings (2 low, 7 moderate).
After removing 227 packages and applying the frozen lockfile:

- `pnpm install --frozen-lockfile --ignore-scripts`: passed.
- `pnpm audit:workspace`: passed, **No known vulnerabilities found**.
- Registry and pinned style unit checks: 9 tests passed.
- Upstream schema/transport, audit policy and genuine shadcn fixture integration:
  12 tests passed across 3 files.
- Package build and workspace typecheck passed.

The audit has no advisory exclusions or severity threshold. TLS verification and
disabled lifecycle scripts remain in place. The result covers the configured
workspace lockfile including development and transitive dependencies at this run;
it is not a claim about unknown vulnerabilities or every standalone consumer.
No npmscan maintainer/provenance analysis is claimed: that connector was unavailable.
Schema-file provenance and integrity are checked locally against the retained manifest.
