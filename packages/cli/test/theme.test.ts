import { it, expect, afterEach, vi } from 'vitest'
import fs from 'node:fs/promises'
import path from 'node:path'
import { compile } from '@ombelle/compiler'
import example from '../../../examples/preset.example.json'
import { createProject } from '../../../tests/helpers/projects.js'
import { inspectProject } from '../src/project/inspect.js'
import { planTheme } from '../src/plan/theme.js'
import type { InstallPlan } from '@ombelle/contracts'
import { applyPlan } from '../src/apply/transaction.js'
const roots: string[] = []
afterEach(async () => {
  vi.restoreAllMocks()
  for (const root of roots.splice(0))
    await fs.rm(root, { recursive: true, force: true })
})
const result = () =>
  compile({
    preset: example,
    componentIds: [],
    catalogRelease: '0.1.0',
    compilerVersion: '0.1.0',
  })
async function materialize(p: InstallPlan) {
  for (const c of p.changes) {
    if (c.action === 'create' || c.action === 'update') {
      await fs.mkdir(path.dirname(path.join(p.projectRoot, c.path)), {
        recursive: true,
      })
      await fs.writeFile(path.join(p.projectRoot, c.path), c.afterContent)
    }
  }
}
it('merges tokens, retains unrelated content, imports reviewed style, and repeats as a no-op', async () => {
  const root = await createProject('vite')
  roots.push(root)
  const original = await fs.readFile(root + '/components.json', 'utf8')
  const p = await planTheme(await inspectProject(root), await result())
  expect(p.dependencyPlan).toEqual([])
  expect(p.changes.some((c: any) => c.kind === 'component')).toBe(false)
  const css = p.changes.find(
    (c: any) => c.path === 'src/index.css',
  )!.afterContent
  expect(css).toContain('/* keep me */')
  expect(css).toContain('--unrelated: 42')
  expect(css).toContain('--primary: #facc15')
  expect(css).toContain('@theme inline')
  expect(css).toContain('ui-style.css')
  await materialize(p)
  expect(await fs.readFile(root + '/components.json', 'utf8')).toBe(original)
  const repeated = await planTheme(await inspectProject(root), await result())
  expect(repeated.changes.every((c: any) => c.action === 'noop')).toBe(true)
})
it('allows unrelated stylesheet edits but conflicts on modified managed tokens', async () => {
  const root = await createProject('vite')
  roots.push(root)
  await materialize(await planTheme(await inspectProject(root), await result()))
  await fs.appendFile(
    root + '/src/index.css',
    '\n.custom { color: hotpink; }\n',
  )
  expect(
    (await planTheme(await inspectProject(root), await result())).diagnostics,
  ).toEqual([])
  const css = await fs.readFile(root + '/src/index.css', 'utf8')
  await fs.writeFile(
    root + '/src/index.css',
    css.replace('--primary: #facc15', '--primary: #ff0000'),
  )
  const conflict = await planTheme(await inspectProject(root), await result())
  expect(conflict.changes.some((c: any) => c.action === 'conflict')).toBe(true)
})
it.each([
  ':root { --primary:red; --primary:blue; }',
  ':root { --primary:red; } :root { --other:blue; }',
])('rejects ambiguous managed CSS before writing', async (css) => {
  const root = await createProject('vite')
  roots.push(root)
  await fs.writeFile(root + '/src/index.css', css)
  await expect(
    planTheme(await inspectProject(root), await result()),
  ).rejects.toMatchObject({ code: 'UNSUPPORTED_PROJECT' })
  expect(await fs.readFile(root + '/src/index.css', 'utf8')).toBe(css)
})
it('uses a configured dark selector and permits palette-only application to another primitive edition', async () => {
  const root = await createProject('vite')
  roots.push(root)
  const config = JSON.parse(
    await fs.readFile(root + '/components.json', 'utf8'),
  )
  config.style = 'base-nova'
  await fs.writeFile(root + '/components.json', JSON.stringify(config))
  await fs.writeFile(
    root + '/ui-library.config.json',
    JSON.stringify({
      configVersion: 1,
      platform: 'react-web',
      language: 'tsx',
      presetFile: './ui-preset.json',
      lockFile: './ui-library.lock.json',
      theme: {
        strategy: 'merge',
        cssEntry: 'src/index.css',
        darkSelector: '.night',
      },
      paths: {
        components: 'src/components/ui',
        styleOutput: 'src/styles/ui-style.css',
      },
    }),
  )
  const plan = await planTheme(await inspectProject(root), await result())
  expect(
    plan.changes.find((c: any) => c.path === 'src/index.css')!.afterContent,
  ).toContain('.night')
  expect(
    plan.changes.some((c: any) => c.path === 'src/styles/ui-style.css'),
  ).toBe(false)
  expect(plan.dependencyPlan).toEqual([])
})

it.each([false, true])(
  'conflicts when managed priority changes from %s',
  async (initialImportant) => {
    const root = await createProject('vite')
    roots.push(root)
    if (initialImportant)
      await fs.writeFile(
        root + '/src/index.css',
        ':root { --primary: #facc15 !important; }',
      )
    await materialize(
      await planTheme(await inspectProject(root), await result()),
    )
    if (!initialImportant) {
      const lockFile = root + '/ui-library.lock.json'
      const lock = JSON.parse(await fs.readFile(lockFile, 'utf8'))
      for (const record of lock.managedDeclarations) delete record.important
      await fs.writeFile(lockFile, JSON.stringify(lock))
    }
    const file = root + '/src/index.css'
    const css = await fs.readFile(file, 'utf8')
    const edited = initialImportant
      ? css.replace('#facc15 !important', '#facc15')
      : css.replace('--primary: #facc15', '--primary: #facc15 !important')
    expect(edited).not.toBe(css)
    await fs.writeFile(file, edited)
    const plan = await planTheme(await inspectProject(root), await result())
    expect(plan.diagnostics).toContainEqual(
      expect.objectContaining({ code: 'FILE_CONFLICT' }),
    )
    await expect(applyPlan(plan)).rejects.toMatchObject({
      code: 'FILE_CONFLICT',
    })
    expect(await fs.readFile(file, 'utf8')).toBe(edited)
  },
)
it('rejects an unrelated edit made during theme planning without erasing it', async () => {
  const root = await createProject('vite')
  roots.push(root)
  const context = await inspectProject(root)
  const compiled = await result()
  const file = path.resolve(root, 'src/index.css')
  const read = fs.readFile.bind(fs)
  let edited = false
  vi.spyOn(fs, 'readFile').mockImplementation((async (...args: any[]) => {
    const text = await (read as any)(...args)
    if (!edited && path.resolve(String(args[0])) === file) {
      edited = true
      await fs.appendFile(
        file,
        '\n.user-edit-during-plan { color: hotpink; }\n',
      )
    }
    return text
  }) as any)
  const plan = await planTheme(context, compiled)
  vi.restoreAllMocks()
  const before = await fs.readFile(file, 'utf8')
  await expect(applyPlan(plan)).rejects.toMatchObject({ code: 'FILE_CONFLICT' })
  expect(await fs.readFile(file, 'utf8')).toBe(before)
})
