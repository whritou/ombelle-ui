# Foundation review and execution decisions

20 October 2026. One fresh independent whole-branch review inspected d70be32..1026a5c and reproduced four Important issues in disposable apps. No Critical or Minor findings were raised. The implementer accepted all four and corrected them in one pass, commit 3c4093f. Eight new regression cases were observed failing before the fixes, then passing. No second review is claimed.

## Findings addressed

- CSS snapshot race — rejects an unrelated edit made during theme planning without erasing it; RED → GREEN.
- React/ReactDOM compatibility — rejects unsupported React pair (four cases); RED → GREEN.
- managed CSS priority ownership — conflicts when managed priority changes (both directions, legacy false record included); RED → GREEN.
- inconsistent component destination/import alias — rejects component destinations inconsistent with the import alias; RED → GREEN.

The final nine-stage gate passed on clean committed source 3c4093fb56390e0ec81c697238338d05c22876b0: 61 unit, 6 integration, 16 browser; zero failures, skips or flakies. See [exact run](latest-run.json). Evidence-only documentation commits follow that code commit.

## Rulings in original order

Each row preserves the ledger decision. The initial Node version assumption and pnpm launch-environment assumption were superseded by later verified rulings. Costs omitted from the original runtime correction: stricter environment compatibility and pnpm configuration maintenance.

1. Ruling: User selected a feature branch in the current folder — no worktree — isolation is branch-only and uncommitted files share the checkout.
2. Ruling: Skill shell scripts run through Git Bash; commands use bundled Node 24.21.0 because escalated PATH resolves an older host Node — exact runtime is pinned — using another Node can fail engines/certificate handling.
3. Ruling: npmscan connector tools are unavailable; use exact npm metadata, lockfile audit and reviewed lifecycle allowlist — no fabricated connector results — audit coverage is limited to registry advisories.
4. Task 1: Ruling: bundled executable is Node 24.19.0 (sandbox shim initially reported 24.21.0); pin the actual tested executable. pnpm 11 lifecycle policy belongs in pnpm-workspace.yaml.
5. Task 3: Ruling: CompileResult additionally exposes validated declarative ThemeData for CSS planning; keeps the CLI from reverse-engineering compiler CSS — single normalized source — costs a shared contract field to maintain.
6. Task 4: Ruling: use the spec-authorized narrow installer fallback; upstream addRegistryItems installed our item but performs package operations without a strict dry-run boundary — preserve public registry compatibility, own writes — additional alias/CSS maintenance is required.
7. Task 4: Ruling: accept braces GHSA-vfj7-8cjw-p6xm in the isolated development-only shadcn probe with trusted fixed input; no published fix exists — record advisory and keep shadcn outside production CLI — malicious development glob input could exhaust the process.
8. Task 7: Ruling: add explicit read preconditions for configuration, aliases and manager evidence to InstallPlan — source-only hashes do not catch metadata changes — more captured hashes, validated by stale-tsconfig test. Windows manager adapter uses the pnpm JS entry inherited from pnpm exec; no shell shim evaluation; document that local invocation requirement.
9. Task 8: Ruling: package builds disable tsconfig source aliases while retaining external package boundaries; the first real subprocess build exposed prettier resolution from an incorrectly inlined compiler — compile against declared package dependencies, not test-only aliases — package exports must stay aligned with builds.
10. Task 8: Ruling: pnpm 11 exec does not preserve npm_execpath on this host; resolve a known pnpm JS file or parse only a quoted dp0-relative script path from its trusted PATH shim, never evaluate command text — makes local invocation work on Windows — unrecognized shim formats produce an actionable error.
11. Task 9: Ruling: prepare one standalone app per framework/style (four apps, plus preview server) outside the workspace graph — separate global style sheets avoid cross-family CSS leakage — four consumer builds increase verification time. Use an installed Edge channel locally if Playwright browser downloads are unavailable; CI installs pinned Chromium.
12. Task 9: Ruling: compare normalized DOM trees with sorted attributes rather than HTML serialization order — React SSR/client place input type attributes in different orders with identical semantics — preserve tag/text/attribute values and exact screenshot equality.
13. Task 9: Ruling: Windows fixture install returned EPERM during a cached hard-link import; retry with package-import-method=copy succeeded — use copy for disposable consumers and early ownership markers for failed-run cleanup — higher temporary disk use. Frozen fixture locks and production audits are now checked on preparation.
14. Final: Ruling: constrain React and ReactDOM to the exact verified 19.3.1 pair, rejecting ranges and older pairs before writes; do not upgrade consumer React independently — avoids claiming untested compatibility — costs adoption friction until a wider version matrix is verified.
15. Final: Ruling: reject configured component paths inconsistent with the resolved import alias — preserve generated import resolution without inventing alias mappings — custom destinations require a matching components.json alias.
16. Final: Ruling: legacy managed priority records default to false; new records capture actual semantic priority — previous generator emitted non-important declarations — previously adopted important declarations require deliberate reinitialization rather than silent overwrite.
17. Final: Ruling: retain deferred managers, remote distribution, publication, native and additional catalog families — outside approved foundation — users cannot use those paths yet.
18. Final: Ruling: retain document-root theme scope and defer nested themed portals — approved matrix works — nested independently themed containers remain unsupported.
19. Final: Ruling: reject ambiguous managed blocks; do not claim arbitrary layered/conditional CSS cascade equivalence — narrow merge contract — complex existing CSS may require manual adaptation.
20. Final: Ruling: retain containment and stale-plan defenses without claiming adversarial OS-write race immunity — no reproduced supported-flow failure — a hostile simultaneous filesystem actor remains outside the guarantee.
21. Final: Ruling: hosted CI and wider browser/screen-reader certification remain unverified — local evidence is explicit — platform-specific failures can remain undiscovered.
22. Final: Ruling: keep the previously acknowledged development-only braces advisory decision — reviewer found no new exposure — trusted dev probe still carries denial-of-service risk.
23. Final: Ruling: leave cosmetic/API preferences unchanged — no demonstrated functional issue — future customization may need redesign.

## Deferred minors

None. Review exclusions were explicitly ruled on above; they are not presented as verified functionality.

## Review limits

The reviewer did not rerun the full gate, hosted Ubuntu CI, wider browser/screen-reader testing, or claim adversarial filesystem race immunity. The implementer ran the full gate after all fixes. The known development-only braces advisory remains documented in foundation.md.
