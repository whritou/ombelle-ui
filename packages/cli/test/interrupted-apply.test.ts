// CLI-02: a process killed at any point of an apply must leave a project the next command can recover.
// The ports capture the project exactly as a kill at that moment would leave it; the copy's lock is then
// handed to a process that no longer exists.
import { afterEach, expect, it } from 'vitest'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import { compile } from '@ombelle/compiler'
import type { InstallPlan } from '@ombelle/contracts'
import example from '../../../examples/preset.example.json'
import { createProject } from '../../../tests/helpers/projects.js'
import { snapshotTree } from '../../../tests/helpers/tree.js'
import { inspectProject } from '../src/project/inspect.js'
import { planAdd } from '../src/plan/components.js'
import { applyPlan } from '../src/apply/transaction.js'
import { recoverInterruptedOperation } from '../src/apply/recovery.js'

const roots: string[] = []
afterEach(async () => {
  for (const root of roots.splice(0)) await fs.rm(root, { recursive: true, force: true })
})
const deadPid = () => spawnSync(process.execPath, ['-e', '']).pid!
const withoutRecords = (tree: Record<string, string>) =>
  Object.fromEntries(Object.entries(tree).filter(([file]) => !file.startsWith('.ombelle-transactions/')))

async function setup(): Promise<{ root: string; plan: InstallPlan }> {
  const root = await createProject('vite')
  roots.push(root)
  const result = await compile({ preset: example, componentIds: ['button', 'dialog'], catalogRelease: '0.1.0', compilerVersion: '0.1.0' })
  const plan = await planAdd(await inspectProject(root), result)
  expect(plan.dependencyPlan.length).toBeGreaterThan(0)
  return { root, plan }
}
async function capture(root: string): Promise<string> {
  const copy = await fs.mkdtemp(path.join(os.tmpdir(), 'ombelle-killed-'))
  roots.push(copy)
  await fs.cp(root, copy, { recursive: true, filter: source => !source.includes('node_modules') })
  const lock = path.join(copy, '.ombelle-operation.lock')
  const owner = JSON.parse(await fs.readFile(lock, 'utf8'))
  await fs.writeFile(lock, JSON.stringify({ ...owner, pid: deadPid() }))
  return copy
}

it('recovers a kill before any write, between writes and during the package install', async () => {
  const { root, plan } = await setup()
  const original = await snapshotTree(root)
  const killed: string[] = []
  const pending = plan.changes.filter(change => change.action !== 'noop').length
  await applyPlan(plan, {
    beforeWrite: async (_file, index) => { if (index === 0 || index === Math.floor(pending / 2)) killed.push(await capture(root)) },
    dependencies: async () => { killed.push(await capture(root)) },
  })
  expect(killed).toHaveLength(3)
  for (const [n, copy] of killed.entries()) {
    expect(await fs.readFile(path.join(copy, '.ombelle-operation.lock'), 'utf8')).toContain('"pid"')
    // The next apply restores the project, releases the lock and asks to run the command again.
    const next = { ...plan, projectRoot: copy }
    const error = await applyPlan(next, { dependencies: async () => {} }).catch(e => e)
    expect(error).toMatchObject({ code: 'FILE_CONFLICT', recovery: { sourceRestored: true, interrupted: true,
      packageStateMayHaveChanged: n === 2 } })
    expect(withoutRecords(await snapshotTree(copy))).toEqual(withoutRecords({ ...original }))
    await expect(fs.access(path.join(copy, '.ombelle-operation.lock'))).rejects.toThrow()
    // The original plan now applies cleanly.
    expect((await applyPlan(next, { dependencies: async () => {} })).status).toBe('success')
  }
})

it('only releases the lock when the kill came after the apply finished', async () => {
  const { root, plan } = await setup()
  await applyPlan(plan, { dependencies: async () => {} })
  const done = await snapshotTree(root)
  const transaction = path.join(root, '.ombelle-transactions', 'finished')
  await fs.mkdir(transaction, { recursive: true })
  await fs.writeFile(path.join(transaction, 'plan.json'), JSON.stringify(plan))
  await fs.writeFile(path.join(transaction, 'complete'), '')
  await fs.writeFile(path.join(root, '.ombelle-operation.lock'), JSON.stringify({
    pid: deadPid(), hostname: os.hostname(), startedAt: new Date().toISOString(), transaction: '.ombelle-transactions/finished' }))
  expect(await recoverInterruptedOperation(root)).toEqual([expect.objectContaining({ restoredPaths: [] })])
  expect(await snapshotTree(root)).toEqual(done)
})

it('recovers an empty lock left by 0.9 once no 0.9 apply can still be running', async () => {
  const { root, plan } = await setup()
  const original = await snapshotTree(root)
  let copy = ''
  await applyPlan(plan, { dependencies: async () => { copy = await capture(root) } })
  const lock = path.join(copy, '.ombelle-operation.lock')
  await fs.writeFile(lock, '')
  await expect(applyPlan({ ...plan, projectRoot: copy }, { dependencies: async () => {} })).rejects.toThrow('Another operation is running')
  const old = new Date(Date.now() - 11 * 60 * 1000)
  await fs.utimes(lock, old, old)
  const [recovery] = (await recoverInterruptedOperation(copy))!
  expect(recovery).toMatchObject({ sourceRestored: true, packageStateMayHaveChanged: true })
  expect(withoutRecords(await snapshotTree(copy))).toEqual(original)
})

it('refuses to touch a project whose lock belongs to a running process', async () => {
  const { root, plan } = await setup()
  await fs.writeFile(path.join(root, '.ombelle-operation.lock'), JSON.stringify({
    pid: process.pid, hostname: os.hostname(), startedAt: new Date().toISOString() }))
  const before = await snapshotTree(root)
  await expect(applyPlan(plan, { dependencies: async () => {} })).rejects.toMatchObject({ code: 'FILE_CONFLICT' })
  expect(await snapshotTree(root)).toEqual(before)
})

it('rolls back when interrupted by Ctrl-C during the package install', async () => {
  const { root, plan } = await setup()
  const original = await snapshotTree(root)
  const error = await applyPlan(plan, {
    dependencies: async (_root, _deps, _manager, _prepared, _lockfile, signal) => {
      process.emit('SIGINT', 'SIGINT')
      expect(signal?.aborted).toBe(true)
    },
  }).catch(e => e)
  expect(error).toMatchObject({ recovery: { sourceRestored: true, interrupted: true, packageStateMayHaveChanged: true } })
  expect(error.message).toContain('Interrupted by SIGINT')
  expect(withoutRecords(await snapshotTree(root))).toEqual(original)
  await expect(fs.access(path.join(root, '.ombelle-operation.lock'))).rejects.toThrow()
})
