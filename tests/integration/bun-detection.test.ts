import { afterEach, expect, it } from 'vitest'
import fs from 'node:fs/promises'
import path from 'node:path'
import { inspectProject } from '../../packages/cli/src/project/inspect.js'
import { planTheme } from '../../packages/cli/src/plan/theme.js'
import { applyPlan } from '../../packages/cli/src/apply/transaction.js'
import { planOutput } from '../../packages/cli/src/format.js'
import { compile } from '@ombelle/compiler'
import { createProject } from '../helpers/projects.js'
import { snapshotTree } from '../helpers/tree.js'

const roots: string[] = []
afterEach(async () => { for (const root of roots.splice(0)) await fs.rm(root, { recursive: true, force: true }) })
async function project(lock?: string, declaration: string | null = 'bun@1.4.3') {
  const root = await createProject('vite'); roots.push(root)
  await fs.rm(path.join(root, 'pnpm-lock.yaml'))
  const pkg = JSON.parse(await fs.readFile(path.join(root, 'package.json'), 'utf8'))
  if (declaration) pkg.packageManager = declaration; else delete pkg.packageManager
  await fs.writeFile(path.join(root, 'package.json'), JSON.stringify(pkg))
  if (lock) await fs.writeFile(path.join(root, lock), lock.endsWith('lockb') ? Buffer.from([0x80]) : '{}')
  return root
}
it.each(['bun.lock', 'bun.lockb'])('detects lock-only %s and persists Bun', async (lock) => {
  const root = await project(lock, null)
  const context = await inspectProject(root)
  expect(context.manager).toBe('bun')
  expect(context.bunLockfile).toBe(lock)
  const preset = JSON.parse(await fs.readFile('examples/preset.example.json', 'utf8'))
  const plan = await planTheme(context, await compile({ preset, componentIds: [], catalogRelease: preset.catalogRelease, compilerVersion: preset.compilerVersion }))
  expect(planOutput('init', 'planned', plan).bunLockfile).toBe(lock)
  await applyPlan(plan)
  expect(JSON.parse(await fs.readFile(path.join(root, 'ui-library.config.json'), 'utf8')).packageManager).toBe('bun')
})
it.each(['bun@1.4.3', 'bun@1.4.3+sha224.dGVzdA=='])('accepts %s without creating a lock', async (declaration) => {
  const root = await project(undefined, declaration)
  expect((await inspectProject(root)).bunLockfile).toBe('bun.lock')
  await expect(fs.access(path.join(root, 'bun.lock'))).rejects.toMatchObject({ code: 'ENOENT' })
})
it.each(['bun.lockb', 'pnpm-lock.yaml', 'yarn.lock', 'package-lock.json'])('rejects extra %s before writes', async (other) => {
  const root = await project('bun.lock')
  await fs.writeFile(path.join(root, other), '{}')
  const before = await snapshotTree(root)
  await expect(inspectProject(root, 'bun')).rejects.toMatchObject({ code: 'UNSUPPORTED_PROJECT' })
  expect(await snapshotTree(root)).toEqual(before)
})
it('permits an explicit Bun override only with its unique owned lock', async () => {
  const root = await project('bun.lock', 'npm@11.19.0')
  await expect(inspectProject(root)).rejects.toMatchObject({ code: 'UNSUPPORTED_PROJECT' })
  const context = await inspectProject(root, 'bun')
  const preset = JSON.parse(await fs.readFile('examples/preset.example.json', 'utf8'))
  const plan = await planTheme(context, await compile({ preset, componentIds: [], catalogRelease: preset.catalogRelease, compilerVersion: preset.compilerVersion }))
  expect(plan.managerWarning).toContain('npm')
  await fs.rm(path.join(root, 'bun.lock')); await fs.writeFile(path.join(root, 'package-lock.json'), '{}')
  await expect(inspectProject(root, 'bun')).rejects.toMatchObject({ code: 'UNSUPPORTED_PROJECT' })
})
it('rejects malformed declarations and a conflicting saved manager', async () => {
  const root = await project('bun.lock', 'bun@latest')
  await expect(inspectProject(root)).rejects.toMatchObject({ code: 'UNSUPPORTED_PROJECT' })
  const pkg = JSON.parse(await fs.readFile(path.join(root, 'package.json'), 'utf8')); pkg.packageManager = 'bun@1.4.3'
  await fs.writeFile(path.join(root, 'package.json'), JSON.stringify(pkg))
  await fs.writeFile(path.join(root, 'ui-library.config.json'), JSON.stringify({ configVersion: 1, platform: 'react-web', language: 'tsx', presetFile: 'ui-preset.json', lockFile: 'ui-library.lock.json', theme: { cssEntry: 'src/index.css' }, packageManager: 'npm' }))
  await expect(inspectProject(root)).rejects.toMatchObject({ code: 'UNSUPPORTED_PROJECT' })
})
it('rejects an app governed by a parent workspace', async () => {
  const parent = await project()
  const child = await project('bun.lock')
  const nested = path.join(parent, 'apps', 'web')
  await fs.mkdir(path.dirname(nested), { recursive: true }); await fs.cp(child, nested, { recursive: true })
  await fs.writeFile(path.join(parent, 'package.json'), JSON.stringify({ workspaces: ['apps/*'] }))
  await expect(inspectProject(nested)).rejects.toMatchObject({ code: 'UNSUPPORTED_PROJECT' })
})
