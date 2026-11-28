# Decisions Risks and Governance

## Initial architecture decisions

These are the baseline decisions recorded during M0, with their current status. The open decisions for 1.0 live in [1.0 decisions](1.0-decisions.md); this file no longer keeps an open-decision list.

| Decision | Recommendation | Reason and consequence |
| --- | --- | --- |
| D01 Distribution | Editable source through a shadcn-compatible registry | Preserves customization and familiar install conventions; updates need conflict handling |
| D02 Language | React TSX first, generated JSX before beta | **Superseded.** TSX only; there is no JSX output and none is planned for 1.0 |
| D03 Behavior | One Radix-based edition first | **Superseded.** Radix and Base UI ship as two editions ([decision 0005](decisions/0005-base-ui-edition.md)); React Aria is not supported |
| D04 Styling | Semantic tokens and reviewed slot recipes | Separates visual families from interaction behavior; unique markup needs migration |
| D05 Preset persistence | Local normalized JSON plus provenance lock | Future installs are stable and do not depend on a live website |
| D06 Export parity | Shared compiler and artifacts | Makes preview-to-install consistency testable |
| D07 CLI reuse | Thin product orchestration over tested upstream integration | **Superseded** by [decision 0002](decisions/0002-registry-adapter.md): the CLI is an independent installer that stays registry-format compatible |
| D08 Editor scope | Structured controls before arbitrary code | Delivers customization with smaller execution and security complexity |
| D09 Native | Separate native HTML and React Native commitments | Prevents a web implementation from implying unsupported mobile compatibility |
| D10 Accounts | Account-free editing and local export first | Removes an early adoption barrier; shared snapshots are public |
| D11 Package managers | npm, pnpm, Yarn and Bun from alpha | Consumer choice is a launch requirement; keep the project's manager independent of its CLI runner |
| D12 Existing shadcn | Dedicated theme add command merging into configured global CSS | Add styling without reinitializing or reinstalling UI; persist the preset for later additions |

## Main risks

| Risk | Early signal | Mitigation and owner |
| --- | --- | --- |
| Product overlaps existing shadcn tools | Pilot users prefer the existing create flow | Designer tests distinct style and component editing value before catalog expansion |
| Preview differs from install | Screenshot or computed-style mismatch | Tech lead gates release on shared artifacts and fixture comparisons |
| Style combinations multiply QA | Unreviewed states accumulate | Catalog maintainer limits stable matrix and uses clear labels, such as "accessibility not guaranteed" for liquid glass |
| Glass reduces readability or responsiveness | Contrast fails over backgrounds or mobile scroll slows | Designer and reviewer require opaque fallback and declared background fixtures |
| Upstream changes break installer | Pinned adapter fixture fails during upgrade | CLI maintainer isolates adapter and upgrades intentionally |
| Local edits are lost | Reinstall replaces an untracked or modified file | CLI maintainer enforces hashes, plans and conflict stops |
| Native scope overwhelms first release | Web-specific APIs leak into native code | Tech lead estimates a separate adapter after the four-component spike |
| Public snapshot endpoint is abused | Publish traffic or oversized input spikes | Service maintainer applies strict schemas, limits and rate controls |

## Decisions still open

See [1.0 decisions](1.0-decisions.md). Resolved and no longer open: product name (Ombelle), npm namespace (`@ombelle-ui`), registry domain (`ombelle-ui.com`), primitive editions (Radix and Base UI), liquid glass (stable, accessibility not guaranteed), and the open-source licence (MIT). Team, launch budget, native variants, a commercial model and the mobile device matrix are outside 1.0 scope.

## Licensing and provenance

shadcn/ui's published repository license is MIT; see S14. Treat this as a source provenance requirement rather than assuming every dependency or asset has the same terms. Preserve applicable copyright and permission notices in redistributed source and maintain a dependency and asset inventory.

Choose this project's own license explicitly. The project is released under the MIT License (see `LICENSE`); any later paid assets would be clearly separated. Avoid implying affiliation with shadcn or using a name that suggests official endorsement. Check the final name and asset rights before release.

## Ownership and contributions

Assign a maintainer to each public contract, the compiler, CLI, catalog, editor, and release process. A component change needs behavior and style review; accessibility-sensitive changes need the relevant evidence updated. A contract change needs migration impact and export-parity review.

Require contributions to include source, metadata, examples, state fixtures, documentation, style support and licenses. Do not accept a screenshot-only component submission into the stable catalog. Keep dependency additions deliberate and explain their size and runtime effects.

## Agent support

Agent-facing documentation should read the current project configuration before suggesting commands, discover the actual supported component API, reuse existing components, preserve local edits, and respect the saved preset. A skill should never invent a property because another UI system has one.

What ships: `llms.txt` and `llms-full.txt`, a `.md` page for every guide, component and block, the catalog JSON at `/api/v1/catalog` (with the install rules), and five Agent Skills in `skills/` (`ombelle-install`, `ombelle-choose`, `ombelle-theme`, `ombelle-blocks`, `ombelle-check`), installed with `npx skills add whritou/ombelle-ui`. Every surface names the published CLI and repeats one install loop: dry run first, `--yes` only on a clean plan, ask the developer on conflicts, finish with `doctor`. An MCP server remains optional and is not built.

The opt-in agent evals ([agent evals](agent-evals.md)) score eight practical tasks, three runs each, before and after each surface: initializing with a preset, adding a login or settings block, switching the preset, stopping on a modified-file conflict, and asking for a preset when none was given. No measurements are recorded yet; keep claims about agent success tied to recorded runs. Keep the skills' supported CLI range explicit.
