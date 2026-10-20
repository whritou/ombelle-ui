import path from 'node:path'
import fs from 'node:fs/promises'
import { spawn } from 'node:child_process'
import {
  FoundationError,
  type Dependency,
  type PackageManager,
} from '@ombelle/contracts'

export type PreparedManager = { entry: string; version?: string }

export async function runDependencies(
  root: string,
  deps: Dependency[],
  manager: PackageManager = 'pnpm',
  prepared?: PreparedManager,
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
  const resolved = prepared ?? (await prepareManager(root, manager))
  const script = resolved.entry
  const args =
    manager === 'yarn'
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
  await new Promise<void>((resolve, reject) => {
    const child = spawn(
      process.execPath,
      [script, ...args],
      {
        cwd: root,
        shell: false,
        windowsHide: true,
        stdio: ['ignore', 'pipe', 'pipe'],
        timeout: 120000,
        env: { ...process.env, CI: 'true' },
      },
    )
    let tail = ''
    const collect = (chunk: Buffer) => {
      tail = (tail + chunk.toString()).slice(-2000)
    }
    child.stdout.on('data', collect)
    child.stderr.on('data', collect)
    child.once('error', (e) =>
      reject(new FoundationError('DEPENDENCY_FAILURE', e.message, root)),
    )
    child.once('exit', (code) =>
      code === 0
        ? resolve()
        : reject(
            new FoundationError(
              'DEPENDENCY_FAILURE',
              manager + ' installation failed: ' + tail,
              root,
            ),
          ),
    )
  })
}

export async function prepareManager(
  root: string,
  manager: PackageManager,
): Promise<PreparedManager> {
  const entry = await managerEntry(manager)
  if (manager !== 'yarn') return { entry }
  const result = await executeScript(entry, ['--version'], root, 15000)
  const version = result.output.trim()
  if (
    result.code !== 0 ||
    !/^(?:1|[2-9]\d*)\.\d+\.\d+(?:-[\w.-]+)?$/.test(version)
  )
    throw new FoundationError(
      'UNSUPPORTED_PROJECT',
      'Cannot determine a supported Yarn Classic or modern Yarn version',
      root,
      'Install Yarn 1.x or modern Yarn 2+ and make its JavaScript launcher available.',
    )
  return { entry, version }
}

function executeScript(
  script: string,
  args: string[],
  cwd: string,
  timeout: number,
): Promise<{ code: number | null; output: string }> {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [script, ...args], {
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

export async function managerEntry(manager: PackageManager): Promise<string> {
  const entryPattern =
    manager === 'npm'
      ? /^npm-cli\.js$/
      : manager === 'pnpm'
        ? /^pnpm\.(?:cjs|mjs|js)$/
        : /^yarn\.(?:cjs|mjs|js)$/
  const inherited = process.env.npm_execpath
  if (inherited && entryPattern.test(path.basename(inherited))) {
    await fs.access(inherited)
    return inherited
  }
  for (const directory of (process.env.PATH ?? process.env.Path ?? '').split(
    path.delimiter,
  )) {
    const names =
      manager === 'npm'
        ? ['npm-cli.js', 'npm.cmd', 'npm']
        : manager === 'pnpm'
          ? ['pnpm.cjs', 'pnpm.mjs', 'pnpm.js', 'pnpm.cmd', 'pnpm']
          : ['yarn.cjs', 'yarn.mjs', 'yarn.js', 'yarn.cmd', 'yarn']
    for (const name of names) {
      try {
        const real = await fs.realpath(path.join(directory, name))
        if (entryPattern.test(path.basename(real))) return real
        if (manager === 'npm' && name === 'npm.cmd') {
          const target = path.join(
            path.dirname(real),
            'node_modules/npm/bin/npm-cli.js',
          )
          await fs.access(target)
          return target
        }
        const source = await fs.readFile(real, 'utf8')
        if (manager === 'pnpm' && name === 'pnpm.cmd') {
          const match = source.match(
            /"%(?:~dp0|dp0%)([^"\r\n]*pnpm\.(?:cjs|mjs|js))"/i,
          )
          if (match && !/[&|<>%]/.test(match[1])) {
            const target = path.resolve(path.dirname(real), match[1])
            await fs.access(target)
            return target
          }
        } else if (manager === 'yarn' && name === 'yarn.cmd') {
          const lines = source
            .split(/\r?\n/)
            .map((line) => line.trim())
            .filter((line) => line && !/^@?echo off$/i.test(line))
          if (lines.length === 1) {
            const match = /^(?:node\s+)?"%~dp0([^"\r\n]+)"\s+%\*$/i.exec(
              lines[0],
            )
            if (match && !/[&|<>%]/.test(match[1])) {
              const target = path.resolve(path.dirname(real), match[1])
              if (entryPattern.test(path.basename(target))) {
                await fs.access(target)
                return target
              }
            }
          }
        } else if (source.startsWith('#!/usr/bin/env node')) return real
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
  throw new FoundationError(
    'UNSUPPORTED_PROJECT',
    'Cannot locate a ' + manager + ' JavaScript entry without shell evaluation',
    undefined,
    'Install ' + manager + ' and add its launcher to PATH.',
  )
}
