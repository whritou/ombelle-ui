import fs from 'node:fs/promises'
import { spawnSync } from 'node:child_process'
import {
  runFoundationStages,
  persistFoundationReport,
} from './foundation-runner.mjs'
import {
  finalizeConsumerEvidence,
  validateMinimalistMeasurements,
} from './consumer-evidence.ts'
import { consumerCases } from './consumer-matrix.ts'
import { finalizeRecipeEvidence } from './recipe-evidence.ts'
import { finalizeComponentPresetEvidence } from './component-preset-evidence.ts'
const steps = [
  'build:packages',
  'test:unit',
  'test:integration',
  'generate:preview',
  'prepare:consumers',
  'typecheck',
  'build:preview',
  'build:consumers',
  'test:e2e',
]
const script = process.env.npm_execpath
if (!script) throw new Error('Run this gate through pnpm check:foundation')
const reportPath = '.artifacts/foundation-report.json'
const controller = new AbortController()
const onInterrupt = () => controller.abort('SIGINT')
const onTerminate = () => controller.abort('SIGTERM')
process.on('SIGINT', onInterrupt)
process.on('SIGTERM', onTerminate)
let report = {
  sourceCommit: spawnSync('git', ['rev-parse', 'HEAD'], {
    encoding: 'utf8',
    windowsHide: true,
  }).stdout.trim(),
  workingTreeDirty: spawnSync('git', ['status', '--porcelain'], {
    encoding: 'utf8',
    windowsHide: true,
  }).stdout.trim().length > 0,
  platform: process.platform,
  node: process.version,
}
try {
  const env = { ...process.env, NEXT_TELEMETRY_DISABLED: '1' }
  delete env.NO_COLOR
  const result = await runFoundationStages({
    stages: steps.map((name) => ({
      name, command: process.execPath, args: [script, 'run', name], env,
    })),
    reportPath,
    logsDirectory: '.artifacts/logs',
    metadata: report,
    signal: controller.signal,
  })
  report = result.report
  if (result.exitCode !== 0) process.exitCode = result.exitCode
  else await validateEvidence()
} catch (error) {
  const canceled = controller.signal.aborted
  process.exitCode = canceled ? controller.signal.reason === 'SIGINT' ? 130 : 143 : 1
  persistFoundationReport(reportPath, {
    ...report,
    status: canceled ? 'canceled' : 'failed',
    exitCode: process.exitCode,
    completedAt: new Date().toISOString(),
    durationMs: report.startedAt ? Date.now() - Date.parse(report.startedAt) : 0,
    error: String(error),
  })
  console.error(error)
} finally {
  process.removeListener('SIGINT', onInterrupt)
  process.removeListener('SIGTERM', onTerminate)
}

async function validateEvidence() {
  const unit = JSON.parse(
      await fs.readFile('.artifacts/unit-results.json', 'utf8'),
    ),
    integration = JSON.parse(
      await fs.readFile('.artifacts/integration-results.json', 'utf8'),
    ),
    browser = JSON.parse(
      await fs.readFile('.artifacts/browser-results.json', 'utf8'),
    ),
    browserVersion = JSON.parse(
      await fs.readFile('.artifacts/browser-version.json', 'utf8'),
    )
  const counts = {
    unit: {
      passed: unit.numPassedTests,
      failed: unit.numFailedTests,
      skipped: unit.numPendingTests,
    },
    integration: {
      passed: integration.numPassedTests,
      failed: integration.numFailedTests,
      skipped: integration.numPendingTests,
    },
    browser: browser.stats,
  }
  let consumerMatrix,
    minimalistMeasurements,
    recipeEvidence,
    componentPresetEvidence
  consumerMatrix = finalizeConsumerEvidence(
    consumerCases(),
    JSON.parse(await fs.readFile('.artifacts/consumer-matrix.json', 'utf8')),
  )
  minimalistMeasurements = validateMinimalistMeasurements(
    JSON.parse(
      await fs.readFile('.artifacts/minimalist-measurements.json', 'utf8'),
    ),
  )
  recipeEvidence = await finalizeRecipeEvidence(
    {
      measurements: JSON.parse(
        await fs.readFile('.artifacts/recipe-measurements.json', 'utf8'),
      ),
      consumers: JSON.parse(
        await fs.readFile('.artifacts/recipe-consumers.json', 'utf8'),
      ),
    },
    consumerMatrix,
  )
  componentPresetEvidence = await finalizeComponentPresetEvidence(
    {
      measurements: JSON.parse(
        await fs.readFile(
          '.artifacts/component-preset-measurements.json',
          'utf8',
        ),
      ),
      consumers: JSON.parse(
        await fs.readFile('.artifacts/component-preset-consumers.json', 'utf8'),
      ),
    },
    consumerMatrix,
  )
  if (
    counts.unit.failed ||
    counts.unit.skipped ||
    counts.integration.failed ||
    counts.integration.skipped ||
    counts.browser.unexpected ||
    counts.browser.skipped ||
    counts.browser.flaky
  )
    throw new Error('Foundation contains failed, skipped or flaky checks')
  const finalizedReport = {
    ...report,
    status: 'passed',
    exitCode: 0,
    counts,
    browserVersion,
    consumerCases: consumerCases(),
    consumerMatrix,
    minimalistMeasurements,
    recipeEvidence,
    componentPresetEvidence,
    npmVersion: JSON.parse(
      await fs.readFile('.artifacts/npm-version.json', 'utf8'),
    ),
    yarnVersions: JSON.parse(
      await fs.readFile('.artifacts/yarn-versions.json', 'utf8'),
    ),
    yarnMatrix: JSON.parse(
      await fs.readFile('.artifacts/yarn-matrix.json', 'utf8'),
    ),
    bunVersion: JSON.parse(
      await fs.readFile('.artifacts/bun-version.json', 'utf8'),
    ),
    bunMatrix: JSON.parse(
      await fs.readFile('.artifacts/bun-matrix.json', 'utf8'),
    ),
  }
  if (controller.signal.aborted) throw new Error('Foundation canceled during evidence validation')
  finalizedReport.completedAt = new Date().toISOString()
  finalizedReport.durationMs = Date.now() - Date.parse(report.startedAt)
  persistFoundationReport(reportPath, finalizedReport)
  console.log(
    'Foundation passed: ' +
      counts.unit.passed +
      ' unit, ' +
      counts.integration.passed +
      ' integration, ' +
      counts.browser.expected +
      ' browser tests.',
  )
}
