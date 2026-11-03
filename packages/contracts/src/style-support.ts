import { supportedComponentIds, type ComponentId } from './component-ids.js'
import { FoundationError } from './diagnostics.js'
import { styleSupport, type StyleFamily, type StyleSupport } from './style-families.js'

export function componentsWithStyleSupport(
  family: StyleFamily,
  statuses: readonly StyleSupport[],
): ComponentId[] {
  return supportedComponentIds.filter(id => statuses.includes(styleSupport(id, family)))
}

export function assertStyleAvailable(ids: readonly ComponentId[], family: StyleFamily): void {
  const blocked = ids.find(id => styleSupport(id, family) === 'unavailable')
  if (blocked === undefined) return
  const label = blocked.charAt(0).toUpperCase() + blocked.slice(1)
  const experimental = componentsWithStyleSupport(family, ['experimental']).join(', ')
  throw new FoundationError(
    'STYLE_UNAVAILABLE',
    `${label} is unavailable for ${family}. Experimental ${family} components: ${experimental}.`,
    '/componentIds',
    'Choose a stable family for this component or remove it.',
  )
}
