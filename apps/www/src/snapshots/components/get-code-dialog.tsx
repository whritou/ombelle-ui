'use client'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import {
  packageManagers,
  type PackageManager,
} from '../install-command'
import styles from './get-code-dialog.module.css'

export type CodeScope = { id: string; label: string; description: string }
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
}) {
  const dialog = useRef<HTMLDialogElement>(null)
  const [scope, setScope] = useState(scopes[0]!.id)
  const [manager, setManager] = useState<PackageManager>('pnpm')
  const [copied, setCopied] = useState(false)
  const [mounted, setMounted] = useState(false)
  useEffect(() => {
    setManager(readManager())
    setMounted(true)
  }, [])
  useEffect(() => {
    const element = dialog.current
    if (!element) return
    if (open && !element.open) element.showModal()
    if (!open && element.open) element.close()
  }, [open, mounted])
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
      const node = document.getElementById('get-code-command')
      if (!node) return
      range.selectNodeContents(node)
      getSelection()?.removeAllRanges()
      getSelection()?.addRange(range)
    }
  }

  if (!mounted) return null
  // Portal to the body so editor toolbar styles never reach the dialog.
  return createPortal(
    <dialog
      ref={dialog}
      className={styles.dialog}
      aria-labelledby="get-code-heading"
      onCancel={(event) => {
        event.preventDefault()
        onClose()
      }}
      onClick={(event) => {
        if (event.target === dialog.current) onClose()
      }}
    >
      <div className={styles.body}>
        <div className={styles.head}>
          <h2 id="get-code-heading" className={styles.title}>
            Get code
          </h2>
          <button
            type="button"
            className={styles.close}
            aria-label="Close"
            onClick={onClose}
          >
            <svg viewBox="0 0 16 16" aria-hidden="true">
              <path d="M4 4l8 8M12 4l-8 8" />
            </svg>
          </button>
        </div>

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

          <div className={styles.terminal}>
            <div className={styles.terminalBar}>
              <div
                className={styles.managers}
                role="group"
                aria-label="Package manager"
              >
                {packageManagers.map((item) => (
                  <button
                    key={item}
                    type="button"
                    aria-pressed={item === manager}
                    onClick={() => chooseManager(item)}
                  >
                    {item}
                  </button>
                ))}
              </div>
              <button
                type="button"
                className={styles.iconButton}
                aria-label="Copy install command"
                disabled={!command}
                onClick={() => void copy()}
              >
                <svg viewBox="0 0 16 16" aria-hidden="true">
                  {copied ? (
                    <path d="M3 8.5l3 3 7-7" />
                  ) : (
                    <>
                      <rect x="5.5" y="5.5" width="8" height="8" rx="1.5" />
                      <path d="M10.5 3.5v-.5a1.5 1.5 0 0 0-1.5-1.5H4A1.5 1.5 0 0 0 2.5 3v5A1.5 1.5 0 0 0 4 9.5h.5" />
                    </>
                  )}
                </svg>
              </button>
            </div>
            <pre
              className={styles.command}
              data-testid="get-code-command"
              tabIndex={0}
              aria-busy={code.status === 'publishing'}
            >
              <code id="get-code-command">
                {command ??
                  (code.status === 'publishing'
                    ? `Generating your ${subject} code…`
                    : installUnavailable ?? 'No code yet.')}
              </code>
            </pre>
          </div>

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
      </div>
    </dialog>,
    document.body,
  )
}
