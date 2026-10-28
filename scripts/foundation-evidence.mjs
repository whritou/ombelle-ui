import fs from 'node:fs/promises'
import path from 'node:path'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { fileURLToPath } from 'node:url'
import { finalizeConsumerEvidence, validateMinimalistMeasurements } from './consumer-evidence.ts'
import { consumerCases } from './consumer-matrix.ts'
import { finalizeRecipeEvidence } from './recipe-evidence.ts'
import { finalizeComponentPresetEvidence } from './component-preset-evidence.ts'

export const foundationSteps = {
  quality: ['build:packages', 'test:unit', 'test:integration', 'generate:preview', 'typecheck', 'audit:workspace'],
  consumers: ['build:packages', 'generate:preview', 'prepare:consumers', 'build:preview', 'build:consumers', 'test:e2e'],
  all: ['build:packages', 'test:unit', 'test:integration', 'generate:preview', 'prepare:consumers', 'typecheck', 'build:preview', 'build:consumers', 'test:e2e', 'audit:workspace'],
}
export const evidenceFiles = {
  quality: ['unit-results.json', 'integration-results.json'],
  consumers: ['browser-results.json', 'browser-version.json', 'consumer-matrix.json', 'minimalist-measurements.json', 'recipe-measurements.json', 'recipe-consumers.json', 'component-preset-measurements.json', 'component-preset-consumers.json', 'npm-version.json', 'yarn-versions.json', 'yarn-matrix.json', 'bun-version.json', 'bun-matrix.json'],
}
const repo = fileURLToPath(new URL('../', import.meta.url))
const read = async (directory, file) => JSON.parse(await fs.readFile(path.join(directory, file), 'utf8'))
const fail = (message) => { throw new Error(message) }

const execute = promisify(execFile)
const testInventories = new Map()

async function expectedTestInventory(kind) {
  if (!['unit', 'integration'].includes(kind)) fail('Unknown foundation test selection')
  if (!testInventories.has(kind)) {
    const selection = kind === 'unit'
      ? ['packages', 'apps/www/src']
      : ['--config', 'vitest.integration.config.ts', 'tests/integration']
    const cli = path.join(path.dirname(fileURLToPath(import.meta.resolve('vitest/package.json'))), 'vitest.mjs')
    // Collect current-checkout definitions using the same config/selection as the
    // measured run. No test bodies execute, and downloaded reports cannot define
    // their own expected identities or reduce their expected assertion counts.
    const inventory = execute(process.execPath, [cli, 'list', ...selection, '--staticParse=false', '--json'], {
      cwd: repo, windowsHide: true, timeout: 180000, maxBuffer: 8 * 1024 * 1024,
    }).then(({ stdout }) => {
      const rows = JSON.parse(stdout)
      if (!Array.isArray(rows) || !rows.length) fail('Empty expected ' + kind + ' assertion inventory')
      return rows
    }).catch(error => {
      testInventories.delete(kind)
      throw error
    })
    testInventories.set(kind, inventory)
  }
  return testInventories.get(kind)
}

