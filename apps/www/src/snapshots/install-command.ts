import { officialSnapshotOrigin, publicCliPackageName, validateRecipeSnapshotSource, validateSnapshotSource, type ComponentRecipe, type InstallableRecipe, type Recipe, type RecipeSnapshotSource, type SnapshotSource, type StyleFamily } from '@ombelle/contracts'

/** Verified public npm release shown on code pages. */
export const publishedInstaller = { packageName: publicCliPackageName, version: '0.7.7' } as const
export const catalogRecipeMinimumCli = '0.6.0'
export const catalogRecipesAvailable = catalogRecipeInstallerSupported(publishedInstaller.version) ||
  (process.env.NODE_ENV !== 'production' && process.env.NEXT_PUBLIC_OMBELLE_CATALOG_RECIPES === '1')
export const catalogRecipeInstallNotice = 'Install this recipe with the repository CLI until a compatible public release is available.'

export function catalogRecipeInstallerSupported(version: string): boolean {
  return compareVersions(version, catalogRecipeMinimumCli) >= 0
}

export const expandedCatalogMinimumCli = '0.7.2'
export const expandedCatalogInstallNotice = `This recipe requires CLI ${expandedCatalogMinimumCli}. Download the JSON or use the repository CLI until a compatible public release is available.`
export const semanticPaletteInstallNotice = `This preset uses semantic status colors and requires CLI ${expandedCatalogMinimumCli}. Download the JSON or use the repository CLI until a compatible public release is available.`

export const displayCatalogMinimumCli = '0.7.3'
export const displayCatalogInstallNotice = `This recipe requires CLI ${displayCatalogMinimumCli}. Download the JSON or use the repository CLI until a compatible public release is available.`
// The 0.7.3 additions: display components and form controls.
const displayComponents = new Set(['spinner', 'kbd', 'empty', 'field', 'meter', 'stepper', 'slider', 'toggle-group', 'chip', 'tag-input', 'input-otp', 'combobox', 'command', 'hover-card', 'context-menu', 'calendar'])

export const catalog075MinimumCli = '0.7.5'
export const catalog075InstallNotice = `This recipe requires CLI ${catalog075MinimumCli}. Download the JSON or use the repository CLI until a compatible public release is available.`
// The 0.7.5 additions: primitives.
const catalog075Components = new Set(['toggle', 'collapsible', 'scroll-area', 'button-group', 'item', 'number-input', 'color-picker', 'code-block'])

const expandedComponents = new Set(['input-group', 'sheet', 'alert-dialog', 'breadcrumb', 'pagination', 'toast'])
const expandedRecipeFields: Readonly<Record<string, readonly string[]>> = {
  badge: ['size', 'dot'], card: ['appearance'], table: ['density', 'striped'], tabs: ['appearance'],
}
// The 0.7.3 variant fields and values that older recipe schemas reject.
const variantRecipeFields073: Readonly<Record<string, readonly string[]>> = {
  badge: ['appearance'], alert: ['dismissible', 'actions', 'layout'], card: ['mode'],
  avatar: ['shape', 'overflow'], accordion: ['appearance', 'icon'],
  tabs: ['counts'], table: ['stickyHeader', 'sortable', 'actions', 'loading'], input: ['size'], textarea: ['size'],
  'input-group': ['clearable', 'counter'], pagination: ['layout', 'pageSize'], select: ['multiple', 'icons'],
  toast: ['mode'], sheet: ['handle', 'resizable'],
}
const variantRecipeValues073: Readonly<Record<string, Readonly<Record<string, readonly string[]>>>> = {
  badge: { variant: ['success', 'warning', 'info'] },
  tabs: { appearance: ['pills'] },
}

export const catalog076MinimumCli = '0.7.6'
export const catalog076InstallNotice = `This recipe requires CLI ${catalog076MinimumCli}. Download the JSON or use the repository CLI until a compatible public release is available.`
// The 0.7.6 additions: new components.
const catalog076Components = new Set(['password-field', 'carousel', 'aspect-ratio', 'toolbar'])
// The 0.7.6 fields, in props or content, that older recipe schemas reject.
const variantRecipeFields076: Readonly<Record<string, readonly string[]>> = {
  field: ['form', 'fieldset', 'legend', 'fields'], checkbox: ['group', 'legend', 'options'],
  sheet: ['snapPoints'], card: ['action'], slider: ['valueDisplay'], progress: ['shape'], meter: ['shape'], 'code-block': ['diff'], tooltip: ['shortcut'],
}

