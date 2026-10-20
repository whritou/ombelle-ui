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

const cli = path.resolve('packages/cli/dist/main.js')
const preset = path.resolve('examples/preset.example.json')

async function yarnProject(packageManager?: string) {
  const root = await createProject('vite')
  roots.push(root)
  await fs.rm(path.join(root, 'pnpm-lock.yaml'))
  await fs.writeFile(path.join(root, 'yarn.lock'), '# yarn lockfile\n')
  const pkg = JSON.parse(await fs.readFile(path.join(root, 'package.json'), 'utf8'))
  if (packageManager === undefined) delete pkg.packageManager
  else pkg.packageManager = packageManager
  await fs.writeFile(path.join(root, 'package.json'), JSON.stringify(pkg))
  return root
}

function command(args: string[]) {
  return new Promise<{ code: number | null; data: any }>((resolve, reject) => {
    const child = spawn(process.execPath, [cli, ...args, '--json'], {
      shell: false,
      windowsHide: true,
    })
    let output = ''
    child.stdout.on('data', (chunk) => (output += chunk))
    child.stderr.on('data', (chunk) => (output += chunk))
    child.once('error', reject)
    child.once('exit', (code) => {
      try {
        resolve({ code, data: JSON.parse(output) })
      } catch {
        reject(new Error(output))
      }
    })
  })
}

it.each(['yarn@1.22.22', 'yarn@4.63.1'])('detects %s from packageManager and yarn.lock', async (field) => {
  const root = await yarnProject(field)
  const result = await command(['init', '--preset', preset, '--cwd', root, '--dry-run'])
  expect(result.code, JSON.stringify(result.data)).toBe(0)
  expect(result.data.packageManager).toBe('yarn')
})

it('detects Yarn from a unique yarn.lock without packageManager', async () => {
  const root = await yarnProject()
  const result = await command(['init', '--preset', preset, '--cwd', root, '--dry-run'])
  expect(result.code, JSON.stringify(result.data)).toBe(0)
  expect(result.data.packageManager).toBe('yarn')
})

it('accepts an explicit Yarn choice when packageManager disagrees and yarn.lock is unique', async () => {
  const root = await yarnProject('pnpm@11.25.0')
  const result = await command([
    'init', '--preset', preset, '--cwd', root, '--package-manager', 'yarn', '--dry-run',
  ])
  expect(result.code, JSON.stringify(result.data)).toBe(0)
  expect(result.data.packageManager).toBe('yarn')
  expect(result.data.managerWarning).toContain('pnpm')
})

it('rejects multiple lockfiles before writing even with explicit selection', async () => {
  const root = await yarnProject('yarn@4.63.1')
  await fs.writeFile(path.join(root, 'pnpm-lock.yaml'), 'lockfileVersion: "9.0"\n')
  const before = await snapshotTree(root)
  const result = await command([
    'init', '--preset', preset, '--cwd', root, '--package-manager', 'yarn', '--yes',
  ])
  expect(result.code).toBe(3)
  expect(await snapshotTree(root)).toEqual(before)
})

it('rejects selecting Yarn when only a foreign lockfile exists', async () => {
  const root = await createProject('vite')
  roots.push(root)
  const before = await snapshotTree(root)
  const result = await command([
    'init', '--preset', preset, '--cwd', root, '--package-manager', 'yarn', '--dry-run',
  ])
  expect(result.code).toBe(3)
  expect(await snapshotTree(root)).toEqual(before)
})

it('rejects malformed Yarn declarations and unsupported manager choices', async () => {
  const root = await yarnProject('yarn@berry')
  const malformed = await command(['init', '--preset', preset, '--cwd', root, '--dry-run'])
  expect(malformed.code).toBe(3)
  const unsupported = await command([
    'init', '--preset', preset, '--cwd', root, '--package-manager', 'bun', '--dry-run',
  ])
  expect(unsupported.code).toBe(2)
})

it('accepts Corepack integrity suffixes for Yarn Classic and modern declarations', async () => {
  for (const field of ['yarn@1.22.22+sha224.dGVzdA==', 'yarn@4.63.1+sha224.dGVzdA==']) {
    const root = await yarnProject(field)
    const result = await command(['init', '--preset', preset, '--cwd', root, '--dry-run'])
    expect(result.code, JSON.stringify(result.data)).toBe(0)
    expect(result.data.packageManager).toBe('yarn')
  }
})

it('persists Yarn in the new Ombelle configuration', async () => {
  const root = await yarnProject('yarn@4.63.1')
  const result = await command(['init', '--preset', preset, '--cwd', root, '--yes'])
  expect(result.code, JSON.stringify(result.data)).toBe(0)
  const config = JSON.parse(await fs.readFile(path.join(root, 'ui-library.config.json'), 'utf8'))
  expect(config.packageManager).toBe('yarn')
})
