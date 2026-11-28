import path from 'node:path'
import fs from 'node:fs/promises'
import { spawn } from 'node:child_process'
import {
  FoundationError,
  type Dependency,
  type PackageManager,
  type BunLockfile,
} from '@ombelle/contracts'
import { resolveBunExecutable, resolveNodeExecutable, resolveRuntime, runtimeNotice } from './executable.js'
import { prepareBun, bunAddArgs, assertBunOwnership, assertBunInstalled } from './bun.js'

export type PreparedManager = {
  executable: string
  prefixArgs: string[]
  version?: string
}

/**
 * The optional dependency-install limit, from OMBELLE_DEPENDENCY_TIMEOUT_SECONDS. Unset or 0 means no
 * limit. Invalid values are refused rather than silently replaced.
 */
export function dependencyTimeoutMs(env: Record<string, string | undefined>): number {
  const value = env.OMBELLE_DEPENDENCY_TIMEOUT_SECONDS
  if (value === undefined || value === '') return 0
  if (!/^\d{1,6}$/.test(value))
    throw new FoundationError('INVALID_DATA', 'OMBELLE_DEPENDENCY_TIMEOUT_SECONDS must be a whole number of seconds', 'OMBELLE_DEPENDENCY_TIMEOUT_SECONDS')
  return Number(value) * 1000
}

export async function runDependencies(
  root: string,
  deps: Dependency[],
  manager: PackageManager = 'pnpm',
  prepared?: PreparedManager,
  bunLockfile?: BunLockfile,
  signal?: AbortSignal,
): Promise<void> {
  if (!deps.length) return
  for (const d of deps)
    if (
      !/^(@[a-z0-9_-]+\/)?[a-z0-9][a-z0-9._-]*$/.test(d.name) ||
      !/^\d+\.\d+\.\d+(?:-[a-zA-Z0-9.-]+)?$/.test(d.version)
    )
      throw new FoundationError(
        'INVALID_DATA',
        'Invalid reviewed dependency name/version',
      )
  const resolved = prepared ?? (await prepareManager(root, manager, bunLockfile, deps))
  const script = resolved.executable
  const args =
    manager === 'bun'
      ? bunAddArgs(deps, bunLockfile ?? 'bun.lock')
      : manager === 'yarn'
      ? [
          'add',
          '--exact',
          ...(resolved.version?.split('.')[0] === '1'
            ? ['--ignore-scripts']
            : ['--mode=skip-build']),
          ...deps.map((d) => d.name + '@' + d.version),
        ]
      : [
          manager === 'npm' ? 'install' : 'add',
          '--save-exact',
          '--ignore-scripts',
          ...(manager === 'npm'
            ? [
                '--dry-run=false',
                '--package-lock-only=false',
                '--save=true',
                '--save-prod',
                '--package-lock=true',
                '--global=false',
                '--workspaces=false',
                '--prefix',
                root,
                '--no-audit',
                '--no-fund',
              ]
            : []),
          ...deps.map((d) => d.name + '@' + d.version),
        ]
  const timeoutMs = dependencyTimeoutMs(process.env)
  await new Promise<void>((resolve, reject) => {
    let timedOut = false
    const child = spawn(
      script,
      [...resolved.prefixArgs, ...args],
      {
        cwd: root,
        shell: false,
        windowsHide: true,
        stdio: ['ignore', 'pipe', 'pipe'],
        ...(signal ? { signal } : {}),
        env: { ...process.env, CI: 'true' },
      },
    )
    // No fixed limit by default (CLI-08): a slow cold install is not a failure, and Ctrl-C rolls back.
    const timer = timeoutMs
      ? setTimeout(() => { timedOut = true; child.kill() }, timeoutMs)
      : undefined
    // Peer-dependency reports start well before the end of the output; keep enough to read them.
    let output = ''
    const collect = (chunk: Buffer) => {
      output = (output + chunk.toString()).slice(-64000)
    }
    child.stdout.on('data', collect)
    child.stderr.on('data', collect)
    child.once('error', (e) => {
      // An abort also kills the child; report it once the child has exited.
      if (signal?.aborted) return
      clearTimeout(timer)
      reject(new FoundationError('DEPENDENCY_FAILURE', e.message, root))
    })
    child.once('exit', async (code) => {
      clearTimeout(timer)
      if (code === 0) return resolve()
      const tail = output.slice(-2000)
      const peer = signal?.aborted || timedOut ? undefined : peerConflict(output)
      if (peer) return reject(await peerConflictError(root, manager, peer))
      reject(
          new FoundationError(
            'DEPENDENCY_FAILURE',
            signal?.aborted
              ? manager + ' installation was interrupted'
              : timedOut
              ? `${manager} installation did not finish within ${timeoutMs / 1000} s (OMBELLE_DEPENDENCY_TIMEOUT_SECONDS)`
              : manager + ' installation failed: ' + tail,
            root,
          ),
        )
    })
  })
  if (manager === 'bun') {
    await assertBunOwnership(root,bunLockfile ?? 'bun.lock')
    await assertBunInstalled(root,deps)
  }
}

