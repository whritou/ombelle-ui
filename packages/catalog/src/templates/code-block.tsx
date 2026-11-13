'use client'
import * as React from 'react'
import * as TabsPrimitive from '@radix-ui/react-tabs'
import { cn } from './utils.js'
import './code-block.css'

// highlight:start
type CodeLanguage = 'tsx' | 'css' | 'json' | 'shell' | 'text'

type CodeToken = 'comment' | 'string' | 'keyword' | 'tag' | 'attr' | 'number' | 'property' | 'punct' | 'flag'

/**
 * One alternation per language; the first group that matches names the token kind.
 * Line-based on purpose: generated output keeps comments and strings on one line,
 * and a missed multi-line token only loses colour, never text.
 */
const codeGrammars: Record<Exclude<CodeLanguage, 'text'>, { pattern: RegExp; kinds: CodeToken[] }> = {
  tsx: {
    pattern:
      /(\/\/.*$|\/\*.*?\*\/)|('(?:\\.|[^'\\])*'|"(?:\\.|[^"\\])*"|`(?:\\.|[^`\\])*`)|\b(import|from|export|default|function|return|const|let|type|interface|extends|as|true|false|null|undefined|if|else)\b|(?<=<\/?)([A-Za-z][\w.]*)|([A-Za-z_][\w-]*)(?==)|(\b\d+(?:\.\d+)?\b)|([{}()[\]<>/=;,.])/gm,
    kinds: ['comment', 'string', 'keyword', 'tag', 'attr', 'number', 'punct'],
  },
  css: {
    pattern:
      /(\/\*.*?\*\/)|('(?:\\.|[^'\\])*'|"(?:\\.|[^"\\])*")|(@[\w-]+)|(--[\w-]+|[a-z-]+)(?=\s*:)|(-?\b\d*\.?\d+(?:px|rem|em|%|ms|s|deg)?\b)|([{}()[\];:,>])/gm,
    kinds: ['comment', 'string', 'keyword', 'property', 'number', 'punct'],
  },
  json: {
    pattern: /("(?:\\.|[^"\\])*")(?=\s*:)|("(?:\\.|[^"\\])*")|\b(true|false|null)\b|(-?\b\d+(?:\.\d+)?\b)|([{}[\]:,])/gm,
    kinds: ['property', 'string', 'keyword', 'number', 'punct'],
  },
  shell: {
    pattern: /(#.*$)|('(?:\\.|[^'\\])*'|"(?:\\.|[^"\\])*")|(^\s*[\w@./-]+)|(\s--?[\w-]+)/gm,
    kinds: ['comment', 'string', 'keyword', 'flag'],
  },
}

function highlightLine(line: string, language: CodeLanguage): React.ReactNode[] {
  if (language === 'text') return line ? [line] : []
  const { pattern, kinds } = codeGrammars[language]
  const nodes: React.ReactNode[] = []
  let last = 0
  for (const match of line.matchAll(pattern)) {
    const index = match.index ?? 0
    if (index > last) nodes.push(line.slice(last, index))
    const group = match.slice(1).findIndex((value) => value !== undefined)
    nodes.push(
      <span key={index} data-token={kinds[group] ?? 'punct'}>
        {match[0]}
      </span>,
    )
    last = index + match[0].length
  }
  if (last < line.length) nodes.push(line.slice(last))
  return nodes
}

/** A final newline ends the last line. */
function codeLines(code: string): string[] {
  return (code.endsWith('\n') ? code.slice(0, -1) : code).split('\n')
}

/**
 * Highlighted lines for a read-only code view. Each line is a span so CSS counters
 * can number them; the text content stays exactly the input, newlines included.
 * A CRLF ending is one text node, so server HTML holds no lone \r.
 */
function highlightCode(code: string, language: CodeLanguage): React.ReactNode[] {
  const lines = codeLines(code)
  const trailing = code.endsWith('\n')
  return lines.map((line, index) => {
    const cr = line.endsWith('\r') ? '\r' : ''
    const end = cr + (index < lines.length - 1 || trailing ? '\n' : '')
    return (
      <span key={index} data-slot="code-block-line">
        {highlightLine(cr ? line.slice(0, -1) : line, language)}
        {end || null}
      </span>
    )
  })
}
// highlight:end

