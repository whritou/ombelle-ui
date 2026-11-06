'use client'
import { useEffect, useState, type ReactNode } from 'react'
import { Code } from 'lucide-react'
import type { ResolvedPreset } from '@ombelle/contracts'
import { usePublication } from '../use-publication'
import { codeInstallCommand, contrastInstallBlocked, glassContrastInstallNotice, glassMaterialInstallNotice, materialInstallBlocked } from '../install-command'
import { GetCodeDialog, type CodeStatus } from './get-code-dialog'

const scopes = [
  {
    id: 'new',
    label: 'New project',
    description:
      'Run in your app folder to initialize it with this preset as its saved project defaults.',
  },
  {
    id: 'theme',
    label: 'Existing project',
    description:
      'Merge the tokens into an app that already uses shadcn. Existing component source stays untouched.',
  },
  {
    id: 'button',
    label: 'Button only',
    description:
      'Add a separately scoped Button styled by this preset, leaving saved project defaults unchanged.',
  },
] as const

/**
 * "Get code" for the preset editor: opening it publishes the current draft and
 * shows its install command. Unchanged drafts reuse the code already generated.
 */
export function PresetGetCode({
  preset,
  current,
  contrastWarning,
  announce,
  describedBy,
  className,
  secondary,
}: {
  preset: ResolvedPreset | null
  current: boolean
  contrastWarning: boolean
  announce: (text: string) => void
  describedBy?: string
  className?: string
  /** Secondary exports shown under the command, such as the JSON download. */
  secondary?: ReactNode
}) {
  const publication = usePublication({ preset, current, announce })
  const { state } = publication
  const [open, setOpen] = useState(false)
  const installUnavailable = contrastInstallBlocked(contrastWarning)
    ? glassContrastInstallNotice
    : preset && materialInstallBlocked({ design: preset.data.design })
      ? glassMaterialInstallNotice
      : undefined
  const last = state.lastPublished
  const matches =
    current && preset !== null && last?.presetHash === preset.hash
  useEffect(() => {
    if (open && !matches) void publication.generate()
    // Only opening the dialog expresses the intent to publish.
  }, [open])
  const code: CodeStatus =
    matches && last
      ? {
          status: 'ready',
          reference: `${last.id}@${last.revision}`,
          href: `/presets/${last.id}/${last.revision}`,
        }
      : state.status === 'failed' || state.status === 'withdrawn'
        ? { status: 'failed', error: state.error, retryable: current }
        : { status: 'publishing' }
  return (
    <>
      <button
        type="button"
        className={className}
        disabled={!current || !preset}
        aria-describedby={describedBy}
        aria-haspopup="dialog"
        onClick={() => setOpen(true)}
      >
        <Code aria-hidden="true" size={16} />
        Get code
      </button>
      <GetCodeDialog
        open={open}
        onClose={() => setOpen(false)}
        subject="preset"
        code={code}
        scopes={scopes}
        installUnavailable={installUnavailable}
        announce={announce}
        onRetry={() => void publication.generate()}
        commandFor={(scope, manager) =>
          codeInstallCommand(
            {
              kind: 'preset',
              source: {
                origin: window.location.origin,
                reference: `${last!.id}@${last!.revision}`,
                presetHash: last!.presetHash,
              },
            },
            scope as (typeof scopes)[number]['id'],
            manager,
          )
        }
      >
        {secondary}
      </GetCodeDialog>
    </>
  )
}