export async function prepareManager(
  root: string,
  manager: PackageManager,
  bunLockfile?: BunLockfile,
  deps: Dependency[] = [],
): Promise<PreparedManager> {
  if (manager === 'bun') return prepareBun(root,await resolveBunExecutable(),bunLockfile ?? 'bun.lock',deps)
  const launcher = await resolveManager(manager, root)
  // pnpm's standalone installer ships a native binary, which runs without Node (INS-04).
  const executable = launcher.native ? launcher.entry : await resolveNodeExecutable()
  const prepared = launcher.native
    ? { executable, prefixArgs: launcher.prefixArgs }
    : { executable, prefixArgs: [launcher.entry, ...launcher.prefixArgs] }
  if (manager !== 'yarn') return prepared
  const result = await executeScript(
    executable,
    [...prepared.prefixArgs, '--version'],
    root,
    15000,
  )
  const version = result.output.trim()
  if (
    result.code !== 0 ||
    !/^(?:1|[2-9]\d*)\.\d+\.\d+(?:-[\w.-]+)?$/.test(version)
  )
    throw new FoundationError(
      'UNSUPPORTED_PROJECT',
      'Cannot determine a supported Yarn Classic or modern Yarn version',
      root,
      'Install Yarn 1.x or modern Yarn 2+, or set OMBELLE_YARN_ENTRY to its JavaScript launcher.',
    )
  return { ...prepared, version }
}

function executeScript(
  script: string,
  args: string[],
  cwd: string,
  timeout: number,
): Promise<{ code: number | null; output: string }> {
  return new Promise((resolve, reject) => {
    const child = spawn(script, args, {
      cwd,
      shell: false,
      windowsHide: true,
      stdio: ['ignore', 'pipe', 'pipe'],
      timeout,
      env: { ...process.env, CI: 'true' },
    })
    let output = ''
    const collect = (chunk: Buffer) => {
      output = (output + chunk.toString()).slice(-2000)
    }
    child.stdout.on('data', collect)
    child.stderr.on('data', collect)
    child.once('error', reject)
    child.once('exit', (code) => resolve({ code, output }))
  })
}

/**
 * Resolves the manager launcher and the runtime an install would use, running nothing but the runtime's
 * `--version`. A dry run calls it to report an install that could not start.
 */
export async function checkInstallRuntime(manager: PackageManager, root?: string): Promise<string[]> {
  if (manager === 'bun') {
    const bun = await resolveRuntime('bun')
    return [runtimeNotice('bun', bun.version)].filter((notice): notice is string => notice !== undefined)
  }
  const launcher = await resolveManager(manager, root)
  if (launcher.native) return []
  const node = await resolveRuntime('node')
  return [runtimeNotice('node', node.version)].filter((notice): notice is string => notice !== undefined)
}

type ManagerLauncher = { entry: string; prefixArgs: string[]; native?: boolean }

