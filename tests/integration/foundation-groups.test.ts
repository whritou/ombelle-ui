import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import { pathToFileURL } from 'node:url'
import { afterEach, expect, test } from 'vitest'
// @ts-expect-error JavaScript gate entry point
import { aggregateFoundationEvidence } from '../../scripts/foundation-evidence.mjs'
import { consumerFixture, presetMeasurements, recipeMeasurements, minimalistMeasurements } from '../helpers/foundation-evidence-fixture.js'

const roots: string[] = []
const commit = 'a'.repeat(40)
const stages = {
  quality: ['build:packages', 'test:unit', 'test:integration', 'generate:preview', 'typecheck', 'audit:workspace'],
  consumers: ['build:packages', 'generate:preview', 'prepare:consumers', 'build:preview', 'build:consumers', 'test:e2e'],
}
let base: Promise<Record<string, Record<string, any>>> | undefined
let collectedDefinitions: { name: string; file: string }[] | undefined
async function testResults(prefix: string) {
  // Collect from source independently of the aggregate implementation. This is
  // structural reporter data only; no test bodies execute during collection.
  if (!collectedDefinitions) {
    // One bounded discovery for fixture construction; production independently
    // collects the unit and integration selections with their respective configs.
    const collected = spawnSync(process.execPath, [path.resolve('node_modules/vitest/vitest.mjs'), 'list', '--config', 'vitest.integration.config.ts', '--staticParse=false', '--json'], { encoding: 'utf8', windowsHide: true, timeout: 60000, maxBuffer: 8 * 1024 * 1024 })
    if (collected.status !== 0) throw new Error(collected.stderr)
    collectedDefinitions = JSON.parse(collected.stdout)
  }
  const byFile = new Map<string, any[]>()
  for (const row of collectedDefinitions!) {
    const name = path.relative(process.cwd(), row.file).replaceAll('\\', '/')
    if (!name.startsWith(prefix)) continue
    const assertions = byFile.get(name) ?? []
    assertions.push({ fullName: row.name, ancestorTitles: [], title: row.name, status: 'passed', failureMessages: [] })
    byFile.set(name, assertions)
  }
  const testResults = [...byFile].map(([name, assertionResults]) => ({ name: '/different-checkout/' + name, status: 'passed', assertionResults }))
  const count = testResults.reduce((sum, suite) => sum + suite.assertionResults.length, 0)
  return { success: true, numTotalTests: count, numPassedTests: count, numFailedTests: 0, numPendingTests: 0, numTodoTests: 0, numFailedTestSuites: 0, numPendingTestSuites: 0, testResults }
}
async function data() {
  const { matrix, consumers, recipes } = await consumerFixture()
  return {
    quality: { 'unit-results.json': await testResults('packages/'), 'integration-results.json': await testResults('tests/integration/') },
    consumers: {
      'consumer-matrix.json': matrix,
      'recipe-consumers.json': recipes,
      'component-preset-consumers.json': consumers,
      'recipe-measurements.json': await recipeMeasurements(),
      'component-preset-measurements.json': await presetMeasurements(),
      'minimalist-measurements.json': minimalistMeasurements(),
      'browser-version.json': { engine: 'chromium', version: '155.0.0.0', channel: 'bundled Chromium' },
      'npm-version.json': '11.19.0', 'yarn-versions.json': {}, 'yarn-matrix.json': {}, 'bun-version.json': '1.4.3', 'bun-matrix.json': {},
      'browser-results.json': {
        stats: { expected: 118, unexpected: 0, skipped: 0, flaky: 0 }, errors: [],
        suites: Object.entries({ 'badge.spec.ts': 30, 'component-presets.spec.ts': 20, 'keyboard.spec.ts': 30, 'minimalist-states.spec.ts': 12, 'parity.spec.ts': 6, 'recipes.spec.ts': 20 }).map(([file, count]) => ({
          file, suites: [], specs: Array.from({ length: count }, (_, i) => ({ file, id: file + i, title: file + i, ok: true, tests: [{ expectedStatus: 'passed', status: 'expected', results: [{ status: 'passed', retry: 0, errors: [] }] }] })),
        })),
      },
    },
  }
}
async function fixture() {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'ombelle-aggregate-'))
  roots.push(root)
  const evidence = await (base ??= data())
  for (const group of ['quality', 'consumers'] as const) {
    await fs.mkdir(path.join(root, group))
    for (const [file, value] of Object.entries(evidence[group])) await write(root, group, file, value)
    await write(root, group, 'foundation-report.json', {
      group, sourceCommit: commit, status: 'passed', exitCode: 0,
      steps: stages[group].map(name => ({ name, status: 'passed', exitCode: 0 })),
    })
  }
  return root
}
async function write(root: string, group: string, file: string, data: unknown) {
  await fs.writeFile(path.join(root, group, file), JSON.stringify(data))
}
async function patch(root: string, group: string, file: string, mutate: (report: any) => void) {
  const report = JSON.parse(await fs.readFile(path.join(root, group, file), 'utf8'))
  mutate(report)
  await write(root, group, file, report)
}
afterEach(async () => { for (const root of roots.splice(0)) await fs.rm(root, { recursive: true, force: true }) })

