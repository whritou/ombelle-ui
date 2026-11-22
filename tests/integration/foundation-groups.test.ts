import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import { afterEach, expect, test } from 'vitest'
import { supportedComponentIds } from '@ombelle/contracts'
// @ts-expect-error JavaScript gate entry point
import { advisoryBaseline, aggregateFoundationEvidence, foundationSteps, specimenSpecCounts, validateBrowserResults, validateSpecimenAudit, validateTestResults } from '../../scripts/foundation-evidence.mjs'
import { consumerFixture, presetMeasurements, recipeMeasurements, minimalistMeasurements } from '../helpers/foundation-evidence-fixture.js'

const roots: string[] = []
const commit = 'a'.repeat(40)
const stages = foundationSteps as Record<'quality' | 'consumers' | 'all', string[]>
let base: Promise<Record<string, Record<string, any>>> | undefined
// A small inventory stands in for the suite: listing every unit and integration test took 469 s of
// CI time here (TST-12). The real collector runs in every Foundation quality group.
const inventories = {
  unit: { files: ['packages/catalog/test/recipe-preset.test.ts', 'apps/www/src/preset-editor/model.test.ts', 'packages/catalog/test/catalog.test.ts'], tests: [
    { file: 'packages/catalog/test/recipe-preset.test.ts', name: 'resolves exact built-in flat' },
    { file: 'packages/catalog/test/recipe-preset.test.ts', name: 'resolves exact built-in ombelle' },
    { file: 'apps/www/src/preset-editor/model.test.ts', name: 'model > creates a draft' },
    { file: 'apps/www/src/preset-editor/model.test.ts', name: 'model > materializes a preset' },
    { file: 'packages/catalog/test/catalog.test.ts', name: 'catalog > lists every component' },
    { file: 'packages/catalog/test/catalog.test.ts', name: 'catalog > compiles deterministically' },
  ] },
  integration: { files: ['tests/integration/recipe-cli.test.ts', 'tests/integration/foundation-runner.test.ts'], tests: [
    ...Array.from({ length: 4 }, () => ({ file: 'tests/integration/recipe-cli.test.ts', name: 'rejects invalid recipe grammar "add"' })),
    { file: 'tests/integration/recipe-cli.test.ts', name: 'adds a recipe' },
    { file: 'tests/integration/foundation-runner.test.ts', name: 'runs stages in order' },
  ] },
}
function browserResults() {
  return {
    stats: { expected: 1185, unexpected: 0, skipped: 0, flaky: 0 }, errors: [],
    suites: Object.entries({ 'badge.spec.ts': 70, 'card.spec.ts': 70, 'checkbox.spec.ts': 70, 'component-presets.spec.ts': 100, 'editor.spec.ts': 19, 'catalog-editors.spec.ts': 24, 'forms.spec.ts': 70, 'keyboard.spec.ts': 70, 'minimalist-states.spec.ts': 12, 'parity.spec.ts': 14, 'preset-editor.spec.ts': 65, 'recipes.spec.ts': 100, 'snapshot-presets.spec.ts': 38, 'recipe-snapshots.spec.ts': 10, 'switch.spec.ts': 70, 'tabs.spec.ts': 70, 'tooltip.spec.ts': 70, 'liquid-glass.spec.ts': 40, 'edition-parity.spec.ts': 196, 'glass-backdrops.spec.ts': 3, 'editor-commands.spec.ts': 4 }).map(([file, count]) => ({
      file, suites: [], specs: Array.from({ length: count }, (_, i) => ({ file, id: file + i, title: file + i, ok: true, tests: [{ expectedStatus: 'passed', status: 'expected', results: [{ status: 'passed', retry: 0, errors: [] }] }] })),
    })),
  }
}
function specimenAudit() {
  const checks = (mode: string) => ({ overflow: 36, clipping: 36, spacing: 36, 'focus-visible': 40, 'target-size': 36, 'forced-colors': mode === 'light' ? 29 : 0, axe: 36 })
  return {
    schemaVersion: 1, sourceCommit: commit, node: 'v24.19.0', browser: { engine: 'chromium', version: '148.0.0.0', channel: 'bundled' },
    configurations: [...['flat', 'minimalist', 'neo-brutalism', 'ombelle', 'papier', 'organic', 'retro-futurism', 'liquid-glass'].flatMap(family => ['radix', 'base'].flatMap(edition =>
      ['light', 'dark'].map(mode => ({ family, edition, mode, specimens: supportedComponentIds.length, checks: checks(mode), contrastAdvisoryFindings: 0 })))),
      ...['radix', 'base'].flatMap(edition => ['light', 'dark'].map(mode => ({ family: 'liquid-glass', edition, mode, transparency: 'reduced', specimens: supportedComponentIds.length, checks: checks(mode), contrastAdvisoryFindings: 0 })))],
    failures: 0,
  }
}
/** The specimen config's Playwright report: every pinned spec passed once. */
function specimenResults(files = Object.entries(specimenSpecCounts as Record<string, number>)) {
  const suites = files.map(([file, count]) => ({
    file, suites: [], specs: Array.from({ length: count }, (_, i) => ({ file, id: 'specimen-' + file + i, title: file + i, ok: true, tests: [{ expectedStatus: 'passed', status: 'expected', results: [{ status: 'passed', retry: 0, errors: [] }] }] })),
  }))
  const expected = suites.reduce((sum, suite) => sum + suite.specs.length, 0)
  return { stats: { expected, unexpected: 0, skipped: 0, flaky: 0 }, errors: [], suites }
}
/** The specimen group as CI runs it: shard n of total, each with its share of configurations and spec files. */
function specimenShards(total = 4) {
  const audit = specimenAudit()
  const files = Object.entries(specimenSpecCounts as Record<string, number>)
  return Array.from({ length: total }, (_, index) => ({
    'specimen-audit.json': { ...audit, shard: { current: index + 1, total }, runId: 'github:1/1', configurations: audit.configurations.filter((_, row) => row % total === index) },
    'specimen-results.json': specimenResults(files.filter((_, file) => file % total === index)),
  }))
}
async function testResults(prefix: string | string[]) {
  // Collect from source independently of the aggregate implementation. This is
  // structural reporter data only; no test bodies execute during collection.
  const prefixes = Array.isArray(prefix) ? prefix : [prefix]
  const kind = prefixes.includes('tests/integration/') ? 'integration' : 'unit'
  const byFile = new Map<string, any[]>()
  for (const row of inventories[kind].tests) {
    const name = row.file
    if (!prefixes.some((prefix) => name.startsWith(prefix))) continue
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
    quality: { 'unit-results.json': await testResults(['packages/', 'apps/www/src/']), 'integration-results.json': await testResults('tests/integration/') },
    consumers: {
      'consumer-matrix.json': matrix,
      'recipe-consumers.json': recipes,
      'component-preset-consumers.json': consumers,
      'recipe-measurements.json': await recipeMeasurements(),
      'component-preset-measurements.json': await presetMeasurements(),
      'minimalist-measurements.json': minimalistMeasurements(),
      'browser-version.json': { engine: 'chromium', version: '155.0.0.0', channel: 'bundled Chromium' },
      'npm-version.json': '11.19.0', 'yarn-versions.json': {}, 'yarn-matrix.json': {}, 'bun-version.json': '1.4.3', 'bun-matrix.json': {},
      'browser-results.json': browserResults(),
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
  for (const [index, files] of specimenShards().entries()) {
    const directory = 'foundation-specimen-shard-' + (index + 1)
    await fs.mkdir(path.join(root, directory))
    for (const [file, value] of Object.entries(files)) await write(root, directory, file, value)
    await write(root, directory, 'foundation-report.json', {
      group: 'specimen', shard: { current: index + 1, total: 4 }, sourceCommit: commit, status: 'passed', exitCode: 0,
      steps: foundationSteps.specimen.map((name: string) => ({ name, status: 'passed', exitCode: 0 })),
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

test.each(['quality', 'all'] as const)('%s generates the preview sources before any test imports them', (group) => {
  // apps/www/src and tests/integration import apps/*/src/generated, written by generate:preview.
  const order = stages[group]
  expect(order.indexOf('generate:preview')).toBeGreaterThan(order.indexOf('build:packages'))
  for (const stage of ['test:unit', 'test:integration']) expect(order.indexOf('generate:preview')).toBeLessThan(order.indexOf(stage))
})
test('accepts a complete specimen audit', () => {
  expect(validateSpecimenAudit(specimenAudit())).toEqual({ configurations: 36, specimens: 36 * supportedComponentIds.length })
})
test.each([
  ['23 configurations', (audit: any) => { audit.configurations.pop() }],
  ['one specimen missing in one configuration', (audit: any) => { audit.configurations[3].specimens -= 1 }],
  ['a failure', (audit: any) => { audit.failures = 1 }],
  ['a duplicated configuration', (audit: any) => { audit.configurations[1] = { ...audit.configurations[0] } }],
  ['a check that measured nothing', (audit: any) => { audit.configurations[0].checks['focus-visible'] = 0 }],
  ['a missing browser version', (audit: any) => { audit.browser.version = '' }],
  ['no spacing measurement', (audit: any) => { delete audit.configurations[2].checks.spacing }],
])('rejects a specimen audit with %s', (_, mutate) => {
  const audit = specimenAudit()
  mutate(audit)
  expect(() => validateSpecimenAudit(audit)).toThrow('Incomplete specimen audit')
})

test('accepts complete browser evidence including edition parity and glass backdrops', () => {
  expect(validateBrowserResults(browserResults())).toMatchObject({ expected: 1185 })
})

test('rejects omitted recipe publication browser cases even when totals match the old inventory', () => {
  const result = browserResults()
  result.suites = result.suites.filter(suite => suite.file !== 'recipe-snapshots.spec.ts')
  result.stats.expected -= 7
  expect(() => validateBrowserResults(result)).toThrow('Incomplete, failed, skipped or flaky browser matrix')
})
test('rejects omitted snapshot browser suite and assertions when totals are adjusted', () => {
  const missingFile = browserResults()
  missingFile.suites = missingFile.suites.filter((suite) => suite.file !== 'snapshot-presets.spec.ts')
  missingFile.stats.expected -= 26
  expect(() => validateBrowserResults(missingFile)).toThrow('Incomplete, failed, skipped or flaky browser matrix')
  const missingAssertion = browserResults()
  const suite = missingAssertion.suites.find((row) => row.file === 'snapshot-presets.spec.ts')!
  suite.specs.pop()
  missingAssertion.stats.expected--
  expect(() => validateBrowserResults(missingAssertion)).toThrow('Incomplete, failed, skipped or flaky browser matrix')
})
test('rejects omitted preset editor cases even when reporter totals are adjusted', () => {
  const result = browserResults()
  result.suites = result.suites.filter((suite) => suite.file !== 'preset-editor.spec.ts')
  result.stats.expected -= 42
  expect(() => validateBrowserResults(result)).toThrow('Incomplete, failed, skipped or flaky browser matrix')
})
test('accepts app unit evidence from Windows and Unix source paths', async () => {
  const result = await testResults(['packages/', 'apps/www/src/'])
  expect(result.testResults.some((suite) => suite.name.includes('/apps/www/src/preset-editor/'))).toBe(true)
  await expect(validateTestResults(result, 'unit', inventories.unit)).resolves.toMatchObject({ failed: 0 })
  for (const suite of result.testResults) suite.name = 'Z:\\portable-checkout\\' + suite.name.replace('/different-checkout/', '').replaceAll('/', '\\')
  await expect(validateTestResults(result, 'unit', inventories.unit)).resolves.toMatchObject({ failed: 0 })
})
test('rejects missing app unit files and assertions after headline counts are adjusted', async () => {
  for (const mode of ['file', 'assertion']) {
    const result = await testResults(['packages/', 'apps/www/src/'])
    const index = result.testResults.findIndex((suite) => suite.name.endsWith('preset-editor/model.test.ts'))
    const removed = mode === 'file' ? result.testResults.splice(index, 1)[0].assertionResults.length : (result.testResults[index].assertionResults.pop(), 1)
    result.numTotalTests -= removed; result.numPassedTests -= removed
    await expect(validateTestResults(result, 'unit', inventories.unit)).rejects.toThrow()
  }
})
test('rejects omitted Card browser cases even when reporter totals are adjusted', () => {
  const result = browserResults()
  result.suites = result.suites.filter(suite => suite.file !== 'card.spec.ts')
  result.stats.expected -= 40
  expect(() => validateBrowserResults(result)).toThrow('Incomplete, failed, skipped or flaky browser matrix')
})
test('rejects omitted Forms browser cases even when reporter totals are adjusted', () => {
  const result = browserResults()
  result.suites = result.suites.filter(suite => suite.file !== 'forms.spec.ts')
  result.stats.expected -= 40
  expect(() => validateBrowserResults(result)).toThrow('Incomplete, failed, skipped or flaky browser matrix')
})
test('rejects omitted editor browser cases even when reporter totals are adjusted', () => {
  const result = browserResults()
  result.suites = result.suites.filter(suite => suite.file !== 'editor.spec.ts')
  result.stats.expected -= 14
  expect(() => validateBrowserResults(result)).toThrow('Incomplete, failed, skipped or flaky browser matrix')
})
test('accepts complete portable structural evidence without any consumer root descriptors', async () => {
  const root = await fixture()
  const unit = JSON.parse(await fs.readFile(path.join(root, 'quality/unit-results.json'), 'utf8'))
  expect(unit.testResults.find((suite: any) => suite.name.endsWith('catalog/test/recipe-preset.test.ts')).assertionResults.map((assertion: any) => assertion.title)).toContain('resolves exact built-in flat')
  const integration = JSON.parse(await fs.readFile(path.join(root, 'quality/integration-results.json'), 'utf8'))
  const repeated = integration.testResults.find((suite: any) => suite.name.endsWith('integration/recipe-cli.test.ts')).assertionResults.filter((assertion: any) => assertion.title === 'rejects invalid recipe grammar "add"')
  expect(repeated).toHaveLength(4) // Legitimate identical parameterized titles retain their multiplicity.
  const result = await aggregateFoundationEvidence(root, commit, { inventories })
  expect(result).toMatchObject({ sourceCommit: commit, status: 'passed', counts: { browser: { expected: 1185 } } })
  expect(Object.keys(result.consumerMatrix)).toHaveLength(54)
  expect(result.recipeEvidence.measurements).toHaveLength(490)
  expect(result.componentPresetEvidence.measurements).toHaveLength(490)
})
test('rejects an absent group rather than accepting a passed status', async () => {
  const root = await fixture()
  await fs.rm(path.join(root, 'consumers'), { recursive: true })
  await expect(aggregateFoundationEvidence(root, commit, { inventories }).then(() => undefined)).rejects.toThrow()
})
test('rejects an extra artifact', async () => {
  const root = await fixture()
  await fs.cp(path.join(root, 'quality'), path.join(root, 'duplicate'), { recursive: true })
  await expect(aggregateFoundationEvidence(root, commit, { inventories }).then(() => undefined)).rejects.toThrow()
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
  await expect(aggregateFoundationEvidence(root, commit, { inventories }).then(() => undefined)).rejects.toThrow()
})
test('merges four specimen shards into one complete audit', async () => {
  const root = await fixture()
  const result = await aggregateFoundationEvidence(root, commit, { inventories })
  expect(result.specimenAudit).toEqual({ configurations: 36, specimens: 36 * supportedComponentIds.length })
  expect(result.specimenAuditEvidence.runIds).toEqual(['github:1/1'])
  expect(result.groups.specimen).toHaveLength(4)
})
test.each([
  ['a missing shard', async (root: string) => { await fs.rm(path.join(root, 'foundation-specimen-shard-3'), { recursive: true }) }],
  ['a duplicated shard', async (root: string) => { await patch(root, 'foundation-specimen-shard-2', 'foundation-report.json', (r) => { r.shard.current = 1 }) }],
  ['shards of different totals', async (root: string) => { await patch(root, 'foundation-specimen-shard-4', 'foundation-report.json', (r) => { r.shard.total = 5 }) }],
  ['a shard audit from another commit', async (root: string) => { await patch(root, 'foundation-specimen-shard-1', 'specimen-audit.json', (r) => { r.sourceCommit = 'b'.repeat(40) }) }],
  ['a configuration no shard measured', async (root: string) => { await patch(root, 'foundation-specimen-shard-1', 'specimen-audit.json', (r) => { r.configurations.pop() }) }],
  ['a configuration two shards measured', async (root: string) => { await patch(root, 'foundation-specimen-shard-1', 'specimen-audit.json', (r) => { r.configurations[1] = r.configurations[0] }) }],
  ['a failed shard audit', async (root: string) => { await patch(root, 'foundation-specimen-shard-2', 'specimen-audit.json', (r) => { r.failures = 1 }) }],
  ['a specimen spec no shard ran', async (root: string) => { await patch(root, 'foundation-specimen-shard-1', 'specimen-results.json', (r) => { r.suites[0].specs.pop(); r.stats.expected-- }) }],
  ['a skipped specimen spec', async (root: string) => { await patch(root, 'foundation-specimen-shard-1', 'specimen-results.json', (r) => { r.suites[0].specs[0].tests[0].results[0].status = 'skipped' }) }],
])('rejects specimen evidence with %s', async (_label, mutate) => {
  const root = await fixture()
  await mutate(root)
  await expect(aggregateFoundationEvidence(root, commit, { inventories }).then(() => undefined)).rejects.toThrow()
})
test('rejects passed reports without their measured evidence files', async () => {
  const root = await fixture()
  await fs.rm(path.join(root, 'consumers/recipe-measurements.json'))
  await expect(aggregateFoundationEvidence(root, commit, { inventories }).then(() => undefined)).rejects.toThrow()
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
  await expect(aggregateFoundationEvidence(root, commit, { inventories }).then(() => undefined)).rejects.toThrow()
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
  await expect(aggregateFoundationEvidence(root, commit, { inventories }).then(() => undefined)).rejects.toThrow()
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
  const result = spawnSync(process.execPath, [path.resolve('scripts/check-foundation.mjs'), '--group', group], { cwd: root, env: { ...env, npm_execpath: runner }, encoding: 'utf8', windowsHide: true })
  expect(result.status).toBe(1) // Successful commands without produced evidence must fail.
  const calls = (await fs.readFile(path.join(root, 'calls.jsonl'), 'utf8')).trim().split('\n').map(line => JSON.parse(line))
  expect(calls).toEqual(stages[group as keyof typeof stages].map(name => ['run', name]))
  await expect(fs.stat(path.join(root, '.artifacts', evidence))).rejects.toThrow()
  const report = JSON.parse(await fs.readFile(path.join(root, '.artifacts/foundation-report.json'), 'utf8'))
  expect(report).toMatchObject({ group, status: 'failed', exitCode: 1 })
})

test.each(['checkbox', 'switch', 'tabs', 'tooltip'])('rejects omitted %s browser cases even when reporter totals are adjusted', (id) => {
  const result = browserResults()
  result.suites = result.suites.filter(suite => suite.file !== id + '.spec.ts')
  result.stats.expected -= 40
  expect(() => validateBrowserResults(result)).toThrow('Incomplete, failed, skipped or flaky browser matrix')
})
test('bounds liquid glass contrast advisories by the recorded baseline', () => {
  const audit = specimenAudit()
  const glass = audit.configurations.find((row: any) => row.family === 'liquid-glass' && !row.transparency)!
  glass.contrastAdvisoryFindings = (advisoryBaseline['liquid-glass/radix/light'] ?? 0) + 1
  expect(() => validateSpecimenAudit(audit)).toThrow('Contrast advisory findings above baseline')
  const reduced = specimenAudit()
  reduced.configurations.find((row: any) => row.transparency === 'reduced')!.contrastAdvisoryFindings = 1
  expect(() => validateSpecimenAudit(reduced)).toThrow('Contrast advisory findings above baseline')
  const missing = specimenAudit()
  delete (missing.configurations[0] as any).contrastAdvisoryFindings
  expect(() => validateSpecimenAudit(missing)).toThrow('Incomplete specimen audit')
})
test('requires the reduced transparency glass configurations', () => {
  const audit = specimenAudit()
  audit.configurations = audit.configurations.filter((row: any) => !row.transparency)
  expect(() => validateSpecimenAudit(audit)).toThrow('Incomplete specimen audit')
})
