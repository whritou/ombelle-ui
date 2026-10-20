import fs from 'node:fs'
import path from 'node:path'
import { spawn } from 'node:child_process'
const map = JSON.parse(fs.readFileSync('.artifacts/consumers.json', 'utf8'))
const fixture = map[process.argv[2]]
if (!fixture) throw new Error('Unknown fixture')
const binary =
  fixture.framework === 'vite'
    ? path.join(fixture.root, 'node_modules/vite/bin/vite.js')
    : path.join(fixture.root, 'node_modules/next/dist/bin/next')
const args =
  fixture.framework === 'vite'
    ? [
        'preview',
        '--host',
        '127.0.0.1',
        '--port',
        String(fixture.port),
        '--strictPort',
      ]
    : ['start', '--hostname', '127.0.0.1', '--port', String(fixture.port)]
const child = spawn(process.execPath, [binary, ...args], {
  cwd: fixture.root,
  stdio: 'inherit',
  windowsHide: true,
  env: { ...process.env, NEXT_TELEMETRY_DISABLED: '1' },
})
process.on('SIGTERM', () => child.kill())
process.on('SIGINT', () => child.kill())
child.on('exit', (code) => process.exit(code ?? 1))
