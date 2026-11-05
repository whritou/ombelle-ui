import { officialSnapshotOrigin, publicCliPackageName, styleFamilies, validateRecipeSnapshotSource, validateSnapshotSource, type Recipe, type RecipeSnapshotSource, type SnapshotSource, type StyleFamily } from '@ombelle/contracts'

/** Verified public npm release shown on code pages. */
export const publishedInstaller = { packageName: publicCliPackageName, version: '0.4.1' } as const

/** First published installer that accepts `ombelle` presets and codes. */
export const ombelleMinimumCli = '0.4.0'

/** First published installer that accepts the liquid glass material settings and recipe glass overrides. */
export const glassMaterialMinimumCli = '0.5.0'
export const glassMaterialInstallNotice = `Installing this Liquid Glass material requires CLI ${glassMaterialMinimumCli}.`
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
  return styleFamilies.filter((family) => family !== 'ombelle' || ombelle || family === current)
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
  return `${installerRunner(release)} ${operation}${pins} --cwd APP --dry-run --json`
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
