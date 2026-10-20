import { it, expect, afterEach } from 'vitest'
import fs from 'node:fs/promises'
import path from 'node:path'
import { spawn } from 'node:child_process'
import { compile } from '@ombelle/compiler'
import example from '../../../examples/preset.example.json'
import { createProject } from '../../../tests/helpers/projects.js'
import { snapshotTree } from '../../../tests/helpers/tree.js'
import { inspectProject } from '../src/project/inspect.js'
import { planAdd } from '../src/plan/components.js'
import { applyPlan } from '../src/apply/transaction.js'
const roots: string[] = []
afterEach(async () => {
  for (const root of roots.splice(0))
    await fs.rm(root, { recursive: true, force: true })
})
async function setup() {
  const root = await createProject('vite')
  roots.push(root)
  const result = await compile({
    preset: example,
    componentIds: ['button'],
    catalogRelease: '0.1.0',
    compilerVersion: '0.1.0',
  })
  return { root, plan: await planAdd(await inspectProject(root), result) }
}
it('writes artifacts and final hashes, and rejects stale source', async () => {
  const { root, plan } = await setup()
  const result = await applyPlan(plan, { dependencies: async () => {} })
  expect(result.status).toBe('success')
  expect(
    await fs.readFile(root + '/src/components/ui/button.tsx', 'utf8'),
  ).toContain('data-slot')
  const next = await planAdd(
    await inspectProject(root),
    await compile({
      preset: example,
      componentIds: ['button'],
      catalogRelease: '0.1.0',
      compilerVersion: '0.1.0',
    }),
  )
  await fs.appendFile(root + '/src/components/ui/button.tsx', '\n// user edit')
  const before = await snapshotTree(root)
  await expect(applyPlan(next)).rejects.toMatchObject({ code: 'FILE_CONFLICT' })
  expect(await snapshotTree(root)).toEqual(before)
})
it('restores exact source/config files after a mid-write failure', async () => {
  const { root, plan } = await setup()
  const before = await snapshotTree(root)
  await expect(
    applyPlan(plan, {
      dependencies: async () => {},
      beforeWrite: async (_file: string, index: number) => {
        if (index === 1) throw new Error('simulated write failure')
      },
    }),
  ).rejects.toMatchObject({
    code: 'INTERNAL_ERROR',
    recovery: { sourceRestored: true },
  })
  const after = await snapshotTree(root)
  for (const key of Object.keys(after))
    if (key.startsWith('.ombelle-transactions')) delete after[key]
  expect(after).toEqual(before)
})
it('reports dependency failure and preserves transaction evidence', async () => {
  const { root, plan } = await setup()
  await expect(
    applyPlan(plan, {
      dependencies: async () => {
        throw new Error('network failure')
      },
    }),
  ).rejects.toMatchObject({
    code: 'DEPENDENCY_FAILURE',
    recovery: { sourceRestored: true, packageStateMayHaveChanged: true },
  })
  await expect(
    fs.access(root + '/src/components/ui/button.tsx'),
  ).rejects.toMatchObject({ code: 'ENOENT' })
  expect((await fs.readdir(root + '/.ombelle-transactions')).length).toBe(1)
})
it('rejects changed project metadata after planning', async () => {
  const { root, plan } = await setup()
  await fs.appendFile(root + '/tsconfig.json', ' ')
  await expect(
    applyPlan(plan, { dependencies: async () => {} }),
  ).rejects.toMatchObject({ code: 'FILE_CONFLICT' })
})
it('rejects a replaced parent junction before source writes', async () => {
  const { root, plan } = await setup(),
    outside = await createProject('vite')
  roots.push(outside)
  await fs.mkdir(root + '/src/components', { recursive: true })
  await fs.symlink(
    outside,
    root + '/src/components/ui',
    process.platform === 'win32' ? 'junction' : 'dir',
  )
  await expect(
    applyPlan(plan, { dependencies: async () => {} }),
  ).rejects.toMatchObject({ code: 'UNSUPPORTED_PROJECT' })
  await expect(fs.access(outside + '/button.tsx')).rejects.toMatchObject({
    code: 'ENOENT',
  })
})
it('cannot interleave writes while another process owns the operation lock', async () => {
  const { root, plan } = await setup()
  const child = spawn(
    process.execPath,
    [
      '--input-type=module',
      '-e',
      "import fs from 'node:fs/promises';const f=await fs.open(process.argv[1]+'/.ombelle-operation.lock','wx');console.log('locked');await new Promise(r=>setTimeout(r,1000));await f.close();await fs.unlink(process.argv[1]+'/.ombelle-operation.lock')",
      root,
    ],
    { stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true },
  )
  await new Promise<void>((resolve, reject) => {
    child.once('error', reject)
    child.stdout.once('data', () => resolve())
  })
  try {
    await expect(
      applyPlan(plan, { dependencies: async () => {} }),
    ).rejects.toMatchObject({ code: 'FILE_CONFLICT' })
  } finally {
    await new Promise<void>((resolve) => child.once('exit', () => resolve()))
  }
})
