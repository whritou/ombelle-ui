import {
  FoundationError,
  validatePreset,
  type ComponentId,
  type Preset,
  type StyleFamily,
  styleFamilies,
  supportedComponentIds,
} from '@ombelle/contracts'
import { catalogData } from './generated.js'
import { runtimeDependencies } from './manifest.js'
export { resolveRecipePreset } from './recipe-preset.js'
/** The pinned icon package that recipe Buttons with an icon depend on. */
export const recipeIconDependency = {
  name: 'lucide-react',
  version: runtimeDependencies['lucide-react'],
} as const
export type ComponentTemplate = {
  id: ComponentId
  content: string
  logicalPath: string
  dependencies: { name: string; version: string }[]
  slots: string[]
  styles?: Partial<Record<StyleFamily, string>>
}
export type Catalog = {
  release: string
  presets: Record<StyleFamily, Preset>
  templates: Record<ComponentId, ComponentTemplate>
  styles: Record<StyleFamily, string>
  utility: string
  /** Liquid-glass refraction filter component, installed with glass components. */
  glassFilter: string
}
const baseDependencies: readonly string[] = [
  'react',
  'clsx',
  'tailwind-merge',
]
const extraDependencies: Partial<Record<ComponentId, readonly string[]>> = {
  button: ['@radix-ui/react-slot', 'class-variance-authority'],
  checkbox: ['@radix-ui/react-checkbox', 'lucide-react'],
  switch: ['@radix-ui/react-switch'],
  tabs: ['@radix-ui/react-tabs'],
  tooltip: ['@radix-ui/react-tooltip'],
  dialog: ['@radix-ui/react-dialog', 'lucide-react'],
  'native-select': ['lucide-react'],
  select: ['@radix-ui/react-select', 'lucide-react'],
  'radio-group': ['@radix-ui/react-radio-group'],
  'dropdown-menu': ['@radix-ui/react-dropdown-menu', 'lucide-react'],
  popover: ['@radix-ui/react-popover'],
  avatar: ['@radix-ui/react-avatar'],
  separator: ['@radix-ui/react-separator'],
  progress: ['@radix-ui/react-progress'],
}
const componentSlots: Partial<Record<ComponentId, readonly string[]>> = {
  checkbox: ['checkbox', 'checkbox-indicator'],
  switch: ['switch', 'switch-thumb'],
  tabs: ['tabs', 'tabs-list', 'tabs-trigger', 'tabs-content'],
  tooltip: [
    'tooltip-provider',
    'tooltip',
    'tooltip-trigger',
    'tooltip-content',
    'tooltip-arrow',
  ],
  card: [
    'card',
    'card-header',
    'card-title',
    'card-description',
    'card-content',
    'card-footer',
  ],
  'native-select': [
    'native-select-wrapper',
    'native-select',
    'native-select-icon',
    'native-select-option',
    'native-select-optgroup',
  ],
  select: [
    'select',
    'select-group',
    'select-value',
    'select-trigger',
    'select-icon',
    'select-content',
    'select-viewport',
    'select-label',
    'select-item',
    'select-item-indicator',
    'select-item-hint',
    'select-separator',
    'select-scroll-up-button',
    'select-scroll-down-button',
  ],
  'radio-group': [
    'radio-group',
    'radio-group-item',
    'radio-group-indicator',
    'radio-group-option',
    'radio-group-option-label',
    'radio-group-option-description',
  ],
  'dropdown-menu': [
    'dropdown-menu',
    'dropdown-menu-portal',
    'dropdown-menu-trigger',
    'dropdown-menu-content',
    'dropdown-menu-group',
    'dropdown-menu-label',
    'dropdown-menu-item',
    'dropdown-menu-checkbox-item',
    'dropdown-menu-radio-group',
    'dropdown-menu-radio-item',
    'dropdown-menu-item-indicator',
    'dropdown-menu-separator',
    'dropdown-menu-shortcut',
    'dropdown-menu-sub',
    'dropdown-menu-sub-trigger',
    'dropdown-menu-sub-icon',
    'dropdown-menu-sub-content',
  ],
  alert: ['alert', 'alert-title', 'alert-description'],
  popover: [
    'popover',
    'popover-trigger',
    'popover-anchor',
    'popover-content',
    'popover-title',
    'popover-description',
  ],
  avatar: [
    'avatar',
    'avatar-image',
    'avatar-fallback',
    'avatar-status',
    'avatar-group',
  ],
  separator: ['separator', 'separator-label'],
  progress: ['progress', 'progress-indicator'],
}
export function getCatalog(release: string): Catalog {
  if (release !== '0.1.0')
    throw new FoundationError(
      'UNSUPPORTED_RELEASE',
      'Unsupported catalog release',
      '/catalogRelease',
    )
  const templates = Object.fromEntries(
    supportedComponentIds.map((id) => [
      id,
      {
        id,
        content: catalogData.templates[id],
        logicalPath: 'components/ui/' + id + '.tsx',
        dependencies: Object.entries(runtimeDependencies)
          .filter(
            ([name]) =>
              baseDependencies.includes(name) ||
              extraDependencies[id]?.includes(name),
          )
          .map(([name, version]) => ({ name, version })),
        slots: [...(componentSlots[id] ?? [id])],
        ...(Object.hasOwn(catalogData.componentStyles, id)
          ? {
              styles:
                catalogData.componentStyles[
                  id as keyof typeof catalogData.componentStyles
                ],
            }
          : {}),
      },
    ]),
  ) as Record<ComponentId, ComponentTemplate>
  return {
    release,
    presets: Object.fromEntries(
      styleFamilies.map((family) => [
        family,
        validatePreset(catalogData.presets[family]),
      ]),
    ) as Record<StyleFamily, Preset>,
    templates,
    styles: { ...catalogData.styles },
    utility: catalogData.utility,
    glassFilter: catalogData.glassFilter,
  }
}
export function getTemplate(
  catalog: Catalog,
  id: ComponentId,
): ComponentTemplate {
  if (!Object.hasOwn(catalog.templates, id))
    throw new FoundationError(
      'INVALID_DATA',
      'Unknown component',
      '/componentIds',
    )
  const template = catalog.templates[id]
  if (!template)
    throw new FoundationError(
      'INVALID_DATA',
      'Unknown component',
      '/componentIds',
    )
  return template
}