function usesVariants076(recipe: Pick<ComponentRecipe, 'component' | 'props'> & { content?: unknown }): boolean {
  const fields = recipe.props as Record<string, unknown>
  const content = (recipe.content ?? {}) as Record<string, unknown>
  return variantRecipeFields076[recipe.component]?.some(key => Object.hasOwn(fields, key) || Object.hasOwn(content, key)) ?? false
}

function needs076(recipe: Pick<ComponentRecipe, 'component' | 'props'> & { content?: unknown }, installer: { version: string }): boolean {
  return (catalog076Components.has(recipe.component) || usesVariants076(recipe)) && compareVersions(installer.version, catalog076MinimumCli) < 0
}

// The 0.7.5 variant fields, in props or content, that older recipe schemas reject.
const variantRecipeFields075: Readonly<Record<string, readonly string[]>> = {
  checkbox: ['option', 'description'], switch: ['size'], progress: ['size', 'tone', 'showLabel', 'showValue'], popover: ['arrow'],
  dialog: ['size', 'footer', 'scrollingBody'], 'alert-dialog': ['media', 'confirmText'], breadcrumb: ['collapse'],
}

function usesVariants075(recipe: Pick<ComponentRecipe, 'component' | 'props'> & { content?: unknown }): boolean {
  const fields = recipe.props as Record<string, unknown>
  const content = (recipe.content ?? {}) as Record<string, unknown>
  return variantRecipeFields075[recipe.component]?.some(key => Object.hasOwn(fields, key) || Object.hasOwn(content, key)) ?? false
}

function usesVariants073(recipe: Pick<ComponentRecipe, 'component' | 'props'>): boolean {
  const props = recipe.props as Record<string, unknown>
  return (variantRecipeFields073[recipe.component]?.some(key => Object.hasOwn(props, key)) ?? false) ||
    Object.entries(variantRecipeValues073[recipe.component] ?? {}).some(([key, values]) => values.includes(String(props[key])))
}

/** A Button recipe with a 0.7.3 variant needs CLI 0.7.3. */
export function buttonRecipeInstallBlocked(
  recipe: { props?: { variant?: string } },
  installer: { version: string } = publishedInstaller,
): boolean {
  return recipe.props?.variant === 'link-destructive' && compareVersions(installer.version, displayCatalogMinimumCli) < 0
}

const semanticPaletteFields = ['success', 'successForeground', 'warning', 'warningForeground', 'info', 'infoForeground']

/** Older recipe schemas reject added keys even when their value is false or a component default. */
export function componentRecipeInstallBlocked(
  recipe: Pick<ComponentRecipe, 'component' | 'props'> & { content?: unknown },
  installer: { version: string } = publishedInstaller,
): boolean {
  if (!catalogRecipeInstallerSupported(installer.version)) return true
  if (needs076(recipe, installer)) return true
  if (catalog076Components.has(recipe.component)) return false
  if (catalog075Components.has(recipe.component)) return compareVersions(installer.version, catalog075MinimumCli) < 0
  if (usesVariants075(recipe) && compareVersions(installer.version, catalog075MinimumCli) < 0) return true
  if (displayComponents.has(recipe.component)) return compareVersions(installer.version, displayCatalogMinimumCli) < 0
  if (usesVariants073(recipe) && compareVersions(installer.version, displayCatalogMinimumCli) < 0) return true
  if (compareVersions(installer.version, expandedCatalogMinimumCli) >= 0) return false
  if (expandedComponents.has(recipe.component)) return true
  if (expandedRecipeFields[recipe.component]?.some(key => Object.hasOwn(recipe.props, key))) return true
  return recipe.component === 'alert' && ['success', 'warning', 'info'].includes(String((recipe.props as Record<string, unknown>).variant))
}

/** Optional semantic palette fields are unknown properties to the older 0.7.1 preset schema. */
export function semanticPaletteInstallBlocked(
  preset: { modes?: Record<string, Record<string, unknown>> },
  installer: { version: string } = publishedInstaller,
): boolean {
  return compareVersions(installer.version, expandedCatalogMinimumCli) < 0 &&
    Object.values(preset.modes ?? {}).some(colors => semanticPaletteFields.some(key => Object.hasOwn(colors, key)))
}

