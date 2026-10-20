import fs from 'node:fs/promises'
import path from 'node:path'
import { spawn, spawnSync } from 'node:child_process'
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
await fs.mkdir('.artifacts/logs', { recursive: true })
const report = {
  startedAt: new Date().toISOString(),
  sourceCommit: spawnSync('git', ['rev-parse', 'HEAD'], {
    encoding: 'utf8',
    windowsHide: true,
  }).stdout.trim(),
  workingTreeDirty:
    spawnSync('git', ['status', '--porcelain'], {
      encoding: 'utf8',
      windowsHide: true,
    }).stdout.trim().length > 0,
  platform: process.platform,
  node: process.version,
  steps: [],
}
for (const step of steps) {
  console.log('Checking ' + step)
  const start = Date.now(),
    log = path.join('.artifacts/logs', step.replaceAll(':', '-') + '.log')
  const result = await new Promise((resolve) => {
    const env = { ...process.env, NEXT_TELEMETRY_DISABLED: '1' }
    delete env.NO_COLOR
    const child = spawn(process.execPath, [script, 'run', step], {
      cwd: process.cwd(),
      shell: false,
      windowsHide: true,
      env,
    })
    let output = ''
    child.stdout.on('data', (x) => (output += x))
    child.stderr.on('data', (x) => (output += x))
    child.on('error', (error) =>
      resolve({ exitCode: 1, output: output + '\n' + error.message }),
    )
    child.on('exit', (exitCode) => resolve({ exitCode: exitCode ?? 1, output }))
  })
  await fs.writeFile(log, result.output)
  report.steps.push({
    name: step,
    exitCode: result.exitCode,
    durationMs: Date.now() - start,
    log,
  })
  console.log(
    step +
      ': ' +
      (result.exitCode === 0 ? 'PASS' : 'FAIL') +
      ' (' +
      Math.round((Date.now() - start) / 1000) +
      's)',
  )
  if (result.exitCode !== 0) {
    console.error(result.output.split(/\r?\n/).slice(-45).join('\n'))
    await fs.writeFile(
      '.artifacts/foundation-report.json',
      JSON.stringify({ ...report, status: 'failed' }, null, 2),
    )
    process.exit(result.exitCode)
  }
}
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
await fs.writeFile(
  '.artifacts/foundation-report.json',
  JSON.stringify(
    {
      ...report,
      completedAt: new Date().toISOString(),
      status: 'passed',
      counts,
      browserVersion,
      npmVersion: JSON.parse(
        await fs.readFile('.artifacts/npm-version.json', 'utf8'),
      ),
    },
    null,
    2,
  ),
)
console.log(
  'Foundation passed: ' +
    counts.unit.passed +
    ' unit, ' +
    counts.integration.passed +
    ' integration, ' +
    counts.browser.expected +
    ' browser tests.',
)