// code-block-parts:start
/** Read by screen readers, not shown. */
const visuallyHidden: React.CSSProperties = {
  position: 'absolute', inlineSize: 1, blockSize: 1, margin: -1, padding: 0, overflow: 'hidden',
  clip: 'rect(0 0 0 0)', whiteSpace: 'nowrap', border: 0,
}

export type DiffKind = 'added' | 'removed' | 'unchanged'

/** The first character is the marker: `+` adds, `-` removes, anything else is unchanged and kept as written. */
function diffKind(line: string): DiffKind {
  return line.startsWith('+') ? 'added' : line.startsWith('-') ? 'removed' : 'unchanged'
}

/** The lines of a diff, without the marker; a CRLF ending keeps its CR at the end of the text. */
export function diffLines(code: string): { kind: DiffKind; text: string }[] {
  return codeLines(code).map((line) => {
    const kind = diffKind(line)
    return { kind, text: kind === 'unchanged' ? line : line.slice(1) }
  })
}

/** The added and unchanged lines without markers, with the original line endings and final newline. */
export function diffNewVersion(code: string): string {
  return code
    .split(/(?<=\n)/)
    .filter((line) => diffKind(line) !== 'removed')
    .map((line) => (diffKind(line) === 'added' ? line.slice(1) : line))
    .join('')
}

export function diffCounts(code: string): { added: number; removed: number } {
  const lines = diffLines(code)
  return {
    added: lines.filter((line) => line.kind === 'added').length,
    removed: lines.filter((line) => line.kind === 'removed').length,
  }
}

/** Like highlightCode, with a marker column; changes also carry a hidden "Added: " or "Removed: ". */
function highlightDiff(code: string, language: CodeLanguage): React.ReactNode[] {
  const lines = diffLines(code)
  const trailing = code.endsWith('\n')
  return lines.map((line, index) => {
    const cr = line.text.endsWith('\r') ? '\r' : ''
    const end = cr + (index < lines.length - 1 || trailing ? '\n' : '')
    return (
      <span key={index} data-slot="code-block-line" data-diff={line.kind === 'unchanged' ? undefined : line.kind}>
        <span data-slot="code-block-diff-marker" aria-hidden="true">
          {line.kind === 'added' ? '+' : line.kind === 'removed' ? '−' : ' '}
        </span>
        {line.kind === 'unchanged' ? null : <span style={visuallyHidden}>{line.kind === 'added' ? 'Added: ' : 'Removed: '}</span>}
        {highlightLine(cr ? line.text.slice(0, -1) : line.text, language)}
        {end || null}
      </span>
    )
  })
}

export function CodeBlockRoot({ className, ...props }: React.ComponentProps<'div'>) {
  return <div {...props} data-slot="code-block" className={cn(className)} />
}

export function CodeBlockHeader({ className, ...props }: React.ComponentProps<'div'>) {
  return <div {...props} data-slot="code-block-header" className={cn(className)} />
}

export function CodeBlockTitle({ className, ...props }: React.ComponentProps<'span'>) {
  return <span {...props} data-slot="code-block-title" className={cn(className)} />
}

export type CodeBlockCopyProps = {
  /** The text written to the clipboard. */
  text: string
  /** The button's accessible name; "Copy code" by default. */
  label?: string
  /** Called after each attempt; `false` when the clipboard is missing or the write rejects. */
  onCopied?(ok: boolean): void
} & Omit<React.ComponentProps<'button'>, 'onClick' | 'children'>

