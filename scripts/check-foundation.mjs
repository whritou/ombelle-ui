import fs from 'node:fs/promises'
import { spawnSync } from 'node:child_process'
import { runFoundationStages, persistFoundationReport } from './foundation-runner.mjs'
import { foundationSteps, evidenceFiles, validateGroupEvidence, combineEvidence, aggregateFoundationEvidence } from './foundation-evidence.mjs'

const args = process.argv.slice(2)
const group = args.length === 0 ? 'all' : args[0] === '--group' && args.length === 2 && ['quality', 'consumers'].includes(args[1]) ? args[1] : args[0] === '--aggregate' && args.length === 2 ? 'aggregate' : undefined
if (!group) throw new Error('Use no arguments, --group quality|consumers, or --aggregate DIRECTORY')
const script = process.env.npm_execpath
if (!script) throw new Error('Run this gate through pnpm check:foundation')
const reportPath = '.artifacts/foundation-report.json'
const controller = new AbortController()
const onInterrupt = () => controller.abort('SIGINT')
const onTerminate = () => controller.abort('SIGTERM')
process.on('SIGINT', onInterrupt)
process.on('SIGTERM', onTerminate)
let report = {
  group,
  sourceCommit: spawnSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8', windowsHide: true }).stdout.trim(),
  workingTreeDirty: spawnSync('git', ['status', '--porcelain'], { encoding: 'utf8', windowsHide: true }).stdout.trim().length > 0,
  platform: process.platform,
  node: process.version,
}
try {
  const env = { ...process.env, NEXT_TELEMETRY_DISABLED: '1' }
  delete env.NO_COLOR
  // Only clear owned result files. Consumer roots remain owned by their preparation
  // lifecycle. A successful group must produce fresh evidence during this run.
  const files = group === 'all' ? [...evidenceFiles.quality, ...evidenceFiles.consumers] : evidenceFiles[group] ?? []
  for (const file of files) await fs.rm('.artifacts/' + file, { force: true })
  const result = await runFoundationStages({
    stages: (group === 'aggregate' ? ['build:packages'] : foundationSteps[group]).map((name) => ({ name, command: process.execPath, args: [script, 'run', name], env })),
    reportPath, logsDirectory: '.artifacts/logs', metadata: report, signal: controller.signal,
  })
  report = result.report
  if (result.exitCode !== 0) process.exitCode = result.exitCode
  else {
    const evidence = group === 'aggregate'
      ? await aggregateFoundationEvidence(args[1], report.sourceCommit)
      : group === 'all'
        ? combineEvidence(await validateGroupEvidence('.artifacts', 'quality'), await validateGroupEvidence('.artifacts', 'consumers'))
        : await validateGroupEvidence('.artifacts', group)
    if (controller.signal.aborted) throw new Error('Foundation canceled during evidence validation')
    persistFoundationReport(reportPath, { ...report, ...evidence, status: 'passed', exitCode: 0, completedAt: new Date().toISOString(), durationMs: Date.now() - Date.parse(report.startedAt) })
    console.log('Foundation ' + group + ' passed: ' + JSON.stringify(evidence.counts))
  }
} catch (error) {
  const canceled = controller.signal.aborted
  process.exitCode = canceled ? controller.signal.reason === 'SIGINT' ? 130 : 143 : 1
  persistFoundationReport(reportPath, { ...report, status: canceled ? 'canceled' : 'failed', exitCode: process.exitCode, completedAt: new Date().toISOString(), durationMs: report.startedAt ? Date.now() - Date.parse(report.startedAt) : 0, error: String(error) })
  console.error(error)
} finally {
  process.removeListener('SIGINT', onInterrupt)
  process.removeListener('SIGTERM', onTerminate)
}
