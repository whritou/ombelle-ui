import { afterEach, expect, it } from 'vitest'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { spawn } from 'node:child_process'
import { managerEntry, prepareManager, runDependencies } from '../../packages/cli/src/apply/manager.js'
import { createProject } from '../helpers/projects.js'

const roots: string[] = []
const originalExecPath = process.env.npm_execpath
const originalPath = process.env.PATH
const originalCapture = process.env.YARN_CAPTURE

afterEach(async () => {
  if (originalExecPath === undefined) delete process.env.npm_execpath
  else process.env.npm_execpath = originalExecPath
  if (originalPath === undefined) delete process.env.PATH
  else process.env.PATH = originalPath
  if (originalCapture === undefined) delete process.env.YARN_CAPTURE
  else process.env.YARN_CAPTURE = originalCapture
  for (const root of roots.splice(0))
    await fs.rm(root, { recursive: true, force: true })
})

async function root() {
  const folder = await fs.mkdtemp(path.join(os.tmpdir(), 'ombelle-yarn-manager-'))
  roots.push(folder)
  return folder
}

async function fakeYarn(folder: string, filename: string, version: string) {
  const entry = path.join(folder, filename)
  await fs.writeFile(
    entry,
    `if (process.argv[2] === '--version') process.stdout.write('${version}')\n` +
      `else if (process.env.YARN_CAPTURE) require('node:fs').writeFileSync(process.env.YARN_CAPTURE, JSON.stringify({ args: process.argv.slice(2), cwd: process.cwd() }))\n` +
      `else process.exit(1)\n`,
  )
  return entry
}

it.each([
  ['yarn.js', '1.22.22'],
  ['yarn.cjs', '4.18.1'],
])('resolves an inherited Yarn JavaScript entry %s', async (filename) => {
  const folder = await root()
  const entry = await fakeYarn(folder, filename, filename.endsWith('.js') ? '1.22.22' : '4.18.1')
  process.env.npm_execpath = entry
  expect(await managerEntry('yarn')).toBe(entry)
})

it('resolves Yarn from PATH without shell evaluation', async () => {
  const folder = await root()
  const entry = await fakeYarn(folder, 'yarn.js', '1.22.22')
  delete process.env.npm_execpath
  process.env.PATH = folder
  expect(await managerEntry('yarn')).toBe(entry)
})

it('resolves a Windows Yarn command shim only to a safe local JavaScript entry', async () => {
  const folder = await root()
  const entry = await fakeYarn(folder, 'yarn.cjs', '4.18.1')
  await fs.writeFile(path.join(folder, 'yarn.cmd'), '@echo off\r\n"%~dp0yarn.cjs" %*\r\n')
  delete process.env.npm_execpath
  process.env.PATH = folder
  expect(await managerEntry('yarn')).toBe(entry)
})

it('resolves a Corepack Yarn command shim to its JavaScript entry and prefix argument', async () => {
  const folder = await root()
  const entry = path.join(folder, 'corepack.cjs')
  await fs.writeFile(entry, `if (process.argv[2] === 'yarn' && process.argv[3] === '--version') process.stdout.write('4.18.1')\nelse if (process.argv[2] === 'yarn' && process.env.YARN_CAPTURE) require('node:fs').writeFileSync(process.env.YARN_CAPTURE, JSON.stringify({ args: process.argv.slice(3) }))\nelse process.exit(1)\n`)
  await fs.writeFile(path.join(folder, 'yarn.cmd'), '@echo off\r\nsetlocal\r\ncall "%~dp0corepack.cjs" yarn %*\r\nendlocal\r\n')
  delete process.env.npm_execpath
  process.env.PATH = folder
  const prepared = await prepareManager(folder, 'yarn')
  expect(prepared).toEqual({ executable: process.execPath, version: '4.18.1', prefixArgs: [entry, 'yarn'] })
  const capture = path.join(folder, 'capture.json')
  process.env.YARN_CAPTURE = capture
  await runDependencies(folder, [{ name: 'clsx', version: '2.1.1' }], 'yarn', prepared)
  expect(JSON.parse(await fs.readFile(capture, 'utf8'))).toEqual({ args: ['add', '--exact', '--mode=skip-build', 'clsx@2.1.1'] })
})

