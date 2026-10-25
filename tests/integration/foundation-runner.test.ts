import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { spawn, spawnSync, type ChildProcess } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { afterEach, expect, test } from 'vitest'

const repo = fileURLToPath(new URL('../../', import.meta.url))
const runner = new URL('../../scripts/foundation-runner.mjs', import.meta.url).href
const staging = path.join(repo, 'scripts/stage-foundation-evidence.mjs')
const roots: string[] = []
const children: ChildProcess[] = []
async function temp() {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'ombelle-foundation-'))
  roots.push(root)
  return root
}
async function until(predicate: () => Promise<boolean>) {
  const deadline = Date.now() + 7000
  while (Date.now() < deadline) {
    if (await predicate()) return
    await new Promise((resolve) => setTimeout(resolve, 25))
  }
  throw new Error('Timed out waiting for durable stage diagnostics')
}
async function read(file: string) {
  return fs.readFile(file, 'utf8').catch(() => '')
}
function alive(pid: number) {
  try { process.kill(pid, 0); return true } catch { return false }
}
function stop(child: ChildProcess) {
  if (child.exitCode !== null || child.signalCode !== null) return
  if (process.platform === 'win32') {
    spawnSync('taskkill', ['/pid', String(child.pid), '/T', '/F'], { windowsHide: true })
  } else child.kill('SIGKILL')
}
afterEach(async () => {
  for (const child of children.splice(0)) stop(child)
  for (const root of roots.splice(0)) await fs.rm(root, { recursive: true, force: true })
})
async function launch(root: string, body: string) {
  const driver = path.join(root, 'driver.mjs')
  await fs.writeFile(driver, `import { runFoundationStages } from ${JSON.stringify(runner)};\n${body}`)
  const child = spawn(process.execPath, [driver], {
    cwd: root, stdio: ['ignore', 'pipe', 'pipe', 'ipc'], windowsHide: true,
  })
  children.push(child)
  let output = ''
  child.stdout!.on('data', (data) => { output += data })
  child.stderr!.on('data', (data) => { output += data })
  const closed = new Promise<number | null>((resolve) => child.once('close', resolve))
  return { child, closed, output: () => output }
}
function gateEnvironment(script: string) {
  return { ...Object.fromEntries(Object.entries(process.env).filter(([name]) => name.toLowerCase() !== 'npm_execpath')), npm_execpath: script }
}
const options = `reportPath: 'report.json', logsDirectory: 'logs'`

test('streams both output channels to disk and the terminal before a stage exits', async () => {
  const root = await temp()
  const processRun = await launch(root, `
const controller = new AbortController();
process.on('message', () => controller.abort('SIGINT'));
const result = await runFoundationStages({ ${options}, stages: [{ name: 'stream', command: process.execPath,
  args: ['-e', "console.log('live stdout'); console.error('live stderr'); setInterval(() => {}, 1000)"] }],
  signal: controller.signal });
process.exitCode = result.exitCode;
process.disconnect();`)
  await until(async () => (await read(path.join(root, 'logs/stream.log'))).includes('live stderr'))
  expect(processRun.child.exitCode).toBeNull()
  expect(await read(path.join(root, 'logs/stream.log'))).toContain('live stdout')
  await until(async () => processRun.output().includes('live stderr'))
  expect(processRun.output()).toContain('live stdout')
  const report = JSON.parse(await read(path.join(root, 'report.json')))
  expect(report.status).toBe('running')
  expect(report.steps[0]).toMatchObject({ name: 'stream', status: 'running' })
  expect(report.steps[0].startedAt).toEqual(expect.any(String))
  processRun.child.send('cancel')
  expect(await processRun.closed).toBe(130)
})

