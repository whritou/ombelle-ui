import { boundedMap } from './bounded-map.js'
import { workerBudget } from './worker-budget.js'
import os from 'node:os'
import fs from 'node:fs/promises'
import path from 'node:path'
import {
  consumerCases,
  assignConsumerPorts,
  type ConsumerCase,
} from './consumer-matrix.js'
import { prepareNodeConsumer } from './prepare-node-consumer.js'
import { prepareBunConsumer } from './prepare-bun-consumers.js'
import type { PendingConsumerEvidence } from './consumer-evidence.js'
type Fixture = ConsumerCase & {
  root: string
  port: number
  version?: string
  linker?: string
  bunVersion?: string
  bunLockfile?: 'bun.lock' | 'bun.lockb'
  buildRuntime?: 'node'
}
const workers = workerBudget(
  'OMBELLE_CONSUMER_WORKERS',
  process.env.OMBELLE_CONSUMER_WORKERS,
  2,
)
const repo = process.cwd(),
  map: Record<string, Fixture> = {},
  proof: Record<string, unknown> = {},
  bunRows: Record<string, unknown> = {}
const pending: Record<string, PendingConsumerEvidence> = {}
const recipeRows: Record<string, unknown> = {}
const componentPresetRows: Record<string, unknown> = {}
let previous: Record<string, Fixture> = {}
try {
  previous = JSON.parse(await fs.readFile('.artifacts/consumers.json', 'utf8'))
} catch (e) {
  if ((e as NodeJS.ErrnoException).code !== 'ENOENT') throw e
}
const temp = await fs.realpath(os.tmpdir())
for (const item of Object.values(previous)) {
  let real: string
  try {
    real = await fs.realpath(item.root)
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === 'ENOENT') continue
    throw e
  }
  const relative = path.relative(temp, real),
    marker = JSON.parse(
      await fs.readFile(path.join(real, '.ombelle-fixture.json'), 'utf8'),
    )
  if (
    relative.includes(path.sep) ||
    !relative.startsWith('ombelle-') ||
    marker.owner !== repo
  )
    throw new Error('Refusing to remove an unowned fixture')
  await fs.rm(real, { recursive: true, force: true })
}
await fs.mkdir('.artifacts', { recursive: true })
await fs.writeFile('.artifacts/consumers.json', '{}')
// A failed new run must never leave a previous successful matrix in place.
await fs.rm('.artifacts/consumer-matrix.json', { force: true })
await fs.writeFile('.artifacts/consumer-pending.json', '{}')
await fs.writeFile('.artifacts/recipe-consumers.json', '{}')
await fs.writeFile('.artifacts/component-preset-consumers.json', '{}')
await fs.rm('.artifacts/component-preset-measurements.json', { force: true })
const cases = consumerCases(),
  ports = assignConsumerPorts(cases),
  versions: Record<string, string> = {}
