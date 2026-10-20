# Sources

Primary references checked on 18 October 2026, with installation and theme integration references refreshed on 19 October 2026. The linked services can change. Pin actual dependencies during M0 and repeat integration checks before release. The recommendations and proposed contracts in this package are project design decisions, not features supplied automatically by these sources.

| ID | Reference | Relevance |
| --- | --- | --- |
| S1 | [shadcn introduction](https://ui.shadcn.com/docs) | Editable source, composition and code distribution model |
| S2 | [Registry introduction](https://ui.shadcn.com/docs/registry) | Publishing custom code through the upstream registry system |
| S3 | [Registry item specification](https://ui.shadcn.com/docs/registry/registry-item-json) | Standard item types, dependencies, files and CSS metadata |
| S4 | [Registry index specification](https://ui.shadcn.com/docs/registry/registry-json) | Registry catalog format |
| S5 | [CLI reference](https://ui.shadcn.com/docs/cli) | Existing init, add, apply, preset, dry-run and build commands |
| S6 | [Theming](https://ui.shadcn.com/docs/theming) | Semantic variables and existing visual theme builder |
| S7 | [shadcn create](https://ui.shadcn.com/create) | Existing visual project configuration surface |
| S8 | [Project configuration](https://ui.shadcn.com/docs/components-json) | Upstream aliases, style, TSX or JSX choice and registry configuration |
| S9 | [Tailwind theme variables](https://tailwindcss.com/docs/theme) | CSS-based theme mapping and variable references |
| S10 | [WCAG 2.2](https://www.w3.org/TR/WCAG22/) | Web accessibility criteria and conformance framework |
| S11 | [Radix accessibility overview](https://www.radix-ui.com/primitives/docs/overview/accessibility) | Primitive behavior and application responsibilities |
| S12 | [shadcn skills](https://ui.shadcn.com/docs/skills) | Existing agent integration and project-aware guidance |
| S13 | [React Native core components](https://reactnative.dev/docs/components-and-apis) | Separate native implementation foundation |
| S14 | [shadcn repository license](https://github.com/shadcn-ui/ui/blob/main/LICENSE.md) | Upstream license and notices |
| S15 | [shadcn JavaScript output](https://ui.shadcn.com/docs/javascript) | JSX as an upstream-supported output language |
| S16 | [Namespaced registries](https://ui.shadcn.com/docs/registry/namespace) | Namespace-to-registry configuration |
| S17 | [Registry examples](https://ui.shadcn.com/docs/registry/examples) | Standard registry:theme items and CSS variable payloads |
| S18 | [npm npx](https://docs.npmjs.com/cli/v11/commands/npx/) | Running a package binary without a permanent global installation |
| S19 | [pnpm dlx](https://pnpm.io/cli/dlx) | Temporary CLI execution; currently documented as an alias of pnx |
| S20 | [Yarn dlx](https://yarnpkg.com/cli/dlx) | Temporary execution and explicit package-to-binary selection |
| S21 | [Bun bunx](https://bun.com/docs/pm/bunx) | Explicit package selection and the --bun runtime flag |

The upstream documentation currently contains examples from different component generations, including older `new-york` configurations and newer base-specific styles. Do not combine snippets from different generations without checking the selected release. This package deliberately leaves the final exact upstream style identifier to the compatibility spike.

Source code fragments in the examples are original illustrations of the documented formats. No external implementation is bundled in this documentation pack.
