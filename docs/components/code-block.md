# Code Block

Code Block shows read-only source with a Copy button: a file block with a title and line numbers, or a command block with one tab per package manager. Its surface is dark in both colour modes and every family, as on the 0.7.5 board. It is available in all five families, with Radix and Base UI editions; the template is a client component.

This component requires CLI **0.7.5** or later: `npx @ombelle-ui/cli@0.7.5 add code-block`. For a built local checkout:

```powershell
pnpm exec node packages/cli/dist/main.js add code-block --cwd APP --dry-run --json
pnpm exec node packages/cli/dist/main.js add code-block --cwd APP --yes
```

```tsx
import { CodeBlock, CodeBlockCommand } from '@/components/ui/code-block'

const source = "import { Button } from '@/components/ui/button'\n\nexport function Save() {\n  return <Button>Save</Button>\n}\n"

export function Install() {
  return <CodeBlockCommand args="@ombelle-ui/cli add button" />
}

export function SaveFile() {
  return <CodeBlock title="save.tsx" language="tsx" code={source} />
}
```

## Parts

`CodeBlock` renders the whole file block from its props. The parts are exported for a custom layout. They take explicit props and need no context, so they work in any order:

- `CodeBlockRoot`: the frame (`data-slot="code-block"`), the `div` that `CodeBlock` renders. It carries the surface colours and the family's border, radius and shadow, so wrap custom parts in it.
- `CodeBlockHeader`: the bar above the code (`code-block-header`).
- `CodeBlockTitle`: the file name pill (`code-block-title`).
- `CodeBlockCopy`: the Copy button (`code-block-copy`) and its live region (`code-block-status`).
- `CodeBlockCode`: `pre > code` (`code-block-code`), with one `code-block-line` span per line.

```tsx
import { CodeBlockCode, CodeBlockCopy, CodeBlockHeader, CodeBlockRoot, CodeBlockTitle } from '@/components/ui/code-block'

export function Config({ code }: { code: string }) {
  return (
    <CodeBlockRoot>
      <CodeBlockHeader>
        <CodeBlockTitle>ombelle.json</CodeBlockTitle>
        <CodeBlockCopy text={code} label="Copy ombelle.json" onCopied={(ok) => console.log(ok)} />
      </CodeBlockHeader>
      <CodeBlockCode code={code} language="json" label="ombelle.json source" />
    </CodeBlockRoot>
  )
}
```

## API and accessibility

### `CodeBlock`

- `code` is required. It is what Copy copies, and the highlighted source unless `children` is given.
- `language` is `tsx` (the default), `css`, `json`, `shell` or `text`. `text` adds line spans and no tokens.
- `title` is the file name in the header. Without it the header holds only Copy.
- `lineNumbers` defaults to `true`. `maxHeight` defaults to `32rem`; the code scrolls inside it, and a long line scrolls sideways inside the `pre`, not the page.
- `copyLabel` names the Copy button: "Copy <title>" by default, or "Copy code" without a title.
- Other `div` props go to the root.

### `CodeBlockCode`

- The `pre` is a Tab stop (`tabIndex={0}`) with `role="region"`, so it can be scrolled with the keyboard and is announced with its name. A `role` you pass takes precedence.
- Its name is "<title> source" inside `CodeBlock`, or "Code" without a title. On `CodeBlockCode`, pass `label`; an `aria-labelledby` you pass replaces the label.
- Every Code Block is a named region landmark, so several untitled blocks on one page all share the name "Code". Pass a `title` (or a `label`) to each block so they can be told apart; axe's `landmark-unique` rule reports duplicates as a best practice.

### Copy

- Copy calls `navigator.clipboard.writeText`. On success the label reads "Copied" for 1.5 s, and a visually hidden polite live region announces "Copied". A second click within 1.5 s restarts the timer.
- When the clipboard is missing (for example on an insecure origin) or the write rejects, the region announces "Copy failed", the label stays "Copy", and no error escapes.
- `CodeBlockCopy` takes `text`, `label` (its accessible name, "Copy code" by default) and `onCopied(ok)`, called after each attempt with `false` on failure. The timer is cleared on unmount.

### `CodeBlockCommand`

