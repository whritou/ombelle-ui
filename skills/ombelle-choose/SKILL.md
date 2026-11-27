---
name: ombelle-choose
description: Use when the user needs a UI piece and has not named an Ombelle id, for example "I need a login page", "which Ombelle component for a date field", or "what does Ombelle have for pricing". Picks the right component or block from the live Ombelle catalog before anything is installed.
---

# Choose an Ombelle component or block

This skill only reads. It decides what to install; the `ombelle-install` skill (and `ombelle-blocks` for blocks) installs it.

## Get the catalog and the CLI version

Fetch `https://ombelle-ui.vercel.app/api/v1/catalog`. Its `cliVersion` is the version other Ombelle skills put in `npx @ombelle-ui/cli@<version>`. If that URL is unreachable, use the version on `https://ombelle-ui.vercel.app/docs/getting-started`, and read `https://ombelle-ui.vercel.app/llms.txt`, which lists every component and block with a link to its page.

The catalog holds `components[]` and `blocks[]`. Each entry has `id`, `name`, `description`, `category`, `installable`, `minimumCli`, `glass` and `docs.markdown` (a link to its Markdown documentation). Never rely on memory for ids: the catalog changes.

## How to choose

1. Prefer a block for a whole page or section: login, settings, pricing, dashboard. Blocks are composed from catalog components and save wiring many parts by hand.
2. Otherwise pick the component whose `description` and `category` match the need. If two fit, read each `docs.markdown` and prefer the one that already covers the behaviour (for example a combobox over a select plus a filter).
3. Skip any entry with `installable: false`, and tell the developer why.
4. Compare `minimumCli` with `cliVersion`. A block needs CLI 1.1.0 or later; if the developer's runner would be older, use the catalog's `cliVersion` in the command.
5. Check `glass`. Liquid glass is stable but its text contrast depends on the backdrop. Offer it only when the developer asked for it, and always say `Accessibility not guaranteed`.
6. Read the chosen entry's `docs.markdown` for props and usage before writing code that uses it.

## Report

Tell the developer the id, the one-line reason, whether it is a component or a block, and any caveat (`minimumCli`, `glass`). Then hand over:

- A component: follow `ombelle-install`.
- A block: follow `ombelle-blocks`.
- No preset in the project yet: `ombelle-install` asks for a preset code first.

If nothing in the catalog fits, say so. Do not hand-write a lookalike and call it Ombelle.