export async function validateTestResults(result, kind) {
  const prefixes = kind === 'unit' ? ['packages/', 'apps/www/src/'] : ['tests/integration/']
  const relativeFile = name => {
    const normalized = String(name).replaceAll('\\', '/')
    for (const prefix of prefixes) {
      if (normalized.startsWith(prefix)) return normalized
      const index = normalized.lastIndexOf('/' + prefix)
      if (index !== -1) return normalized.slice(index + 1)
    }
    return normalized
  }
  const expected = new Map()
  for (const prefix of prefixes) {
    const pattern = prefix + (kind === 'unit' ? '**/*.test.{ts,tsx}' : '**/*.test.ts')
    for await (const file of fs.glob(pattern, { cwd: repo })) expected.set(file.replaceAll('\\', '/'), new Map())
  }
  if (!expected.size || !Array.isArray(result.testResults)) fail('Missing ' + kind + ' test files')
  for (const test of await expectedTestInventory(kind)) {
    const names = expected.get(relativeFile(test.file))
    if (!names || typeof test.name !== 'string' || !test.name) fail('Unexpected collected ' + kind + ' assertion')
    names.set(test.name, (names.get(test.name) ?? 0) + 1)
  }
  if ([...expected.values()].some(names => !names.size)) fail('Missing collected ' + kind + ' test file')
  let assertions = 0
  for (const suite of result.testResults) {
    const relative = relativeFile(suite.name)
    const names = expected.get(relative)
    if (!names || suite.status !== 'passed' || !suite.assertionResults?.length) fail('Missing, duplicate or failed ' + kind + ' suite: ' + suite.name)
    expected.delete(relative)
    for (const assertion of suite.assertionResults) {
      if (assertion.status !== 'passed' || assertion.failureMessages?.length || assertion.meta?.retryCount > 0) fail('Failed, skipped or retried ' + kind + ' assertion')
      if (!Array.isArray(assertion.ancestorTitles) || assertion.ancestorTitles.some(title => typeof title !== 'string') || typeof assertion.title !== 'string') fail('Missing assertion identity: ' + relative)
      const titles = [...assertion.ancestorTitles, assertion.title]
      const identity = titles.join(' > ')
      const remaining = names.get(identity) ?? 0
      if (remaining === 0 || assertion.fullName !== titles.join(' ')) fail('Duplicate or unexpected assertion: ' + relative + ' > ' + identity)
      // Parameterized cases may intentionally share a rendered title. Require
      // exactly the occurrence count independently collected from source.
      names.set(identity, remaining - 1)
      assertions++
    }
    if ([...names.values()].some(count => count !== 0)) fail('Incomplete assertion evidence: ' + relative)
  }
  if (expected.size || result.success !== true || !assertions || result.numTotalTests !== assertions || result.numPassedTests !== assertions || result.numFailedTests !== 0 || result.numPendingTests !== 0 || result.numTodoTests !== 0 || result.numFailedTestSuites !== 0 || result.numPendingTestSuites !== 0) fail('Incomplete or failed ' + kind + ' results')
  return { passed: assertions, failed: 0, skipped: 0 }
}

// Fourteen evidence-owning specs, without importing Playwright configuration
// (which needs this runner's consumer roots). Update this contract with added specs.
const browserSpecCounts = { 'badge.spec.ts': 30, 'card.spec.ts': 30, 'checkbox.spec.ts': 30, 'component-presets.spec.ts': 20, 'editor.spec.ts': 9, 'forms.spec.ts': 30, 'keyboard.spec.ts': 30, 'minimalist-states.spec.ts': 12, 'parity.spec.ts': 6, 'preset-editor.spec.ts': 26, 'recipes.spec.ts': 20, 'snapshot-presets.spec.ts': 22, 'switch.spec.ts': 30, 'tabs.spec.ts': 30, 'tooltip.spec.ts': 30 }
export function validateBrowserResults(result) {
  const remaining = { ...browserSpecCounts }, ids = new Set(), titles = new Set()
  let count = 0
  function visit(suites) {
    if (!Array.isArray(suites)) fail('Missing browser suites')
    for (const suite of suites) {
      for (const spec of suite.specs ?? []) {
        const file = spec.file?.replaceAll('\\', '/').split('/').at(-1)
        const title = file + '/' + spec.title
        if (!(remaining[file] > 0) || !spec.id || ids.has(spec.id) || titles.has(title) || spec.ok !== true || spec.tests?.length !== 1) fail('Missing or duplicate browser spec')
        remaining[file]--; ids.add(spec.id); titles.add(title); count++
        const test = spec.tests[0], outcome = test.results?.[0]
        if (test.status !== 'expected' || test.expectedStatus !== 'passed' || test.results?.length !== 1 || outcome?.status !== 'passed' || outcome.retry !== 0 || outcome.errors?.length) fail('Failed, skipped or flaky browser test')
      }
      visit(suite.suites ?? [])
    }
  }
  visit(result.suites)
  if (Object.values(remaining).some(n => n !== 0) || result.errors?.length || result.stats?.expected !== count || result.stats.unexpected !== 0 || result.stats.skipped !== 0 || result.stats.flaky !== 0) fail('Incomplete, failed, skipped or flaky browser matrix')
  return result.stats
}