await boundedMap(
  cases,
  workers,
  async (spec) => {
    const map: Record<string, Fixture> = {},
      proof: Record<string, unknown> = {},
      bunRows: Record<string, unknown> = {}
    const pending: Record<string, PendingConsumerEvidence> = {},
      recipeRows: Record<string, unknown> = {},
      componentPresetRows: Record<string, unknown> = {},
      versions: Record<string, string> = {}
    let auditOutput = ''
    console.log('Preparing ' + spec.id)
    if (spec.manager === 'bun') {
      if (!spec.bunFormat) throw new Error('Missing Bun lockfile format')
      const row = await prepareBunConsumer(
        spec.framework,
        spec.bunFormat,
        spec.cliRuntime,
        spec.family,
      )
      map[spec.id] = {
        ...spec,
        root: row.fixture.root,
        port: ports[spec.id],
        buildRuntime: 'node',
        bunLockfile: row.fixture.lockfile,
        bunVersion: row.fixture.version,
        version: row.fixture.version,
      }
      proof[spec.id] = {
        family: spec.family,
        manager: 'bun',
        version: row.fixture.version,
        cliRuntime: row.cliRuntime,
        artifacts: row.artifacts,
        audit: { exitCode: row.audit.code, scope: 'all' },
      }
      bunRows[spec.id] = {
        family: spec.family,
        bunVersion: row.fixture.version,
        bunLockfile: row.fixture.lockfile,
        cliRuntime: row.cliRuntime,
        sourceHashes: row.sourceHashes,
        auditExitCode: row.audit.code,
        build: { status: 'pending' },
      }
      auditOutput = row.audit.output
      versions.bun = row.fixture.version
      recipeRows[spec.id] = {
        ...row.recipeEvidence,
        cliRuntime: row.cliRuntime,
        build: { status: 'pending' },
      }
      componentPresetRows[spec.id] = {
        ...row.componentPresetEvidence,
        ...spec,
        managerVersion: row.fixture.version,
        cliRuntime: row.cliRuntime,
        build: { status: 'pending' },
      }
    } else {
      const row = await prepareNodeConsumer(spec)
      map[spec.id] = {
        ...spec,
        root: row.root,
        port: ports[spec.id],
        version: row.version,
        linker: row.linker,
      }
      proof[spec.id] = {
        family: spec.family,
        manager: spec.manager,
        version: row.version,
        framework: spec.framework,
        linker: row.linker,
        cliRuntime: row.cliRuntime,
        artifacts: row.artifacts,
        audit: { exitCode: row.audit.code, scope: row.audit.scope },
        immutableInstall: true,
        noForeignLockfiles: true,
      }
      auditOutput = row.audit.output
      versions[
        spec.manager === 'yarn'
          ? row.version.startsWith('1.')
            ? 'classic'
            : 'modern'
          : spec.manager
      ] = row.version
      recipeRows[spec.id] = {
        ...row.recipeEvidence,
        cliRuntime: row.cliRuntime,
        build: { status: 'pending' },
      }
      componentPresetRows[spec.id] = {
        ...row.componentPresetEvidence,
        ...spec,
        managerVersion: row.version,
        cliRuntime: row.cliRuntime,
        build: { status: 'pending' },
      }
    }
    const observed = proof[spec.id] as {
      version: string
      cliRuntime: PendingConsumerEvidence['cliRuntime']
      artifacts: { path: string; sha256: string }[]
      audit: PendingConsumerEvidence['audit']
    }
    pending[spec.id] = {
      family: spec.family,
      manager: spec.manager,
      managerVersion: observed.version,
      cliRuntime: observed.cliRuntime,
      sourceHashes: Object.fromEntries(
        observed.artifacts.map((a) => [a.path, a.sha256]),
      ),
      audit: observed.audit,
    }
    return {
      map,
      proof,
      bunRows,
      pending,
      recipeRows,
      componentPresetRows,
      versions,
      auditOutput,
    }
  },
  async (outcomes) => {
    // All work has drained; only this parent writes aggregate evidence, in matrix order.
    for (const [index, outcome] of outcomes.entries()) {
      if (outcome?.status !== 'fulfilled') continue
      const row = outcome.value
      Object.assign(map, row.map)
      Object.assign(proof, row.proof)
      Object.assign(bunRows, row.bunRows)
      Object.assign(pending, row.pending)
      Object.assign(recipeRows, row.recipeRows)
      Object.assign(componentPresetRows, row.componentPresetRows)
      Object.assign(versions, row.versions)
      await fs.writeFile(
        '.artifacts/audit-' + cases[index].id + '.json',
        row.auditOutput,
      )
    }
    for (const [file, data] of Object.entries({
      'consumer-pending': pending,
      'recipe-consumers': recipeRows,
      'component-preset-consumers': componentPresetRows,
      consumers: map,
      'install-provenance': proof,
      'bun-matrix': bunRows,
    }))
      await fs.writeFile(
        '.artifacts/' + file + '.json',
        JSON.stringify(data, null, 2),
      )
  },
)
await fs.writeFile(
  '.artifacts/npm-version.json',
  JSON.stringify({ version: versions.npm }),
)
await fs.writeFile(
  '.artifacts/bun-version.json',
  JSON.stringify({ version: versions.bun }),
)
await fs.writeFile(
  '.artifacts/yarn-matrix.json',
  JSON.stringify(
    Object.fromEntries(
      Object.entries(proof).filter(([id]) => id.startsWith('yarn-')),
    ),
    null,
    2,
  ),
)
await fs.writeFile(
  '.artifacts/yarn-versions.json',
  JSON.stringify(
    { classic: versions.classic, modern: versions.modern },
    null,
    2,
  ),
)