export async function managerEntry(manager: PackageManager): Promise<string> {
  if (manager === 'bun') return resolveBunExecutable()
  return (await resolveManager(manager)).entry
}

/**
 * Finds the manager's JavaScript launcher by reading files and shims, never running them. `root` is the
 * target application: when it pins pnpm in `packageManager` and no pnpm launcher is on PATH, pnpm runs
 * through corepack, which honours that pin.
 */
export async function resolveManager(manager: PackageManager, root?: string): Promise<ManagerLauncher> {
  // Windows file names are case-insensitive: `corepack enable` and some installers write `.CMD` shims.
  const flags = process.platform === 'win32' ? 'i' : ''
  const entryPattern =
    manager === 'npm'
      ? new RegExp('^npm-cli\\.js$', flags)
      : manager === 'pnpm'
        ? new RegExp('^pnpm\\.(?:cjs|mjs|js)$', flags)
        : new RegExp('^yarn\\.(?:cjs|mjs|js)$', flags)
  const configured = manager === 'yarn' ? process.env.OMBELLE_YARN_ENTRY : undefined
  if (configured && entryPattern.test(path.basename(configured))) {
    await fs.access(configured)
    return { entry: configured, prefixArgs: [] }
  }
  const inherited = process.env.npm_execpath
  if (inherited && entryPattern.test(path.basename(inherited))) {
    await fs.access(inherited)
    return { entry: inherited, prefixArgs: [] }
  }
  // `pnpm dlx` and `yarn dlx` set no npm_execpath, but name themselves in the user agent. When corepack
  // launched them, the matching release sits in corepack's cache (INS-04).
  const cached = await corepackEntry(manager, process.env)
  if (cached) return { entry: cached, prefixArgs: [] }
  for (const directory of (process.env.PATH ?? process.env.Path ?? '').split(
    path.delimiter,
  )) {
    const names =
      manager === 'npm'
        ? ['npm-cli.js', 'npm.cmd', 'npm']
        : manager === 'pnpm'
          ? ['pnpm.cjs', 'pnpm.mjs', 'pnpm.js', 'pnpm.cmd', 'pnpm', ...(process.platform === 'win32' ? ['pnpm.exe'] : [])]
          : ['yarn.cjs', 'yarn.mjs', 'yarn.js', 'yarn.cmd', 'yarn']
    for (const name of names) {
      try {
        const real = await fs.realpath(path.join(directory, name))
        if (entryPattern.test(path.basename(real)))
          return { entry: real, prefixArgs: [] }
        if (manager === 'pnpm' && (name === 'pnpm' || name === 'pnpm.exe') && (await isNativeExecutable(real)))
          return { entry: real, prefixArgs: [], native: true }
        if (manager === 'npm' && name === 'npm.cmd') {
          const target = path.join(
            path.dirname(real),
            'node_modules/npm/bin/npm-cli.js',
          )
          await fs.access(target)
          return { entry: target, prefixArgs: [] }
        }
        const source = await fs.readFile(real, 'utf8')
        if (manager === 'pnpm' && name === 'pnpm.cmd') {
          // A shim that hands pnpm to corepack: `"%~dp0\…\corepack.js" pnpm %*`.
          const lines = shimLines(source)
          const corepackLine = lines.find((line) => /corepack\.(?:cjs|js)/i.test(line))
          if (corepackLine) {
            const target = corepackShimTarget(lines, path.dirname(real), 'pnpm')
            if (target) {
              await fs.access(target)
              return { entry: target, prefixArgs: ['pnpm'] }
            }
            continue
          }
          const match = source.match(
            /"%(?:~dp0|dp0%)([^"\r\n]*pnpm\.(?:cjs|mjs|js))"/i,
          )
          if (match && !/[&|<>%]/.test(match[1])) {
            // `"%dp0%\node_modules\…"`: a leading separator is relative to the shim, not the drive root.
            const target = fromWindowsShim(path.dirname(real), match[1])
            await fs.access(target)
            return { entry: target, prefixArgs: [] }
          }
        } else if (manager === 'yarn' && name === 'yarn.cmd') {
          const lines = shimLines(source)
          const corepackLine = lines.find((line) =>
            /corepack\.(?:cjs|js)/i.test(line),
          )
          if (corepackLine) {
            const match = corepackShimLine(corepackLine, 'yarn')
            if (match) {
              const target = fromWindowsShim(path.dirname(real), match)
              await fs.access(target)
              return { entry: target, prefixArgs: ['yarn'] }
            }
          } else {
            const match = /^(?:call\s+)?(?:node\s+)?"%~dp0([^"\r\n]+)"\s+%\*$/i.exec(
              lines.join(' '),
            )
            if (match && !/[&|<>%]/.test(match[1])) {
              const target = fromWindowsShim(path.dirname(real), match[1])
              if (entryPattern.test(path.basename(target))) {
                await fs.access(target)
                return { entry: target, prefixArgs: [] }
              }
            }
          }
        } else if (source.startsWith('#!/usr/bin/env node'))
          return { entry: real, prefixArgs: [] }
        else if (source.startsWith('#!/bin/sh')) {
          // pnpm 11 `self-update` and `pnpm setup` write POSIX cmd-shims that
          // record their target on a trailing comment; read it, never run it.
          const match = /^# cmd-shim-target=(.+)$/m.exec(source)
          const target = match?.[1].trim()
          if (
            target &&
            path.isAbsolute(target) &&
            entryPattern.test(path.basename(target))
          ) {
            await fs.access(target)
            return { entry: target, prefixArgs: [] }
          }
        }
      } catch (e) {
        if (
          !['ENOENT', 'ENOTDIR', 'EISDIR'].includes(
            (e as NodeJS.ErrnoException).code ?? '',
          )
        )
          throw e
      }
    }
  }
  // No pnpm launcher, but the app pins pnpm and corepack is on PATH (common on Windows, where pnpm often
  // comes only from corepack): run `corepack pnpm`, which installs with the pinned release.
  if (manager === 'pnpm' && root && (await declaresPnpm(root))) {
    const corepack = await findCorepack(flags)
    if (corepack) return { entry: corepack, prefixArgs: ['pnpm'] }
  }
  throw new FoundationError(
    'UNSUPPORTED_PROJECT',
    'Cannot locate a ' + manager + ' JavaScript entry without shell evaluation',
    undefined,
    'Install ' + manager + ' and add its launcher to PATH' +
      (manager === 'yarn'
        ? ', or set OMBELLE_YARN_ENTRY to its JavaScript launcher.'
        : manager === 'pnpm'
          ? ', or pin it with "packageManager": "pnpm@<version>" in package.json to run it through corepack.'
          : '.'),
  )
}

