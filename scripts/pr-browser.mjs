import { spawnSync } from 'node:child_process'

// The browser subset ci.yml runs on every change (TST-01), on the preview pages only:
//   node scripts/pr-browser.mjs interactions        every interaction spec of the specimen config
//   node scripts/pr-browser.mjs audit [base-commit] the specimen audit, in all 32 configurations, of the
//                                                   components the change touches plus a fixed sample
// Run pnpm build:packages and pnpm generate:preview first. Foundation runs the complete audit.
const [part, base] = process.argv.slice(2)
const run = (command, args, env = {}) => {
  const result = spawnSync(command, args, { stdio: ['ignore', 'inherit', 'inherit'], env: { ...process.env, ...env }, windowsHide: true })
  if (result.status !== 0) process.exit(result.status ?? 1)
}
const playwright = ['node_modules/@playwright/test/cli.js', 'test', '-c', 'playwright.specimen-audit.config.ts']
if (process.env.OMBELLE_SPECIMEN_SHARD) throw new Error('The PR browser subset is not sharded; unset OMBELLE_SPECIMEN_SHARD')

if (part === 'interactions') {
  const { specimenSpecFiles } = await import('./specimen-shard.mjs')
  run(process.execPath, [...playwright, ...specimenSpecFiles.filter(file => file !== 'specimen-audit.spec.ts').map(file => 'tests/e2e/' + file)])
} else if (part === 'audit') {
  const listed = spawnSync(process.execPath, ['--import', 'tsx', 'scripts/pr-audit-components.ts', base ?? ''], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'inherit'], windowsHide: true })
  if (listed.status !== 0) process.exit(listed.status ?? 1)
  const components = listed.stdout.trim()
  console.log('Auditing ' + components)
  run(process.execPath, [...playwright, 'tests/e2e/specimen-audit.spec.ts'], { OMBELLE_AUDIT_COMPONENTS: components })
} else throw new Error('Use: node scripts/pr-browser.mjs interactions | audit [base-commit]')
