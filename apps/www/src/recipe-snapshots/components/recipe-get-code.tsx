'use client'
import { useEffect, useState, type ReactNode } from 'react'
import { Code } from 'lucide-react'
import type { InstallableRecipeCompileResult } from '@ombelle/contracts'
import { useRecipePublication } from '../use-publication'
import { codeInstallCommand, installableRecipeInstallNotice } from '../../snapshots/install-command'
import {
  GetCodeDialog,
  type CodeStatus,
} from '../../snapshots/components/get-code-dialog'

type ResolvedRecipe = InstallableRecipeCompileResult['recipe']

/**
 * "Get code" for the Button editor: opening it publishes the current recipe and
 * shows its install command. Unchanged recipes reuse the code already generated.
 */
export function RecipeGetCode({
  recipe,
  current,
  announce,
  className,
  secondary,
  componentName = 'Button',
  storageKey,
}: {
  recipe: ResolvedRecipe | null
  current: boolean
  announce: (text: string) => void
  className?: string
  /** Secondary exports shown under the command, such as the JSON download. */
  secondary?: ReactNode
  componentName?: string
  storageKey?: string
}) {
  const publication = useRecipePublication({ recipe, current, announce, storageKey })
  const scopes = [{ id: 'recipe', label: componentName,
    description: `Run in an initialized app folder to add this ${componentName} recipe. The CLI shows its plan and asks before writing.` }] as const
  const installUnavailable = recipe ? installableRecipeInstallNotice(recipe.data) : undefined
  const { state } = publication
  const [open, setOpen] = useState(false)
  const last = state.lastPublished
  const matches =
    current && recipe !== null && last?.recipeHash === recipe.hash
  useEffect(() => {
    // Only opening the dialog expresses the intent to publish.
    if (open && !matches) void publication.generate()
  }, [open])
  const code: CodeStatus =
    matches && last
      ? {
          status: 'ready',
          reference: `${last.id}@${last.revision}`,
          href: `/recipes/${last.id}/${last.revision}`,
        }
      : state.status === 'failed' || state.status === 'withdrawn'
        ? { status: 'failed', error: state.error, retryable: current }
        : { status: 'publishing' }
  return (
    <>
      <button
        type="button"
        className={className}
        disabled={!current || !recipe}
        aria-haspopup="dialog"
        onClick={() => setOpen(true)}
      >
        <Code aria-hidden="true" size={16} />
        Get code
      </button>
      <GetCodeDialog
        open={open}
        onClose={() => setOpen(false)}
        subject="recipe"
        code={code}
        scopes={scopes}
        installUnavailable={installUnavailable}
        announce={announce}
        onRetry={() => void publication.generate()}
        commandFor={(_scope, manager) =>
          codeInstallCommand(
            {
              kind: 'recipe',
              source: {
                origin: window.location.origin,
                reference: `${last!.id}@${last!.revision}`,
                recipeHash: last!.recipeHash,
              },
            },
            'recipe',
            manager,
          )
        }
      >
        {secondary}
      </GetCodeDialog>
    </>
  )
}
