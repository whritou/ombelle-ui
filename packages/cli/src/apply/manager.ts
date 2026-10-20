import path from 'node:path'
import fs from 'node:fs/promises'
import { spawn } from 'node:child_process'
import {
  FoundationError,
  type Dependency,
  type PackageManager,
} from '@ombelle/contracts'

export async function runDependencies(
  root: string,
  deps: Dependency[],
  manager: PackageManager = 'pnpm',
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
  const script = await managerEntry(manager)
  await new Promise<void>((resolve, reject) => {
    const child = spawn(
      process.execPath,
      [
        script,
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
      ],
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

export async function managerEntry(manager: PackageManager): Promise<string> {
  const entryPattern =
    manager === 'npm' ? /^npm-cli\.js$/ : /^pnpm\.(?:cjs|mjs|js)$/
  const inherited = process.env.npm_execpath
  if (inherited && entryPattern.test(path.basename(inherited))) {
    await fs.access(inherited)
    return inherited
  }
  for (const directory of (process.env.PATH ?? process.env.Path ?? '').split(
    path.delimiter,
  )) {
    for (const name of manager === 'npm'
      ? ['npm-cli.js', 'npm.cmd', 'npm']
      : ['pnpm.cjs', 'pnpm.mjs', 'pnpm.js', 'pnpm.cmd', 'pnpm']) {
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
