import { componentSlots } from './component-slots.js'
import {
  FoundationError,
  isSupportedContractRelease,
  type BlockId,
  type ComponentId,
  type Edition,
  type Preset,
  type StyleFamily,
  supportedComponentIds,
} from '@ombelle/contracts'
import { catalogData } from './generated.js'
import { getCatalogPresets, type StartingPresetId } from './presets.js'
import { runtimeDependencies } from './manifest.js'
export { blockImports, blockManifest, type BlockMeta } from './blocks/index.js'
export { expansionExamples, baseToastExample } from './expansion-examples.js'
export { knownShadcnUtilityHashes, shadcnBaseStyles, shadcnRadixStyles } from './shadcn.js'
export { resolveRecipePreset } from './recipe-preset.js'
export { fontById, fontRegistry, styleFamilyFonts, type FontEntry, type FontRole } from './fonts.js'
export { glassTintPalettes, type GlassTintId, type GlassTintPalette } from './glass-tints.js'
export { glassControlSlots, glassHaloSelector, glassHostedSlots, glassMarkSlots, glassSurfaceSlots } from './glass-recipes.js'
/** The pinned icon package that recipe Buttons with an icon depend on. */
export const recipeIconDependency = {
  name: 'lucide-react',
  version: runtimeDependencies['lucide-react'],
} as const
export {
  defaultGlassPresetId,
  getCatalogPresets,
  offeredGlassPresetOrder,
  startingPresetOrder,
  type CatalogPresets,
  type StartingPresetId,
} from './presets.js'

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
  /** Earlier revisions of built-in and starting presets, resolvable only by exact id@revision. */
  retiredPresets: Preset[]
  release: string
  presets: Record<StyleFamily, Preset>
  templates: Record<ComponentId, ComponentTemplate>
  /** Base UI templates; components without primitive imports share their Radix template. */
  baseTemplates: Partial<Record<ComponentId, ComponentTemplate>>
  styles: Record<StyleFamily, string>
  /** Block sources (Radix edition) and stylesheets, keyed by block id. */
  blockTemplates: Partial<Record<BlockId, string>>
  /** Base UI block sources; a block without one installs its Radix source in both editions. */
  blockBaseTemplates: Partial<Record<BlockId, string>>
  blockStyles: Partial<Record<BlockId, string>>
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
  chip: ['lucide-react'],
  alert: ['lucide-react'],
  table: ['lucide-react'],
  'input-group': ['lucide-react'],
  'input-otp': ['input-otp'],
  'hover-card': ['@radix-ui/react-hover-card'],
  combobox: ['@radix-ui/react-popover', 'lucide-react'],
  calendar: ['react-day-picker', 'date-fns', '@date-fns/tz', 'lucide-react', '@radix-ui/react-popover'],
  command: ['cmdk', '@radix-ui/react-dialog', 'lucide-react'],
  'context-menu': ['@radix-ui/react-context-menu', 'lucide-react'],
  slider: ['@radix-ui/react-slider'],
  collapsible: ['@radix-ui/react-collapsible', 'lucide-react'],
  toggle: ['@radix-ui/react-toggle'],
  'number-input': ['lucide-react'],
  'password-field': ['lucide-react'],
  carousel: ['lucide-react'],
  'navigation-menu': ['@radix-ui/react-navigation-menu', 'lucide-react'],
  sidebar: ['@radix-ui/react-dialog', '@radix-ui/react-tooltip', '@radix-ui/react-collapsible', '@radix-ui/react-slot', 'lucide-react'],
  resizable: ['react-resizable-panels'],
  menubar: ['@radix-ui/react-menubar', 'lucide-react'],
  'data-table': ['@radix-ui/react-dropdown-menu', '@radix-ui/react-popover', '@tanstack/react-table', 'lucide-react'],
  toolbar: ['@radix-ui/react-toolbar', '@radix-ui/react-dropdown-menu', 'lucide-react'],
  'color-picker': ['@radix-ui/react-popover', '@radix-ui/react-slider', 'lucide-react'],
  'code-block': ['@radix-ui/react-tabs'],
  'scroll-area': ['@radix-ui/react-scroll-area'],
  'toggle-group': ['@radix-ui/react-toggle-group'],
  'tag-input': ['lucide-react'],
  empty: ['@radix-ui/react-slot'],
  field: ['lucide-react'],
  stepper: ['lucide-react'],
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
  select: ['@radix-ui/react-select', '@radix-ui/react-popover', 'lucide-react'],
  'radio-group': ['@radix-ui/react-radio-group'],
  'dropdown-menu': ['@radix-ui/react-dropdown-menu', 'lucide-react'],
  breadcrumb: ['@radix-ui/react-dropdown-menu'],
  popover: ['@radix-ui/react-popover'],
  avatar: ['@radix-ui/react-avatar'],
  separator: ['@radix-ui/react-separator'],
  accordion: ['@radix-ui/react-accordion', 'lucide-react'],
  progress: ['@radix-ui/react-progress'],
}
// Built once per release: building validates every preset and filters every template's dependencies, and the
// editors read the catalog on every render. Callers only read it.
const catalogs = new Map<string, Catalog>()
export function getCatalog(release: string): Catalog {
  if (!isSupportedContractRelease(release))
    throw new FoundationError(
      'UNSUPPORTED_RELEASE',
      'Unsupported catalog release',
      '/catalogRelease',
    )
  let catalog = catalogs.get(release)
  if (!catalog) {
    catalog = buildCatalog(release)
    catalogs.set(release, catalog)
  }
  return catalog
}
function buildCatalog(release: string): Catalog {
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
  const shared = getCatalogPresets(release)
  return {
    release,
    presets: shared.presets,
    startingPresets: shared.startingPresets,
    retiredPresets: shared.retiredPresets,
    templates,
    baseTemplates,
    styles: { ...catalogData.styles },
    blockTemplates: { ...catalogData.blockTemplates },
    blockBaseTemplates: { ...catalogData.blockBaseTemplates },
    blockStyles: { ...catalogData.blockStyles },
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
  const baseTemplate = catalogData.baseTemplates[id as keyof typeof catalogData.baseTemplates]
  // A Base UI template keeps only the component packages it imports (Input OTP drops input-otp).
  const kept = names.filter((name) => !name.startsWith('@radix-ui/') &&
    (baseDependencies.includes(name) || baseTemplate === undefined || baseTemplate.includes(`from '${name}`)))
  const baseUi = kept.length < names.length || /from '@base-ui\/react/.test(baseTemplate ?? '')
  return baseUi ? [...kept, '@base-ui/react'] : kept
}
/** A block's source and stylesheet: the Base UI file when the block has one, else the Radix file. */
export function getBlockTemplate(
  catalog: Catalog,
  id: BlockId,
  edition: Edition = 'radix',
): { content: string; styles: string } {
  const radix = catalog.blockTemplates[id]
  const styles = catalog.blockStyles[id]
  if (radix === undefined || styles === undefined)
    throw new FoundationError('INVALID_DATA', 'Unknown block', '/componentIds')
  return { content: (edition === 'base' ? catalog.blockBaseTemplates[id] : undefined) ?? radix, styles }
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
