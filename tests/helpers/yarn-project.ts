import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { spawn } from 'node:child_process'
import type { StyleFamily } from '@ombelle/contracts'
import { writeScenarioFixture } from './scenario-fixture.js'

export type YarnFixtureId = 'classic-vite' | 'modern-next' | 'pnp-vite'
export type YarnFixture = {
  id: YarnFixtureId
  root: string
  entry: string
  version: string
  linker: 'node_modules' | 'node-modules' | 'pnp'
  framework: 'vite' | 'next'
}

const specs: Record<YarnFixtureId, Omit<YarnFixture, 'root' | 'entry'>> = {
  'classic-vite': {
    id: 'classic-vite',
    version: '1.22.22',
    linker: 'node_modules',
    framework: 'vite',
  },
  'modern-next': {
    id: 'modern-next',
    version: '4.18.1',
    linker: 'node-modules',
    framework: 'next',
  },
  'pnp-vite': {
    id: 'pnp-vite',
    version: '4.18.1',
    linker: 'pnp',
    framework: 'vite',
  },
}

function corepackHome() {
  if (process.env.COREPACK_HOME) return process.env.COREPACK_HOME
  return process.platform === 'win32'
    ? path.join(
        process.env.LOCALAPPDATA ?? path.join(os.homedir(), 'AppData', 'Local'),
        'node',
        'corepack',
      )
    : path.join(os.homedir(), '.cache', 'node', 'corepack')
}

export async function yarnEntry(version: string) {
  const envName = version.startsWith('1.')
    ? 'OMBELLE_YARN_CLASSIC_ENTRY'
    : 'OMBELLE_YARN_MODERN_ENTRY'
  if (process.env[envName]) return path.resolve(process.env[envName]!)
  const home = corepackHome()
  const candidates =
    version.startsWith('1.')
      ? [path.join(home, 'v1', 'yarn', version, 'bin', 'yarn.js')]
      : [path.join(home, 'v1', 'yarn', version, 'yarn.js')]
  for (const candidate of candidates) {
    try {
      await fs.access(candidate)
      return candidate
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code !== 'ENOENT') throw e
    }
  }
  throw new Error(
    `Yarn ${version} is not cached by Corepack; prepare that exact version first`,
  )
}

function run(entry: string, args: string[], cwd: string) {
  return new Promise<string>((resolve, reject) => {
    const child = spawn(process.execPath, [entry, ...args], {
      cwd,
      shell: false,
      windowsHide: true,
      env: { ...process.env, CI: 'true' },
    })
    let output = ''
    child.stdout.on('data', (chunk) => (output += chunk))
    child.stderr.on('data', (chunk) => (output += chunk))
    child.once('error', reject)
    child.once('exit', (code) =>
      code === 0
        ? resolve(output)
        : reject(new Error(`Yarn ${args.join(' ')} failed:\n${output.slice(-6000)}`)),
    )
  })
}

export async function createYarnProject(id: YarnFixtureId,family:StyleFamily='flat'): Promise<YarnFixture> {
  const spec = specs[id]
  const root = await fs.mkdtemp(path.join(os.tmpdir(), `ombelle-${id}-`))
  try {
    const repo = process.cwd()
    await fs.cp(path.join(repo, 'fixtures', spec.framework), root, {
      recursive: true,
    })
    await fs.rm(path.join(root, 'pnpm-lock.yaml'), { force: true })
    await writeScenarioFixture(root,family)
    const manifestPath = path.join(root, 'package.json')
    const manifest = JSON.parse(await fs.readFile(manifestPath, 'utf8'))
    manifest.packageManager = 'yarn@' + spec.version
    delete manifest.dependencies?.clsx
    await fs.writeFile(manifestPath, JSON.stringify(manifest, null, 2) + '\n')
    if (spec.version.startsWith('4.'))
      await fs.writeFile(
        path.join(root, '.yarnrc.yml'),
        `nodeLinker: ${spec.linker}\n`,
      )
    const lock = path.join(repo, 'fixtures', 'yarn', id, 'yarn.lock')
    await fs.copyFile(lock, path.join(root, 'yarn.lock'))
    const entry = await yarnEntry(spec.version)
    const actualVersion = (await run(entry, ['--version'], root)).trim()
    if (actualVersion !== spec.version)
      throw new Error(`Expected Yarn ${spec.version}; found ${actualVersion}`)
    await run(
      entry,
      spec.version.startsWith('1.')
        ? ['install', '--frozen-lockfile', '--ignore-scripts']
        : ['install', '--immutable', '--mode=skip-build'],
      root,
    )
    return { ...spec, root, entry }
  } catch (error) {
    await fs.rm(root, { recursive: true, force: true })
    throw error
  }
}
