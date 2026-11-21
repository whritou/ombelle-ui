// CLI-03: a CRLF checkout (Git for Windows' default) of files Ombelle wrote must not read as edited source.
import { afterEach, expect, it } from 'vitest'
import fs from 'node:fs/promises'
import path from 'node:path'
import { compile } from '@ombelle/compiler'
import example from '../../../examples/preset.example.json'
import { createProject } from '../../../tests/helpers/projects.js'
import { inspectProject } from '../src/project/inspect.js'
import { planAdd } from '../src/plan/components.js'
import { planTheme } from '../src/plan/theme.js'
import { applyPlan } from '../src/apply/transaction.js'

const roots: string[] = []
afterEach(async () => { for (const root of roots.splice(0)) await fs.rm(root, { recursive: true, force: true }) })
const build = (componentIds: ('button' | 'input')[]) =>
  compile({ preset: example, componentIds, catalogRelease: '0.1.0', compilerVersion: '0.1.0' })

it('treats CRLF copies of managed files as unedited and leaves their line endings alone', async () => {
  const root = await createProject('vite')
  roots.push(root)
  await applyPlan(await planTheme(await inspectProject(root), await build([])))
  await applyPlan(await planAdd(await inspectProject(root), await build(['button'])), { dependencies: async () => {} })
  const lock = JSON.parse(await fs.readFile(path.join(root, 'ui-library.lock.json'), 'utf8'))
  const managed = Object.keys(lock.artifacts)
  expect(managed.length).toBeGreaterThan(2)
  for (const file of managed) {
    const full = path.join(root, file)
    await fs.writeFile(full, (await fs.readFile(full, 'utf8')).replace(/\n/g, '\r\n'))
  }
  const add = await planAdd(await inspectProject(root), await build(['button', 'input']))
  expect(add.diagnostics).toEqual([])
  for (const file of managed) {
    const change = add.changes.find(item => item.path === file)
    if (change) expect([file, change.action]).toEqual([file, 'noop'])
  }
  expect(add.changes.some(change => change.path.endsWith('input.tsx') && change.action === 'create')).toBe(true)
  const theme = await planTheme(await inspectProject(root), await build([]))
  expect(theme.diagnostics).toEqual([])
  // An edit is still an edit, whatever the line endings.
  const button = managed.find(file => file.endsWith('button.tsx'))!
  await fs.appendFile(path.join(root, button), '// edited\r\n')
  const edited = await planAdd(await inspectProject(root), await build(['button']))
  expect(edited.changes.find(change => change.path === button)?.action).toBe('conflict')
})
