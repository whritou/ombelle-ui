import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { expect, it } from 'vitest'
import { createRuntimeIdentityCache } from '../helpers/cli-runtime.js'
it('deduplicates identical runtime probes and protects cached identity from caller mutation', async () => {
  let probes = 0
  const cache = createRuntimeIdentityCache(async (runtime) => {
    probes++
    return { executable: process.execPath, name: runtime, version: '24.19.0' }
  })
  const [first, second] = await Promise.all([cache('node'), cache('node')])
  first.version = 'changed'
  expect(second.version).toBe('24.19.0')
  expect((await cache('node')).version).toBe('24.19.0')
  expect(probes).toBe(1)
})
it('separates executable, effective environment and runtime identities', async () => {
  let probes = 0
  const cache = createRuntimeIdentityCache(async (runtime) => {
    probes++
    return {
      executable: process.execPath,
      name: runtime,
      version: String(probes),
    }
  })
  const env = {
    PATH: process.env.PATH,
    OMBELLE_NODE_EXECUTABLE: process.execPath,
  }
  expect((await cache('node', env)).version).toBe('1')
  expect((await cache('node', { ...env })).version).toBe('1')
  expect(
    (await cache('node', { ...env, NODE_OPTIONS: '--invalid' })).version,
  ).toBe('1')
  expect(
    (await cache('node', { ...env, OMBELLE_NODE_EXECUTABLE: 'different.exe' }))
      .version,
  ).toBe('2')
  expect(
    (await cache('node', { ...env, NODE_PATH: 'another-library' })).version,
  ).toBe('3')
  expect(
    (await cache('node', { ...env, PATH: 'different-path' })).version,
  ).toBe('4')
  expect((await cache('bun', env)).version).toBe('5')
})
it('reprobes when an executable at the same configured path changes', async () => {
  const root = await fs.mkdtemp(
    path.join(os.tmpdir(), 'ombelle-runtime-cache-'),
  )
  try {
    const file = path.join(root, 'runtime.exe')
    await fs.writeFile(file, 'old')
    let probes = 0
    const cache = createRuntimeIdentityCache(async (runtime) => ({
      executable: file,
      name: runtime,
      version: String(++probes),
    }))
    const env = { OMBELLE_NODE_EXECUTABLE: file }
    expect((await cache('node', env)).version).toBe('1')
    await fs.writeFile(file, 'replacement')
    expect((await cache('node', env)).version).toBe('2')
  } finally {
    await fs.rm(root, { recursive: true, force: true })
  }
})
it('does not retain failed probes', async () => {
  let probes = 0
  const cache = createRuntimeIdentityCache(async (runtime) => {
    if (++probes === 1) throw Error('unavailable')
    return { executable: process.execPath, name: runtime, version: '24.19.0' }
  })
  await expect(cache('node')).rejects.toThrow('unavailable')
  expect((await cache('node')).version).toBe('24.19.0')
  expect(probes).toBe(2)
})
