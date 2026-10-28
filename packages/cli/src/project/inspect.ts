import { sha256 } from '@ombelle/compiler'
import fs from 'node:fs/promises'
import path from 'node:path'
import {
  FoundationError,
  validatePreset,
  type ProjectContext,
  type ProjectConfig,
  type ProjectLock,
  type PackageManager,
  type BunLockfile,
} from '@ombelle/contracts'
import { safePath, portable } from './paths.js'
import { fingerprintFile } from './fingerprint.js'
import { assertStandaloneProject } from './workspace.js'
import { validateInstalledRecipes } from './recipes.js'
import { validateInstalledComponentPresets } from './component-presets.js'
import { validateSnapshotSources } from '../snapshots/source.js'
export async function readText(
  root: string,
  relative: string,
): Promise<string | null> {
  const target = await safePath(root, relative)
  try {
    return await fs.readFile(target, 'utf8')
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === 'ENOENT') return null
    throw e
  }
}
function declaredManager(value: unknown): PackageManager | undefined {
  if (typeof value !== 'string') return undefined
  const ordinary = /^(npm|pnpm)@\d+\.\d+\.\d+(?:[-+][\w.-]+)?$/.exec(value)
  if (ordinary) return ordinary[1] as PackageManager
  const additional =
    /^(yarn|bun)@\d+\.\d+\.\d+(?:\+sha224\.[A-Za-z0-9+/]+={0,2})?$/.exec(value)
  if (additional) return additional[1] as PackageManager
  return undefined
}