/** Non-empty shim lines, without `echo off`. */
function shimLines(source: string): string[] {
  return source
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !/^@?echo off$/i.test(line))
}

/**
 * The corepack script a Windows shim line runs, relative to the shim: `[node] "%~dp0…corepack.js" <tool> %*`,
 * with `tool` empty for corepack's own shim. Anything else, or a path with shell metacharacters, is refused.
 */
function corepackShimLine(line: string, tool: string): string | undefined {
  const match = new RegExp(
    '^(?:call\\s+)?(?:(?:"%~dp0[^"\\r\\n]*node(?:\\.exe)?"|node(?:\\.exe)?)\\s+)?"%~dp0([^"\\r\\n]*corepack\\.(?:cjs|js))"\\s+' +
      (tool ? tool + '\\s+' : '') + '%\\*$',
    'i',
  ).exec(line)
  // Yarn's shim check predates the `%` refusal and keeps its original rule.
  const unsafe = tool === 'yarn' ? /[&|<>]/ : /[&|<>%]/
  return match && !unsafe.test(match[1]) ? match[1] : undefined
}

/** The corepack script every corepack line of a shim agrees on, or undefined. */
function corepackShimTarget(lines: string[], directory: string, tool: string): string | undefined {
  const targets = lines
    .filter((line) => /corepack\.(?:cjs|js)/i.test(line))
    .map((line) => corepackShimLine(line, tool))
  if (!targets.length || targets.some((target) => target === undefined)) return undefined
  const resolved = new Set(targets.map((target) => fromWindowsShim(directory, target!)))
  return resolved.size === 1 ? [...resolved][0] : undefined
}

