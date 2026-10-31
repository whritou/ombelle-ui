import { afterEach, expect, it } from 'vitest'
import fs from 'node:fs/promises'
import path from 'node:path'
import { spawn } from 'node:child_process'
import { createYarnProject, type YarnFixtureId } from '../helpers/yarn-project.js'

const roots: string[] = []
afterEach(async () => {
  for (const root of roots.splice(0))
    await fs.rm(root, { recursive: true, force: true })
})

const cli = path.resolve('packages/cli/dist/main.js')
const preset = path.resolve('examples/preset.example.json')
// Four Yarn installs plus a production build measured 38-62 s alone on Windows,
// so the shared 60 s default fails without load; keep roughly 3x headroom.
const rowTimeout = 180_000
const rows: { id: YarnFixtureId; version: string; linker: string }[] = [
  { id: 'classic-vite', version: '1.22.22', linker: 'node_modules' },
  { id: 'modern-next', version: '4.18.1', linker: 'node-modules' },
  { id: 'pnp-vite', version: '4.18.1', linker: 'pnp' },
]

function execute(
  file: string,
  args: string[],
  cwd: string,
  env: NodeJS.ProcessEnv,
): Promise<{ code: number | null; output: string; data?: any }> {
  return new Promise((resolve, reject) => {
    const child = spawn(file, args, {
      cwd,
      shell: false,
      windowsHide: true,
      env,
    })
    let output = ''
    child.stdout.on('data', (chunk) => (output += chunk))
    child.stderr.on('data', (chunk) => (output += chunk))
    child.once('error', reject)
    child.once('exit', (code) => {
      let data
      try { data = JSON.parse(output) } catch {}
      resolve({ code, output, data })
    })
  })
}

it.each(rows)('$id installs with Yarn $version and builds with $linker', async ({ id, version, linker }) => {
  const fixture = await createYarnProject(id)
  roots.push(fixture.root)
  expect(fixture.version).toBe(version)
  expect(fixture.linker).toBe(linker)
  await fs.appendFile(path.join(fixture.root, 'src/index.css'), '\n.user-yarn-style { color: hotpink; }\n')
  const env = { ...process.env, npm_execpath: fixture.entry, OMBELLE_YARN_ENTRY: fixture.entry }
  const runCli = (args: string[]) => execute(process.execPath, [cli, ...args, '--json'], fixture.root, env)

  const init = await runCli(['init', '--preset', preset, '--yes'])
  expect(init.code, init.output).toBe(0)
  expect(init.data.packageManager).toBe('yarn')
  const add = await runCli(['add', 'button', '--yes'])
  expect(add.code, add.output).toBe(0)
  const pkg = JSON.parse(await fs.readFile(path.join(fixture.root, 'package.json'), 'utf8'))
  expect(pkg.dependencies.clsx).toBe('2.1.1')
  const dialog = await runCli(['add', 'dialog', '--yes'])
  expect(dialog.code, dialog.output).toBe(0)
  const saved = await runCli(['add', 'input', '--yes'])
  expect(saved.code, saved.output).toBe(0)
  expect(saved.data.presetHash).toBe(init.data.presetHash)
  expect(await fs.readFile(path.join(fixture.root, 'src/index.css'), 'utf8')).toContain('.user-yarn-style')
  await expect(fs.access(path.join(fixture.root, 'yarn.lock'))).resolves.toBeUndefined()
  await expect(fs.access(path.join(fixture.root, 'package-lock.json'))).rejects.toMatchObject({ code: 'ENOENT' })
  await expect(fs.access(path.join(fixture.root, 'pnpm-lock.yaml'))).rejects.toMatchObject({ code: 'ENOENT' })
  if (linker === 'pnp')
    await expect(fs.access(path.join(fixture.root, 'node_modules'))).rejects.toMatchObject({ code: 'ENOENT' })

  const built = await execute(process.execPath, [fixture.entry, 'run', 'build'], fixture.root, env)
  expect(built.code, built.output).toBe(0)
}, rowTimeout)
