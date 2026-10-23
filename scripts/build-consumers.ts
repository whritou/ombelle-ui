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
for (const row of Object.values(componentPresetRows) as Record<
  string,
  unknown
>[])
  row.build = { status: 'pending' }
await fs.writeFile(
  '.artifacts/component-preset-consumers.json',
  JSON.stringify(componentPresetRows, null, 2),
)
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
for (const [id, fixture] of Object.entries(map)) {
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
    await fs.writeFile(
      '.artifacts/bun-matrix.json',
      JSON.stringify(bunRows, null, 2),
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
    await fs.writeFile(
      '.artifacts/component-preset-consumers.json',
      JSON.stringify(componentPresetRows, null, 2),
    )
    await fs.writeFile(
      '.artifacts/recipe-consumers.json',
      JSON.stringify(recipeRows, null, 2),
    )
    continue
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
  await fs.writeFile(
    '.artifacts/component-preset-consumers.json',
    JSON.stringify(componentPresetRows, null, 2),
  )
  await fs.writeFile(
    '.artifacts/recipe-consumers.json',
    JSON.stringify(recipeRows, null, 2),
  )
}
const finalized = finalizeConsumerEvidence(consumerCases(), measured)
await validateComponentPresetConsumers(componentPresetRows, finalized)
await fs.writeFile(
  '.artifacts/consumer-matrix.json',
  JSON.stringify(finalized, null, 2),
)
