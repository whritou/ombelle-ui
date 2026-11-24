import { officialSnapshotOrigin, publicCliPackageName, validateRecipeSnapshotSource, validateSnapshotSource, type InstallableRecipe, type Preset, type RecipeSnapshotSource, type SnapshotSource, type StyleFamily } from '@ombelle/contracts'

/** Verified public npm release shown on code pages. */
export const publishedInstaller = { packageName: publicCliPackageName, version: '1.0.0' } as const

/** What a code page offers to install: a preset (with its contrast state) or a recipe. */
export type InstallSubject =
  | { kind: 'preset'; preset: Preset; contrastWarning?: boolean }
  | { kind: 'recipe'; recipe: InstallableRecipe }

/** The first CLI release that installs some content, and the feature that needs it (the contracts' `MinimumCli` shape). */
export type MinimumCli = { version: string; feature: string }

/**
 * A catalog feature the published installer cannot install yet. While the installer is older than
 * `minimumCli` and `applies` matches, the site shows a notice instead of a command, so every command
 * it shows works.
 */
export type InstallRule = {
  minimumCli: string
  feature: string
  applies(subject: InstallSubject): boolean
}

/**
 * Rules newer than the published installer, until the PUB-05 table replaces them (see `minimumCliFor`).
 * Add one when the catalog gains something the published CLI rejects, and delete it once a release that
 * accepts it is published (the unit test fails until then). Empty while the published installer accepts
 * everything the site can produce.
 */
export const installRules: readonly InstallRule[] = []

/**
 * PUB-05 HOOK: the first published CLI that installs this content. The CLI owns one table of minimum
 * versions per document feature in `@ombelle/contracts` (`minimumCliForPreset` and `minimumCliForRecipe`,
 * branch `feat/cli-1-0-freeze`). Once it is on this branch, return
 * `subject.kind === 'preset' ? minimumCliForPreset(subject.preset) : minimumCliForRecipe(subject.recipe)`
 * here and delete `installRules`; the notices and code pages need no other change.
 */
export function minimumCliFor(subject: InstallSubject, rules: readonly InstallRule[] = installRules): MinimumCli | undefined {
  return rules
    .filter((rule) => rule.applies(subject))
    .map((rule) => ({ version: rule.minimumCli, feature: rule.feature }))
    .reduce<MinimumCli | undefined>((best, next) => (!best || compareVersions(next.version, best.version) > 0 ? next : best), undefined)
}

/** The notice that replaces the command for this content, or undefined when the command works. */
export function installNotice(
  subject: InstallSubject,
  installer: { version: string } = publishedInstaller,
  rules: readonly InstallRule[] = installRules,
): string | undefined {
  const needed = minimumCliFor(subject, rules)
  return needed && compareVersions(installer.version, needed.version) < 0
    ? `Installing this ${subject.kind} needs ${publicCliPackageName} ${needed.version} or newer (${needed.feature}); the published installer is ${installer.version}.`
    : undefined
}

/** A shared notice keeps local artifacts, Get code and published snapshots on the same compatibility rule. */
export function installableRecipeInstallNotice(
  recipe: InstallableRecipe,
  installer: { version: string } = publishedInstaller,
): string | undefined {
  return installNotice({ kind: 'recipe', recipe }, installer)
}

export function presetInstallNotice(
  preset: Preset,
  contrastWarning = false,
  installer: { version: string } = publishedInstaller,
): string | undefined {
  return installNotice({ kind: 'preset', preset, contrastWarning }, installer)
}

/** Catalog recipes (schema 2.0) are installable by every published installer the site names. */
export const catalogRecipesAvailable = true

/** Components first released in 0.9, marked as new on the home page. */
export const catalog09Components: ReadonlySet<string> = new Set(['prose', 'navigation-menu', 'sidebar', 'resizable', 'menubar', 'data-table'])

/** First published installer with the DM Mono code font (the organic release). */
export const organicMinimumCli = '0.8.1'
/** First published installer that accepts the liquid glass material settings, named on the preset export panel. */
export const glassMaterialMinimumCli = '0.5.0'

// Retired gates, kept until their callers drop them. The published installer
// accepts all of this content, so each predicate is false and no notice shows.
// New gates belong in `installRules`.
/** @deprecated Always false; use `presetInstallNotice`. */
export const materialInstallBlocked = (_input: { design?: Record<string, unknown>; overrides?: Record<string, unknown> }, _installer?: { version: string }): boolean => false
/** @deprecated Always false; use `presetInstallNotice`. */
export const contrastInstallBlocked = (_hasWarning: boolean, _installer?: { version: string }): boolean => false
/** @deprecated Always false; use `presetInstallNotice`. */
export const fontsInstallBlocked = (_preset: { design?: unknown }, _installer?: { version: string }): boolean => false
/** @deprecated Always false; use `presetInstallNotice`. */
export const semanticPaletteInstallBlocked = (_preset: { modes?: Record<string, Record<string, unknown>> }, _installer?: { version: string }): boolean => false
/** @deprecated Never shown: its predicate is always false. */
export const glassMaterialInstallNotice = `Installing this Liquid Glass material requires CLI ${glassMaterialMinimumCli}.`
/** @deprecated Never shown: its predicate is always false. */
export const glassContrastInstallNotice = `The published installer needs CLI ${glassMaterialMinimumCli} for this preset. Use the repository CLI to install it with a contrast warning.`
/** @deprecated Never shown: its predicate is always false. */
export const fontsInstallNotice = 'This preset uses font pairs and requires CLI 0.7.8. Download the JSON or use the repository CLI until a compatible public release is available.'
/** @deprecated Never shown: its predicate is always false. */
export const semanticPaletteInstallNotice = 'This preset uses semantic status colors and requires CLI 0.7.2. Download the JSON or use the repository CLI until a compatible public release is available.'

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
  'papier',
  'organic',
  'retro-futurism',
  'minimalist',
  'neo-brutalism',
  'flat',
  'liquid-glass',
]

/** Fresh website sessions start with the first family shown in the pickers. */
export const defaultSiteFamily = siteFamilyOrder[0]!

/**
 * Style families the website offers for new choices, in site order. Every
 * family is installable by the published installer. The arguments are kept
 * for callers and no longer change the result.
 */
export function offeredStyleFamilies(
  _current?: StyleFamily,
  _installer: { version: string } = publishedInstaller,
): readonly StyleFamily[] {
  return siteFamilyOrder
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
