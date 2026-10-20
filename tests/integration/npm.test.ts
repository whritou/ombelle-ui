import { it, expect, afterEach } from 'vitest'
import fs from 'node:fs/promises'
import path from 'node:path'
import { spawn } from 'node:child_process'
import { createNpmProject } from '../helpers/npm-project.js'
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
  env = process.env,
): Promise<{ code: number | null; data: any }> {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [cli, ...args, '--json'], {
      shell: false,
      windowsHide: true,
      env: Object.fromEntries(
        Object.entries(env).map(([key, value]) => [
          process.platform === 'win32' ? key.toUpperCase() : key,
          value,
        ]),
      ),
    })
    let text = ''
    child.stdout.on('data', (s) => (text += s))
    child.stderr.on('data', (s) => (text += s))
    child.on('error', reject)
    child.on('exit', (code) => {
      try {
        resolve({ code, data: JSON.parse(text) })
      } catch {
        reject(new Error(text))
      }
    })
  })
}
it.each(['vite', 'next'] as const)(
  'installs into an npm %s app from a pnpm launcher and preserves its manager and source',
  async (framework) => {
    const root = await createNpmProject(framework)
    roots.push(root)
    await fs.writeFile(root + '/.npmrc', 'package-lock=false\nsave=false\n')
    const before = await snapshotTree(root)
    const dry = await command([
      'init',
      '--preset',
      preset,
      '--cwd',
      root,
      '--dry-run',
    ])
    expect(dry.code, JSON.stringify(dry.data)).toBe(0)
    expect(dry.data.packageManager).toBe('npm')
    expect(await snapshotTree(root)).toEqual(before)
    const init = await command([
      'init',
      '--preset',
      preset,
      '--cwd',
      root,
      '--yes',
    ])
    expect(init.code, JSON.stringify(init.data)).toBe(0)
    const add = await command([
      'add',
      'button',
      'dialog',
      '--cwd',
      root,
      '--yes',
    ])
    expect(add.code, JSON.stringify(add.data)).toBe(0)
    const pkg = JSON.parse(await fs.readFile(root + '/package.json', 'utf8'))
    expect(pkg.packageManager).toBe('npm@11.19.0')
    expect(pkg.dependencies['@radix-ui/react-dialog']).toBe('1.3.1')
    const lock = JSON.parse(
      await fs.readFile(root + '/package-lock.json', 'utf8'),
    )
    expect(lock.lockfileVersion).toBe(3)
    expect(lock.packages['node_modules/@radix-ui/react-dialog'].version).toBe(
      '1.3.1',
    )
    await expect(fs.access(root + '/pnpm-lock.yaml')).rejects.toMatchObject({
      code: 'ENOENT',
    })
    await expect(fs.access(root + '/lifecycle-ran')).rejects.toMatchObject({
      code: 'ENOENT',
    })
    const input = await command(['add', 'input', '--cwd', root, '--yes'])
    expect(input.code, JSON.stringify(input.data)).toBe(0)
    expect(input.data.presetHash).toBe(init.data.presetHash)
    const repeated = await command(['add', 'input', '--cwd', root, '--yes'])
    expect(repeated.code).toBe(0)
    expect(repeated.data.changes.every((c: any) => c.action === 'noop')).toBe(
      true,
    )
    const lockBeforeTheme = await fs.readFile(
      root + '/package-lock.json',
      'utf8',
    )
    await fs.appendFile(
      root + '/src/index.css',
      '\n.user-style { color: hotpink; }\n',
    )
    const failedManager = root + '/npm-cli.js'
    await fs.writeFile(failedManager, 'process.exit(1)')
    const theme = await command(
      ['theme', 'add', preset, '--cwd', root, '--yes'],
      { ...process.env, npm_execpath: failedManager },
    )
    expect(theme.code, JSON.stringify(theme.data)).toBe(0)
    expect(await fs.readFile(root + '/package-lock.json', 'utf8')).toBe(
      lockBeforeTheme,
    )
    expect(await fs.readFile(root + '/src/index.css', 'utf8')).toContain(
      '.user-style',
    )
    await fs.appendFile(
      root + '/src/components/ui/button.tsx',
      '\n// user edit',
    )
    const files = await snapshotTree(root)
    const conflict = await command(['add', 'button', '--cwd', root, '--yes'])
    expect(conflict.code).toBe(4)
    expect(await snapshotTree(root)).toEqual(files)
  },
  120000,
)
it('reports npm failure with source recovery and dependency uncertainty', async () => {
  const root = await createNpmProject('vite')
  roots.push(root)
  expect(
    (await command(['init', '--preset', preset, '--cwd', root, '--yes'])).code,
  ).toBe(0)
  const fake = root + '/npm-cli.js'
  await fs.writeFile(fake, 'process.exit(1)')
  const failed = await command(['add', 'button', '--cwd', root, '--yes'], {
    ...process.env,
    npm_execpath: fake,
  })
  expect(failed.code, JSON.stringify(failed.data)).toBe(6)
  expect(failed.data.error.nextAction).toContain('with npm')
  expect(failed.data.error.recovery.sourceRestored).toBe(true)
  expect(failed.data.error.recovery.packageStateMayHaveChanged).toBe(true)
  await expect(
    fs.access(root + '/src/components/ui/button.tsx'),
  ).rejects.toMatchObject({ code: 'ENOENT' })
})
