import {
  FoundationError,
  validatePreset,
  type ComponentId,
  type Edition,
  type Preset,
  type StyleFamily,
  styleFamilies,
  supportedComponentIds,
} from '@ombelle/contracts'
import { catalogData } from './generated.js'
import { runtimeDependencies } from './manifest.js'
export { expansionExamples, baseToastExample } from './expansion-examples.js'
export { knownShadcnUtilityHashes, shadcnBaseStyles, shadcnRadixStyles } from './shadcn.js'
export { resolveRecipePreset } from './recipe-preset.js'
export { glassTintPalettes, type GlassTintId, type GlassTintPalette } from './glass-tints.js'
export { glassControlSlots, glassHaloSelector, glassHostedSlots, glassMarkSlots, glassSurfaceSlots } from './glass-recipes.js'
/** The pinned icon package that recipe Buttons with an icon depend on. */
export const recipeIconDependency = {
  name: 'lucide-react',
  version: runtimeDependencies['lucide-react'],
} as const
export const defaultGlassPresetId = 'builtin-liquid-glass-cristal'
/** The liquid glass starting points in picker order: Cristal first, the original family base last. */
export const startingPresetOrder = [
  defaultGlassPresetId,
  'builtin-liquid-glass-givre',
  'builtin-liquid-glass-fume',
  'builtin-liquid-glass-relief',
  'builtin-liquid-glass-clear',
  'builtin-liquid-glass-prism',
  'builtin-liquid-glass-liquid',
  'builtin-liquid-glass-voile',
  'builtin-liquid-glass',
] as const
export type StartingPresetId = (typeof startingPresetOrder)[number]
/**
 * The starting presets the editors and component pages offer, in picker order. Clear, Prism
 * and Liquid shipped in 0.5.0 and stay in the catalog, so recipes, snapshots and projects
 * pinned to them still resolve; they are no longer offered.
 */
export const offeredGlassPresetOrder = [
  defaultGlassPresetId,
  'builtin-liquid-glass-givre',
  'builtin-liquid-glass-fume',
  'builtin-liquid-glass-relief',
  'builtin-liquid-glass-voile',
  'builtin-liquid-glass',
] as const satisfies readonly StartingPresetId[]

