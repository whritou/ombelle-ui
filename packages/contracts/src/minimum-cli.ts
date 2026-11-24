/**
 * The first published CLI version that reads each document feature (PUB-05). One table for every
 * consumer: the website reads it to decide which install command it may show, and tools that hand JSON to
 * a CLI read it to name the version a document needs. A release that adds a value or a field adds its
 * row here (and, from 1.0, raises the document's schemaVersion).
 *
 * Versions are published `@ombelle-ui/cli` releases. Features not listed need the first release that
 * read the document kind at all (`preset.base`, `recipe.base`, `componentRecipe.base`).
 */
export const minimumCliTable = {
  preset: {
    base: '0.1.0',
    /** Style families added after the first release. */
    styleFamily: { ombelle: '0.4.0', papier: '0.8.0', organic: '0.8.1', 'retro-futurism': '0.8.2' } as Readonly<Record<string, string>>,
    /** success, warning and info palette colors (and their foregrounds) in any mode. */
    semanticPalette: '0.7.2',
    /** schemaVersion 1.1: display, body or code fonts from the font registry. */
    extendedTypography: '0.7.8',
    /** Liquid glass material fields, sheen above 0.5 or backdrop contrast above 1. */
    glassMaterial: '0.5.0',
    /** A glass preset below the contrast bound, installed with a warning instead of refused. */
    glassContrastWarning: '0.5.0',
  },
  /** Button recipes, schemaVersion 1.0. */
  recipe: {
    base: '0.1.0',
    linkDestructiveVariant: '0.7.3',
    /** overrides.fontFamilyId */
    fonts: '0.8.0',
    /** glass* overrides, or a liquid glass material preset reference. */
    glass: '0.5.0',
  },
  /** Catalog component recipes, schemaVersion 2.0. */
  componentRecipe: {
    base: '0.6.0',
    /** appearance.fonts */
    fonts: '0.8.0',
    /** Components added after 0.6.0. */
    components: {
      ...Object.fromEntries(['input-group', 'sheet', 'alert-dialog', 'breadcrumb', 'pagination', 'toast'].map((id) => [id, '0.7.2'])),
      ...Object.fromEntries(['spinner', 'kbd', 'empty', 'field', 'meter', 'stepper', 'slider', 'toggle-group', 'chip', 'tag-input',
        'input-otp', 'combobox', 'command', 'hover-card', 'context-menu', 'calendar'].map((id) => [id, '0.7.3'])),
      ...Object.fromEntries(['toggle', 'collapsible', 'scroll-area', 'button-group', 'item', 'number-input', 'color-picker',
        'code-block'].map((id) => [id, '0.7.5'])),
      ...Object.fromEntries(['password-field', 'carousel', 'aspect-ratio', 'toolbar'].map((id) => [id, '0.7.6'])),
      ...Object.fromEntries(['prose', 'navigation-menu', 'sidebar', 'resizable', 'menubar', 'data-table'].map((id) => [id, '0.9.0'])),
    } as Readonly<Record<string, string>>,
    /**
     * Fields added to a component's recipe after it first shipped, by version. `props` rows match keys
     * in props only; `propsOrContent` rows match keys in props or content.
     */
    fields: [
      { version: '0.7.2', where: 'props', fields: { badge: ['size', 'dot'], card: ['appearance'], table: ['density', 'striped'], tabs: ['appearance'] } },
      { version: '0.7.3', where: 'props', fields: {
        badge: ['appearance'], alert: ['dismissible', 'actions', 'layout'], card: ['mode'], avatar: ['shape', 'overflow'],
        accordion: ['appearance', 'icon'], tabs: ['counts'], table: ['stickyHeader', 'sortable', 'actions', 'loading'],
        input: ['size'], textarea: ['size'], 'input-group': ['clearable', 'counter'], pagination: ['layout', 'pageSize'],
        select: ['multiple', 'icons'], toast: ['mode'], sheet: ['handle', 'resizable'],
      } },
      { version: '0.7.5', where: 'propsOrContent', fields: {
        checkbox: ['option', 'description'], switch: ['size'], progress: ['size', 'tone', 'showLabel', 'showValue'], popover: ['arrow'],
        dialog: ['size', 'footer', 'scrollingBody'], 'alert-dialog': ['media', 'confirmText'], breadcrumb: ['collapse'],
      } },
      { version: '0.7.6', where: 'propsOrContent', fields: {
        field: ['form', 'fieldset', 'legend', 'fields'], checkbox: ['group', 'legend', 'options'], sheet: ['snapPoints'], card: ['action'],
        slider: ['valueDisplay'], progress: ['shape'], meter: ['shape'], 'code-block': ['diff'], tooltip: ['shortcut'],
      } },
    ] as readonly { version: string; where: 'props' | 'propsOrContent'; fields: Readonly<Record<string, readonly string[]>> }[],
    /** Prop values added after their prop shipped. */
    values: [
      { version: '0.7.2', component: 'alert', prop: 'variant', values: ['success', 'warning', 'info'] },
      { version: '0.7.3', component: 'badge', prop: 'variant', values: ['success', 'warning', 'info'] },
      { version: '0.7.3', component: 'tabs', prop: 'appearance', values: ['pills'] },
    ] as readonly { version: string; component: string; prop: string; values: readonly string[] }[],
  },
} as const

