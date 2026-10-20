import { it, expect, afterEach } from 'vitest'
import fs from 'node:fs/promises'
import path from 'node:path'
import { compile } from '@ombelle/compiler'
import example from '../../../examples/preset.example.json'
import { createProject } from '../../../tests/helpers/projects.js'
import { snapshotTree } from '../../../tests/helpers/tree.js'
import { inspectProject } from '../src/project/inspect.js'
import { planAdd } from '../src/plan/components.js'
const roots: string[] = []
afterEach(async () => {
  for (const root of roots.splice(0))
    await fs.rm(root, { recursive: true, force: true })
})
const generate = () =>
  compile({
    preset: example,
    componentIds: ['button'],
    catalogRelease: '0.1.0',
    compilerVersion: '0.1.0',
  })
it('plans without writes and respects custom aliases', async () => {
  const root = await createProject('next')
  roots.push(root)
  const upstream = JSON.parse(
    await fs.readFile(root + '/components.json', 'utf8'),
  )
  upstream.aliases.ui = '~/widgets'
  upstream.aliases.utils = '~/lib/cn'
  await fs.writeFile(root + '/components.json', JSON.stringify(upstream))
  await fs.writeFile(
    root + '/tsconfig.json',
    JSON.stringify({ compilerOptions: { paths: { '~/*': ['./src/*'] } } }),
  )
  const before = await snapshotTree(root),
    plan = await planAdd(await inspectProject(root), await generate())
  expect(await snapshotTree(root)).toEqual(before)
  expect(plan.projectRoot).toBe(root)
  expect(
    plan.changes.find((c: any) => c.path === 'src/widgets/button.tsx')!
      .afterContent,
  ).toContain('~/lib/cn')
})
it('reports unknown existing files and locally changed owned files as conflicts', async () => {
  const root = await createProject('vite')
  roots.push(root)
  await fs.mkdir(root + '/src/components/ui', { recursive: true })
  await fs.writeFile(root + '/src/components/ui/button.tsx', 'local edit')
  const before = await snapshotTree(root)
  const plan = await planAdd(await inspectProject(root), await generate())
  expect(
    plan.changes.find((c: any) => c.path.endsWith('button.tsx'))!.action,
  ).toBe('conflict')
  expect(await snapshotTree(root)).toEqual(before)
})
it('recognizes recorded identical files as no-ops', async () => {
  const root = await createProject('vite')
  roots.push(root)
  const first = await planAdd(await inspectProject(root), await generate())
  for (const c of first.changes) {
    if (c.action === 'create') {
      await fs.mkdir(path.dirname(path.join(root, c.path)), { recursive: true })
      await fs.writeFile(path.join(root, c.path), c.afterContent)
    }
  }
  const next = await planAdd(await inspectProject(root), await generate())
  expect(next.changes.every((c: any) => c.action === 'noop')).toBe(true)
  await fs.appendFile(root + '/src/components/ui/button.tsx', '\n// local')
  const conflict = await planAdd(await inspectProject(root), await generate())
  expect(
    conflict.changes.find((c: any) => c.path.endsWith('button.tsx'))!.action,
  ).toBe('conflict')
})
it('rejects case-insensitive destination collisions and incompatible component editions', async () => {
  const root = await createProject('vite')
  roots.push(root)
  const r = await generate()
  r.artifacts.push({
    ...r.artifacts.find((a) => a.kind === 'component')!,
    logicalPath: 'components/ui/Button.tsx',
  })
  await expect(planAdd(await inspectProject(root), r)).rejects.toMatchObject({
    code: 'FILE_CONFLICT',
  })
  const c = JSON.parse(await fs.readFile(root + '/components.json', 'utf8'))
  c.style = 'base-nova'
  await fs.writeFile(root + '/components.json', JSON.stringify(c))
  await expect(
    planAdd(await inspectProject(root), await generate()),
  ).rejects.toMatchObject({ code: 'UNSUPPORTED_PROJECT' })
})
