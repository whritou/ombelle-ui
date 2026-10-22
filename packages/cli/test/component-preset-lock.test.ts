import { afterEach, expect, it } from 'vitest'
import fs from 'node:fs/promises'
import path from 'node:path'
import { compile, compileButtonPreset, sha256 } from '@ombelle/compiler'
import { getCatalog } from '@ombelle/catalog'
import type {
  InstalledArtifact,
  InstalledComponentPreset,
} from '@ombelle/contracts'
import { createProject } from '../../../tests/helpers/projects.js'
import { inspectProject } from '../src/project/inspect.js'
import { validateInstalledComponentPresets } from '../src/project/component-presets.js'
import { transformComponentPresetArtifact } from '../src/project/component-preset-transform.js'
import { planTheme } from '../src/plan/theme.js'
import { applyPlan } from '../src/apply/transaction.js'

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
