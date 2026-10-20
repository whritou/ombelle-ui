import { it, expect, afterEach } from 'vitest'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { runDependencies } from '../../packages/cli/src/apply/manager.js'
const roots: string[] = []
afterEach(async () => {
  for (const root of roots.splice(0))
    await fs.rm(root, { recursive: true, force: true })
})
it.each(['dry-run=true', 'package-lock-only=true', 'omit=prod'])(
  'installs required dependencies despite npm config %s',
  async (config) => {
    const root = await fs.mkdtemp(
      path.join(os.tmpdir(), 'ombelle-npm-options-'),
    )
    roots.push(root)
    await fs.writeFile(
      root + '/package.json',
      JSON.stringify({
        name: 'npm-options-fixture',
        private: true,
        version: '1.0.0',
      }),
    )
    await fs.writeFile(root + '/.npmrc', config + '\n')
    await runDependencies(root, [{ name: 'clsx', version: '2.1.1' }], 'npm')
    const installed = JSON.parse(
      await fs.readFile(root + '/node_modules/clsx/package.json', 'utf8'),
    )
    expect(installed.version).toBe('2.1.1')
    const lock = JSON.parse(
      await fs.readFile(root + '/package-lock.json', 'utf8'),
    )
    expect(lock.packages['node_modules/clsx'].version).toBe('2.1.1')
  },
  30000,
)
