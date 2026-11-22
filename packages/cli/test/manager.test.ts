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