/** A shared notice keeps local artifacts, Get code and published snapshots on the same compatibility rule. */
export function installableRecipeInstallNotice(
  recipe: InstallableRecipe,
  installer: { version: string } = publishedInstaller,
): string | undefined {
  if (recipe.schemaVersion === '2.0') {
    if (!catalogRecipeInstallerSupported(installer.version)) return catalogRecipeInstallNotice
    if (!componentRecipeInstallBlocked(recipe, installer)) return undefined
    if (needs076(recipe, installer)) return catalog076InstallNotice
    if (catalog075Components.has(recipe.component) || (usesVariants075(recipe) && compareVersions(installer.version, catalog075MinimumCli) < 0)) return catalog075InstallNotice
    return displayComponents.has(recipe.component) || (usesVariants073(recipe) && compareVersions(installer.version, displayCatalogMinimumCli) < 0)
      ? displayCatalogInstallNotice : expandedCatalogInstallNotice
  }
  if (buttonRecipeInstallBlocked(recipe, installer)) return displayCatalogInstallNotice
  return recipeInstallBlocked(recipe, installer) ? glassMaterialInstallNotice : undefined
}

/** First published installer that accepts `ombelle` presets and codes. */
export const ombelleMinimumCli = '0.4.0'

/** First published installer that accepts the liquid glass material settings and recipe glass overrides. */
export const glassMaterialMinimumCli = '0.5.0'
export const glassMaterialInstallNotice = `Installing this Liquid Glass material requires CLI ${glassMaterialMinimumCli}.`
export const glassContrastMinimumCli = '0.5.0'
export const glassContrastInstallNotice = `The published installer needs CLI ${glassContrastMinimumCli} for this preset. Use the repository CLI to install it with a contrast warning.`
const materialFields = ['glassRefraction', 'glassRefractionWidth', 'glassHalo', 'glassDepth', 'glassMotion', 'glassDispersion']

/**
 * True when a preset design or recipe overrides use what the published installer rejects: a material field
 * (even at 0), sheen above 0.5 or backdrop contrast above 1 (the 0.4.x ranges), or any glass* recipe override.
 * The site then shows no command, so every command it shows works.
 */
export function materialInstallBlocked(
  input: { design?: Record<string, unknown>; overrides?: Record<string, unknown> },
  installer: { version: string } = publishedInstaller,
): boolean {
  if (compareVersions(installer.version, glassMaterialMinimumCli) >= 0) return false
  const d = input.design ?? {}
  const preset =
    materialFields.some((key) => d[key] !== undefined) ||
    (typeof d.glassSheen === 'number' && d.glassSheen > 0.5) ||
    (typeof d.glassBackdropContrast === 'number' && d.glassBackdropContrast > 1)
  return preset || Object.keys(input.overrides ?? {}).some((key) => key.startsWith('glass'))
}

export function recipeInstallBlocked(recipe: Pick<Recipe, 'overrides' | 'presetRef'>, installer: { version: string } = publishedInstaller): boolean {
  return materialInstallBlocked(recipe, installer) ||
    (compareVersions(installer.version, glassMaterialMinimumCli) < 0 && recipe.presetRef.id.startsWith('builtin-liquid-glass-'))
}

export function contrastInstallBlocked(hasWarning: boolean, installer: { version: string } = publishedInstaller): boolean {
  return hasWarning && compareVersions(installer.version, glassContrastMinimumCli) < 0
}

/** Compares two x.y.z versions numerically: negative, zero or positive. */
export function compareVersions(a: string, b: string): number {
  const parse = (version: string) => {
    if (!/^\d+\.\d+\.\d+$/.test(version)) throw new Error('Expected an x.y.z version.')
    return version.split('.').map(Number)
  }
  const left = parse(a), right = parse(b)
  for (let index = 0; index < 3; index++)
    if (left[index] !== right[index]) return left[index]! - right[index]!
  return 0
}

/**
 * Order in which the website lists style families, in every picker and list.
 * The shared catalog order (contracts styleFamilies) is unchanged.
 */
export const siteFamilyOrder: readonly StyleFamily[] = [
  'ombelle',
  'minimalist',
  'neo-brutalism',
  'flat',
  'liquid-glass',
]