test('accepts complete portable structural evidence without any consumer root descriptors', async () => {
  const root = await fixture()
  const unit = JSON.parse(await fs.readFile(path.join(root, 'quality/unit-results.json'), 'utf8'))
  // Vitest 5 defaults to static listing, which leaves test.each templates unexpanded.
  expect(unit.testResults.find((suite: any) => suite.name.endsWith('catalog/test/recipe-preset.test.ts')).assertionResults.map((assertion: any) => assertion.title)).toContain('resolves exact built-in flat')
  const integration = JSON.parse(await fs.readFile(path.join(root, 'quality/integration-results.json'), 'utf8'))
  const repeated = integration.testResults.find((suite: any) => suite.name.endsWith('integration/recipe-cli.test.ts')).assertionResults.filter((assertion: any) => assertion.title === 'rejects invalid recipe grammar "add"')
  expect(repeated).toHaveLength(4) // Legitimate identical parameterized titles retain their multiplicity.
  const result = await aggregateFoundationEvidence(root, commit)
  expect(result).toMatchObject({ sourceCommit: commit, status: 'passed', counts: { browser: { expected: 118 } } })
  expect(Object.keys(result.consumerMatrix)).toHaveLength(34)
  expect(result.recipeEvidence.measurements).toHaveLength(90)
  expect(result.componentPresetEvidence.measurements).toHaveLength(90)
}, 180000) // Fixture discovery plus two independently bounded runtime inventories.
test('rejects an absent group rather than accepting a passed status', async () => {
  const root = await fixture()
  await fs.rm(path.join(root, 'consumers'), { recursive: true })
  await expect(aggregateFoundationEvidence(root, commit).then(() => undefined)).rejects.toThrow()
})
test('rejects an extra artifact', async () => {
  const root = await fixture()
  await fs.cp(path.join(root, 'quality'), path.join(root, 'duplicate'), { recursive: true })
  await expect(aggregateFoundationEvidence(root, commit).then(() => undefined)).rejects.toThrow()
})
test.each([
  ['failed group', (r: any) => { r.status = 'failed' }],
  ['nonzero group exit', (r: any) => { r.exitCode = 1 }],
  ['source mismatch', (r: any) => { r.sourceCommit = 'b'.repeat(40) }],
  ['duplicate identity', (r: any) => { r.group = 'quality' }],
  ['missing measured stage', (r: any) => { r.steps.pop() }],
  ['failed measured stage', (r: any) => { r.steps[0].exitCode = 1 }],
])('rejects %s', async (_label, mutate) => {
  const root = await fixture()
  await patch(root, 'consumers', 'foundation-report.json', mutate)
  await expect(aggregateFoundationEvidence(root, commit).then(() => undefined)).rejects.toThrow()
})
test('rejects passed reports without their measured evidence files', async () => {
  const root = await fixture()
  await fs.rm(path.join(root, 'consumers/recipe-measurements.json'))
  await expect(aggregateFoundationEvidence(root, commit).then(() => undefined)).rejects.toThrow()
})
test.each([
  ['incomplete matrix', 'consumer-matrix.json', (r: any) => { delete r['vite-flat'] }],
  ['failed consumer build', 'consumer-matrix.json', (r: any) => { r['vite-flat'].build.exitCode = 1 }],
  ['duplicate measurements', 'recipe-measurements.json', (r: any) => { r[1] = r[0] }],
  ['incomplete measurements', 'component-preset-measurements.json', (r: any) => { r.pop() }],
  ['failed isolation', 'component-preset-measurements.json', (r: any) => { r[0].checks.isolation = false }],
  ['flaky browser', 'browser-results.json', (r: any) => { r.suites[0].specs[0].tests[0].results.push({ status: 'passed', retry: 1 }) }],
  ['skipped browser', 'browser-results.json', (r: any) => { r.suites[0].specs[0].tests[0].results[0].status = 'skipped' }],
  ['missing browser', 'browser-results.json', (r: any) => { r.suites[0].specs.pop(); r.stats.expected-- }],
  ['duplicate browser', 'browser-results.json', (r: any) => { r.suites[0].specs[1] = r.suites[0].specs[0] }],
])('rejects %s even with passed group status', async (_label, file, mutate) => {
  const root = await fixture()
  await patch(root, 'consumers', file, mutate)
  await expect(aggregateFoundationEvidence(root, commit).then(() => undefined)).rejects.toThrow()
})
test.each([
  ['duplicate assertion replacement', (r: any) => {
    const suite = r.testResults.find((s: any) => s.name.endsWith('catalog/test/catalog.test.ts'))
    suite.assertionResults[1] = structuredClone(suite.assertionResults[0])
  }],
  ['truncated assertion sets with adjusted totals', (r: any) => {
    for (const suite of r.testResults) suite.assertionResults = suite.assertionResults.slice(0, 1)
    r.numTotalTests = r.numPassedTests = r.testResults.length
  }],
  ['missing test file', (r: any) => { r.testResults.pop(); r.numTotalTests--; r.numPassedTests-- }],
  ['duplicate test file', (r: any) => { r.testResults[1] = r.testResults[0] }],
  ['skipped assertion', (r: any) => { r.testResults[0].assertionResults[0].status = 'pending' }],
  ['todo test', (r: any) => { r.numTodoTests = 1 }],
  ['empty result', (r: any) => { r.testResults = []; r.numTotalTests = 0; r.numPassedTests = 0 }],
])('rejects %s even with successful summary counts', async (_label, mutate) => {
  const root = await fixture()
  await patch(root, 'quality', 'unit-results.json', mutate)
  await expect(aggregateFoundationEvidence(root, commit).then(() => undefined)).rejects.toThrow()
})