/** True when the app's package.json pins pnpm (`"packageManager": "pnpm@…"`). */
async function declaresPnpm(root: string): Promise<boolean> {
  try {
    const pkg = JSON.parse(await fs.readFile(path.join(root, 'package.json'), 'utf8')) as { packageManager?: unknown }
    return typeof pkg.packageManager === 'string' && /^pnpm@\d/.test(pkg.packageManager)
  } catch {
    return false
  }
}

/** corepack's JavaScript entry, from a symlink or a Windows shim on PATH; shims are read, never run. */
async function findCorepack(flags: string): Promise<string | undefined> {
  const entryPattern = new RegExp('^corepack\\.(?:cjs|js)$', flags)
  const names = process.platform === 'win32' ? ['corepack.cmd', 'corepack'] : ['corepack']
  for (const directory of (process.env.PATH ?? process.env.Path ?? '').split(path.delimiter)) {
    if (!directory) continue
    for (const name of names) {
      try {
        const real = await fs.realpath(path.join(directory, name))
        let target: string | undefined
        if (entryPattern.test(path.basename(real))) target = real
        else if (name === 'corepack.cmd')
          target = corepackShimTarget(shimLines(await fs.readFile(real, 'utf8')), path.dirname(real), '')
        if (target && entryPattern.test(path.basename(target))) {
          await fs.access(target)
          return target
        }
      } catch (e) {
        if (!['ENOENT', 'ENOTDIR', 'EISDIR'].includes((e as NodeJS.ErrnoException).code ?? '')) throw e
      }
    }
  }
  return undefined
}

/** The corepack cache root: COREPACK_HOME, else corepack's per-platform default. */
export function corepackHome(env: NodeJS.ProcessEnv): string | undefined {
  if (env.COREPACK_HOME) return env.COREPACK_HOME
  if (process.platform === 'win32')
    return env.LOCALAPPDATA ? path.join(env.LOCALAPPDATA, 'node', 'corepack') : undefined
  const cache = env.XDG_CACHE_HOME || (env.HOME ? path.join(env.HOME, '.cache') : undefined)
  return cache ? path.join(cache, 'node', 'corepack') : undefined
}

/** The JavaScript entry of the manager release the user agent names, from corepack's cache. */
export async function corepackEntry(
  manager: PackageManager,
  env: NodeJS.ProcessEnv,
): Promise<string | undefined> {
  if (manager !== 'pnpm' && manager !== 'yarn') return undefined
  const agent = /^(pnpm|yarn)\/(\d+\.\d+\.\d+(?:-[\w.]+)?)(?:\s|$)/.exec(env.npm_config_user_agent ?? '')
  const home = corepackHome(env)
  if (!agent || agent[1] !== manager || !home) return undefined
  const release = path.join(home, 'v1', manager, agent[2])
  const candidates = manager === 'pnpm'
    ? ['bin/pnpm.cjs', 'bin/pnpm.mjs']
    : ['yarn.js', 'bin/yarn.js']
  for (const candidate of candidates) {
    const file = path.join(release, candidate)
    try {
      if ((await fs.stat(file)).isFile()) return file
    } catch (e) {
      if (!['ENOENT', 'ENOTDIR'].includes((e as NodeJS.ErrnoException).code ?? '')) throw e
    }
  }
  return undefined
}

