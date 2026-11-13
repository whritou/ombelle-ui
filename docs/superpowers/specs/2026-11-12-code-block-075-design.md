# Code Block

Sub-project 3 of the 0.7.5 work. It adds Code Block in the Radix and Base UI editions and all five style families, with a component-editor recipe, and replaces the website's own code block in the docs and editors. This work stacks on sub-project 2 (`2026-11-12-editor-inputs-075-design.md`); the shared conventions are in sub-project 1 (`2026-11-12-primitives-075-design.md`).

## Intent

The 0.7.5 design artifact (https://claude.ai/artifact/1FMRGWoyJSwht9wATT838U, page "0.7.5 proposal", boards `project/<Family>08Components.dc.html`, section 03) shows a command block with package-manager tabs and a file block with line numbers, both with Copy. Every Ombelle flow ends in a command or exported TSX and CSS: the docs, the editors' artifact views and the Get code dialog.

The website has its own version: `apps/www/src/site/components/code-block.tsx` (`CodeBlock`, `CommandTabs`, `CopyButton`) and the highlighter `apps/www/src/editor/components/code-highlight.tsx`.

Decisions taken in brainstorming (12 November 2026):

- **Highlighter:** the website's in-house highlighter moves into the catalog template. It has no dependency, runs synchronously, gives the same output on the server and in the browser, and covers TSX, CSS, JSON and shell. Consumers who want another highlighter pass already-highlighted children.
- **Surface:** dark in both colour modes in every family, as on the board.

The catalog goes from 52 to 53 components. Installing Code Block needs CLI 0.7.5.

## Component (`code-block`, client)

The package-manager row uses the Tabs primitive: `@radix-ui/react-tabs` (already pinned) in the Radix edition and Base UI `Tabs` in the Base UI edition. It uses Code Block's own slots, not the catalog Tabs styles.

### Parts

- `CodeBlock`, the root, with `CodeBlockHeader`, `CodeBlockTitle`, `CodeBlockCopy` and `CodeBlockCode`. `CodeBlock` renders all of them from its props; the parts are exported for custom layouts.
- `CodeBlockCommand`, the command block with package-manager tabs.
- `highlightCode(source, language)`, exported for consumers who render their own markup.

### `CodeBlock`

- **Props:** `code` (string, required: what Copy copies), `language` (`tsx`, `css`, `json`, `shell` or `text`, default `tsx`), `title` (the file name shown in the header), `lineNumbers` (default `true`), `maxHeight` (default `32rem`), `copyLabel` (default "Copy <title>", or "Copy code" without a title), `children` (replaces the highlighted output; `code` is still copied).
- **Header:** `CodeBlockTitle` shows `title`, then `CodeBlockCopy`.
- **Code:** `CodeBlockCode` renders `pre > code`. The `pre` takes `tabIndex={0}` and `aria-label` "<title> source" (or "Code"), and scrolls inside `maxHeight`.

### `CodeBlockCommand`

- **Props:** `args` (for example `@ombelle-ui/cli add button`), `managers` (default `['pnpm', 'npm', 'yarn', 'bun']`), `manager` or `defaultManager` (default the first), `onManagerChange`, `label` (the tab list name, default "Package manager").
- **Runners:** pnpm `pnpm dlx`, npm `npx`, yarn `yarn dlx`, bun `bunx`. The command shown and copied is `<runner> <args>`.
- **Tabs:** a `tablist` named by `label`, one `tab` per manager; arrow keys move between tabs and select them, Home and End jump to the ends. The command is the `tabpanel`.
- **Copy:** named "Copy command"; copies the full command for the selected manager.

### Highlighter

- `code-highlight.tsx` moves from the website into the template unchanged in behaviour: one regex alternation per language, applied line by line. `text` returns the source without tokens.
- Each token is a `<span data-token="…">` with one of `comment`, `string`, `keyword`, `tag`, `attr`, `number`, `property`, `punct` or `flag`.
- It never drops or reorders text: the concatenated text of the output equals the source for any input, which a test checks for every language.

### Line numbers

Each line is a `span` (`data-slot="code-block-line"`). Numbers come from a CSS counter in `::before`, so selecting or copying the code never includes them and screen readers do not read them. `lineNumbers={false}` sets `data-line-numbers="false"` and hides them.

### Copying

- `navigator.clipboard.writeText` on click. The label changes to "Copied" for 1.5 s, and a visually hidden polite live region announces "Copied".
- If the clipboard is unavailable or the write rejects, the live region announces "Copy failed" and the label stays "Copy".
- The timer is cleared on unmount.

## Styles

Each family gets `styles/code-block/<family>.css` from its board.

- **Surface colours:** slot-scoped custom properties on `code-block`, `--code-block-background` (`oklch(0.2 0.012 275)`) and `--code-block-foreground` (`oklch(0.93 0.005 275)`), the board's values in every family. Consumers can override them. The preset schema does not change.
- **Token colours:** start from the board: `keyword` and `tag` mix the family `--primary` toward the foreground (the board's `oklch(0.78 0.12 6)` in Ombelle), `string` is the board's green, `comment` is the foreground at 55 %, and line numbers at 40 %. Each token colour must reach 4.5:1 on the surface, and line numbers 3:1; the style generator lightens any that fail in a family and records the change in the evidence.
- **Family shape:** each family keeps its own border, radius and shadow from the board: the neo-brutalist offset shadow and square corners, the glass edge, the minimalist 1px border, the flat and Ombelle radius.
- **Header:** tabs and the file title are pills; the selected tab has the board's 16 % foreground fill. Copy is an outline pill aligned to the end.
- **Forced colours:** the surface uses `Canvas` and `CanvasText` with a visible border, the selected tab uses `Highlight`, and tokens fall back to `CanvasText`.

## Recipe and the component editor

| Props | Content |
| --- | --- |
| `mode` (`file` or `command`), `language`, `lineNumbers` (boolean) | `title`, `code` (up to 4000 characters), `args` |

`validateComposition` rejects a `command` recipe without `args` and a `file` recipe without `code`.

## Website

- `site/components/code-block.tsx` is replaced by the compiled catalog Code Block in its users:
  - the component docs page `app/components/[id]/page.tsx`;
  - `site/components/playground.tsx`;
  - `site/docs/guides.tsx`;
  - the editors' artifact views (`editor/components/code-view`).
- The Get code dialog's package-manager buttons (`aria-pressed`) and the command below them become one `CodeBlockCommand`, keeping the selected manager in the dialog's state.
- `apps/www/src/editor/components/code-highlight.tsx` is removed; its tests move to `packages/catalog/test/code-block.test.ts`.
- The site's code windows keep their dark look in both site themes, which the catalog surface matches.

## Preview scenes and gallery

- The Projects scene's project page shows an install `CodeBlockCommand` and a short `CodeBlock` of a config file.
- `fixtures/shared/preset-gallery.tsx` gets a Code Block section.

## Verification

Run and record the environment of each:

- `pnpm build:packages`, `pnpm typecheck`, `pnpm test:unit` and `pnpm test:integration`.
- `pnpm generate:preview` and `pnpm test:specimen-audit` limited to `code-block`, including the token contrast check in all five families and both modes.
- Unit tests: the ported highlighter tests, the text-preserving test for every language, and the same output from a server render and a client render.
- Browser tests in both editions:
  - arrow keys, Home and End move between the manager tabs and change the command;
  - Copy writes the right command for each manager and the file source for a file block, with a stubbed clipboard;
  - the live region announces "Copied", and "Copy failed" when the stub rejects;
  - the `pre` is named and scrolls with the keyboard;
  - a selection across numbered lines copies no line numbers.
- The website's docs and editor end-to-end tests, updated for the swap.
- Board comparison by computed styles in every family.
- `next build` First Load JS for the docs and editor routes, before and after.

## Documentation

- `docs/components/code-block.md`, including how to pass output from another highlighter as children.
- `docs/accessibility-review.md`: check rows for the tabs, the scrollable `pre`, the copy announcement and token contrast.
- docs/03, the README count (53), the CHANGELOG under Unreleased, and `docs/evidence/code-block-075.md`.

## Out of scope

- Languages beyond TSX, CSS, JSON and shell.
- Line highlighting, diffs, word wrap toggles and collapsing long files.
- A light code surface.
- Releases and the CLI version bump.
