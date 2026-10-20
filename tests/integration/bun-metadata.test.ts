import { afterEach, expect, it, vi } from 'vitest'
import fs from 'node:fs/promises'
import path from 'node:path'
import os from 'node:os'
import { inspectProject } from '../../packages/cli/src/project/inspect.js'
import { planTheme } from '../../packages/cli/src/plan/theme.js'
import { planAdd } from '../../packages/cli/src/plan/components.js'
import { applyPlan } from '../../packages/cli/src/apply/transaction.js'
import { compile } from '@ombelle/compiler'
import { createProject } from '../helpers/projects.js'
import { snapshotTree } from '../helpers/tree.js'
const roots: string[] = []
afterEach(async () => { for (const root of roots.splice(0)) await fs.rm(root, { recursive: true, force: true }) })
it.each(['binary', 'config', 'alternate'])('rejects stale %s metadata before writing source', async (change) => {
  const root = await createProject('vite'); roots.push(root)
  await fs.rm(path.join(root, 'pnpm-lock.yaml'))
  const pkg = JSON.parse(await fs.readFile(path.join(root, 'package.json'), 'utf8')); pkg.packageManager = 'bun@1.4.3'
  await fs.writeFile(path.join(root, 'package.json'), JSON.stringify(pkg))
  await fs.writeFile(path.join(root, 'bun.lockb'), Buffer.from([0x80]))
  await fs.writeFile(path.join(root, 'bunfig.toml'), '[install]\nignoreScripts = true\n')
  const context = await inspectProject(root)
  const preset = JSON.parse(await fs.readFile('examples/preset.example.json', 'utf8'))
  const plan = await planTheme(context, await compile({ preset, componentIds: [], catalogRelease: preset.catalogRelease, compilerVersion: preset.compilerVersion }))
  if (change === 'binary') await fs.writeFile(path.join(root, 'bun.lockb'), Buffer.from([0x81]))
  if (change === 'config') await fs.appendFile(path.join(root, 'bunfig.toml'), 'exact = true\n')
  if (change === 'alternate') await fs.writeFile(path.join(root, 'bun.lock'), '{}')
  const before = await snapshotTree(root), dependencies = vi.fn()
  await expect(applyPlan(plan, { dependencies })).rejects.toMatchObject({ code: 'FILE_CONFLICT' })
  expect(dependencies).not.toHaveBeenCalled()
  expect(await snapshotTree(root)).toEqual(before)
})
it.each(['manifest', 'pnpm', 'during-write'])('rejects newly governing workspace %s before invoking dependencies', async change => {
  const parent = await fs.mkdtemp(path.join(os.tmpdir(), 'ombelle-workspace-race-'))
  roots.push(parent)
  const template = await createProject('vite'); roots.push(template)
  const root = path.join(parent, 'apps/app')
  await fs.cp(template, root, { recursive: true })
  await fs.rm(path.join(root, 'pnpm-lock.yaml'))
  const pkg = JSON.parse(await fs.readFile(path.join(root, 'package.json'), 'utf8'))
  pkg.packageManager = 'bun@1.4.3'
  await fs.writeFile(path.join(root, 'package.json'), JSON.stringify(pkg))
  const preset = JSON.parse(await fs.readFile('examples/preset.example.json', 'utf8'))
  const plan = await planAdd(await inspectProject(root), await compile({ preset, componentIds: ['button'], catalogRelease: preset.catalogRelease, compilerVersion: preset.compilerVersion }))
  expect(plan.dependencyPlan.length).toBeGreaterThan(0)
  const govern = () => change === 'pnpm'
    ? fs.writeFile(path.join(parent, 'pnpm-workspace.yaml'), 'packages:\n  - apps/*\n')
    : fs.writeFile(path.join(parent, 'package.json'), JSON.stringify({ private: true, workspaces: ['apps/*'] }))
  if (change !== 'during-write') await govern()
  const before = await snapshotTree(root), dependencies = vi.fn()
  await expect(applyPlan(plan, {
    dependencies,
    beforeWrite: change === 'during-write' ? async (_file, index) => { if (index === 0) await govern() } : undefined,
  })).rejects.toMatchObject({ code: 'UNSUPPORTED_PROJECT', ...(change === 'during-write' ? { recovery: { sourceRestored: true, packageStateMayHaveChanged: false } } : {}) })
  expect(dependencies).not.toHaveBeenCalled()
  const after = await snapshotTree(root)
  for (const key of Object.keys(after)) if (key.startsWith('.ombelle-transactions/')) delete after[key]
  expect(after).toEqual(before)
  await expect(fs.access(path.join(parent, 'bun.lock'))).rejects.toMatchObject({ code: 'ENOENT' })
  await expect(fs.access(path.join(parent, 'node_modules'))).rejects.toMatchObject({ code: 'ENOENT' })
})
