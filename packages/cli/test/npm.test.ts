import { it, expect, afterEach } from 'vitest'
import fs from 'node:fs/promises'
import { createNpmProject } from '../../../tests/helpers/npm-project.js'
import { inspectProject } from '../src/project/inspect.js'
import { planAdd } from '../src/plan/components.js'
import { planTheme } from '../src/plan/theme.js'
import { applyPlan } from '../src/apply/transaction.js'
import { compile } from '@ombelle/compiler'
import example from '../../../examples/preset.example.json'
const roots: string[] = []
afterEach(async () => {
  for (const root of roots.splice(0))
    await fs.rm(root, { recursive: true, force: true })
})
it.each(['field-and-lock', 'field-only', 'lock-only'])(
  'selects npm using target evidence: %s',
  async (evidence) => {
    const root = await createNpmProject('vite')
    roots.push(root)
    if (evidence === 'field-only') await fs.rm(root + '/package-lock.json')
    if (evidence === 'lock-only') {
      const pkg = JSON.parse(await fs.readFile(root + '/package.json', 'utf8'))
      delete pkg.packageManager
      await fs.writeFile(root + '/package.json', JSON.stringify(pkg))
    }
    expect((await inspectProject(root)).manager).toBe('npm')
  },
)
it('rejects contradictory manager declarations and lock evidence', async () => {
  const root = await createNpmProject('vite')
  roots.push(root)
  const pkg = JSON.parse(await fs.readFile(root + '/package.json', 'utf8'))
  pkg.packageManager = 'pnpm@11.25.0'
  await fs.writeFile(root + '/package.json', JSON.stringify(pkg))
  await expect(inspectProject(root)).rejects.toMatchObject({
    code: 'UNSUPPORTED_PROJECT',
  })
})
it('carries npm selection through source and theme plans and saves it in config', async () => {
  const root = await createNpmProject('vite')
  roots.push(root)
  const context = await inspectProject(root)
  const result = await compile({
    preset: example,
    componentIds: ['button'],
    catalogRelease: '0.1.0',
    compilerVersion: '0.1.0',
  })
  for (const plan of [
    await planAdd(context, result),
    await planTheme(context, result),
  ]) {
    expect(plan.packageManager).toBe('npm')
    expect(
      JSON.parse(
        plan.changes.find((c) => c.path === 'ui-library.config.json')!
          .afterContent,
      ).packageManager,
    ).toBe('npm')
  }
})
it('rejects stale npm lockfiles before any dependency or source operation', async () => {
  const root = await createNpmProject('vite')
  roots.push(root)
  const result = await compile({
    preset: example,
    componentIds: ['button'],
    catalogRelease: '0.1.0',
    compilerVersion: '0.1.0',
  })
  const plan = await planAdd(await inspectProject(root), result)
  await fs.appendFile(root + '/package-lock.json', '\n')
  await expect(applyPlan(plan)).rejects.toMatchObject({ code: 'FILE_CONFLICT' })
  await expect(
    fs.access(root + '/src/components/ui/button.tsx'),
  ).rejects.toMatchObject({ code: 'ENOENT' })
})