export async function validateGroupEvidence(directory, group) {
  if (group === 'quality') {
    return { counts: {
      unit: await validateTestResults(await read(directory, 'unit-results.json'), 'unit'),
      integration: await validateTestResults(await read(directory, 'integration-results.json'), 'integration'),
    } }
  }
  if (group !== 'consumers') fail('Unknown foundation group')
  const browser = validateBrowserResults(await read(directory, 'browser-results.json'))
  const consumerMatrix = finalizeConsumerEvidence(consumerCases(), await read(directory, 'consumer-matrix.json'))
  const minimalistMeasurements = validateMinimalistMeasurements(await read(directory, 'minimalist-measurements.json'))
  const recipeEvidence = await finalizeRecipeEvidence({ measurements: await read(directory, 'recipe-measurements.json'), consumers: await read(directory, 'recipe-consumers.json') }, consumerMatrix)
  const componentPresetEvidence = await finalizeComponentPresetEvidence({ measurements: await read(directory, 'component-preset-measurements.json'), consumers: await read(directory, 'component-preset-consumers.json') }, consumerMatrix)
  const browserVersion = await read(directory, 'browser-version.json')
  if (browserVersion.engine !== 'chromium' || !browserVersion.version || !browserVersion.channel) fail('Missing measured browser identity')
  return {
    counts: { browser }, browserVersion, consumerCases: consumerCases(), consumerMatrix, minimalistMeasurements, recipeEvidence, componentPresetEvidence,
    npmVersion: await read(directory, 'npm-version.json'), yarnVersions: await read(directory, 'yarn-versions.json'), yarnMatrix: await read(directory, 'yarn-matrix.json'), bunVersion: await read(directory, 'bun-version.json'), bunMatrix: await read(directory, 'bun-matrix.json'),
  }
}
export function combineEvidence(quality, consumers) {
  return { ...quality, ...consumers, counts: { ...quality.counts, ...consumers.counts } }
}
export async function aggregateFoundationEvidence(directory, sourceCommit) {
  if (!/^[a-f0-9]{40,64}$/.test(sourceCommit)) fail('Missing actual source commit')
  const entries = await fs.readdir(directory, { withFileTypes: true })
  if (entries.length !== 2 || entries.some(entry => !entry.isDirectory())) fail('Expected exactly two foundation group artifacts')
  const groups = new Map()
  // Check every prerequisite before validating the potentially large content.
  for (const entry of entries) {
    const root = path.join(directory, entry.name)
    const report = await read(root, 'foundation-report.json')
    if (!['quality', 'consumers'].includes(report.group) || groups.has(report.group)) fail('Missing or duplicate foundation group')
    if (report.sourceCommit !== sourceCommit) fail('Foundation source commit mismatch')
    if (report.status !== 'passed' || report.exitCode !== 0) fail('Failed foundation group: ' + report.group)
    const expected = foundationSteps[report.group]
    if (!Array.isArray(report.steps) || report.steps.length !== expected.length || report.steps.some((step, index) => step.name !== expected[index] || step.status !== 'passed' || step.exitCode !== 0)) fail('Incomplete or failed foundation stages: ' + report.group)
    groups.set(report.group, { root, report })
  }
  const quality = await validateGroupEvidence(groups.get('quality').root, 'quality')
  const consumers = await validateGroupEvidence(groups.get('consumers').root, 'consumers')
  return { ...combineEvidence(quality, consumers), sourceCommit, status: 'passed', exitCode: 0, groups: Object.fromEntries([...groups].map(([group, value]) => [group, value.report])) }
}
