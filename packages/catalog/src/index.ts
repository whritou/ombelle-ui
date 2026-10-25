import {
  FoundationError,
  validatePreset,
  type ComponentId,
  type Preset,
  type StyleFamily,
  supportedStyleFamilies,
  supportedComponentIds,
} from '@ombelle/contracts'
import { catalogData } from './generated.js'
import { runtimeDependencies } from './manifest.js'
export { resolveRecipePreset } from './recipe-preset.js'
export type ComponentTemplate = {
  id: ComponentId
  content: string
  logicalPath: string
  dependencies: { name: string; version: string }[]
  slots: string[]
  styles?: Record<StyleFamily, string>
}
export type Catalog = {
  release: string
  presets: Record<StyleFamily, Preset>
  templates: Record<ComponentId, ComponentTemplate>
  styles: Record<StyleFamily, string>
  utility: string
}
const baseDependencies: readonly string[] = [
  'react',
  'clsx',
  'tailwind-merge',
]
const extraDependencies: Partial<Record<ComponentId, readonly string[]>> = {
  button: ['@radix-ui/react-slot', 'class-variance-authority'],
  checkbox: ['@radix-ui/react-checkbox', 'lucide-react'],
  dialog: ['@radix-ui/react-dialog', 'lucide-react'],
  'native-select': ['lucide-react'],
}
const componentSlots: Partial<Record<ComponentId, readonly string[]>> = {
  checkbox: ['checkbox', 'checkbox-indicator'],
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
      supportedStyleFamilies.map((family) => [
        family,
        validatePreset(catalogData.presets[family]),
      ]),
    ) as Record<StyleFamily, Preset>,
    templates,
    styles: { ...catalogData.styles },
    utility: catalogData.utility,
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
