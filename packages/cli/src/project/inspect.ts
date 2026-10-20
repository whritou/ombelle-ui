import { sha256 } from '@ombelle/compiler'
import fs from 'node:fs/promises'
import path from 'node:path'
import {
  FoundationError,
  validatePreset,
  type ProjectContext,
  type ProjectConfig,
  type ProjectLock,
} from '@ombelle/contracts'
import { safePath, portable } from './paths.js'
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
export async function readJson(root: string, relative: string): Promise<any> {
  const text = await readText(root, relative)
  if (text === null) return undefined
  try {
    return JSON.parse(text)
  } catch {
    throw new FoundationError('INVALID_DATA', 'Invalid JSON', relative)
  }
}
export async function inspectProject(cwd: string): Promise<ProjectContext> {
  const root = await fs.realpath(path.resolve(cwd))
  const preconditions: Record<string, string | null> = {}
  const loadJson = async (relative: string) => {
    const text = await readText(root, relative)
    preconditions[relative] = text === null ? null : await sha256(text)
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
  const lockNames = [
    'pnpm-lock.yaml',
    'package-lock.json',
    'yarn.lock',
    'bun.lock',
    'bun.lockb',
  ]
  const present: string[] = []
  for (const name of lockNames) {
    const text = await readText(root, name)
    preconditions[name] = text === null ? null : await sha256(text)
    if (text !== null) present.push(name)
  }
  if (
    present.length > 1 ||
    present.some((p) => p !== 'pnpm-lock.yaml') ||
    (pkg.packageManager && !/^pnpm@\d/.test(pkg.packageManager)) ||
    (!pkg.packageManager && present.length === 0)
  )
    throw bad('Foundation requires an unambiguous pnpm application')
  const deps = { ...pkg.devDependencies, ...pkg.dependencies }
  const framework = deps.next ? 'next' : deps.vite ? 'vite' : undefined
  if (!framework || !deps.react || !/^\D*4\./.test(deps.tailwindcss ?? ''))
    throw bad('Support is limited to React Vite/Next with Tailwind v4')
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
  const preset = raw ? validatePreset(raw) : undefined
  return {
    preconditions,
    root,
    framework,
    manager: 'pnpm',
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