export type MinimumCli = { version: string; feature: string }

/** Compares two x.y.z versions numerically: negative, zero or positive. */
export function compareCliVersions(a: string, b: string): number {
  const parse = (version: string) => {
    if (!/^\d+\.\d+\.\d+$/.test(version)) throw new Error('Expected an x.y.z version: ' + version)
    return version.split('.').map(Number)
  }
  const left = parse(a), right = parse(b)
  for (let index = 0; index < 3; index++) if (left[index] !== right[index]) return left[index]! - right[index]!
  return 0
}
function highest(requirements: MinimumCli[]): MinimumCli {
  return requirements.reduce((best, next) => (compareCliVersions(next.version, best.version) > 0 ? next : best))
}
const object = (value: unknown): Record<string, unknown> =>
  value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : {}
const semanticColors = ['success', 'successForeground', 'warning', 'warningForeground', 'info', 'infoForeground']
const glassMaterialFields = ['glassRefraction', 'glassRefractionWidth', 'glassHalo', 'glassDepth', 'glassMotion', 'glassDispersion']

/** The first CLI that installs a preset document, and the feature that needs it. */
export function minimumCliForPreset(preset: unknown): MinimumCli {
  const table = minimumCliTable.preset
  const data = object(preset)
  const design = object(data.design)
  const found: MinimumCli[] = [{ version: table.base, feature: 'preset' }]
  const family = typeof data.styleFamily === 'string' ? table.styleFamily[data.styleFamily] : undefined
  if (family) found.push({ version: family, feature: 'styleFamily ' + data.styleFamily })
  if (Object.values(object(data.modes)).some((colors) => semanticColors.some((key) => Object.hasOwn(object(colors), key))))
    found.push({ version: table.semanticPalette, feature: 'semantic palette colors' })
  if (data.schemaVersion === '1.1') found.push({ version: table.extendedTypography, feature: 'schemaVersion 1.1 (font pairs)' })
  if (glassMaterialFields.some((key) => design[key] !== undefined) ||
    (typeof design.glassSheen === 'number' && design.glassSheen > 0.5) ||
    (typeof design.glassBackdropContrast === 'number' && design.glassBackdropContrast > 1))
    found.push({ version: table.glassMaterial, feature: 'liquid glass material settings' })
  return highest(found)
}

/** The first CLI that installs a recipe document (Button 1.0 or component 2.0), and the feature that needs it. */
export function minimumCliForRecipe(recipe: unknown): MinimumCli {
  const data = object(recipe)
  if (data.schemaVersion !== '2.0') {
    const table = minimumCliTable.recipe
    const overrides = object(data.overrides)
    const found: MinimumCli[] = [{ version: table.base, feature: 'recipe' }]
    if (object(data.props).variant === 'link-destructive') found.push({ version: table.linkDestructiveVariant, feature: 'Button variant link-destructive' })
    if (overrides.fontFamilyId !== undefined) found.push({ version: table.fonts, feature: 'overrides.fontFamilyId' })
    const presetRef = object(data.presetRef)
    if (Object.keys(overrides).some((key) => key.startsWith('glass')) ||
      (typeof presetRef.id === 'string' && presetRef.id.startsWith('builtin-liquid-glass-')))
      found.push({ version: table.glass, feature: 'liquid glass overrides or material preset' })
    return highest(found)
  }
  const table = minimumCliTable.componentRecipe
  const component = String(data.component)
  const props = object(data.props), content = object(data.content)
  const found: MinimumCli[] = [{ version: table.base, feature: 'component recipe' }]
  const added = table.components[component]
  if (added) found.push({ version: added, feature: 'component ' + component })
  if (object(data.appearance).fonts !== undefined) found.push({ version: table.fonts, feature: 'appearance.fonts' })
  for (const row of table.fields)
    for (const field of row.fields[component] ?? [])
      if (Object.hasOwn(props, field) || (row.where === 'propsOrContent' && Object.hasOwn(content, field)))
        found.push({ version: row.version, feature: component + ' ' + field })
  for (const row of table.values)
    if (row.component === component && row.values.includes(String(props[row.prop])))
      found.push({ version: row.version, feature: component + ' ' + row.prop + ' ' + String(props[row.prop]) })
  return highest(found)
}
