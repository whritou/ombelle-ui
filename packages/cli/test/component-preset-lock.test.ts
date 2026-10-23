import { afterEach, describe, expect, it } from 'vitest'
import fs from 'node:fs/promises'
import path from 'node:path'
import { compile, compileButtonPreset, sha256 } from '@ombelle/compiler'
import { getCatalog } from '@ombelle/catalog'
import type {
  InstalledArtifact,
  InstalledComponentPreset,
  ProjectLock,
} from '@ombelle/contracts'
import { createProject } from '../../../tests/helpers/projects.js'
import { inspectProject } from '../src/project/inspect.js'
import { validateInstalledComponentPresets } from '../src/project/component-presets.js'
import { transformComponentPresetArtifact } from '../src/project/component-preset-transform.js'
import { planTheme } from '../src/plan/theme.js'
import { applyPlan } from '../src/apply/transaction.js'

describe('component preset integration contracts', () => {

const roots: string[] = []

afterEach(async () => {
  for (const root of roots.splice(0))
    await fs.rm(root, { recursive: true, force: true })
})

async function setup() {
  const root = await createProject('vite')
  roots.push(root)
  await applyPlan(
    await planTheme(
      await inspectProject(root),
      await compile({
        preset: getCatalog('0.1.0').presets.flat,
        componentIds: [],
        catalogRelease: '0.1.0',
        compilerVersion: '0.1.0',
      }),
    ),
  )
  return root
}

async function installProvenance(root: string) {
  const result = await compileButtonPreset({
      preset: getCatalog('0.1.0').presets.flat,
    }),
    key = result.preset.data.id + '@' + result.preset.data.revision,
    artifacts: Record<string, InstalledArtifact> = {}
  const context = await inspectProject(root)
  for (const artifact of result.artifacts.filter(
    (item) => item.kind !== 'utility',
  )) {
    const transformed = await transformComponentPresetArtifact(
      context,
      artifact,
    )
    artifacts[transformed.path] = {
      logicalPath: artifact.logicalPath,
      sha256: await sha256(transformed.content),
      kind: artifact.kind,
    }
  }
  const { artifacts: ignored, dependencies: unused, ...record } = result
  const lockFile = path.join(root, 'ui-library.lock.json')
  const lock = JSON.parse(await fs.readFile(lockFile, 'utf8'))
  lock.artifacts = { ...lock.artifacts, ...artifacts }
  lock.componentPresets = { [key]: { ...record, artifacts } }
  await fs.writeFile(lockFile, JSON.stringify(lock))
  return { key, lockFile }
}

it('accepts a legacy lock without component preset provenance', async () => {
  const root = await setup()
  const context = await inspectProject(root)
  expect(context.lock?.componentPresets).toBeUndefined()
})

it('recompiles and accepts valid component preset provenance', async () => {
  const root = await setup()
  const { key } = await installProvenance(root)
  const context = await inspectProject(root)
  expect(context.lock?.componentPresets?.[key]).toBeDefined()
})

it.each(['preset data', 'scope', 'dark selector', 'key', 'artifact hash'])(
  'rejects tampered %s before planning',
  async (field) => {
    const root = await setup()
    const { key, lockFile } = await installProvenance(root)
    const lock = JSON.parse(await fs.readFile(lockFile, 'utf8'))
    const componentPresets = lock.componentPresets as Record<
      string,
      InstalledComponentPreset
    >
    const record = componentPresets[key]

    if (field === 'preset data') record.preset.data.name = 'Tampered preset'
    if (field === 'scope') record.scope = 'f'.repeat(64)
    if (field === 'dark selector') record.darkSelector = '.theme-dark'
    if (field === 'key') {
      delete componentPresets[key]
      componentPresets['wrong@99'] = record
    }
    if (field === 'artifact hash') {
      const [file, artifact] = Object.entries(record.artifacts)[0]!
      artifact.sha256 = 'f'.repeat(64)
      lock.artifacts[file] = artifact
    }

    await fs.writeFile(lockFile, JSON.stringify(lock))
    await expect(inspectProject(root)).rejects.toMatchObject({
      code: 'UNSUPPORTED_PROJECT',
    })
  },
)

it('returns an empty map when provenance is absent', async () => {
  const root = await setup()
  expect(await validateInstalledComponentPresets(root, undefined, {})).toEqual(
    {},
  )
})

it('rejects component artifact paths that escape the project root', async () => {
  const root = await setup()
  const { key, lockFile } = await installProvenance(root)
  const lock = JSON.parse(await fs.readFile(lockFile, 'utf8'))
  const record = lock.componentPresets[key] as InstalledComponentPreset
  const [file, artifact] = Object.entries(record.artifacts)[0]!
  delete record.artifacts[file]
  record.artifacts['../outside.tsx'] = artifact
  lock.artifacts['../outside.tsx'] = artifact
  await fs.writeFile(lockFile, JSON.stringify(lock))

  await expect(inspectProject(root)).rejects.toMatchObject({
    code: 'UNSUPPORTED_PROJECT',
  })
})

})

describe('component preset safety contracts', () => {

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
  const context = await inspectProject(root)
  for (const artifact of artifacts.filter((a) => a.kind !== 'utility')) {
    const transformed = await transformComponentPresetArtifact(context, artifact)
    owned[transformed.path] = {
      logicalPath: artifact.logicalPath,
      kind: artifact.kind,
      sha256: await sha256(transformed.content),
    }
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

it('rejects fabricated transformed source hashes in both ownership maps', async () => {
  const { root, lock, key, record } = await setup()
  const source = Object.keys(record.artifacts).find((file) =>
    file.endsWith('button.tsx'),
  )!
  record.artifacts[source].sha256 = 'a'.repeat(64)
  lock.artifacts[source].sha256 = 'a'.repeat(64)
  lock.componentPresets = { [key]: record }
  await writeLock(root, lock)
  await expect(inspectProject(root)).rejects.toMatchObject({
    code: 'UNSUPPORTED_PROJECT',
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

})
