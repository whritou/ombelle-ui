'use client'

import * as Tabs from '@radix-ui/react-tabs'
import { Terminal } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { highlightCode, type CodeLanguage } from '../../editor/components/code-highlight'
import code from '../../editor/components/code-view.module.css'

function useCopy() {
  const [copied, setCopied] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined)
  useEffect(() => () => clearTimeout(timer.current), [])
  const copy = (text: string) =>
    navigator.clipboard?.writeText(text).then(() => {
      setCopied(true)
      clearTimeout(timer.current)
      timer.current = setTimeout(() => setCopied(false), 1500)
    }, () => {})
  return { copied, copy }
}

/** The component editor's Copy button, for a dark code window bar. */
export function CopyButton({ text, label = 'Copy code' }: { text: string; label?: string }) {
  const { copied, copy } = useCopy()
  return (
    <button type="button" onClick={() => copy(text)} aria-label={label} className={code.copy}>
      <span aria-live="polite">{copied ? 'Copied' : 'Copy'}</span>
    </button>
  )
}

const languageNames: Record<CodeLanguage, string> = { tsx: 'TSX', css: 'CSS', json: 'JSON', shell: 'Shell' }

/** The language a title names by its extension; CSS blocks titled "… styles" or "… material" read as CSS. */
export function codeLanguage(title: string | undefined): CodeLanguage {
  const name = (title ?? '').toLowerCase()
  if (name.endsWith('.css') || / styles$| material$/.test(name)) return 'css'
  if (name.endsWith('.json')) return 'json'
  if (name.endsWith('.sh')) return 'shell'
  return 'tsx'
}

/**
 * Read-only code in the component editor's window: dark in both site themes,
 * with a file tab, language badge, line numbers and highlighting.
 */
export function CodeBlock({ code: source, title, maxHeight, language }: {
  code: string; title?: string; maxHeight?: string; language?: CodeLanguage
}) {
  const lang = language ?? codeLanguage(title)
  return (
    <div className={code.window}>
      <div className={code.bar}>
        <span className={code.file}>
          <span className={code.fileName}>{title ?? 'code'}</span>
          <span className={code.lang}>{languageNames[lang]}</span>
        </span>
        <CopyButton text={source} />
      </div>
      {/* Short snippets keep their own height; long sources scroll inside the window. */}
      <pre tabIndex={0} aria-label={title ? `${title} source` : 'Code'} className={code.code}
        style={{ minHeight: 0, maxHeight: maxHeight ?? '32rem' }}>
        <code>{highlightCode(source, lang)}</code>
      </pre>
    </div>
  )
}

const runners = [
  { value: 'npm', prefix: 'npx' },
  { value: 'pnpm', prefix: 'pnpm dlx' },
  { value: 'yarn', prefix: 'yarn dlx --quiet' },
  { value: 'bun', prefix: 'bunx' },
] as const

const runnerTab = 'rounded-md px-2.5 py-1 font-mono text-xs text-[var(--code-muted)] transition-colors hover:bg-[var(--code-line)] hover:text-[var(--code-text)] data-[state=active]:bg-[var(--code-line)] data-[state=active]:text-[var(--code-text)]'

/** Install command with npm / pnpm / yarn / bun runner tabs, in the same dark code window. */
export function CommandTabs({ release, args, label = 'Package runner' }: { release: string; args: string; label?: string }) {
  return (
    <Tabs.Root defaultValue="pnpm" className={code.window}>
      <div className={code.bar}>
        <div className="flex min-w-0 items-center gap-2 pl-3">
          <Terminal className="size-4 shrink-0 text-[var(--code-muted)]" aria-hidden />
          <Tabs.List aria-label={label} className="flex gap-1">
            {runners.map(runner => (
              <Tabs.Trigger key={runner.value} value={runner.value} className={runnerTab}>{runner.value}</Tabs.Trigger>
            ))}
          </Tabs.List>
        </div>
      </div>
      {runners.map(runner => {
        const command = `${runner.prefix} ${release} ${args}`
        return (
          <Tabs.Content key={runner.value} value={runner.value} className="flex items-center gap-3 px-4 py-3">
            <code className={code.command}>{highlightCode(command, 'shell')}</code>
            <CopyButton text={command} label="Copy command" />
          </Tabs.Content>
        )
      })}
    </Tabs.Root>
  )
}
