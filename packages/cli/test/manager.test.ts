import { it, expect, vi } from 'vitest'
import { runDependencies } from '../src/apply/manager.js'
it('does nothing for an empty dependency plan', async () => {
  await expect(runDependencies('.', [])).resolves.toBeUndefined()
})
it('rejects command-like dependency names before starting a process', async () => {
  await expect(
    runDependencies('.', [{ name: 'evil;echo bad', version: '1.0.0' }]),
  ).rejects.toMatchObject({ code: 'INVALID_DATA' })
})
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { corepackEntry, corepackHome } from '../src/apply/manager.js'
// INS-04: `pnpm dlx` and `yarn dlx` set no npm_execpath; the user agent names the release corepack cached.
it('finds the pnpm and yarn release a dlx user agent names in the corepack cache', async () => {
  const home = await fs.mkdtemp(path.join(os.tmpdir(), 'ombelle-corepack-'))
  try {
    await fs.mkdir(path.join(home, 'v1/pnpm/11.25.0/bin'), { recursive: true })
    await fs.writeFile(path.join(home, 'v1/pnpm/11.25.0/bin/pnpm.cjs'), '')
    await fs.mkdir(path.join(home, 'v1/yarn/4.18.1'), { recursive: true })
    await fs.writeFile(path.join(home, 'v1/yarn/4.18.1/yarn.js'), '')
    await fs.mkdir(path.join(home, 'v1/yarn/1.22.22/bin'), { recursive: true })
    await fs.writeFile(path.join(home, 'v1/yarn/1.22.22/bin/yarn.js'), '')
    const env = (agent: string) => ({ COREPACK_HOME: home, npm_config_user_agent: agent })
    expect(await corepackEntry('pnpm', env('pnpm/11.25.0 npm/? node/v24.19.0 win32 x64'))).toBe(
      path.join(home, 'v1/pnpm/11.25.0/bin/pnpm.cjs'))
    expect(await corepackEntry('yarn', env('yarn/4.18.1 npm/? node/v24.19.0 win32 x64'))).toBe(
      path.join(home, 'v1/yarn/4.18.1/yarn.js'))
    expect(await corepackEntry('yarn', env('yarn/1.22.22 npm/? node/v24.19.0 win32 x64'))).toBe(
      path.join(home, 'v1/yarn/1.22.22/bin/yarn.js'))
    // Another manager, an uncached release, or no agent finds nothing.
    expect(await corepackEntry('pnpm', env('yarn/4.18.1 npm/? node/v24.19.0'))).toBeUndefined()
    expect(await corepackEntry('pnpm', env('pnpm/9.0.0 npm/? node/v24.19.0'))).toBeUndefined()
    expect(await corepackEntry('pnpm', { COREPACK_HOME: home })).toBeUndefined()
    expect(await corepackEntry('npm', env('npm/11.19.0 node/v24.19.0'))).toBeUndefined()
  } finally {
    await fs.rm(home, { recursive: true, force: true })
  }
})
it('uses corepack\'s default cache root per platform', () => {
  expect(corepackHome({ COREPACK_HOME: '/custom' })).toBe('/custom')
  if (process.platform === 'win32')
    expect(corepackHome({ LOCALAPPDATA: 'C:\Users\a\AppData\Local' })).toBe(path.join('C:\Users\a\AppData\Local', 'node', 'corepack'))
  else expect(corepackHome({ HOME: '/home/a' })).toBe('/home/a/.cache/node/corepack')
})
import { resolveManager } from '../src/apply/manager.js'
// Windows with pnpm only through corepack: a `corepack enable` style shim that calls corepack, or no pnpm
// shim at all. Shims are parsed, never run.
async function withPath<T>(run: (dir: string, app: string) => Promise<T>): Promise<T> {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'ombelle-path-'))
  const app = await fs.mkdtemp(path.join(os.tmpdir(), 'ombelle-app-'))
  vi.stubEnv('PATH', dir)
  vi.stubEnv('Path', dir)
  vi.stubEnv('npm_execpath', '')
  vi.stubEnv('npm_config_user_agent', '')
  try {
    return await run(dir, app)
  } finally {
    vi.unstubAllEnvs()
    await fs.rm(dir, { recursive: true, force: true })
    await fs.rm(app, { recursive: true, force: true })
  }
}
const corepackJs = (dir: string) => path.join(dir, 'node_modules', 'corepack', 'dist', 'corepack.js')
async function writeCorepack(dir: string) {
  await fs.mkdir(path.dirname(corepackJs(dir)), { recursive: true })
  await fs.writeFile(corepackJs(dir), '#!/usr/bin/env node\n')
}
it('runs pnpm through corepack when the pnpm.CMD shim calls corepack', async () => {
  await withPath(async (dir) => {
    await writeCorepack(dir)
    // Windows resolves `pnpm.cmd` to an upper-case `pnpm.CMD`; other platforms are case-sensitive.
    const shim = process.platform === 'win32' ? 'pnpm.CMD' : 'pnpm.cmd'
    await fs.writeFile(path.join(dir, shim), [
      '@SETLOCAL',
      '@IF EXIST "%~dp0\\node.exe" (',
      '  "%~dp0\\node.exe"  "%~dp0\\node_modules\\corepack\\dist\\corepack.js" pnpm %*',
      ') ELSE (',
      '  @SET PATHEXT=%PATHEXT:;.JS;=;%',
      '  node  "%~dp0\\node_modules\\corepack\\dist\\corepack.js" pnpm %*',
      ')',
    ].join('\r\n'))
    const launcher = await resolveManager('pnpm')
    expect(path.normalize(launcher.entry).toLowerCase()).toBe(path.normalize(await fs.realpath(corepackJs(dir))).toLowerCase())
    expect(launcher.prefixArgs).toEqual(['pnpm'])
  })
})
it('refuses a corepack pnpm shim with shell metacharacters or disagreeing targets', async () => {
  await withPath(async (dir) => {
    await writeCorepack(dir)
    await fs.writeFile(path.join(dir, 'pnpm.cmd'),
      '"%~dp0\\node_modules\\corepack\\dist\\corepack.js" pnpm %* & calc\r\n')
    await expect(resolveManager('pnpm')).rejects.toMatchObject({ code: 'UNSUPPORTED_PROJECT' })
    await fs.writeFile(path.join(dir, 'pnpm.cmd'), [
      '"%~dp0\\node_modules\\corepack\\dist\\corepack.js" pnpm %*',
      'node "%~dp0\\other\\corepack.js" pnpm %*',
    ].join('\r\n'))
    await expect(resolveManager('pnpm')).rejects.toMatchObject({ code: 'UNSUPPORTED_PROJECT' })
  })
})
it('runs pnpm through corepack with no pnpm shim when the app pins pnpm', async () => {
  await withPath(async (dir, app) => {
    await writeCorepack(dir)
    if (process.platform === 'win32')
      await fs.writeFile(path.join(dir, 'corepack.cmd'), [
        '@SETLOCAL',
        '@IF EXIST "%~dp0\\node.exe" (',
        '  "%~dp0\\node.exe"  "%~dp0\\node_modules\\corepack\\dist\\corepack.js" %*',
        ') ELSE (',
        '  @SET PATHEXT=%PATHEXT:;.JS;=;%',
        '  node  "%~dp0\\node_modules\\corepack\\dist\\corepack.js" %*',
        ')',
      ].join('\r\n'))
    else await fs.symlink(corepackJs(dir), path.join(dir, 'corepack'))
    // Without a packageManager pin, corepack would pick its own pnpm release: refuse.
    await fs.writeFile(path.join(app, 'package.json'), JSON.stringify({ name: 'app' }))
    await expect(resolveManager('pnpm', app)).rejects.toMatchObject({ code: 'UNSUPPORTED_PROJECT' })
    await fs.writeFile(path.join(app, 'package.json'), JSON.stringify({ name: 'app', packageManager: 'yarn@4.18.1' }))
    await expect(resolveManager('pnpm', app)).rejects.toMatchObject({ code: 'UNSUPPORTED_PROJECT' })
    await fs.writeFile(path.join(app, 'package.json'), JSON.stringify({ name: 'app', packageManager: 'pnpm@11.25.0' }))
    const launcher = await resolveManager('pnpm', app)
    expect(path.normalize(launcher.entry).toLowerCase()).toBe(path.normalize(await fs.realpath(corepackJs(dir))).toLowerCase())
    expect(launcher.prefixArgs).toEqual(['pnpm'])
    // Yarn and npm gain no corepack fallback.
    await expect(resolveManager('yarn', app)).rejects.toMatchObject({ code: 'UNSUPPORTED_PROJECT' })
  })
})
it('keeps reading yarn corepack shims and pnpm.cjs shims as before', async () => {
  await withPath(async (dir) => {
    await writeCorepack(dir)
    await fs.writeFile(path.join(dir, 'yarn.cmd'),
      '@echo off\r\n"%~dp0\\node_modules\\corepack\\dist\\corepack.js" yarn %*\r\n')
    expect(await resolveManager('yarn')).toMatchObject({ prefixArgs: ['yarn'] })
    const pnpmCjs = path.join(dir, 'node_modules', 'pnpm', 'bin', 'pnpm.cjs')
    await fs.mkdir(path.dirname(pnpmCjs), { recursive: true })
    await fs.writeFile(pnpmCjs, '')
    await fs.writeFile(path.join(dir, 'pnpm.cmd'), '@"%~dp0\\node_modules\\pnpm\\bin\\pnpm.cjs" %*\r\n')
    expect(await resolveManager('pnpm')).toMatchObject({ prefixArgs: [] })
  })
})
