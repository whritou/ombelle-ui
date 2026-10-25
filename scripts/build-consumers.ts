import { boundedMap } from './bounded-map.js'
import { workerBudget } from './worker-budget.js'
import fs from 'node:fs/promises'
import path from 'node:path'
import { sha256 } from '@ombelle/compiler'
import { managerEntry } from '../packages/cli/src/apply/manager.js'
import { run, pnpmEntry } from './process.js'
import { yarnEntry } from '../tests/helpers/yarn-project.js'
import {
  buildBunFixture,
  bunEvidenceRow,
} from '../tests/helpers/bun-project.js'
import { jsonRecord } from '../tests/helpers/cli-runtime.js'
import { resolveBunExecutable } from '../packages/cli/src/apply/executable.js'
import { consumerCases } from './consumer-matrix.js'
import {
  finalizeConsumerEvidence,
  type ConsumerEvidence,
  type PendingConsumerEvidence,
} from './consumer-evidence.js'
import { validateComponentPresetConsumers } from './component-preset-evidence.js'
const workers = workerBudget(
  'OMBELLE_CONSUMER_WORKERS',
  process.env.OMBELLE_CONSUMER_WORKERS,
  2,
)
const pending = JSON.parse(
  await fs.readFile('.artifacts/consumer-pending.json', 'utf8'),
) as Record<string, PendingConsumerEvidence>
const measured: Record<string, ConsumerEvidence> = {}
const recipeRows = JSON.parse(
  await fs.readFile('.artifacts/recipe-consumers.json', 'utf8'),
)
const componentPresetRows = JSON.parse(
  await fs.readFile('.artifacts/component-preset-consumers.json', 'utf8'),
)
for (const row of [
  ...Object.values(recipeRows),
  ...Object.values(componentPresetRows),
] as Record<string, unknown>[])
  row.build = { status: 'pending' }
async function verifyBuiltSources(id: string, root: string) {
  for (const [file, hash] of Object.entries(pending[id].sourceHashes))
    if (
      (await sha256(await fs.readFile(path.join(root, file), 'utf8'))) !== hash
    )
      throw Error(
        'Built consumer source changed after preparation: ' + id + '/' + file,
      )
}
await fs.rm('.artifacts/consumer-matrix.json', { force: true })
const map = JSON.parse(
  await fs.readFile('.artifacts/consumers.json', 'utf8'),
) as Record<
  string,
  {
    root: string
    manager?: 'npm' | 'pnpm' | 'yarn' | 'bun'
    version?: string
    framework: 'vite' | 'next'
    bunLockfile?: 'bun.lock' | 'bun.lockb'
  }
>
const bunRows = jsonRecord(
  JSON.parse(await fs.readFile('.artifacts/bun-matrix.json', 'utf8')),
)
for (const row of Object.values(bunRows))
  jsonRecord(row).build = { status: 'pending' }
for (const [file, data] of Object.entries({
  'recipe-consumers': recipeRows,
  'component-preset-consumers': componentPresetRows,
  'bun-matrix': bunRows,
}))
  await fs.writeFile(
    '.artifacts/' + file + '.json',
    JSON.stringify(data, null, 2),
  )
const entries = Object.entries(map)
const preparedRecipes = recipeRows,
  preparedPresets = componentPresetRows,
  preparedBun = bunRows
