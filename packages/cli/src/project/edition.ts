import type { Edition } from '@ombelle/contracts'
import { shadcnBaseStyles, shadcnRadixStyles } from '@ombelle/catalog'
/** Maps a components.json style to its edition; undefined when unsupported. */
export function detectEdition(style: string | undefined): Edition | undefined {
  if (style === undefined) return 'radix'
  if ((shadcnRadixStyles as readonly string[]).includes(style)) return 'radix'
  if ((shadcnBaseStyles as readonly string[]).includes(style)) return 'base'
  return undefined
}