export type ComponentTemplate = {
  id: ComponentId
  content: string
  logicalPath: string
  dependencies: { name: string; version: string }[]
  slots: string[]
  styles?: Partial<Record<StyleFamily, string>>
}
export type Catalog = {
  /** Liquid glass starting points, keyed by preset id; see startingPresetOrder. */
  startingPresets: Record<StartingPresetId, Preset>
  release: string
  presets: Record<StyleFamily, Preset>
  templates: Record<ComponentId, ComponentTemplate>
  /** Base UI templates; components without primitive imports share their Radix template. */
  baseTemplates: Partial<Record<ComponentId, ComponentTemplate>>
  styles: Record<StyleFamily, string>
  /** Lab paint rules used by Liquid Glass presets with material settings. */
  glassLabStyle: string
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
  sheet: ['@radix-ui/react-dialog', 'lucide-react'],
  'alert-dialog': ['@radix-ui/react-alert-dialog'],
  toast: ['@radix-ui/react-toast'],
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
  accordion: ['@radix-ui/react-accordion', 'lucide-react'],
  progress: ['@radix-ui/react-progress'],
}
const componentSlots: Partial<Record<ComponentId, readonly string[]>> = {
  badge: ['badge', 'badge-dot'],
  toast: ['toast-viewport', 'toast', 'toast-content', 'toast-title', 'toast-description', 'toast-action', 'toast-close'],
  'input-group': ['input-group', 'input-group-input', 'input-group-textarea', 'input-group-addon', 'input-group-text', 'input-group-button'],
  sheet: ['sheet', 'sheet-trigger', 'sheet-close', 'sheet-dismiss', 'sheet-overlay', 'sheet-content', 'sheet-header', 'sheet-footer', 'sheet-title', 'sheet-description'],
  'alert-dialog': ['alert-dialog', 'alert-dialog-trigger', 'alert-dialog-overlay', 'alert-dialog-content', 'alert-dialog-header', 'alert-dialog-footer', 'alert-dialog-title', 'alert-dialog-description', 'alert-dialog-cancel', 'alert-dialog-action'],
  breadcrumb: ['breadcrumb', 'breadcrumb-list', 'breadcrumb-item', 'breadcrumb-link', 'breadcrumb-page', 'breadcrumb-separator', 'breadcrumb-ellipsis'],
  pagination: ['pagination', 'pagination-content', 'pagination-item', 'pagination-link', 'pagination-ellipsis'],
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
  accordion: [
    'accordion',
    'accordion-item',
    'accordion-header',
    'accordion-trigger',
    'accordion-icon',
    'accordion-content',
    'accordion-content-inner',
  ],
  table: [
    'table-container',
    'table',
    'table-caption',
    'table-header',
    'table-body',
    'table-footer',
    'table-row',
    'table-head',
    'table-cell',
  ],
  progress: ['progress', 'progress-indicator'],
}
export function getCatalog(release: string): Catalog {
  if (release !== '0.1.0')
    throw new FoundationError(
      'UNSUPPORTED_RELEASE',
      'Unsupported catalog release',
      '/catalogRelease',
    )
  const entry = (id: ComponentId, content: string, edition: Edition) => ({
    id,
    content,
    logicalPath: 'components/ui/' + id + '.tsx',
    dependencies: Object.entries(runtimeDependencies)
      .filter(([name]) => editionDependencies(id, edition).includes(name))
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
  })
  const baseTemplates = Object.fromEntries(
    Object.entries(catalogData.baseTemplates).map(([id, content]) => [
      id,
      entry(id as ComponentId, content as string, 'base'),
    ]),
  ) as Partial<Record<ComponentId, ComponentTemplate>>
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
    startingPresets: Object.fromEntries(
      startingPresetOrder.map((id) => [
        id,
        validatePreset(catalogData.startingPresets[id as keyof typeof catalogData.startingPresets]),
      ]),
    ) as Record<StartingPresetId, Preset>,
    templates,
    baseTemplates,
    styles: { ...catalogData.styles },
    glassLabStyle: catalogData.glassLabStyle,
    utility: catalogData.utility,
    glassFilter: catalogData.glassFilter,
  }
}
const usesRadix = (id: ComponentId) =>
  catalogData.templates[id].includes('@radix-ui/')
/** Dependencies of a component in an edition: Base UI replaces every Radix package. */
function editionDependencies(id: ComponentId, edition: Edition): string[] {
  const names = [...baseDependencies, ...(extraDependencies[id] ?? [])]
  if (edition === 'radix') return names
  const kept = names.filter((name) => !name.startsWith('@radix-ui/'))
  return kept.length < names.length ? [...kept, '@base-ui/react'] : kept
}
/** Editions a component can be installed in. */
export function componentEditions(id: ComponentId): readonly Edition[] {
  return !usesRadix(id) || Object.hasOwn(catalogData.baseTemplates, id)
    ? ['radix', 'base']
    : ['radix']
}
export function getTemplate(
  catalog: Catalog,
  id: ComponentId,
  edition: Edition = 'radix',
): ComponentTemplate {
  if (edition === 'base' && Object.hasOwn(catalog.templates, id)) {
    const base = catalog.baseTemplates[id]
    if (base) return base
    if (usesRadix(id))
      throw new FoundationError(
        'UNSUPPORTED_PROJECT',
        'Component `' + id + "` isn't available for Base UI yet; available: " +
          supportedComponentIds.filter((c) => componentEditions(c).includes('base')).join(', '),
        '/componentIds',
      )
  }
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
