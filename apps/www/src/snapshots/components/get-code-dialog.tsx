'use client'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import {
  packageManagers,
  type PackageManager,
} from '../install-command'
import styles from './get-code-dialog.module.css'
import { Dialog, DialogBody, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '../../generated/ui/components/ui/dialog'
// Requested when the dialog opens, alongside publishing, so the editors' first load does not carry it.
type CommandBlock = typeof import('../../generated/ui/components/ui/code-block').CodeBlockCommand
let commandBlock: Promise<CommandBlock> | undefined
const loadCommandBlock = () =>
  (commandBlock ??= import('../../generated/ui/components/ui/code-block').then((module) => module.CodeBlockCommand))

export type CodeScope = { id: string; label: string; description: string }
export type CodeSummary = ReactNode | ((close: () => void) => ReactNode)
export type CodeStatus =
  | { status: 'publishing' }
  | { status: 'ready'; reference: string; href: string }
  | { status: 'failed'; error: string; retryable: boolean }

const managerKey = 'ombelle:get-code:manager'

function readManager(): PackageManager {
  try {
    const stored = localStorage.getItem(managerKey)
    if (packageManagers.includes(stored as PackageManager))
      return stored as PackageManager
  } catch {
    /* Storage is a convenience only. */
  }
  return 'pnpm'
}

/**
 * The single "Get code" surface shared by the preset and Button editors. Its
 * owner publishes the current draft when it opens; this dialog only presents
 * the resulting code, the install command and secondary local exports.
 */
export function GetCodeDialog({
  open,
  onClose,
  subject,
  code,
  scopes,
  commandFor,
  installUnavailable,
  onRetry,
  announce,
  children,
  summary,
}: {
  open: boolean
  onClose: () => void
  subject: 'preset' | 'recipe'
  code: CodeStatus
  scopes: readonly CodeScope[]
  commandFor: (scope: string, manager: PackageManager) => string
  installUnavailable?: string
  onRetry: () => void
  announce: (text: string) => void
  /** Secondary local exports, such as the JSON download. */
  children?: ReactNode
  /** What the edits change against the catalog default, read before publishing; a function gets the dialog's close. */
  summary?: CodeSummary
}) {
  const terminal = useRef<HTMLDivElement>(null)
  // The dialog opens from the editor's own button, not a Dialog trigger, so it returns focus there itself.
  const opener = useRef<HTMLElement | null>(null)
  const fallback = useRef<HTMLElement>(null)
  const [CodeBlockCommand, setCodeBlockCommand] = useState<CommandBlock | null>(null)
  const [scope, setScope] = useState(scopes[0]!.id)
  const [manager, setManager] = useState<PackageManager>('pnpm')
  const [copied, setCopied] = useState(false)
  const [mounted, setMounted] = useState(false)
  useEffect(() => {
    setManager(readManager())
    setMounted(true)
  }, [])
  useEffect(() => {
    if (open) opener.current = document.activeElement as HTMLElement | null
  }, [open])
  useEffect(() => {
    if (!open || CodeBlockCommand) return
    let live = true
    loadCommandBlock().then((block) => { if (live) setCodeBlockCommand(() => block) }, () => {
      // A failed chunk keeps the plain command, which still copies and selects.
      commandBlock = undefined
    })
    return () => { live = false }
  }, [open, CodeBlockCommand])
  const active = scopes.find((item) => item.id === scope) ?? scopes[0]!
  const command =
    code.status === 'ready' && !installUnavailable ? commandFor(active.id, manager) : null
  useEffect(() => setCopied(false), [command])

  function chooseManager(next: PackageManager) {
    setManager(next)
    try {
      localStorage.setItem(managerKey, next)
    } catch {
      /* Keep the in-memory choice. */
    }
  }
  async function copy() {
    if (!command) return
    try {
      await navigator.clipboard.writeText(command)
      setCopied(true)
      announce('Install command copied.')
    } catch {
      announce('Clipboard unavailable. Select the command and copy it.')
      const range = document.createRange()
      // The selected tab's command, or the plain command while the block loads.
      const node = terminal.current?.querySelector("[role='tabpanel'][data-state='active'] code") ?? fallback.current
      if (!node) return
      range.selectNodeContents(node)
      getSelection()?.removeAllRanges()
      getSelection()?.addRange(range)
    }
  }

  if (!mounted) return null
  // The catalog Dialog: its body scrolls between the title and the Copy command footer.
  return (
    <Dialog open={open} onOpenChange={(next) => { if (!next) onClose() }}>
      <DialogContent size="lg" className={styles.dialog} aria-describedby={undefined}
        onCloseAutoFocus={(event) => {
          event.preventDefault()
          // An action that moved focus on purpose (Show changes) keeps it; otherwise return to the opener.
          const active = document.activeElement
          if (!active || active === document.body) opener.current?.focus()
        }}>
        <DialogHeader className={styles.head}>
          <DialogTitle className={styles.title}>
            Get code
          </DialogTitle>
        </DialogHeader>
        <DialogBody className={styles.body}>
        {scopes.length > 1 && (
          <div
            className={styles.tabs}
            role="tablist"
            aria-label="Installation"
          >
            {scopes.map((item, index) => (
              <button
                key={item.id}
                id={`get-code-tab-${item.id}`}
                type="button"
                role="tab"
                aria-selected={item.id === active.id}
                aria-controls="get-code-panel"
                tabIndex={item.id === active.id ? 0 : -1}
                onClick={() => setScope(item.id)}
                onKeyDown={(event) => {
                  if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft')
                    return
                  event.preventDefault()
                  const next =
                    scopes[
                      (index + (event.key === 'ArrowRight' ? 1 : -1) +
                        scopes.length) %
                        scopes.length
                    ]!
                  setScope(next.id)
                  document.getElementById(`get-code-tab-${next.id}`)?.focus()
                }}
              >
                {item.label}
              </button>
            ))}
          </div>
        )}

        <div
          id="get-code-panel"
          role={scopes.length > 1 ? 'tabpanel' : undefined}
          aria-labelledby={
            scopes.length > 1 ? `get-code-tab-${active.id}` : undefined
          }
          className={styles.panel}
        >
          <p className={styles.description}>{active.description}</p>
          {summary && <div className={styles.summary}>{typeof summary === 'function' ? summary(onClose) : summary}</div>}

          {command && CodeBlockCommand ? (
            <CodeBlockCommand
              ref={terminal}
              args={commandFor(active.id, 'npm').replace(/^npx /, '')}
              manager={manager}
              onManagerChange={chooseManager}
              copyLabel="Copy install command"
            />
          ) : command ? (
            <pre className={styles.command} tabIndex={0} role="region" aria-label="Install command">
              <code ref={fallback}>{command}</code>
            </pre>
          ) : (
            <pre
              className={styles.command}
              data-testid="get-code-command"
              tabIndex={0}
              aria-busy={code.status === 'publishing'}
            >
              <code>
                {code.status === 'publishing'
                  ? `Generating your ${subject} code…`
                  : installUnavailable ?? 'No code yet.'}
              </code>
            </pre>
          )}

          {code.status === 'failed' && (
            <div role="alert" className={styles.error}>
              <p>{code.error}</p>
              {code.retryable && (
                <button type="button" onClick={onRetry}>
                  Try again
                </button>
              )}
            </div>
          )}

        </div>

        <div className={styles.footer}>
          {code.status === 'ready' && (
            <p className={styles.reference}>
              Code{' '}
              <a href={code.href} data-testid="get-code-reference">
                {code.reference}
              </a>
            </p>
          )}
          <p className={styles.notice}>
            Codes are public and permanent: anyone with the code can read this{' '}
            {subject}. Don’t include private information.{' '}
            <a href="/privacy">Privacy</a>
          </p>
          {children && <div className={styles.secondary}>{children}</div>}
        </div>
        </DialogBody>
        <DialogFooter className={styles.actions}>
          <button
            type="button"
            className={styles.primary}
            disabled={!command}
            onClick={() => void copy()}
          >
            {code.status === 'publishing'
              ? 'Generating code…'
              : copied
                ? 'Copied'
                : 'Copy command'}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
