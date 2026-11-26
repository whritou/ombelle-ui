import fs from 'node:fs/promises'
import { readFileSync } from 'node:fs'
import { supportedComponentIds } from '../packages/contracts/src/component-ids.ts'
import { supportedBlockIds } from '../packages/contracts/src/block-ids.ts'
import path from 'node:path'
import os from 'node:os'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { fileURLToPath } from 'node:url'
import { finalizeConsumerEvidence, validateMinimalistMeasurements } from './consumer-evidence.ts'
import { consumerCases } from './consumer-matrix.ts'
import { finalizeRecipeEvidence } from './recipe-evidence.ts'
import { finalizeComponentPresetEvidence } from './component-preset-evidence.ts'

// Unit and integration tests import apps/www/src/generated and apps/preview/src/generated,
// which generate:preview writes, so it runs before them (as in ci.yml).
// The specimen audit is its own group: it needs only the generated preview, and in CI it is
// sharded across jobs (OMBELLE_SPECIMEN_SHARD=1/4), each shard a specimen group of its own.
export const foundationSteps = {
  quality: ['build:packages', 'generate:preview', 'test:unit', 'test:integration', 'typecheck', 'audit:workspace'],
  consumers: ['build:packages', 'generate:preview', 'prepare:consumers', 'build:preview', 'build:consumers', 'test:e2e'],
  specimen: ['build:packages', 'generate:preview', 'test:specimen-audit'],
  all: ['build:packages', 'generate:preview', 'test:unit', 'test:integration', 'prepare:consumers', 'typecheck', 'build:preview', 'build:consumers', 'test:specimen-audit', 'test:e2e', 'audit:workspace'],
}
export const evidenceFiles = {
  quality: ['unit-results.json', 'integration-results.json'],
  consumers: ['browser-results.json', 'browser-version.json', 'consumer-matrix.json', 'minimalist-measurements.json', 'recipe-measurements.json', 'recipe-consumers.json', 'component-preset-measurements.json', 'component-preset-consumers.json', 'npm-version.json', 'yarn-versions.json', 'yarn-matrix.json', 'bun-version.json', 'bun-matrix.json'],
  specimen: ['specimen-audit.json', 'specimen-results.json'],
}
export { parseShard } from './specimen-shard.mjs'
export { parseConsumerShard } from './consumer-shards.mjs'
// Consumer evidence that browser specs write: in a sharded run exactly one shard holds each file.
// Every other consumer file comes from consumer preparation, which every shard repeats.
export const consumerTestEvidence = ['browser-version.json', 'minimalist-measurements.json', 'recipe-measurements.json', 'component-preset-measurements.json']
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
      // Listing every unit file takes close to 200 s on CI runners and grows with the catalog.
      cwd: repo, windowsHide: true, timeout: 360000, maxBuffer: 8 * 1024 * 1024,
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

/**
 * Validate a vitest JSON report against the test identities collected from this checkout. Tests of the
 * validator itself pass a small `inventory` ({ files, tests: [{ file, name }] }) instead of listing the
 * whole suite (TST-12); the gate always collects the real one.
 */