- `args` is what follows the runner, such as `@ombelle-ui/cli add button`. The command shown and copied is `<runner> <args>`.
- The runners are `pnpm dlx`, `npx`, `yarn dlx` and `bunx`, exported as `commandRunners`. `runners` replaces some of them, for example `runners={{ yarn: 'yarn dlx --quiet' }}`. `packageCommand(manager, args, runners)` returns the same string the block copies.
- The runner is a `data-token="keyword"` span and is coloured like a keyword; the text of the command is unchanged.
- `managers` sets the tabs and their order (default `['pnpm', 'npm', 'yarn', 'bun']`). It is controlled with `manager` and `onManagerChange`, or uncontrolled with `defaultManager`. A manager that is not in `managers` falls back to the first listed one.
- The tab list is named by `label` ("Package manager" by default). The arrow keys move between tabs and select them, and Home and End jump to the ends. The command is the tab panel.
- Copy is named by `copyLabel`, "Copy command" by default, and copies the selected manager's command.
- The root carries `data-code-block-mode="command"`.

### Line numbers

- Numbers come from a CSS counter in `::before`, so selecting or copying the code never includes them, and screen readers do not read them.
- `lineNumbers={false}` sets `data-line-numbers="false"` on the `pre` and hides them. The column grows for files of 100 lines or more.

### Another highlighter

`highlightCode(source, language)` returns the line spans that Code Block renders, for your own markup. It covers TSX, CSS, JSON and shell, runs synchronously and gives the same output on the server and in the browser. The text of its output always equals the source.

To use another highlighter, pass its output as `children`. `code` is still what Copy copies, so pass the plain source too. Line numbers count only `data-slot="code-block-line"` spans, so wrap each line of the other output in one, or set `lineNumbers={false}`:

```tsx
import { CodeBlock } from '@/components/ui/code-block'

export function Highlighted({ code, lines }: { code: string; lines: React.ReactNode[] }) {
  return (
    <CodeBlock title="app.tsx" code={code}>
      {lines.map((line, index) => (
        <span key={index} data-slot="code-block-line">
          {line}
          {index < lines.length - 1 ? '\n' : null}
        </span>
      ))}
    </CodeBlock>
  )
}
```

Tokens are `span` elements with `data-token` set to `comment`, `string`, `keyword`, `tag`, `attr`, `number`, `property`, `punct` or `flag`; the stylesheet colours them inside `code-block-code`.

## Surface and token colours

Each family stylesheet sets custom properties on `[data-slot='code-block']`. Override them on the root or an ancestor rule of your own:

| Property | Colours |
| --- | --- |
| `--code-block-background` | The surface, `oklch(0.2 0.012 275)` in every family and both modes |
| `--code-block-foreground` | Plain text, `oklch(0.93 0.005 275)` |
| `--code-block-keyword` | `keyword`, `tag` and the command runner |
| `--code-block-string` | `string` |
| `--code-block-comment` | `comment` |
| `--code-block-attr` | `attr` and `number` |
| `--code-block-property` | `property` and `flag` |
| `--code-block-punct` | `punct` |
| `--code-block-line-number` | Line numbers |

The token colours are literal `oklch()` values per family, not mixes of the live `--primary`, so a preset with a dark primary cannot drop them below their contrast floor. Every token colour is at least 4.5:1 on the surface, and line numbers at least 3:1; keyword and tag follow each family's primary hue. The preset schema does not change. If you change the background, check the token colours against it.

In forced colours the surface uses `Canvas` and `CanvasText` with a visible border, the selected tab uses `Highlight`, and tokens use `CanvasText`. With reduced motion, transitions are removed.

## Recipe

The recipe editor sets `mode` (`file` or `command`), `language` and `lineNumbers`, and the content `title`, `code` (up to 4000 characters) and `args`. A `command` recipe without `args` and a `file` recipe without `code` are rejected. Compilation emits `components/ui/code-block.tsx`, `components/ui/code-block.css` and `examples/code-block.tsx`. Runtime dependencies are React 19.3.1, clsx 2.1.1 and tailwind-merge 3.7.0, plus @radix-ui/react-tabs 1.2.1 in the Radix edition.

## Base UI edition

The Base UI edition uses `Tabs` from `@base-ui/react/tabs` with `activateOnFocus`, so the arrow keys select as in the Radix edition, and adds no dependency. It writes Radix's `data-state` (`active` or `inactive`) next to Base UI's own attributes, so the stylesheet is shared. The highlighter and the parts other than `CodeBlockCommand` are the same code in both editions, kept byte-identical by a unit test.

## Liquid glass

Liquid glass is experimental for Code Block, as for every glass component, and its findings do not block a release. The glass surface is the same dark surface, with the board's white rim and the family's 2px `--foreground` focus ring drawn in the code foreground. See [liquid glass](liquid-glass.md).

See [Code Block evidence](../evidence/code-block-075.md) for the token contrast, the browser tests, the specimen audit and the board comparison.