export async function inspectProject(
  cwd: string,
  explicitManager?: PackageManager,
): Promise<ProjectContext> {
  const root = await fs.realpath(path.resolve(cwd))
  const preconditions: Record<string, string | null> = {}
  const loadJson = async (relative: string) => {
    const text = await readText(root, relative)
    preconditions[relative] = await fingerprintFile(root, relative)
    if (text === null) return undefined
    try {
      return JSON.parse(text)
    } catch {
      throw new FoundationError('INVALID_DATA', 'Invalid JSON', relative)
    }
  }
  const pkg = await loadJson('package.json')
  const bad = (message: string) =>
    new FoundationError('UNSUPPORTED_PROJECT', message, root)
  if (!pkg || typeof pkg !== 'object')
    throw bad('Target an existing application with package.json')
  await assertStandaloneProject(root)
  const lockNames = [
    'pnpm-lock.yaml',
    'package-lock.json',
    'yarn.lock',
    'bun.lock',
    'bun.lockb',
    'npm-shrinkwrap.json',
  ]
  const present: string[] = []
  for (const name of lockNames) {
    const fingerprint = await fingerprintFile(root, name)
    preconditions[name] = fingerprint
    if (fingerprint !== null) present.push(name)
  }
  const declared = declaredManager(pkg.packageManager)
  const locked =
    present.length === 1
      ? (
          {
            'package-lock.json': 'npm',
            'pnpm-lock.yaml': 'pnpm',
            'yarn.lock': 'yarn',
            'bun.lock': 'bun',
            'bun.lockb': 'bun',
          } as Record<string, PackageManager>
        )[present[0]]
      : undefined
  if (
    present.length > 1 ||
    (present.length && !locked) ||
    (pkg.packageManager !== undefined && !declared) ||
    (!explicitManager && declared && locked && declared !== locked) ||
    (explicitManager && locked && explicitManager !== locked) ||
    (explicitManager &&
      declared &&
      explicitManager !== declared &&
      locked !== explicitManager) ||
    (!explicitManager && !declared && !locked)
  )
    throw bad(
      'Choose an unambiguous npm, pnpm, Yarn, or Bun application; align manager evidence and its single lockfile',
    )
  const manager = explicitManager ?? declared ?? locked
  if (!manager) throw bad('Choose a package manager for the target application')
  preconditions['.npmrc'] = await fingerprintFile(root, '.npmrc')
  preconditions['bunfig.toml'] = await fingerprintFile(root, 'bunfig.toml')
  const deps = { ...pkg.devDependencies, ...pkg.dependencies }
  const framework = deps.next ? 'next' : deps.vite ? 'vite' : undefined
  if (!framework || !deps.react || !/^\D*4\./.test(deps.tailwindcss ?? ''))
    throw bad('Support is limited to React Vite/Next with Tailwind v4')
  if (deps.react !== '19.3.1' || deps['react-dom'] !== '19.3.1')
    throw bad(
      'Foundation requires exact react and react-dom 19.3.1 declarations; align both versions before installing (ranges are not verified)',
    )
  const config = (await loadJson('ui-library.config.json')) as
    ProjectConfig | undefined
  if (
    config &&
    (config.configVersion !== 1 ||
      config.platform !== 'react-web' ||
      config.language !== 'tsx' ||
      !config.theme?.cssEntry ||
      !config.presetFile ||
      !config.lockFile)
  )
    throw bad('Unsupported Ombelle project configuration')
  if (
    config &&
    config.packageManager !== undefined &&
    config.packageManager !== 'auto' &&
    config.packageManager !== manager
  )
    throw bad(
      'Ombelle packageManager must match the target app; use auto or align its configuration',
    )
  const upstream = await loadJson('components.json')
  const tsconfig = await loadJson('tsconfig.json')
  const paths = tsconfig?.compilerOptions?.paths
  const alias = (value: string) => {
    if (typeof value !== 'string') throw bad('Missing import alias')
    const matches = Object.entries(paths ?? {}).filter(
      ([key]) => key.endsWith('/*') && value.startsWith(key.slice(0, -1)),
    )
    if (matches.length !== 1) throw bad('Ambiguous or missing import alias')
    const [key, targets] = matches[0] as [string, unknown]
    if (
      !Array.isArray(targets) ||
      targets.length !== 1 ||
      typeof targets[0] !== 'string' ||
      !targets[0].endsWith('/*')
    )
      throw bad('Only one explicit alias target is supported')
    const base =
      typeof tsconfig.compilerOptions.baseUrl === 'string'
        ? tsconfig.compilerOptions.baseUrl
        : '.'
    return portable(
      path.join(base, targets[0].slice(0, -1), value.slice(key.length - 1)),
    )
  }
  const uiAlias =
    upstream?.aliases?.ui ?? upstream?.aliases?.components ?? '@/components/ui'
  const utilsAlias = upstream?.aliases?.utils ?? '@/lib/utils'
  const componentsDir = config?.paths?.components ?? alias(uiAlias),
    utilsFile = alias(utilsAlias) + '.ts',
    sourceDir = portable(path.dirname(path.dirname(alias(utilsAlias))))
  if (
    portable(path.normalize(componentsDir)) !==
    portable(path.normalize(alias(uiAlias)))
  )
    throw bad(
      'Component destination must match components.json aliases.ui and tsconfig paths; align the alias before installing',
    )
  let cssEntry = config?.theme.cssEntry ?? upstream?.tailwind?.css
  if (!cssEntry) {
    const candidates = []
    for (const p of ['src/index.css', 'src/app/globals.css', 'app/globals.css'])
      if ((await readText(root, p)) !== null) candidates.push(p)
    if (candidates.length !== 1) throw bad('Choose one global CSS entry')
    cssEntry = candidates[0]
  }
  if (typeof cssEntry !== 'string' || (await readText(root, cssEntry)) === null)
    throw bad('Configured global CSS entry is missing')
  const styleFile =
    config?.paths?.styleOutput ??
    portable(path.join(sourceDir, 'styles/ui-style.css'))
  for (const p of [
    componentsDir,
    utilsFile,
    styleFile,
    config?.presetFile ?? 'ui-preset.json',
    config?.lockFile ?? 'ui-library.lock.json',
  ])
    await safePath(root, p)
  const lock = (await loadJson(config?.lockFile ?? 'ui-library.lock.json')) as
    ProjectLock | undefined
  if (
    lock &&
    (lock.lockVersion !== 1 ||
      typeof lock.artifacts !== 'object' ||
      !Array.isArray(lock.managedDeclarations))
  )
    throw bad('Unsupported Ombelle lock version or shape')
  const raw = await loadJson(config?.presetFile ?? 'ui-preset.json')
  if (lock?.recipes !== undefined)
    lock.recipes = await validateInstalledRecipes(
      root,
      lock.recipes,
      lock.artifacts,
    )
  if (lock?.componentPresets !== undefined)
    lock.componentPresets = await validateInstalledComponentPresets(
      root,
      lock.componentPresets,
      lock.artifacts,
      { root, componentsDir, sourceDir, utilsFile, uiAlias, utilsAlias },
    )
  const preset = raw ? validatePreset(raw) : undefined
  if (lock) await validateSnapshotSources(lock, preset)
  return {
    ...(manager === 'bun'
      ? { bunLockfile: (present[0] ?? 'bun.lock') as BunLockfile }
      : {}),
    preconditions,
    root,
    framework,
    manager,
    cssEntry,
    darkSelector: config?.theme.darkSelector ?? '.dark',
    componentsDir,
    utilsFile,
    styleFile,
    uiAlias,
    utilsAlias,
    sourceDir,
    packageJson: pkg,
    upstream,
    config,
    preset,
    lock,
  }
}