test('persists completed stages and terminates a canceled child tree before returning', async () => {
  const root = await temp()
  const descendant = path.join(root, 'descendant.mjs')
  const worker = path.join(root, 'worker.mjs')
  await fs.writeFile(descendant, "import fs from 'node:fs'; fs.writeFileSync('descendant.pid', String(process.pid)); setInterval(() => fs.appendFileSync('heartbeat', '.'), 20)")
  await fs.writeFile(worker, "import {spawn} from 'node:child_process'; import fs from 'node:fs'; fs.writeFileSync('child.pid', String(process.pid)); spawn(process.execPath, ['descendant.mjs'], {stdio:'inherit'}); console.log('waiting'); setInterval(()=>{},1000)")
  const processRun = await launch(root, `
const controller = new AbortController();
process.on('message', () => controller.abort('SIGTERM'));
const result = await runFoundationStages({ ${options}, signal: controller.signal, stages: [
 { name: 'done', command: process.execPath, args: ['-e', "console.log('completed')"] },
 { name: 'wait', command: process.execPath, args: ['worker.mjs'] },
 { name: 'never', command: process.execPath, args: ['-e', "throw Error('must not run')"] }
] });
process.exitCode = result.exitCode; process.disconnect();`)
  await until(async () => Boolean(await read(path.join(root, 'heartbeat'))))
  const reportBefore = JSON.parse(await read(path.join(root, 'report.json')))
  expect(reportBefore.steps[0]).toMatchObject({ name: 'done', status: 'passed', exitCode: 0 })
  expect(reportBefore.steps[0].durationMs).toBeGreaterThanOrEqual(0)
  const childPid = Number(await read(path.join(root, 'child.pid')))
  const descendantPid = Number(await read(path.join(root, 'descendant.pid')))
  processRun.child.send('cancel')
  expect(await processRun.closed).toBe(143)
  const report = JSON.parse(await read(path.join(root, 'report.json')))
  expect(report.status).toBe('canceled')
  expect(report.steps.map((step: {status: string}) => step.status)).toEqual(['passed', 'canceled'])
  expect(report.completedAt).toEqual(expect.any(String))
  expect(alive(childPid)).toBe(false)
  // POSIX may briefly retain a killed orphan as a zombie; unchanged heartbeat also
  // proves that no descendant continues executing after the runner returns.
  if (process.platform === 'win32') expect(alive(descendantPid)).toBe(false)
  const heartbeat = await read(path.join(root, 'heartbeat'))
  await new Promise((resolve) => setTimeout(resolve, 100))
  expect(await read(path.join(root, 'heartbeat'))).toBe(heartbeat)
})

if (process.platform !== 'win32') test('handles a real POSIX termination signal without losing the completed stage', async () => {
  const root = await temp()
  const gate = path.join(repo, 'scripts/check-foundation.mjs')
  await fs.writeFile(path.join(root, 'fake-pnpm.mjs'), "if(process.argv[3] !== 'build:packages') { console.log('waiting'); setInterval(()=>{},1000) }")
  const child = spawn(process.execPath, [gate], {
    cwd: root, env: gateEnvironment(path.join(root, 'fake-pnpm.mjs')), stdio: 'pipe',
  })
  children.push(child)
  const closed = new Promise<number | null>((resolve) => child.once('close', resolve))
  await until(async () => (await read(path.join(root, '.artifacts/logs/test-unit.log'))).includes('waiting'))
  child.kill('SIGTERM')
  expect(await closed).toBe(143)
  const report = JSON.parse(await read(path.join(root, '.artifacts/foundation-report.json')))
  expect(report.steps.map((step: {status: string}) => step.status)).toEqual(['passed', 'canceled'])
})

test('preserves nonzero exit codes and bounds diagnostic tails without truncating logs', async () => {
  const root = await temp()
  const processRun = await launch(root, `
const result = await runFoundationStages({ ${options}, tailBytes: 1024, stages: [
 { name: 'failure', command: process.execPath, args: ['-e', "process.stdout.write('x'.repeat(100000)); process.stdout.write('last error'); process.exitCode=7"] }
] });
process.exitCode = result.exitCode; process.disconnect();`)
  expect(await processRun.closed).toBe(7)
  const log = await read(path.join(root, 'logs/failure.log'))
  expect(log.length).toBeGreaterThan(100000)
  const report = JSON.parse(await read(path.join(root, 'report.json')))
  expect(report.status).toBe('failed')
  expect(report.steps[0]).toMatchObject({ exitCode: 7, status: 'failed' })
  expect(Buffer.byteLength(report.steps[0].tail)).toBeLessThanOrEqual(1024)
  expect(report.steps[0].tail).toContain('last error')
})