/** Shows "Copied" for 1.5 s after a successful copy; a polite live region announces the result. */
export function CodeBlockCopy({ text, label, onCopied, className, ...props }: CodeBlockCopyProps) {
  const [copied, setCopied] = React.useState(false)
  const [status, setStatus] = React.useState('')
  const timer = React.useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const mounted = React.useRef(false)
  React.useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
      clearTimeout(timer.current)
    }
  }, [])
  // New text has not been copied.
  React.useEffect(() => {
    clearTimeout(timer.current)
    setCopied(false)
    setStatus('')
  }, [text])
  const copy = async () => {
    // Clear the region first so a repeated result is announced again. A missing
    // clipboard also fails after an await, so the cleared region always renders first.
    setStatus('')
    let ok = false
    try {
      await (typeof navigator !== 'undefined' && navigator.clipboard
        ? navigator.clipboard.writeText(text)
        : Promise.reject(new Error('Clipboard unavailable')))
      ok = true
    } catch {
      ok = false
    }
    clearTimeout(timer.current)
    setCopied(ok)
    setStatus(ok ? 'Copied' : 'Copy failed')
    // A write that settles after unmount starts no timer.
    if (ok && mounted.current)
      timer.current = setTimeout(() => {
        setCopied(false)
        setStatus('')
      }, 1500)
    onCopied?.(ok)
  }
  return (
    <>
      <button
        {...props}
        type="button"
        data-slot="code-block-copy"
        aria-label={label ?? 'Copy code'}
        className={cn(className)}
        onClick={() => void copy()}
      >
        {copied ? 'Copied' : 'Copy'}
      </button>
      <span role="status" aria-live="polite" data-slot="code-block-status" style={visuallyHidden}>
        {status}
      </span>
    </>
  )
}

export type CodeBlockCodeProps = {
  /** The source; highlighted unless `children` is given. */
  code: string
  language?: CodeLanguage
  /** Numbers come from a CSS counter; `false` hides them. */
  lineNumbers?: boolean
  /** The pre scrolls inside this height; 32rem by default. */
  maxHeight?: string
  /** The pre region's accessible name, "Code" by default; dropped when `aria-labelledby` is set. */
  label?: string
  /** Marks lines starting with `+` or `-` as added or removed; ignored with `children`. */
  diff?: boolean
  /** Replaces the highlighted output, for another highlighter. */
  children?: React.ReactNode
} & Omit<React.ComponentProps<'pre'>, 'children'>

export function CodeBlockCode({
  code,
  language = 'tsx',
  lineNumbers = true,
  maxHeight = '32rem',
  label,
  diff,
  children,
  className,
  style,
  ...props
}: CodeBlockCodeProps) {
  return (
    <pre
      tabIndex={0}
      role="region"
      {...props}
      data-slot="code-block-code"
      data-line-numbers={lineNumbers ? undefined : 'false'}
      data-diff={diff && children === undefined ? '' : undefined}
      aria-label={props['aria-labelledby'] === undefined ? (label ?? props['aria-label'] ?? 'Code') : undefined}
      style={{ maxHeight, '--code-block-gutter': `${String(codeLines(code).length).length}ch`, ...style } as React.CSSProperties}
      className={cn(className)}
    >
      <code>{children ?? (diff ? highlightDiff(code, language) : highlightCode(code, language))}</code>
    </pre>
  )
}

export type CodeBlockProps = {
  /** What Copy copies, and the highlighted source unless `children` is given. */
  code: string
  language?: CodeLanguage
  /** The file name shown in the header. */
  title?: string
  lineNumbers?: boolean
  maxHeight?: string
  /** "Copy <title>", or "Copy code" without a title, by default; "Copy the new <title>" with `diff`. */
  copyLabel?: string
  /** Shows `+` and `-` lines as a diff, with a count in the header; Copy takes the new version. */
  diff?: boolean
  children?: React.ReactNode
} & Omit<React.ComponentProps<'div'>, 'children'>

/** A file block: the title and Copy in the header, then the code. */
export function CodeBlock({ code, language, title, lineNumbers, maxHeight, copyLabel, diff, children, ...props }: CodeBlockProps) {
  // Another highlighter's output has no markers to read.
  const shown = diff === true && children === undefined
  const counts = shown ? diffCounts(code) : undefined
  return (
    <CodeBlockRoot {...props}>
      <CodeBlockHeader>
        {title ? <CodeBlockTitle>{title}</CodeBlockTitle> : null}
        {counts ? (
          <span data-slot="code-block-diff-count">
            <span aria-hidden="true">{`+${counts.added} −${counts.removed}`}</span>
            <span style={visuallyHidden}>{`${counts.added} added, ${counts.removed} removed`}</span>
          </span>
        ) : null}
        <CodeBlockCopy
          text={shown ? diffNewVersion(code) : code}
          label={copyLabel ?? (shown ? `Copy the new ${title || 'code'}` : title ? `Copy ${title}` : 'Copy code')}
        />
      </CodeBlockHeader>
      <CodeBlockCode
        code={code}
        language={language}
        lineNumbers={lineNumbers}
        maxHeight={maxHeight}
        diff={shown}
        label={title ? `${title} source` : 'Code'}
      >
        {children}
      </CodeBlockCode>
    </CodeBlockRoot>
  )
}

