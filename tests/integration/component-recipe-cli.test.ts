import fs from 'node:fs/promises'
import path from 'node:path'
import { afterEach, expect, it } from 'vitest'
import { getCatalog } from '@ombelle/catalog'
import { compileComponentRecipe } from '@ombelle/compiler'
import badge from '../../examples/component-recipe.badge.json'
import button from '../../examples/recipe.example.json'
import { runBuiltCli, jsonRecord } from '../helpers/cli-runtime.js'
import { createProject } from '../helpers/projects.js'
import { snapshotTree } from '../helpers/tree.js'
import { catalogRecipeFixtures } from '../helpers/catalog-recipe-fixtures.js'
import { startSnapshotService } from '../helpers/snapshot-service.js'
import { randomUUID } from 'node:crypto'

const roots: string[] = []
afterEach(async () => {
  for (const root of roots.splice(0)) await fs.rm(root, { recursive: true, force: true })
})

it('installs Badge through a custom alias and preserves the initialized host', async () => {
  const root = await createProject('vite')
  roots.push(root)
  const write = (name: string, value: unknown) => fs.writeFile(path.join(root, name), JSON.stringify(value))
  const pkg = JSON.parse(await fs.readFile(path.join(root, 'package.json'), 'utf8'))
  const catalog = getCatalog('0.1.0')
  for (const item of [...catalog.templates.button.dependencies, ...catalog.templates.badge.dependencies])
    pkg.dependencies[item.name] = item.version
  await write('package.json', pkg)
  const config = JSON.parse(await fs.readFile(path.join(root, 'components.json'), 'utf8'))
  config.aliases.ui = '@/custom-ui'
  await write('components.json', config)
  const cli = async (...args: string[]) => runBuiltCli('node', [...args, '--json'], root)
  const ok = async (...args: string[]) => {
    const result = await cli(...args)
    expect(result.code, result.output).toBe(0)
    return jsonRecord(result.data)
  }
  await ok('init', '--preset', path.resolve('packages/catalog/src/presets/flat.json'), '--yes')
  await ok('add', 'button', '--yes')
  await write('badge.recipe.json', badge)
  const before = await snapshotTree(root)
  const plan = await ok('add', '--recipe', './badge.recipe.json', '--dry-run')
  expect(plan.recipe).toMatchObject({ importPath: '@/custom-ui/recipes/catalog_badge/r1/badge' })
  expect(await snapshotTree(root)).toEqual(before)
  await ok('add', '--recipe', './badge.recipe.json', '--yes')
  const compiled = await compileComponentRecipe({ recipe: badge })
  expect(await fs.readFile(path.join(root, 'src/custom-ui/recipes/catalog_badge/r1/badge.css'), 'utf8'))
    .toBe(compiled.artifacts.find(artifact => artifact.kind === 'style')?.content)
  const installed = await snapshotTree(root)
  for (const [file, bytes] of Object.entries(before))
    if (file !== 'ui-library.lock.json') expect(installed[file], file).toEqual(bytes)
  await ok('add', '--recipe', './badge.recipe.json', '--yes')
  expect(await snapshotTree(root)).toEqual(installed)
  await write('button.recipe.json', { ...button, id: badge.id, revision: badge.revision })
  const conflict = await snapshotTree(root)
  expect((await cli('add', '--recipe', './button.recipe.json', '--yes')).output).toContain('FILE_CONFLICT')
  expect(await snapshotTree(root)).toEqual(conflict)
})

it.each(catalogRecipeFixtures())('installs $component from JSON and an immutable code', async recipe => {
  const root = await createProject('vite')
  roots.push(root)
  const compiled = await compileComponentRecipe({ recipe })
  const pkg = JSON.parse(await fs.readFile(path.join(root, 'package.json'), 'utf8'))
  for (const dependency of compiled.dependencies) pkg.dependencies[dependency.name] = dependency.version
  await fs.writeFile(path.join(root, 'package.json'), JSON.stringify(pkg))
  const run = async (...args: string[]) => {
    const result = await runBuiltCli('node', [...args, '--json'], root)
    expect(result.code, result.output).toBe(0)
    return jsonRecord(result.data)
  }
  await run('init', '--preset', path.resolve('packages/catalog/src/presets/flat.json'), '--yes')
  await fs.writeFile(path.join(root, 'recipe.json'), JSON.stringify(recipe))
  const before = await snapshotTree(root)
  await run('add', '--recipe', './recipe.json', '--dry-run')
  expect(await snapshotTree(root)).toEqual(before)
  await run('add', '--recipe', './recipe.json', '--yes')
  const service = await startSnapshotService()
  try {
    const response = await fetch(service.origin + '/api/v1/recipes', {
      method: 'POST', headers: { Origin: service.origin, 'Content-Type': 'application/json', 'Idempotency-Key': randomUUID() },
      body: JSON.stringify({ recipe }),
    })
    expect(response.status).toBe(201)
    const snapshot = await response.json()
    const installed = await run('add', '--recipe', snapshot.id + '@1', '--snapshot-origin', service.origin,
      '--recipe-hash', snapshot.recipeHash, '--yes')
    expect(installed.recipe).toMatchObject({ recipe: { hash: compiled.recipe.hash, data: { component: recipe.component } } })
    const tree = await snapshotTree(root)
    for (const [file, bytes] of Object.entries(before))
      if (file !== 'ui-library.lock.json') expect(tree[file], file).toEqual(bytes)
  } finally { await service.close() }
})