test.each(['quality', 'consumers'])('executes %s stages independently and clears stale owned evidence', async group => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'ombelle-group-'))
  roots.push(root)
  await fs.mkdir(path.join(root, '.artifacts'))
  const evidence = group === 'quality' ? 'unit-results.json' : 'consumer-matrix.json'
  await fs.writeFile(path.join(root, '.artifacts', evidence), '{}')
  const runner = path.join(root, 'pnpm.mjs')
  await fs.writeFile(runner, "import fs from 'node:fs'; fs.appendFileSync('calls.jsonl', JSON.stringify(process.argv.slice(2))+'\\n')")
  const env = Object.fromEntries(Object.entries(process.env).filter(([key]) => key.toLowerCase() !== 'npm_execpath'))
  const result = spawnSync(process.execPath, ['--import', pathToFileURL(path.resolve('node_modules/tsx/dist/loader.mjs')).href, path.resolve('scripts/check-foundation.mjs'), '--group', group], { cwd: root, env: { ...env, npm_execpath: runner }, encoding: 'utf8', windowsHide: true })
  expect(result.status).toBe(1) // Successful commands without produced evidence must fail.
  const calls = (await fs.readFile(path.join(root, 'calls.jsonl'), 'utf8')).trim().split('\n').map(line => JSON.parse(line))
  expect(calls).toEqual(stages[group as keyof typeof stages].map(name => ['run', name]))
  await expect(fs.stat(path.join(root, '.artifacts', evidence))).rejects.toThrow()
  const report = JSON.parse(await fs.readFile(path.join(root, '.artifacts/foundation-report.json'), 'utf8'))
  expect(report).toMatchObject({ group, status: 'failed', exitCode: 1 })
})