/** Fresh website sessions start with the first family shown in the pickers. */
export const defaultSiteFamily = siteFamilyOrder[0]!

/**
 * Style families the website offers for new choices. A family the published
 * installer cannot install stays hidden until that installer is released, so
 * every command the site shows works. `current` keeps an already-selected
 * family (from a restored draft) visible.
 */
export function offeredStyleFamilies(
  current?: StyleFamily,
  installer: { version: string } = publishedInstaller,
): readonly StyleFamily[] {
  const ombelle = compareVersions(installer.version, ombelleMinimumCli) >= 0
  return siteFamilyOrder.filter((family) => family !== 'ombelle' || ombelle || family === current)
}

export function installerRunner(release?: { packageName: string; version: string }): string {
  if (!release) return 'pnpm exec node packages/cli/dist/main.js'
  if (release.packageName !== publicCliPackageName || !/^\d+\.\d+\.\d+$/.test(release.version))
    throw new Error('Unsupported published installer release.')
  return `npx ${release.packageName}@${release.version}`
}

/** Display-only invocation for the private repository CLI. */
export function snapshotInstallCommand(
  source: SnapshotSource,
  scope: 'new' | 'theme' | 'button',
  release?: { packageName: string; version: string },
): string {
  const { origin, reference, presetHash } = validateSnapshotSource(source)
  // URL permits punctuation in hostnames which shells interpret. Limit the
  // displayed authority to literal DNS/IP characters and quote it as one value
  // in POSIX shells and PowerShell (including IPv6's brackets).
  if (!/^https?:\/\/(?:[a-z0-9.-]+|\[[a-f0-9:]+\])(?::[0-9]+)?$/.test(origin))
    throw new Error(
      'Snapshot origin cannot be represented safely in a command.',
    )
  const operation = {
    new: `init --preset ${reference}`,
    theme: `theme add ${reference}`,
    button: `add button --preset ${reference}`,
  }[scope]
  if (!operation) throw new Error('Unknown installation scope.')
  const pins = origin === officialSnapshotOrigin ? '' : ` --snapshot-origin '${origin}' --preset-hash ${presetHash}`
  return `${installerRunner(release)} ${operation}${pins}`
}

export const packageManagers = ['pnpm', 'npm', 'yarn', 'bun'] as const
export type PackageManager = (typeof packageManagers)[number]

/** Runs the published installer once through the chosen package manager. */
export function managerRunner(manager: PackageManager, release = publishedInstaller): string {
  installerRunner(release)
  const target = `${release.packageName}@${release.version}`
  return { pnpm: `pnpm dlx ${target}`, npm: `npx ${target}`, yarn: `yarn dlx ${target}`, bun: `bunx ${target}` }[manager]
}

/**
 * The short command shown by "Get code". It runs in the current folder; without
 * `--yes` the CLI prints its plan and asks before writing anything.
 */
export function codeInstallCommand(
  code: { kind: 'preset'; source: SnapshotSource } | { kind: 'recipe'; source: RecipeSnapshotSource },
  scope: 'new' | 'theme' | 'button' | 'recipe',
  manager: PackageManager,
  release = publishedInstaller,
): string {
  const source = code.kind === 'preset' ? validateSnapshotSource(code.source) : validateRecipeSnapshotSource(code.source)
  if (!/^https?:\/\/(?:[a-z0-9.-]+|\[[a-f0-9:]+\])(?::[0-9]+)?$/.test(source.origin))
    throw new Error('Snapshot origin cannot be represented safely in a command.')
  if ((code.kind === 'recipe') !== (scope === 'recipe')) throw new Error('Unknown installation scope.')
  const operation = {
    new: `init --preset ${source.reference}`,
    theme: `theme add ${source.reference}`,
    button: `add button --preset ${source.reference}`,
    recipe: `add --recipe ${source.reference}`,
  }[scope]
  const pins = source.origin === officialSnapshotOrigin
    ? ''
    : code.kind === 'preset'
      ? ` --snapshot-origin '${source.origin}' --preset-hash ${code.source.presetHash}`
      : ` --snapshot-origin '${source.origin}' --recipe-hash ${code.source.recipeHash}`
  return `${managerRunner(manager, release)} ${operation}${pins}`
}