await boundedMap(
  entries,
  workers,
  async ([id, fixture]) => {
    const measured: Record<string, ConsumerEvidence> = {},
      recipeRows = { [id]: preparedRecipes[id] },
      componentPresetRows = { [id]: preparedPresets[id] },
      bunRows = { [id]: preparedBun[id] }
    console.log('Building ' + id)
    if (fixture.manager === 'bun') {
      const built = await buildBunFixture(fixture.root, fixture.framework)
      if (built.code !== 0) throw new Error(built.output)
      await verifyBuiltSources(id, fixture.root)
      const prepared = jsonRecord(bunRows[id]),
        identity = jsonRecord(prepared.cliRuntime)
      if (
        (identity.name !== 'node' && identity.name !== 'bun') ||
        typeof identity.executable !== 'string' ||
        typeof identity.version !== 'string'
      )
        throw new Error('Missing measured CLI runtime')
      if (prepared.auditExitCode !== 0 || !fixture.bunLockfile)
        throw new Error('Missing successful Bun preparation/audit')
      const hashes = jsonRecord(prepared.sourceHashes)
      if (Object.values(hashes).some((hash) => typeof hash !== 'string'))
        throw new Error('Invalid source hashes')
      bunRows[id] = bunEvidenceRow(
        {
          root: fixture.root,
          executable: await resolveBunExecutable(),
          version: '1.4.3',
          lockfile: fixture.bunLockfile,
        },
        {
          cliRuntime: {
            executable: identity.executable,
            name: identity.name,
            version: identity.version,
          },
          buildRuntime: { ...built.runtime, name: 'node' },
          sourceHashes: hashes as Record<string, string>,
          auditExitCode: 0,
          buildExitCode: built.code,
        },
      )
      measured[id] = {
        ...pending[id],
        buildRuntime: { ...built.runtime, name: 'node' },
        build: { exitCode: built.code },
      }
      recipeRows[id] = {
        ...recipeRows[id],
        audit: pending[id].audit,
        buildRuntime: built.runtime,
        build: { status: 'passed', exitCode: built.code },
      }
      componentPresetRows[id] = {
        ...componentPresetRows[id],
        audit: pending[id].audit,
        buildRuntime: measured[id].buildRuntime,
        build: { status: 'passed', exitCode: built.code },
      }
      return { measured, recipeRows, componentPresetRows, bunRows }
    }
    await run(
      process.execPath,
      [
        fixture.manager === 'npm'
          ? await managerEntry('npm')
          : fixture.manager === 'yarn'
            ? await yarnEntry(fixture.version!)
            : pnpmEntry(),
        'run',
        'build',
      ],
      fixture.root,
    )
    measured[id] = {
      ...pending[id],
      buildRuntime: {
        name: process.versions.bun ? 'bun' : 'node',
        executable: process.execPath,
        version: process.versions.bun ?? process.versions.node,
      },
      build: { exitCode: 0 },
    }
    await verifyBuiltSources(id, fixture.root)
    recipeRows[id] = {
      ...recipeRows[id],
      audit: pending[id].audit,
      buildRuntime: measured[id].buildRuntime,
      build: { status: 'passed', exitCode: 0 },
    }
    componentPresetRows[id] = {
      ...componentPresetRows[id],
      audit: pending[id].audit,
      buildRuntime: measured[id].buildRuntime,
      build: { status: 'passed', exitCode: 0 },
    }
    return { measured, recipeRows, componentPresetRows, bunRows: {} }
  },
  async (outcomes) => {
    for (const [index, outcome] of outcomes.entries()) {
      const id = entries[index][0]
      if (outcome?.status === 'fulfilled') {
        Object.assign(measured, outcome.value.measured)
        Object.assign(recipeRows, outcome.value.recipeRows)
        Object.assign(componentPresetRows, outcome.value.componentPresetRows)
        Object.assign(bunRows, outcome.value.bunRows)
      } else if (outcome?.status === 'rejected') {
        recipeRows[id].build = { status: 'failed' }
        componentPresetRows[id].build = { status: 'failed' }
        if (bunRows[id]) jsonRecord(bunRows[id]).build = { status: 'failed' }
      }
    }
    for (const [file, data] of Object.entries({
      'recipe-consumers': recipeRows,
      'component-preset-consumers': componentPresetRows,
      'bun-matrix': bunRows,
    }))
      await fs.writeFile(
        '.artifacts/' + file + '.json',
        JSON.stringify(data, null, 2),
      )
  },
)
const finalized = finalizeConsumerEvidence(consumerCases(), measured)
await validateComponentPresetConsumers(componentPresetRows, finalized)
await fs.writeFile(
  '.artifacts/consumer-matrix.json',
  JSON.stringify(finalized, null, 2),
)
