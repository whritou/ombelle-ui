import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawnSync } from 'node:child_process'
const repo = fileURLToPath(new URL('../', import.meta.url))
function run(script, cwd = repo) {
  const result = spawnSync(process.execPath, [path.join(repo, script)], {
    cwd, windowsHide: true, stdio: 'inherit',
    env: { ...process.env, NEXT_TELEMETRY_DISABLED: '1' },
  })
  if (result.error) throw result.error
  if (result.status !== 0) process.exit(result.status ?? 1)
}
for (const script of ['sync-schema.mjs', 'sync-catalog.mjs', 'build.mjs', 'build-hosted-preview.mjs'])
  run('scripts/' + script)
const result = spawnSync(process.execPath, [path.join(repo, 'apps/www/node_modules/next/dist/bin/next'), 'build'], {
  cwd: path.join(repo, 'apps/www'), windowsHide: true, stdio: 'inherit',
  env: { ...process.env, NEXT_TELEMETRY_DISABLED: '1' },
})
if (result.error) throw result.error
process.exitCode = result.status ?? 1
