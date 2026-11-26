import fs from 'node:fs/promises'
import { spawnSync } from 'node:child_process'
import { runFoundationStages, persistFoundationReport } from './foundation-runner.mjs'
import { foundationSteps, evidenceFiles, validateGroupEvidence, combineEvidence, aggregateFoundationEvidence, parseShard, parseConsumerShard } from './foundation-evidence.mjs'

const args = process.argv.slice(2)
const group = args.length === 0 ? 'all' : args[0] === '--group' && args.length === 2 && ['quality', 'consumers', 'specimen'].includes(args[1]) ? args[1] : args[0] === '--aggregate' && args.length === 2 ? 'aggregate' : undefined
if (!group) throw new Error('Use no arguments, --group quality|consumers|specimen, or --aggregate DIRECTORY')
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
  // The CI run that produced this report, so evidence can name its source (TST-05).
  ...(process.env.GITHUB_RUN_ID ? { run: {
    id: process.env.GITHUB_RUN_ID, attempt: process.env.GITHUB_RUN_ATTEMPT, workflow: process.env.GITHUB_WORKFLOW,
    url: process.env.GITHUB_SERVER_URL + '/' + process.env.GITHUB_REPOSITORY + '/actions/runs/' + process.env.GITHUB_RUN_ID,
  } } : {}),
}
// A specimen shard runs some audit configurations; the aggregate requires every shard.
// A consumers shard runs some browser spec files (scripts/consumer-shards.mjs) the same way.
const specimenShard = parseShard(process.env.OMBELLE_SPECIMEN_SHARD)
if (specimenShard && group !== 'specimen') throw new Error('OMBELLE_SPECIMEN_SHARD applies to --group specimen only')
const consumerShard = parseConsumerShard(process.env.OMBELLE_CONSUMERS_SHARD)
if (consumerShard && group !== 'consumers') throw new Error('OMBELLE_CONSUMERS_SHARD applies to --group consumers only')
const shard = specimenShard ?? consumerShard
if (shard) report.shard = shard
try {
  // The gate has registry access, so tests/integration/blocks-older-cli.test.ts runs against the published 1.0 CLI
  // instead of skipping (the gate fails on skipped assertions). Set it on this process too: evidence validation
  // lists the expected tests with `vitest list`, which must collect that file's tests as the measured run did.
  process.env.OMBELLE_REGISTRY_TESTS = '1'
  const env = { ...process.env, NEXT_TELEMETRY_DISABLED: '1' }
  delete env.NO_COLOR
  // Only clear owned result files. Consumer roots remain owned by their preparation
  // lifecycle. A successful group must produce fresh evidence during this run.
  const files = group === 'all' ? [...evidenceFiles.quality, ...evidenceFiles.consumers, ...evidenceFiles.specimen] : evidenceFiles[group] ?? []
  for (const file of files) await fs.rm('.artifacts/' + file, { force: true })
  await fs.rm('.artifacts/component-preset-measurements-parts', { recursive: true, force: true })
  const result = await runFoundationStages({
    stages: (group === 'aggregate' ? ['build:packages', 'generate:preview'] : foundationSteps[group]).map((name) => ({ name, command: process.execPath, args: [script, 'run', name], env })),
    reportPath, logsDirectory: '.artifacts/logs', metadata: report, signal: controller.signal,
  })
  report = result.report
  if (result.exitCode !== 0) process.exitCode = result.exitCode
  else {
    const evidence = group === 'aggregate'
      ? await aggregateFoundationEvidence(args[1], report.sourceCommit)
      : group === 'all'
        ? combineEvidence(await validateGroupEvidence('.artifacts', 'quality'), await validateGroupEvidence('.artifacts', 'consumers'), await validateGroupEvidence('.artifacts', 'specimen'))
        : await validateGroupEvidence('.artifacts', group, { shard: consumerShard })
    if (controller.signal.aborted) throw new Error('Foundation canceled during evidence validation')
    persistFoundationReport(reportPath, { ...report, ...evidence, status: 'passed', exitCode: 0, completedAt: new Date().toISOString(), durationMs: Date.now() - Date.parse(report.startedAt) })
    console.log('Foundation ' + group + ' passed: ' + JSON.stringify(evidence.counts ?? { shard: report.shard }))
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
