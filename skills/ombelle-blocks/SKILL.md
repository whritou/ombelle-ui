---
name: ombelle-blocks
description: Use when the user asks for a login, settings, pricing or dashboard page or section built with Ombelle UI, or to install an Ombelle block such as login-01, settings-01, pricing-01 or dashboard-01 and wire it into their app.
---

# Install and wire an Ombelle block

A block is a composed section built only from Ombelle components. Blocks need `@ombelle-ui/cli` 1.1.0 or later, and the project must already be initialized with a preset (see `ombelle-install`).

## Get the CLI version

Read `cliVersion` from `https://ombelle-ui.vercel.app/api/v1/catalog` and confirm the block is in `blocks[]` with `installable: true` and a `minimumCli` the version meets. If the catalog is unreachable, use the version on `https://ombelle-ui.vercel.app/docs/getting-started`. A CLI older than 1.1.0 answers `UNKNOWN_COMPONENT` for a block id; run the catalog's version instead. Use `ombelle-choose` when you are unsure which block fits.

## Install loop

Same loop as `ombelle-install`: dry run with `--json`, show the plan, `--yes` only when `status` is `planned`, the exit code is 0 and no warning has `resolutions`, stop and ask on `status: "conflict"` or `FILE_CONFLICT`, finish with `doctor --json`.

```bash
npx @ombelle-ui/cli@<version> add <block> --dry-run --json
```

```bash
npx @ombelle-ui/cli@<version> add <block> --yes
```

```bash
npx @ombelle-ui/cli@<version> doctor --json
```

A block writes `blocks/<id>.tsx` and `<id>.css` next to the components directory (by default `src/components/blocks/`) and installs the components it uses. Block and component ids can share one command. `--beside` is refused for a block's own files; if a component it needs exists unmanaged, resolve that conflict with the developer as `ombelle-install` describes. A component the developer edited is kept as it is and reported as `BLOCK_COMPONENT_EDITED`; that is a notice, not a conflict.

## Wire it in

Blocks take no props. Each block file exports one component with no props (`Login01`, `Settings01`, `Pricing01`, `Dashboard01`), installed at `@/components/blocks/<block>` by default.

1. Read the installed block file and the block's `docs.markdown` from the catalog before changing anything.
2. Render the component from the page or route the developer named, importing it from the block file.
3. Copy, links and the example handlers (such as `exampleData` and `showExampleNotice`) live in the block file and are meant to be edited there. Tell the developer that editing it makes the file `edited`, so a later `update` reports `FILE_CONFLICT` for it until they choose `--overwrite <path>` or keep their version.

## Auth and data are example-only

The catalog entry's `exampleOnly` list names the parts that are examples (sign-in, form handling, plans, accounts, metrics). Keep them marked as examples until they are replaced with real code. They do not authenticate, store or fetch anything. Keep them marked as example in code and comments, and never present them as working. When the developer connects real auth or data, replace the example parts in their own code and say what was replaced. Do not add fake credentials, tokens or endpoints, and do not remove the example marking before the real implementation exists.

Liquid glass in a block's preset: say `Accessibility not guaranteed`.
