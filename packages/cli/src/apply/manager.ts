import path from 'node:path'
import fs from 'node:fs/promises'
import { spawn } from 'node:child_process'
import { FoundationError, type Dependency } from '@ombelle/contracts'
export async function runDependencies(
  root: string,
  deps: Dependency[],
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
  let script = process.env.npm_execpath
  if (!script || !/^pnpm\.(?:cjs|mjs|js)$/.test(path.basename(script))) {
    script = undefined
    for (const directory of (process.env.PATH ?? process.env.Path ?? '').split(
      path.delimiter,
    )) {
      for (const name of [
        'pnpm.cjs',
        'pnpm.mjs',
        'pnpm.js',
        'pnpm.cmd',
        'pnpm',
      ]) {
        const candidate = path.join(directory, name)
        try {
          const real = await fs.realpath(candidate)
          if (/pnpm\.(cjs|mjs|js)$/.test(real)) {
            script = real
            break
          }
          const source = await fs.readFile(real, 'utf8')
          if (name === 'pnpm.cmd') {
            const match = source.match(
              /"%(?:~dp0|dp0%)([^"\r\n]*pnpm\.(?:cjs|mjs|js))"/i,
            )
            if (match && !/[&|<>%]/.test(match[1])) {
              const target = path.resolve(path.dirname(real), match[1])
              await fs.access(target)
              script = target
              break
            }
          } else if (source.startsWith('#!/usr/bin/env node')) {
            script = real
            break
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
      if (script) break
    }
  }
  if (!script)
    throw new FoundationError(
      'UNSUPPORTED_PROJECT',
      'Cannot locate a pnpm JavaScript entry without shell evaluation',
      root,
      'Install pnpm and add its launcher to PATH.',
    )
  await fs.access(script)
  await new Promise<void>((resolve, reject) => {
    const child = spawn(
      process.execPath,
      [
        script,
        'add',
        '--save-exact',
        '--ignore-scripts',
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
              'pnpm installation failed: ' + tail,
              root,
            ),
          ),
    )
  })
}