async function isNativeExecutable(file: string): Promise<boolean> {
  const handle = await fs.open(file, 'r')
  try {
    const bytes = Buffer.alloc(4)
    await handle.read(bytes, 0, 4, 0)
    const magic = bytes.toString('hex')
    return (bytes[0] === 0x4d && bytes[1] === 0x5a) || magic === '7f454c46' ||
      ['cffaedfe', 'cefaedfe', 'feedfacf', 'feedface', 'cafebabe'].includes(magic)
  } finally {
    await handle.close()
  }
}

function fromWindowsShim(directory: string, relative: string): string {
  const portable = relative
    .replace(/^[/\\]+/, '')
    .replace(/[\\/]/g, path.sep)
  return path.resolve(directory, portable)
}

export type PeerConflict = { from?: string; peer: string; range?: string }
/**
 * A package manager that refused an install because of a peer dependency (npm ERESOLVE, pnpm
 * ERR_PNPM_PEER_DEP_ISSUES, Yarn and Bun peer errors when they fail rather than warn): the package that
 * declares the peer, the peer and its range, read from the manager's output.
 */
export function peerConflict(output: string): PeerConflict | undefined {
  const text = output.replace(/\u001b\[[0-9;]*m/g, '')
  if (!/ERESOLVE|ERR_PNPM_PEER_DEP_ISSUES|unmet peer|incorrect peer dependency|peer dependenc(?:y|ies)/i.test(text)) return undefined
  // npm: peer react@"^18.0.0" from @radix-ui/react-dialog@1.2.3
  const npm = /peer (@?[^@\s"]+)@"([^"]+)" from (@?[^@\s]+)@/.exec(text)
  if (npm) return { peer: npm[1]!, range: npm[2]!, from: npm[3]! }
  // pnpm: ┬ @radix-ui/react-dialog 1.2.3 … ✕ unmet peer react@"^18.0.0": found 20.0.0
  const pnpm = /(@?[a-z0-9][\w./-]*) \d+\.\d+\.\d+\S*[\s\S]{0,200}?unmet peer (@?[^@\s"]+)@(?:"([^"]+)"|([^\s:]+))/i.exec(text)
  if (pnpm) return { from: pnpm[1]!, peer: pnpm[2]!, range: (pnpm[3] ?? pnpm[4])! }
  // Yarn and Bun: "<pkg> has (an) unmet/incorrect peer dependency <peer>@<range>"
  const other = /(@?[a-z0-9][\w./-]*)(?:@\S+)? (?:has|provides) (?:an? )?(?:unmet|incorrect) peer dependency "?(@?[^@\s"]+)@([^"\s]+)/i.exec(text)
  if (other) return { from: other[1]!, peer: other[2]!, range: other[3]! }
  return /ERESOLVE|ERR_PNPM_PEER_DEP_ISSUES/.test(text) ? { peer: 'react' } : undefined
}
async function peerConflictError(root: string, manager: PackageManager, conflict: PeerConflict): Promise<FoundationError> {
  let declared: string | undefined
  try {
    const pkg = JSON.parse(await fs.readFile(path.join(root, 'package.json'), 'utf8'))
    declared = pkg.dependencies?.[conflict.peer] ?? pkg.devDependencies?.[conflict.peer]
  } catch { declared = undefined }
  const error = new FoundationError(
    'DEPENDENCY_FAILURE',
    manager + ' refused the install because of a peer dependency: ' +
      (conflict.from ? conflict.from + ' declares ' : 'a component dependency declares ') +
      'peer ' + conflict.peer + (conflict.range ? '@"' + conflict.range + '"' : '') +
      ', and the project declares ' + conflict.peer + ' ' + (declared === undefined ? '(none)' : '"' + declared + '"') +
      '. The source files of this plan were restored.',
    root,
    'Use React 19, which this release was tested with, or wait for ' + (conflict.from ?? 'the package') +
      ' to declare support; to install anyway, allow the conflict in ' + manager +
      (manager === 'npm' ? ' (legacy-peer-deps=true in .npmrc)' : manager === 'pnpm' ? ' (strict-peer-dependencies=false)' : '') +
      ' and run the command again.',
  )
  return Object.assign(error, { peerConflict: conflict })
}
