import {
  FoundationError,
  validatePreset,
  type ComponentId,
  type Preset,
  type StyleFamily,
  supportedStyleFamilies,
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
}
export type Catalog = {
  release: string
  presets: Record<StyleFamily, Preset>
  templates: Record<ComponentId, ComponentTemplate>
  styles: Record<StyleFamily, string>
  utility: string
}
export function getCatalog(release: string): Catalog {
  if (release !== '0.1.0')
    throw new FoundationError(
      'UNSUPPORTED_RELEASE',
      'Unsupported catalog release',
      '/catalogRelease',
    )
  const templates = Object.fromEntries(
    (['button', 'dialog', 'input'] as const).map((id) => [
      id,
      {
        id,
        content: catalogData.templates[id],
        logicalPath: 'components/ui/' + id + '.tsx',
        dependencies: Object.entries(runtimeDependencies)
          .filter(
            ([name]) =>
              name === 'react' ||
              name === 'clsx' ||
              name === 'tailwind-merge' ||
              (id === 'button' &&
                (name === '@radix-ui/react-slot' ||
                  name === 'class-variance-authority')) ||
              (id === 'dialog' && name === '@radix-ui/react-dialog'),
          )
          .map(([name, version]) => ({ name, version })),
        slots: [id],
      },
    ]),
  ) as Record<ComponentId, ComponentTemplate>
  return {
    release,
    presets: Object.fromEntries(supportedStyleFamilies.map(family => [family, validatePreset(catalogData.presets[family])])) as Record<StyleFamily, Preset>,
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
