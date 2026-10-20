import { it, expect, afterEach } from 'vitest'
import fs from 'node:fs/promises'
import path from 'node:path'
import { spawn } from 'node:child_process'
import { createProject } from '../helpers/projects.js'
import { snapshotTree } from '../helpers/tree.js'
const roots: string[] = []
afterEach(async () => {
  for (const root of roots.splice(0))
    await fs.rm(root, { recursive: true, force: true })
})
const cli = path.resolve('packages/cli/dist/main.js'),
  preset = path.resolve('examples/preset.example.json')
function command(
  args: string[],
  env: NodeJS.ProcessEnv = process.env,
): Promise<{ exitCode: number | null; data: any }> {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [cli, ...args, '--json'], {
      shell: false,
      windowsHide: true,
      env: Object.fromEntries(Object.entries(env).map(([key,value])=>[process.platform==='win32'?key.toUpperCase():key,value])),
    })
    let out = '',
      err = ''
    child.stdout.on('data', (x) => (out += x))
    child.stderr.on('data', (x) => (err += x))
    child.on('error', reject)
    child.on('exit', (exitCode) => {
      try {
        resolve({ exitCode, data: JSON.parse(out || err) })
      } catch {
        reject(new Error(out + '\n' + err))
      }
    })
  })
}
it('reuses the saved preset in a fresh process and refuses local edits even with yes', async () => {
  const root = await createProject('vite')
  roots.push(root)
  const init = await command([
    'init',
    '--preset',
    preset,
    '--cwd',
    root,
    '--yes',
  ])
  expect(init.exitCode).toBe(0)
  const add = await command(['add', 'button', 'dialog', '--cwd', root, '--yes'])
  expect(add.exitCode, JSON.stringify(add.data)).toBe(0)
  const next = await command(['add', 'input', '--cwd', root, '--yes'])
  expect(next.exitCode, JSON.stringify(next.data)).toBe(0)
  expect(next.data.presetHash).toBe(init.data.presetHash)
  const lock = JSON.parse(
    await fs.readFile(root + '/ui-library.lock.json', 'utf8'),
  )
  expect(Object.keys(lock.artifacts).some((p) => p.endsWith('input.tsx'))).toBe(
    true,
  )
  await fs.appendFile(
    root + '/src/components/ui/button.tsx',
    '\n// user modification',
  )
  const before = await snapshotTree(root)
  const conflict = await command(['add', 'button', '--cwd', root, '--yes'])
  expect(conflict.exitCode).toBe(4)
  expect(await snapshotTree(root)).toEqual(before)
}, 120000)
it('dry-run has no filesystem effects or dependency operations', async () => {
  const root = await createProject('vite')
  roots.push(root)
  const before = await snapshotTree(root)
  const plan = await command([
    'init',
    '--preset',
    preset,
    '--cwd',
    root,
    '--dry-run',
  ])
  expect(plan.exitCode).toBe(0)
  expect(plan.data.status).toBe('planned')
  expect(await snapshotTree(root)).toEqual(before)
})
it('reports malformed JSON and missing initialization clearly', async () => {
  const root = await createProject('vite')
  roots.push(root)
  await fs.writeFile(root + '/bad.json', '{')
  const invalid = await command([
    'init',
    '--preset',
    root + '/bad.json',
    '--cwd',
    root,
    '--yes',
  ])
  expect(invalid.exitCode).toBe(2)
  expect(invalid.data.error.code).toBe('INVALID_DATA')
  const missing = await command(['add', 'input', '--cwd', root, '--yes'])
  expect(missing.exitCode).toBe(3)
  expect(missing.data.error.code).toBe('UNSUPPORTED_PROJECT')
})
it('returns dependency failure with recovery information', async () => {
  const root = await createProject('vite')
  roots.push(root)
  expect(
    (await command(['init', '--preset', preset, '--cwd', root, '--yes']))
      .exitCode,
  ).toBe(0)
  const fake = root + '/pnpm.mjs'
  await fs.writeFile(fake, 'process.exit(1)\n')
  const failed = await command(['add', 'button', '--cwd', root, '--yes'], {
    ...process.env,
    npm_execpath: fake,
  })
  expect(failed.exitCode, JSON.stringify(failed.data.error)).toBe(6)
  expect(failed.data.error.recovery.sourceRestored).toBe(true)
  expect(failed.data.error.recovery.packageStateMayHaveChanged).toBe(true)
})
it('reports Yarn-specific dependency failure and recovery information', async () => {
  const root = await createProject('vite')
  roots.push(root)
  await fs.rm(root + '/pnpm-lock.yaml')
  await fs.writeFile(root + '/yarn.lock', '# yarn lockfile\n')
  const pkg = JSON.parse(await fs.readFile(root + '/package.json', 'utf8'))
  pkg.packageManager = 'yarn@4.18.1'
  await fs.writeFile(root + '/package.json', JSON.stringify(pkg))
  const preset = path.resolve('examples/preset.example.json')
  expect((await command(['init', '--preset', preset, '--cwd', root, '--yes'])).exitCode).toBe(0)
  const fake = root + '/yarn.cjs'
  await fs.writeFile(fake, `if (process.argv[2] === '--version') process.stdout.write('4.18.1')\nelse process.exit(1)\n`)
  const failed = await command(['add', 'button', '--cwd', root, '--yes'], {
    ...process.env,
    npm_execpath: fake,
  })
  expect(failed.exitCode, JSON.stringify(failed.data)).toBe(6)
  expect(failed.data.error.message).toContain('yarn installation failed')
  expect(failed.data.error.nextAction).toContain('with yarn')
  expect(failed.data.error.recovery.sourceRestored).toBe(true)
  expect(failed.data.error.recovery.packageStateMayHaveChanged).toBe(true)
  await expect(fs.access(root + '/src/components/ui/button.tsx')).rejects.toMatchObject({ code: 'ENOENT' })
})
it('rejects an unsupported Yarn executable before writing consumer source', async () => {
  const root = await createProject('vite')
  roots.push(root)
  await fs.rm(root + '/pnpm-lock.yaml')
  await fs.writeFile(root + '/yarn.lock', '# yarn lockfile\n')
  const pkg = JSON.parse(await fs.readFile(root + '/package.json', 'utf8'))
  pkg.packageManager = 'yarn@4.18.1'
  await fs.writeFile(root + '/package.json', JSON.stringify(pkg))
  const preset = path.resolve('examples/preset.example.json')
  expect((await command(['init', '--preset', preset, '--cwd', root, '--yes'])).exitCode).toBe(0)
  const fake = root + '/yarn.cjs'
  await fs.writeFile(fake, `if (process.argv[2] === '--version') process.stdout.write('0.0.0')\nelse process.exit(1)\n`)
  const before = await snapshotTree(root)
  const failed = await command(['add', 'button', '--cwd', root, '--yes'], {
    ...process.env,
    npm_execpath: fake,
  })
  expect(failed.exitCode, JSON.stringify(failed.data)).toBe(3)
  expect(await snapshotTree(root)).toEqual(before)
})

it('rejects schema-invalid JSON before selecting generator releases', async () => {
  const root = await createProject('vite')
  roots.push(root)
  await fs.writeFile(
    root + '/incomplete.json',
    JSON.stringify({ platform: 'react-web' }),
  )
  const result = await command([
    'init',
    '--preset',
    root + '/incomplete.json',
    '--cwd',
    root,
    '--yes',
  ])
  expect(result.exitCode).toBe(2)
  expect(result.data.error.code).toBe('INVALID_DATA')
})
