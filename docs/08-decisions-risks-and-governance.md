# Decisions Risks and Governance

## Initial architecture decisions

These decisions form a proposed baseline. Accept or revise them through short architecture decision records during M0.

| Decision | Recommendation | Reason and consequence |
| --- | --- | --- |
| D01 Distribution | Editable source through a shadcn-compatible registry | Preserves customization and familiar install conventions; updates need conflict handling |
| D02 Language | React TSX first, generated JSX before beta | Fits the requested ecosystem; conversion requires independent consumer checks |
| D03 Behavior | One Radix-based edition first | Keeps APIs and testing manageable; Base UI and React Aria need later adapters |
| D04 Styling | Semantic tokens and reviewed slot recipes | Separates visual families from interaction behavior; unique markup needs migration |
| D05 Preset persistence | Local normalized JSON plus provenance lock | Future installs are stable and do not depend on a live website |
| D06 Export parity | Shared compiler and artifacts | Makes preview-to-install consistency testable |
| D07 CLI reuse | Thin product orchestration over tested upstream integration | Avoids unnecessary installer duplication; isolate and pin upstream behavior |
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
| Style combinations multiply QA | Unreviewed states accumulate | Catalog maintainer limits stable matrix and uses clear experimental labels |
| Glass reduces readability or responsiveness | Contrast fails over backgrounds or mobile scroll slows | Designer and reviewer require opaque fallback and declared background fixtures |
| Upstream changes break installer | Pinned adapter fixture fails during upgrade | CLI maintainer isolates adapter and upgrades intentionally |
| Local edits are lost | Reinstall replaces an untracked or modified file | CLI maintainer enforces hashes, plans and conflict stops |
| Native scope overwhelms first release | Web-specific APIs leak into native code | Tech lead estimates a separate adapter after the four-component spike |
| Public snapshot endpoint is abused | Publish traffic or oversized input spikes | Service maintainer applies strict schemas, limits and rate controls |

## Decisions still open

Confirm final product name, npm namespace, registry domain, team and launch budget, exact primitive edition and package versions, the meaning and priority of native variants, and whether liquid glass must be stable for the initial public release.

Also decide open-source licensing and any future commercial model, supported fonts, public snapshot retention and abuse handling, the mobile device matrix, and the long-term compatibility window. None requires blocking the first local technical spike. Resolve publication and licensing choices before external distribution.

## Licensing and provenance

shadcn/ui's published repository license is MIT; see S14. Treat this as a source provenance requirement rather than assuming every dependency or asset has the same terms. Preserve applicable copyright and permission notices in redistributed source and maintain a dependency and asset inventory.

Choose this project's own license explicitly. MIT is a reasonable candidate for an open component foundation, with any later paid assets clearly separated, but this is a product decision. Avoid implying affiliation with shadcn or using a name that suggests official endorsement. Check the final name and asset rights before release.

## Ownership and contributions

Assign a maintainer to each public contract, the compiler, CLI, catalog, editor, and release process. A component change needs behavior and style review; accessibility-sensitive changes need the relevant evidence updated. A contract change needs migration impact and export-parity review.

Require contributions to include source, metadata, examples, state fixtures, documentation, style support and licenses. Do not accept a screenshot-only component submission into the stable catalog. Keep dependency additions deliberate and explain their size and runtime effects.

## Agent skills roadmap

Agent-facing documentation should read the current project configuration before suggesting commands, discover the actual supported component API, reuse existing components, preserve local edits, and respect the saved preset. A skill should never invent a property because another UI system has one.

Evaluate skills against practical tasks: build a labelled form, compose a settings block, change a project preset, install a scoped recipe, and handle a local modification conflict. Compare task completion and regressions with and without the skill. Keep the skill's supported CLI and catalog range explicit. This documentation package specifies that future work; it does not install an agent skill.