it('rejects a Yarn command shim containing shell operators', async () => {
  const folder = await root()
  await fs.writeFile(path.join(folder, 'yarn.cmd'), '@echo off\r\necho unsafe & whoami\r\n')
  delete process.env.npm_execpath
  process.env.PATH = folder
  await expect(managerEntry('yarn')).rejects.toMatchObject({ code: 'UNSUPPORTED_PROJECT' })
})

it.each([
  ['1.22.22', ['add', '--exact', '--ignore-scripts', 'clsx@2.1.1']],
  ['4.18.1', ['add', '--exact', '--mode=skip-build', 'clsx@2.1.1']],
])('runs Yarn %s with exact dependencies and script controls', async (version, expectedArgs) => {
  const folder = await root()
  const entryFolder = path.join(folder, 'directory with spaces')
  await fs.mkdir(entryFolder)
  const entry = await fakeYarn(entryFolder, 'yarn.cjs', version)
  const capture = path.join(folder, 'capture.json')
  process.env.npm_execpath = entry
  process.env.YARN_CAPTURE = capture
  await runDependencies(folder, [{ name: 'clsx', version: '2.1.1' }], 'yarn')
  expect(JSON.parse(await fs.readFile(capture, 'utf8'))).toEqual({ args: expectedArgs, cwd: folder })
})

it('reports a Yarn install failure as dependency failure', async () => {
  const folder = await root()
  const entry = path.join(folder, 'yarn.cjs')
  await fs.writeFile(entry, `if (process.argv[2] === '--version') process.stdout.write('4.18.1')\nelse { process.stderr.write('install failed'); process.exit(1) }\n`)
  process.env.npm_execpath = entry
  await expect(runDependencies(folder, [{ name: 'clsx', version: '2.1.1' }], 'yarn'))
    .rejects.toMatchObject({ code: 'DEPENDENCY_FAILURE', message: expect.stringContaining('yarn') })
})

it('does not execute Yarn for dry-run or theme-only operations', async () => {
  const folder = await createProject('vite')
  roots.push(folder)
  await fs.rm(path.join(folder, 'pnpm-lock.yaml'))
  await fs.writeFile(path.join(folder, 'yarn.lock'), '# yarn lockfile\n')
  const pkg = JSON.parse(await fs.readFile(path.join(folder, 'package.json'), 'utf8'))
  pkg.packageManager = 'yarn@4.18.1'
  await fs.writeFile(path.join(folder, 'package.json'), JSON.stringify(pkg))
  const entry = await fakeYarn(folder, 'yarn.cjs', '4.18.1')
  const sentinel = path.join(folder, 'yarn-ran')
  await fs.writeFile(entry, `require('node:fs').writeFileSync('${sentinel.replaceAll('\\', '/')}', 'ran')\n`)
  const run = (args: string[]) => new Promise<{ code: number | null; data: any }>((resolve, reject) => {
    const child = spawn(process.execPath, [path.resolve('packages/cli/dist/main.js'), ...args, '--json'], {
      shell: false,
      windowsHide: true,
      env: { ...process.env, npm_execpath: entry },
    })
    let output = ''
    child.stdout.on('data', (chunk) => (output += chunk))
    child.stderr.on('data', (chunk) => (output += chunk))
    child.once('error', reject)
    child.once('exit', (code) => {
      try { resolve({ code, data: JSON.parse(output) }) } catch { reject(new Error(output)) }
    })
  })
  const preset = path.resolve('examples/preset.example.json')
  const dry = await run(['init', '--preset', preset, '--cwd', folder, '--dry-run'])
  expect(dry.code, JSON.stringify(dry.data)).toBe(0)
  const applied = await run(['init', '--preset', preset, '--cwd', folder, '--yes'])
  expect(applied.code, JSON.stringify(applied.data)).toBe(0)
  const themed = await run(['theme', 'add', preset, '--cwd', folder, '--yes'])
  expect(themed.code, JSON.stringify(themed.data)).toBe(0)
  await expect(fs.access(sentinel)).rejects.toMatchObject({ code: 'ENOENT' })
})