export type PackageManager = 'pnpm' | 'npm' | 'yarn' | 'bun'

/** The command each package manager runs a package with. */
export const commandRunners: Record<PackageManager, string> = {
  pnpm: 'pnpm dlx',
  npm: 'npx',
  yarn: 'yarn dlx',
  bun: 'bunx',
}

const packageManagers: readonly PackageManager[] = ['pnpm', 'npm', 'yarn', 'bun']

/** The runner of a manager: `pnpm dlx`, unless `runners` replaces it. */
function commandRunner(manager: PackageManager, runners?: Partial<Record<PackageManager, string>>): string {
  return runners?.[manager] ?? commandRunners[manager]
}

/** The runner, a space, then the arguments: `pnpm dlx @ombelle-ui/cli add button`. */
export function packageCommand(
  manager: PackageManager,
  args: string,
  runners?: Partial<Record<PackageManager, string>>,
): string {
  return `${commandRunner(manager, runners)} ${args}`
}

export type CodeBlockCommandProps = {
  /** What follows the runner, for example `@ombelle-ui/cli add button`. */
  args: string
  /** The tabs, in order; all four by default. */
  managers?: PackageManager[]
  manager?: PackageManager
  defaultManager?: PackageManager
  onManagerChange?(manager: PackageManager): void
  /** The tab list's accessible name, "Package manager" by default. */
  label?: string
  /** "Copy command" by default. */
  copyLabel?: string
  /** Replaces the runner of some managers. */
  runners?: Partial<Record<PackageManager, string>>
} & Omit<React.ComponentProps<'div'>, 'children' | 'defaultValue'>

/** The selected manager, falling back to the first listed one when it is not listed. */
function useCommandManager(
  managers: readonly PackageManager[],
  manager: PackageManager | undefined,
  defaultManager: PackageManager | undefined,
  onManagerChange: ((manager: PackageManager) => void) | undefined,
) {
  const listed = managers.length > 0 ? managers : packageManagers
  const [uncontrolled, setUncontrolled] = React.useState(defaultManager)
  const requested = manager ?? uncontrolled
  const selected = requested !== undefined && listed.includes(requested) ? requested : listed[0]!
  const select = (value: unknown) => {
    const next = listed.find((item) => item === value)
    if (next === undefined || next === selected) return
    if (manager === undefined) setUncontrolled(next)
    onManagerChange?.(next)
  }
  return { listed, selected, select }
}
// code-block-parts:end

/** A command block, one tab per package manager. Radix tabs activate automatically, so arrow keys select. */
export function CodeBlockCommand({
  args,
  managers = [...packageManagers],
  manager,
  defaultManager,
  onManagerChange,
  label,
  copyLabel,
  runners,
  className,
  dir,
  ...props
}: CodeBlockCommandProps) {
  const { listed, selected, select } = useCommandManager(managers, manager, defaultManager, onManagerChange)
  return (
    <TabsPrimitive.Root
      {...props}
      dir={dir === 'rtl' || dir === 'ltr' ? dir : undefined}
      data-slot="code-block"
      data-code-block-mode="command"
      value={selected}
      onValueChange={select}
      className={cn(className)}
    >
      <CodeBlockHeader>
        <TabsPrimitive.List data-slot="code-block-tabs" aria-label={label ?? 'Package manager'}>
          {listed.map((item) => (
            <TabsPrimitive.Trigger key={item} value={item} data-slot="code-block-tab">
              {item}
            </TabsPrimitive.Trigger>
          ))}
        </TabsPrimitive.List>
        <CodeBlockCopy text={packageCommand(selected, args, runners)} label={copyLabel ?? 'Copy command'} />
      </CodeBlockHeader>
      {listed.map((item) => (
        <TabsPrimitive.Content key={item} value={item}>
          <pre data-slot="code-block-command">
            <code>
              <span data-token="keyword">{commandRunner(item, runners)}</span>
              {` ${args}`}
            </code>
          </pre>
        </TabsPrimitive.Content>
      ))}
    </TabsPrimitive.Root>
  )
}

export { highlightCode }
export type { CodeLanguage, CodeToken }
