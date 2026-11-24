// CLI-08: no fixed install limit; an explicit limit names itself, and an abort stops the manager.
import { afterEach, expect, it } from 'vitest'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { dependencyTimeoutMs, runDependencies } from '../src/apply/manager.js'

const dirs: string[] = []
afterEach(async () => {
  delete process.env.OMBELLE_DEPENDENCY_TIMEOUT_SECONDS
  for (const dir of dirs.splice(0)) await fs.rm(dir, { recursive: true, force: true })
})
async function hangingManager() {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'ombelle-manager-'))
  dirs.push(dir)
  const script = path.join(dir, 'pnpm.cjs')
  await fs.writeFile(script, 'setTimeout(() => {}, 60000)\n')
  return { dir, prepared: { executable: process.execPath, prefixArgs: [script] } }
}
const deps = [{ name: 'clsx', version: '2.1.1' }]

it('has no install limit unless one is configured', () => {
  expect(dependencyTimeoutMs({})).toBe(0)
  expect(dependencyTimeoutMs({ OMBELLE_DEPENDENCY_TIMEOUT_SECONDS: '0' })).toBe(0)
  expect(dependencyTimeoutMs({ OMBELLE_DEPENDENCY_TIMEOUT_SECONDS: '900' })).toBe(900_000)
  expect(() => dependencyTimeoutMs({ OMBELLE_DEPENDENCY_TIMEOUT_SECONDS: '2m' })).toThrow('whole number of seconds')
})

it('names a configured timeout when it stops the install', async () => {
  const { dir, prepared } = await hangingManager()
  process.env.OMBELLE_DEPENDENCY_TIMEOUT_SECONDS = '1'
  await expect(runDependencies(dir, deps, 'pnpm', prepared)).rejects.toMatchObject({
    code: 'DEPENDENCY_FAILURE', message: expect.stringContaining('did not finish within 1 s'),
  })
})

it('stops the package manager when the apply is interrupted', async () => {
  const { dir, prepared } = await hangingManager()
  const abort = new AbortController()
  setTimeout(() => abort.abort(), 300)
  await expect(runDependencies(dir, deps, 'pnpm', prepared, undefined, abort.signal)).rejects.toMatchObject({
    code: 'DEPENDENCY_FAILURE', message: expect.stringContaining('interrupted'),
  })
})
