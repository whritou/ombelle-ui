import { afterEach, expect, it } from 'vitest'
import fs from 'node:fs/promises'
import path from 'node:path'
import { compileButtonPreset } from '@ombelle/compiler'
import { getCatalog } from '@ombelle/catalog'
import type { InstalledArtifact, ProjectLock } from '@ombelle/contracts'
import { createProject } from '../../../tests/helpers/projects.js'
import { inspectProject } from '../src/project/inspect.js'
import { validateInstalledComponentPresets } from '../src/project/component-presets.js'

const roots: string[] = []
afterEach(async () => {
  for (const root of roots.splice(0))
    await fs.rm(root, { recursive: true, force: true })
})

async function setup() {
  const root = await createProject('vite')
  roots.push(root)
  const result = await compileButtonPreset({
    preset: getCatalog('0.1.0').presets.flat,
  })
  const { artifacts, dependencies: unused, ...identity } = result
  const owned: Record<string, InstalledArtifact> = {}
  for (const artifact of artifacts.filter((a) => a.kind !== 'utility'))
    owned['src/components/ui/' + artifact.logicalPath] = {
      logicalPath: artifact.logicalPath,
      kind: artifact.kind,
      sha256: artifact.sha256,
    }
  const key = result.preset.data.id + '@' + result.preset.data.revision
  const lock: ProjectLock = {
    lockVersion: 1,
    catalogRelease: '0.1.0',
    compilerVersion: '0.1.0',
    presetHash: result.preset.hash,
    artifacts: structuredClone(owned),
    managedDeclarations: [],
  }
  const record = { ...identity, artifacts: owned }
  return { root, lock, key, record }
}

async function writeLock(root: string, lock: ProjectLock) {
  await fs.writeFile(
    path.join(root, 'ui-library.lock.json'),
    JSON.stringify(lock),
  )
}

it('preserves legacy locks without component preset provenance', async () => {
  const { root, lock } = await setup()
  await writeLock(root, lock)
  expect((await inspectProject(root)).lock!.componentPresets).toBeUndefined()
  await expect(
    validateInstalledComponentPresets(root, undefined, lock.artifacts),
  ).resolves.toEqual({})
})

it('accepts recompiled records and transformed source hashes in the ownership map', async () => {
  const { root, lock, key, record } = await setup()
  const source = Object.keys(record.artifacts).find((file) =>
    file.endsWith('button.tsx'),
  )!
  record.artifacts[source].sha256 = 'a'.repeat(64)
  lock.artifacts[source].sha256 = 'a'.repeat(64)
  lock.componentPresets = { [key]: record }
  await writeLock(root, lock)
  expect((await inspectProject(root)).lock!.componentPresets).toEqual({
    [key]: record,
  })
})

it.each([
  'preset data',
  'scope',
  'dark selector',
  'unsafe dark selector',
  'key',
  'artifact hash',
  'global hash',
  'CSS hash in both maps',
  'missing artifact',
  'duplicate artifact',
  'unsafe path',
  'malformed record',
  'unsupported release',
] as const)('rejects altered %s before planning', async (change) => {
  const { root, lock, key, record } = await setup()
  const file = Object.keys(record.artifacts).find((p) => p.endsWith('.css'))!
  let storedKey = key
  switch (change) {
    case 'preset data':
      record.preset.data.name = 'Tampered'
      break
    case 'scope':
      record.scope = 'f'.repeat(64)
      break
    case 'dark selector':
      record.darkSelector = '.night'
      break
    case 'unsafe dark selector':
      record.darkSelector = '.dark,body'
      break
    case 'key':
      storedKey += '0'
      break
    case 'artifact hash':
      record.artifacts[file].sha256 = 'f'.repeat(64)
      break
    case 'global hash':
      lock.artifacts[file].sha256 = 'f'.repeat(64)
      break
    case 'CSS hash in both maps':
      record.artifacts[file].sha256 = 'f'.repeat(64)
      lock.artifacts[file].sha256 = 'f'.repeat(64)
      break
    case 'missing artifact':
      delete record.artifacts[file]
      break
    case 'duplicate artifact':
      record.artifacts['src/duplicate.css'] = record.artifacts[file]
      delete record.artifacts[
        Object.keys(record.artifacts).find((p) => p.endsWith('button.tsx'))!
      ]
      lock.artifacts['src/duplicate.css'] = record.artifacts[file]
      break
    case 'unsafe path':
      record.artifacts['../outside.css'] = record.artifacts[file]
      lock.artifacts['../outside.css'] = record.artifacts[file]
      delete record.artifacts[file]
      break
    case 'malformed record':
      record.artifacts[file] = null as unknown as InstalledArtifact
      break
    case 'unsupported release':
      record.preset.data.catalogRelease = '9.0.0'
      break
  }
  lock.componentPresets = { [storedKey]: record }
  await writeLock(root, lock)
  await expect(inspectProject(root)).rejects.toMatchObject({
    code: 'UNSUPPORTED_PROJECT',
  })
})

it.each([null, [], 'invalid', { bad: null }])(
  'rejects malformed provenance maps: %j',
  async (value) => {
    const { root, lock } = await setup()
    await expect(
      validateInstalledComponentPresets(root, value, lock.artifacts),
    ).rejects.toMatchObject({ code: 'UNSUPPORTED_PROJECT' })
  },
)
