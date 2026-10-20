# Registry adapter decision

20 October 2026. Tested shadcn 4.22.1 and its documented shadcn/registry API against a loopback registry and disposable pnpm Vite fixture. A generated Button item passed the upstream schema and installed component/utility source and CSS variables/rules. The app alias remained @/lib/utils. The operation changed package dependencies as part of installation; addRegistryItems has no documented dry-run/skip-dependency boundary matching Ombelle's strict plan contract.

Decision: keep the upstream schema and source/theme transport, but implement the narrow Vite/Next path/alias transformation and reviewed CSS merge in Ombelle. Production CLI code must not import the upstream probe. The probe remains a development integration check with only local reviewed registry payloads.

The selected primitive edition is Radix; the fixture upstream style identifier is radix-nova, accepted by the pinned API. Ombelle's styleFamily remains separate and never replaces components.json.style.

Audit limitation: the development-only shadcn toolchain pulls braces 3.0.3 through fast-glob/micromatch. GHSA-vfj7-8cjw-p6xm / CVE-2026-93687 reports deeply nested-pattern stack exhaustion and no patched version as of this check. Root installs run with lifecycle scripts disabled for this probe. No untrusted glob patterns are supplied by the experiment. This is an acknowledged development dependency risk, not a clean full-tree audit; the production CLI does not depend on shadcn/braces. See https://github.com/advisories/GHSA-vfj7-8cjw-p6xm . Recheck before release.
