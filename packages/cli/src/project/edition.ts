import { FoundationError, type Edition, type ProjectContext } from '@ombelle/contracts'
import { shadcnBaseStyles, shadcnRadixStyles } from '@ombelle/catalog'
/** Maps a components.json style to its edition; undefined when unsupported. */
export function detectEdition(style: string | undefined): Edition | undefined {
  if (style === undefined) return 'radix'
  if ((shadcnRadixStyles as readonly string[]).includes(style)) return 'radix'
  if ((shadcnBaseStyles as readonly string[]).includes(style)) return 'base'
  return undefined
}
/**
 * Detects the project's edition for a command and rejects what that command
 * cannot install. Reads components.json's style at call time.
 */
export function assertEdition(
  context: ProjectContext,
  purpose: 'components' | 'recipes' = 'components',
): Edition {
  const style = context.upstream?.style
  const edition = detectEdition(style)
  if (!edition)
    throw new FoundationError(
      'UNSUPPORTED_PROJECT',
      "Style `" + style + "` isn't supported; Ombelle supports `radix-nova`, `new-york` and shadcn's `base-*` styles",
      'components.json',
    )
  if (purpose === 'recipes' && edition === 'base')
    throw new FoundationError(
      'UNSUPPORTED_PROJECT',
      "Recipes and component presets aren't available for Base UI yet",
      'components.json',
    )
  assertLockedEdition(context, edition)
  return edition
}
/** Installed components fix the edition; a lock without components does not. */
export function assertLockedEdition(context: ProjectContext, edition: Edition) {
  const lock = context.lock
  if (!lock || !Object.values(lock.artifacts ?? {}).some((a) => a.kind === 'component'))
    return
  const locked = lock.edition ?? 'radix'
  if (locked !== edition)
    throw new FoundationError(
      'FILE_CONFLICT',
      "This project's components.json uses the " + edition +
        ' edition but installed Ombelle components use ' + locked +
        "; editions can't be mixed",
      context.config?.lockFile ?? 'ui-library.lock.json',
    )
}
