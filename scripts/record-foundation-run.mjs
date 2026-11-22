import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { spawnSync } from 'node:child_process'

// Record a passing Foundation run in docs/evidence/foundation-run.json from that run's own aggregate
// report, so the evidence names the run and commit it came from instead of hand-copied numbers (TST-05).
//   node scripts/record-foundation-run.mjs <github-run-id>
// Needs the gh CLI signed in to the repository. It refuses a run whose aggregate did not pass.
const runId = process.argv[2]
if (!/^\d+$/.test(runId ?? '')) throw new Error('Use: node scripts/record-foundation-run.mjs <github-run-id>')
const gh = (...args) => {
  const result = spawnSync('gh', args, { encoding: 'utf8', windowsHide: true })
  if (result.status !== 0) throw new Error('gh ' + args.join(' ') + ' failed: ' + result.stderr)
  return result.stdout
}
const run = JSON.parse(gh('run', 'view', runId, '--json', 'databaseId,headSha,headBranch,event,conclusion,url,createdAt,updatedAt,workflowName,jobs'))
if (run.workflowName !== 'Foundation' || run.conclusion !== 'success') throw new Error(`Run ${runId} is not a successful Foundation run (${run.workflowName}: ${run.conclusion})`)
const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'ombelle-foundation-run-'))
try {
  gh('run', 'download', runId, '--name', 'foundation-evidence', '--dir', directory)
  const report = JSON.parse(await fs.readFile(path.join(directory, 'foundation-report.json'), 'utf8'))
  if (report.group !== 'aggregate' || report.status !== 'passed' || report.exitCode !== 0 || report.sourceCommit !== run.headSha)
    throw new Error('The aggregate report does not record a pass on the run commit')
  const minutes = job => Math.round((Date.parse(job.completedAt) - Date.parse(job.startedAt)) / 6000) / 10
  const record = {
    schemaVersion: 1,
    run: { id: run.databaseId, url: run.url, event: run.event, branch: run.headBranch, startedAt: run.createdAt, completedAt: run.updatedAt },
    sourceCommit: report.sourceCommit,
    counts: report.counts,
    specimenAudit: report.specimenAudit,
    contrastAdvisoryFindings: Object.fromEntries((report.specimenAuditEvidence?.configurations ?? [])
      .filter(row => row.contrastAdvisoryFindings > 0)
      .map(row => [[row.family, row.edition, row.mode, row.transparency].filter(Boolean).join('/'), row.contrastAdvisoryFindings])),
    consumers: Object.keys(report.consumerMatrix ?? {}).length,
    browser: report.browserVersion,
    jobMinutes: Object.fromEntries(run.jobs.map(job => [job.name, minutes(job)])),
  }
  await fs.writeFile('docs/evidence/foundation-run.json', JSON.stringify(record, null, 2) + '\n')
  console.log('Recorded Foundation run ' + runId + ' on ' + report.sourceCommit)
} finally {
  await fs.rm(directory, { recursive: true, force: true })
}
