'use client'

import * as Tabs from '@radix-ui/react-tabs'
import { Check, Copy, Terminal } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

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

export function CopyButton({ text, label = 'Copy code' }: { text: string; label?: string }) {
  const { copied, copy } = useCopy()
  return (
    <button
      type="button"
      onClick={() => copy(text)}
      aria-label={label}
      className="inline-flex size-8 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
    >
      {copied ? <Check className="size-4" aria-hidden /> : <Copy className="size-4" aria-hidden />}
    </button>
  )
}

/** Scrollable code with a filename bar and copy button. */
export function CodeBlock({ code, title, maxHeight }: { code: string; title?: string; maxHeight?: string }) {
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card">
      <div className="flex min-h-11 items-center justify-between gap-2 border-b border-border px-4">
        <span className="truncate font-mono text-xs text-muted-foreground">{title ?? 'code'}</span>
        <CopyButton text={code} />
      </div>
      <pre tabIndex={0} aria-label={title ? `${title} source` : 'Code'} className="overflow-auto p-4 font-mono text-[13px] leading-relaxed" style={{ maxHeight }}>
        <code>{code}</code>
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

/** Install command with npm / pnpm / yarn / bun runner tabs, like shadcn's docs. */
export function CommandTabs({ release, args, label = 'Package runner' }: { release: string; args: string; label?: string }) {
  return (
    <Tabs.Root defaultValue="pnpm" className="overflow-hidden rounded-xl border border-border bg-card">
      <div className="flex min-h-11 items-center gap-2 border-b border-border px-3">
        <Terminal className="size-4 text-muted-foreground" aria-hidden />
        <Tabs.List aria-label={label} className="flex gap-1">
          {runners.map(runner => (
            <Tabs.Trigger key={runner.value} value={runner.value} className="rounded-md px-2.5 py-1 font-mono text-xs text-muted-foreground data-[state=active]:bg-muted data-[state=active]:text-foreground">
              {runner.value}
            </Tabs.Trigger>
          ))}
        </Tabs.List>
      </div>
      {runners.map(runner => {
        const command = `${runner.prefix} ${release} ${args}`
        return (
          <Tabs.Content key={runner.value} value={runner.value} className="flex items-start gap-3 p-4">
            <code className="flex-1 break-all font-mono text-[13px]">{command}</code>
            <CopyButton text={command} label="Copy command" />
          </Tabs.Content>
        )
      })}
    </Tabs.Root>
  )
}
