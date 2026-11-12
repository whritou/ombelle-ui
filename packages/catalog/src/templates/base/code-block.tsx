'use client'
import * as React from 'react'
import { Tabs as TabsPrimitive } from '@base-ui/react/tabs'
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

/**
 * Highlighted lines for a read-only code view. Each line is a span so CSS counters
 * can number them; the text content stays exactly the input, newlines included.
 */
function highlightCode(code: string, language: CodeLanguage): React.ReactNode[] {
  const trailing = code.endsWith('\n')
  const lines = (trailing ? code.slice(0, -1) : code).split('\n')
  return lines.map((line, index) => (
    <span key={index} data-slot="code-block-line">
      {highlightLine(line, language)}
      {index < lines.length - 1 || trailing ? '\n' : null}
    </span>
  ))
}
// highlight:end

// code-block-parts:start
/** Read by screen readers, not shown. */
const visuallyHidden: React.CSSProperties = {
  position: 'absolute', inlineSize: 1, blockSize: 1, margin: -1, padding: 0, overflow: 'hidden',
  clip: 'rect(0 0 0 0)', whiteSpace: 'nowrap', border: 0,
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
  const copy = async () => {
    // Clear the region first so a repeated result is announced again.
    setStatus('')
    let ok = false
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard) {
        await navigator.clipboard.writeText(text)
        ok = true
      }
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
  /** The pre's accessible name, "Code" by default; dropped when `aria-labelledby` is set. */
  label?: string
  /** Replaces the highlighted output, for another highlighter. */
  children?: React.ReactNode
} & Omit<React.ComponentProps<'pre'>, 'children'>

export function CodeBlockCode({
  code,
  language = 'tsx',
  lineNumbers = true,
  maxHeight = '32rem',
  label,
  children,
  className,
  style,
  ...props
}: CodeBlockCodeProps) {
  return (
    <pre
      tabIndex={0}
      {...props}
      data-slot="code-block-code"
      data-line-numbers={lineNumbers ? undefined : 'false'}
      aria-label={props['aria-labelledby'] === undefined ? (label ?? props['aria-label'] ?? 'Code') : undefined}
      style={{ maxHeight, ...style }}
      className={cn(className)}
    >
      <code>{children ?? highlightCode(code, language)}</code>
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
  /** "Copy <title>", or "Copy code" without a title, by default. */
  copyLabel?: string
  children?: React.ReactNode
} & Omit<React.ComponentProps<'div'>, 'children'>

/** A file block: the title and Copy in the header, then the code. */
export function CodeBlock({ code, language, title, lineNumbers, maxHeight, copyLabel, children, ...props }: CodeBlockProps) {
  return (
    <CodeBlockRoot {...props}>
      <CodeBlockHeader>
        {title ? <CodeBlockTitle>{title}</CodeBlockTitle> : null}
        <CodeBlockCopy text={code} label={copyLabel ?? (title ? `Copy ${title}` : 'Copy code')} />
      </CodeBlockHeader>
      <CodeBlockCode
        code={code}
        language={language}
        lineNumbers={lineNumbers}
        maxHeight={maxHeight}
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

/** The runner, a space, then the arguments: `pnpm dlx @ombelle-ui/cli add button`. */
export function packageCommand(
  manager: PackageManager,
  args: string,
  runners?: Partial<Record<PackageManager, string>>,
): string {
  return `${runners?.[manager] ?? commandRunners[manager]} ${args}`
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

// Radix-compatible data-state next to Base UI's own attributes, as in the Tabs template.
const activeState = (active: boolean) => (active ? 'active' : 'inactive')

/** A command block, one tab per package manager. Tabs activate on focus, so arrow keys select. */
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
  ...props
}: CodeBlockCommandProps) {
  const { listed, selected, select } = useCommandManager(managers, manager, defaultManager, onManagerChange)
  return (
    <TabsPrimitive.Root
      {...props}
      data-slot="code-block"
      data-code-block-mode="command"
      value={selected}
      onValueChange={select}
      className={cn(className)}
    >
      <CodeBlockHeader>
        <TabsPrimitive.List data-slot="code-block-tabs" aria-label={label ?? 'Package manager'} activateOnFocus>
          {listed.map((item) => (
            <TabsPrimitive.Tab
              key={item}
              value={item}
              data-slot="code-block-tab"
              render={(tabProps, state) => <button {...tabProps} data-state={activeState(state.active)} />}
            >
              {item}
            </TabsPrimitive.Tab>
          ))}
        </TabsPrimitive.List>
        <CodeBlockCopy text={packageCommand(selected, args, runners)} label={copyLabel ?? 'Copy command'} />
      </CodeBlockHeader>
      {listed.map((item) => (
        <TabsPrimitive.Panel
          key={item}
          value={item}
          render={(panelProps, state) => <div {...panelProps} data-state={activeState(!state.hidden)} />}
        >
          <pre data-slot="code-block-command">
            <code>{packageCommand(item, args, runners)}</code>
          </pre>
        </TabsPrimitive.Panel>
      ))}
    </TabsPrimitive.Root>
  )
}

export { highlightCode }
export type { CodeLanguage, CodeToken }