export async function validateTestResults(result, kind, inventory) {
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
  if (inventory) for (const file of inventory.files) expected.set(file, new Map())
  else for (const prefix of prefixes) {
    const pattern = prefix + (kind === 'unit' ? '**/*.test.{ts,tsx}' : '**/*.test.ts')
    for await (const file of fs.glob(pattern, { cwd: repo })) expected.set(file.replaceAll('\\', '/'), new Map())
  }
  if (!expected.size || !Array.isArray(result.testResults)) fail('Missing ' + kind + ' test files')
  for (const test of inventory?.tests ?? await expectedTestInventory(kind)) {
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

// Twenty-one evidence-owning specs (1185 cases), without importing Playwright configuration
// (which needs this runner's consumer roots). Update this contract with added specs.
const browserSpecCounts = { 'badge.spec.ts': 70, 'card.spec.ts': 70, 'checkbox.spec.ts': 70, 'component-presets.spec.ts': 100, 'editor.spec.ts': 19, 'catalog-editors.spec.ts': 24, 'forms.spec.ts': 70, 'keyboard.spec.ts': 70, 'minimalist-states.spec.ts': 12, 'parity.spec.ts': 14, 'preset-editor.spec.ts': 65, 'recipes.spec.ts': 100, 'snapshot-presets.spec.ts': 38, 'recipe-snapshots.spec.ts': 10, 'switch.spec.ts': 70, 'tabs.spec.ts': 70, 'tooltip.spec.ts': 70, 'liquid-glass.spec.ts': 40, 'edition-parity.spec.ts': 196, 'glass-backdrops.spec.ts': 3, 'editor-commands.spec.ts': 4 }
// Every spec playwright.specimen-audit.config.ts runs, by file (467 cases; the audit is two tests per configuration). Shards split these; the aggregate
// requires the shards together to have run each case exactly once. Update with added specs.
export const specimenSpecCounts = { 'specimen-audit.spec.ts': 73, 'specimen-audit-checks.spec.ts': 23, 'display-components.spec.ts': 4, 'form-controls.spec.ts': 16, 'primitives-075.spec.ts': 20, 'editor-inputs-075.spec.ts': 28, 'code-block-075.spec.ts': 22, 'overlays-search.spec.ts': 18, 'calendar.spec.ts': 16, 'variants-basics.spec.ts': 13, 'variants-more.spec.ts': 44, 'variants-075.spec.ts': 34, 'components-076.spec.ts': 38, 'app-shell-09.spec.ts': 64, 'variants-076.spec.ts': 51, 'glass-scenes.spec.ts': 3 }
// A known failure may stay in the suite only as test.fixme(true, 'FINDING-ID: why'), so the run records
// it with its finding instead of losing it. Any other skip fails the gate.
const documentedFixme = test => test.expectedStatus === 'skipped' && test.status === 'skipped'
  && test.annotations?.some(annotation => annotation.type === 'fixme' && /^[A-Z]{2,6}-\d+:\s*\S/.test(annotation.description ?? ''))
/** Each documented fixme by title and finding, so the evidence lists what the gate still lets through. */
export const knownFailures = specs => specs.filter(spec => spec.fixme).map(spec => ({ title: spec.title, finding: spec.fixme }))
/** Every spec in a Playwright JSON report, each required to have passed once with no retry or skip. */
function passingSpecs(result, label) {
  const specs = []
  let fixme = 0
  function visit(suites) {
    if (!Array.isArray(suites)) fail('Missing ' + label + ' suites')
    for (const suite of suites) {
      for (const spec of suite.specs ?? []) {
        const file = spec.file?.replaceAll('\\', '/').split('/').at(-1)
        if (!file || !spec.id || spec.ok !== true || spec.tests?.length !== 1) fail('Missing or duplicate ' + label + ' spec')
        const test = spec.tests[0], outcome = test.results?.[0]
        if (documentedFixme(test) && spec.ok === true) { fixme++; specs.push({ file, id: spec.id, title: file + '/' + spec.title, fixme: test.annotations.find(a => a.type === 'fixme').description }); continue }
        if (test.status !== 'expected' || test.expectedStatus !== 'passed' || test.results?.length !== 1 || outcome?.status !== 'passed' || outcome.retry !== 0 || outcome.errors?.length) fail('Failed, skipped or flaky ' + label + ' test')
        specs.push({ file, id: spec.id, title: file + '/' + spec.title })
      }
      visit(suite.suites ?? [])
    }
  }
  visit(result?.suites)
  if (result.errors?.length || result.stats?.expected !== specs.length - fixme || result.stats.unexpected !== 0 || result.stats.skipped !== fixme || result.stats.flaky !== 0) fail('Incomplete, failed, skipped or flaky ' + label + ' matrix')
  return specs
}
/** Each pinned file ran exactly its count of distinct cases, and nothing else ran. */
function requireSpecCounts(specs, counts, label) {
  // Ids, not titles: Playwright ids cover the describe path, and specimen specs repeat a title in
  // different describe blocks (calendar.spec.ts, 24 November). A case run twice still repeats its id.
  const remaining = { ...counts }, ids = new Set()
  for (const spec of specs) {
    if (!(remaining[spec.file] > 0) || ids.has(spec.id)) fail('Missing or duplicate ' + label + ' spec')
    remaining[spec.file]--; ids.add(spec.id)
  }
  if (Object.values(remaining).some(n => n !== 0)) fail('Incomplete, failed, skipped or flaky ' + label + ' matrix')
}
export function validateBrowserResults(result) {
  const specs = passingSpecs(result, 'browser')
  requireSpecCounts(specs, browserSpecCounts, 'browser')
  return { ...result.stats, knownFailures: knownFailures(specs) }
}

const auditFamilies = ['flat', 'minimalist', 'neo-brutalism', 'ombelle', 'papier', 'organic', 'retro-futurism', 'liquid-glass']
const auditChecks = ['overflow', 'clipping', 'spacing', 'focus-visible', 'target-size', 'forced-colors', 'axe']
// Every family in both editions and modes, then liquid glass again with reduced transparency.
export const auditConfigurations = [
  ...auditFamilies.flatMap(family => ['radix', 'base'].flatMap(edition => ['light', 'dark'].map(mode => family + '/' + edition + '/' + mode))),
  ...['radix', 'base'].flatMap(edition => ['light', 'dark'].map(mode => 'liquid-glass/' + edition + '/' + mode + '/reduced-transparency')),
]
const auditKey = row => row.family + '/' + row.edition + '/' + row.mode + (row.transparency === 'reduced' ? '/reduced-transparency' : row.transparency === undefined ? '' : '/' + row.transparency)
// Contrast findings a family's accessibility caveat makes advisory (liquid glass on translucent
// surfaces) may not grow unnoticed: each configuration may record at most its baseline (TST-07).
// Lower a number when a fix removes findings; raise one only with the reason in the commit.
export const advisoryBaseline = JSON.parse(readFileSync(new URL('./specimen-advisory-baseline.json', import.meta.url), 'utf8'))
const incompleteAudit = () => fail('Incomplete specimen audit')
/** Each measured configuration: every specimen, every check measured. */
function validateAuditRows(rows) {
  const seen = rows.map(auditKey)
  if (!rows.length || new Set(seen).size !== seen.length || seen.some(key => !auditConfigurations.includes(key))) incompleteAudit()
  for (const row of rows) {
    // Components and blocks are counted apart: a block is page-sized and measured at two widths.
    if (row.specimens !== supportedComponentIds.length || row.blocks !== supportedBlockIds.length) incompleteAudit()
    const advisory = row.contrastAdvisoryFindings
    if (!Number.isInteger(advisory) || advisory < 0) incompleteAudit()
    if (advisory > (advisoryBaseline[auditKey(row)] ?? 0)) fail('Contrast advisory findings above baseline: ' + auditKey(row) + ' ' + advisory + ' > ' + (advisoryBaseline[auditKey(row)] ?? 0))
    for (const check of auditChecks) {
      const count = row.checks?.[check]
      if (!Number.isInteger(count) || (check === 'forced-colors' && row.mode === 'dark' ? count !== 0 : count < 1)) incompleteAudit()
    }
  }
}
function validateAuditHeader(result) {
  if (result?.schemaVersion !== 1 || result.browser?.engine !== 'chromium' || !result.browser.version || result.failures !== 0 || !Array.isArray(result.configurations)) incompleteAudit()
}
/** One shard's audit: the configurations it ran are complete and clean; coverage is checked once merged. */
export function validateSpecimenAuditPart(result) {
  validateAuditHeader(result)
  validateAuditRows(result.configurations)
  return { configurations: result.configurations.length }
}
/** The specimen audit must cover every family, edition and mode, measure every check, and record no failure. */
export function validateSpecimenAudit(result) {
  validateAuditHeader(result)
  const rows = result.configurations
  validateAuditRows(rows)
  if (rows.length !== auditConfigurations.length) incompleteAudit()
  return { configurations: rows.length, specimens: rows.reduce((sum, row) => sum + row.specimens, 0) }
}
/** Merge shard audits measured on one commit with one browser into the gate's single audit. */
export function mergeSpecimenAudits(parts) {
  if (!parts.length) incompleteAudit()
  const [first] = parts
  for (const part of parts) {
    validateAuditHeader(part)
    if (part.browser.version !== first.browser.version || part.browser.channel !== first.browser.channel || part.sourceCommit !== first.sourceCommit) fail('Specimen audit shards measured different sources or browsers')
  }
  const configurations = parts.flatMap(part => part.configurations)
    .sort((a, b) => auditConfigurations.indexOf(auditKey(a)) - auditConfigurations.indexOf(auditKey(b)))
  const { shard: _shard, runId: _runId, ...header } = first
  return { ...header, runIds: [...new Set(parts.map(part => part.runId))], configurations, failures: parts.reduce((sum, part) => sum + part.failures, 0) }
}
export async function validateGroupEvidence(directory, group, options = {}) {
  if (group === 'quality') {
    return { counts: {
      unit: await validateTestResults(await read(directory, 'unit-results.json'), 'unit', options.inventories?.unit),
      integration: await validateTestResults(await read(directory, 'integration-results.json'), 'integration', options.inventories?.integration),
    } }
  }
  if (group === 'specimen') {
    // A shard is checked for what it ran; the aggregate checks that the shards together ran everything.
    const audit = await read(directory, 'specimen-audit.json')
    const specs = passingSpecs(await read(directory, 'specimen-results.json'), 'specimen')
    if (audit.shard) {
      validateSpecimenAuditPart(audit)
      return { specimenShard: { audit, specs } }
    }
    requireSpecCounts(specs, specimenSpecCounts, 'specimen')
    return { specimenAudit: validateSpecimenAudit(audit), counts: { specimen: { expected: specs.length, knownFailures: knownFailures(specs) } } }
  }
  if (group !== 'consumers') fail('Unknown foundation group')
  // A shard is checked for what it ran; the aggregate merges the shards and checks everything.
  if (options.shard) return { consumersShard: { specs: passingSpecs(await read(directory, 'browser-results.json'), 'browser').length } }
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
export function combineEvidence(...groups) {
  return Object.assign({}, ...groups, { counts: Object.assign({}, ...groups.map(group => group.counts)) })
}
/** A group is one unsharded report, or shards 1..total of one total, each once. */
function requireShards(shards, label) {
  if (shards.length === 1 && !shards[0].report.shard) return
  const total = shards[0]?.report.shard?.total
  if (!Number.isInteger(total) || shards.length !== total || shards.some(({ report }) => report.shard?.total !== total)
    || new Set(shards.map(({ report }) => report.shard.current)).size !== total) fail('Missing or duplicate ' + label + ' shard')
}
/**
 * Merge consumer shard evidence into one directory the unsharded validation reads: the browser
 * reports joined (each spec once, checked against the pinned counts), each test-written file from
 * the one shard whose specs wrote it, and the preparation files every shard produced from shard 1.
 */
export async function mergeConsumerShards(roots, output) {
  const reports = await Promise.all(roots.map(root => read(root, 'browser-results.json')))
  const sum = key => reports.reduce((total, report) => total + (report.stats?.[key] ?? 0), 0)
  const browser = {
    ...reports[0], suites: reports.flatMap(report => report.suites ?? []), errors: reports.flatMap(report => report.errors ?? []),
    stats: { ...reports[0].stats, expected: sum('expected'), unexpected: sum('unexpected'), skipped: sum('skipped'), flaky: sum('flaky'), duration: Math.max(...reports.map(report => report.stats?.duration ?? 0)) },
  }
  await fs.writeFile(path.join(output, 'browser-results.json'), JSON.stringify(browser))
  const exists = file => fs.access(file).then(() => true, () => false)
  for (const file of evidenceFiles.consumers.filter(name => name !== 'browser-results.json')) {
    const holders = []
    for (const root of roots) if (await exists(path.join(root, file))) holders.push(root)
    if (consumerTestEvidence.includes(file) ? holders.length !== 1 : holders.length !== roots.length) fail('Missing or duplicate consumer shard evidence: ' + file)
    await fs.copyFile(path.join(holders[0], file), path.join(output, file))
  }
  return output
}
export async function aggregateFoundationEvidence(directory, sourceCommit, options = {}) {
  if (!/^[a-f0-9]{40,64}$/.test(sourceCommit)) fail('Missing actual source commit')
  const entries = await fs.readdir(directory, { withFileTypes: true })
  if (entries.some(entry => !entry.isDirectory())) fail('Expected only foundation group artifacts')
  const groups = new Map(), shards = [], consumerShards = []
  // Check every prerequisite before validating the potentially large content.
  for (const entry of entries) {
    const root = path.join(directory, entry.name)
    const report = await read(root, 'foundation-report.json')
    if (!['quality', 'consumers', 'specimen'].includes(report.group) || groups.has(report.group)) fail('Missing or duplicate foundation group')
    if (report.sourceCommit !== sourceCommit) fail('Foundation source commit mismatch')
    if (report.status !== 'passed' || report.exitCode !== 0) fail('Failed foundation group: ' + report.group)
    const expected = foundationSteps[report.group]
    if (!Array.isArray(report.steps) || report.steps.length !== expected.length || report.steps.some((step, index) => step.name !== expected[index] || step.status !== 'passed' || step.exitCode !== 0)) fail('Incomplete or failed foundation stages: ' + report.group)
    if (report.group === 'specimen') shards.push({ root, report })
    else if (report.group === 'consumers') consumerShards.push({ root, report })
    else groups.set(report.group, { root, report })
  }
  if (!groups.has('quality') || !consumerShards.length || !shards.length) fail('Missing or duplicate foundation group')
  requireShards(shards, 'specimen')
  requireShards(consumerShards, 'consumers')
  const quality = await validateGroupEvidence(groups.get('quality').root, 'quality', options)
  let consumers
  if (consumerShards.length === 1) consumers = await validateGroupEvidence(consumerShards[0].root, 'consumers')
  else {
    const merged = await fs.mkdtemp(path.join(os.tmpdir(), 'ombelle-consumer-shards-'))
    try {
      await mergeConsumerShards(consumerShards.sort((a, b) => a.report.shard.current - b.report.shard.current).map(shard => shard.root), merged)
      consumers = await validateGroupEvidence(merged, 'consumers')
    } finally {
      await fs.rm(merged, { recursive: true, force: true })
    }
  }
  const parts = []
  for (const { root } of shards) parts.push(await validateGroupEvidence(root, 'specimen'))
  let specimen
  if (parts.length === 1 && parts[0].specimenAudit) specimen = parts[0]
  else {
    const audits = parts.map(part => part.specimenShard.audit)
    if (audits.some(audit => audit.sourceCommit !== sourceCommit)) fail('Foundation source commit mismatch')
    const specs = parts.flatMap(part => part.specimenShard.specs)
    requireSpecCounts(specs, specimenSpecCounts, 'specimen')
    const merged = mergeSpecimenAudits(audits)
    specimen = { specimenAudit: validateSpecimenAudit(merged), specimenAuditEvidence: merged, counts: { specimen: { expected: specs.length, knownFailures: knownFailures(specs) } } }
  }
  const reports = { ...Object.fromEntries([...groups].map(([group, value]) => [group, value.report])), consumers: consumerShards.length === 1 ? consumerShards[0].report : consumerShards.map(shard => shard.report), specimen: shards.map(shard => shard.report) }
  return { ...combineEvidence(quality, consumers, specimen), sourceCommit, status: 'passed', exitCode: 0, groups: reports }
}
