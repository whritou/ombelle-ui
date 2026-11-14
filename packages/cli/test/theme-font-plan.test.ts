import { afterEach, expect, it } from 'vitest'
import fs from 'node:fs/promises'
import { compile } from '@ombelle/compiler'
import { getCatalog } from '@ombelle/catalog'
import { createProject } from '../../../tests/helpers/projects.js'
import { inspectProject } from '../src/project/inspect.js'
import { planTheme } from '../src/plan/theme.js'

const roots: string[] = []
afterEach(async () => {
  for (const root of roots.splice(0)) await fs.rm(root, { recursive: true, force: true })
})

const catalog = getCatalog('0.1.0')
const compileWith = (preset: unknown, componentIds: string[]) =>
  compile({
    preset,
    componentIds: componentIds as never,
    catalogRelease: '0.1.0',
    compilerVersion: '0.1.0',
  })

it('plans no dependency for a theme even when the compile result carries component dependencies', async () => {
  const root = await createProject('vite')
  roots.push(root)
  const result = await compileWith(catalog.presets.minimalist, ['button'])
  expect(result.dependencies.length).toBeGreaterThan(0)
  const plan = await planTheme(await inspectProject(root), result)
  expect(plan.dependencyPlan).toEqual([])
})

it('plans only the font packages of a font preset, not the component dependencies beside them', async () => {
  const root = await createProject('vite')
  roots.push(root)
  const ombelle = structuredClone(catalog.presets.ombelle)
  const result = await compileWith(
    { ...ombelle, schemaVersion: '1.1', design: { ...ombelle.design, fontFamilyId: 'inter' } },
    ['button'],
  )
  const plan = await planTheme(await inspectProject(root), result)
  expect(plan.dependencyPlan).toEqual([{ name: '@fontsource-variable/inter', version: '5.3.0' }])
})