test('records spawn errors as failed stages', async () => {
  const root = await temp()
  const processRun = await launch(root, `
const result = await runFoundationStages({ ${options}, stages: [{ name: 'missing', command: './missing-command', args: [] }] });
process.exitCode = result.exitCode; process.disconnect();`)
  expect(await processRun.closed).toBe(1)
  const report = JSON.parse(await read(path.join(root, 'report.json')))
  expect(report.steps[0]).toMatchObject({ status: 'failed', exitCode: 1 })
  expect(report.steps[0].tail).toContain('ENOENT')
})

test('stages stable core and browser evidence separately and records missing canceled outputs', async () => {
  const root = await temp()
  for (const directory of ['.artifacts/logs', 'playwright-report/data', 'test-results/.playwright-artifacts-active/nested', 'test-results/failure']) {
    await fs.mkdir(path.join(root, directory), { recursive: true })
  }
  const evidence = {
    '.artifacts/foundation-report.json': '{"status":"canceled"}',
    '.artifacts/component-preset-measurements.json': '{"checks":[]}',
    '.artifacts/component-preset-consumers.json': '{"cases":[]}',
    '.artifacts/component-preset-browser-version.json': '{"browser":"chromium"}',
    '.artifacts/logs/test-e2e.log': 'interrupted',
    'playwright-report/index.html': 'final html',
    'playwright-report/data/trace.zip': 'trace',
    'test-results/failure/screenshot.png': 'screenshot',
    'test-results/.playwright-artifacts-active/nested/transient': 'not stable',
  }
  for (const [file, content] of Object.entries(evidence)) await fs.writeFile(path.join(root, file), content)
  function stage() {
    return spawnSync(process.execPath, [staging], { cwd: root, encoding: 'utf8', windowsHide: true })
  }
  const result = stage()
  expect(result.stderr).toBe('')
  expect(result.status).toBe(0)
  const output = path.join(root, '.artifacts/upload')
  expect(await read(path.join(output, 'core/component-preset-measurements.json'))).toBe('{"checks":[]}')
  expect(await read(path.join(output, 'core/component-preset-consumers.json'))).toBe('{"cases":[]}')
  expect(await read(path.join(output, 'core/component-preset-browser-version.json'))).toBe('{"browser":"chromium"}')
  expect(await read(path.join(output, 'core/logs/test-e2e.log'))).toBe('interrupted')
  expect(await read(path.join(output, 'browser/playwright-report/index.html'))).toBe('final html')
  expect(await read(path.join(output, 'browser/test-results/failure/screenshot.png'))).toBe('screenshot')
  expect(await fs.readdir(path.join(output, 'browser/test-results'))).toEqual(['failure'])
  const manifest = JSON.parse(await read(path.join(output, 'core/staging-manifest.json')))
  expect(manifest.foundationStatus).toBe('canceled')
  expect(manifest.missing).toContain('.artifacts/browser-results.json')
  expect(await read(path.join(output, 'core/browser-results.json'))).toBe('')
  // A second staging pass must not leave obsolete attachments from an earlier run.
  await fs.rm(path.join(root, 'test-results'), { recursive: true })
  expect(stage().status).toBe(0)
  await expect(fs.stat(path.join(output, 'browser/test-results'))).rejects.toMatchObject({ code: 'ENOENT' })
})

test('the default gate preserves child failure and durable stage details', async () => {
  const root = await temp()
  await fs.writeFile(path.join(root, 'fake-pnpm.mjs'), "console.error('gate child failed'); process.exitCode=7")
  const gate = path.join(repo, 'scripts/check-foundation.mjs')
  const child = spawn(process.execPath, [gate], {
    cwd: root, env: gateEnvironment(path.join(root, 'fake-pnpm.mjs')), stdio: 'pipe', windowsHide: true,
  })
  children.push(child)
  let output = ''
  child.stderr!.on('data', (chunk) => { output += chunk })
  const closed = new Promise<number | null>((resolve) => child.once('close', resolve))
  expect(await closed, output).toBe(7)
  const report = JSON.parse(await read(path.join(root, '.artifacts/foundation-report.json')))
  expect(report.status).toBe('failed')
  expect(report.steps[0]).toMatchObject({ name: 'build:packages', status: 'failed', exitCode: 7 })
  expect(report.completedAt).toEqual(expect.any(String))
  expect(await read(path.join(root, '.artifacts/logs/build-packages.log'))).toContain('gate child failed')
})
