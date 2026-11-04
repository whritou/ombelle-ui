import { afterEach, expect, it } from 'vitest'
import fs from 'node:fs/promises'
import path from 'node:path'
import { getCatalog } from '@ombelle/catalog'
import { compileRecipe, recipeImportAlias, rewriteModuleSpecifiers, sha256 } from '@ombelle/compiler'
import { createEditorDraft, updateDraftRecipe } from '../../apps/www/src/editor/model.js'
import { serializeRecipe } from '../../apps/www/src/editor/storage.js'
import { createProject } from '../helpers/projects.js'
import { jsonRecord, runBuiltCli } from '../helpers/cli-runtime.js'

const roots: string[] = []
afterEach(async () => {
  for (const root of roots.splice(0)) await fs.rm(root, { recursive: true, force: true })
})

it('installs the editor export with the direct compiler bytes and recipe lock identity', async () => {
  const draft = createEditorDraft('neo-brutalism')
  const edited = updateDraftRecipe(draft, {
    ...draft.recipe,
    content: 'Ship <release> & review',
    props: { variant: 'outline', size: 'lg', type: 'button', disabled: false, loading: false },
    overrides: { radiusRem: 1.25, borderWidthPx: 3, minHeightPx: 52, shadowOffsetXPx: -4, shadowOffsetYPx: 8 },
  })
  const exported = serializeRecipe(edited)
  const recipe = JSON.parse(exported)
  const compiled = await compileRecipe({ recipe })
  const root = await createProject('vite')
  roots.push(root)
  const pkg = JSON.parse(await fs.readFile(path.join(root, 'package.json'), 'utf8'))
  for (const dependency of getCatalog('0.1.0').templates.button.dependencies)
    pkg.dependencies[dependency.name] = dependency.version
  await fs.writeFile(path.join(root, 'package.json'), JSON.stringify(pkg))
  const init = await runBuiltCli('node', [
    'init', '--preset', path.resolve('packages/catalog/src/presets/neo-brutalism.json'), '--yes', '--json',
  ], root)
  expect(init.code, init.output).toBe(0)
  await fs.writeFile(path.join(root, 'button.recipe.json'), exported)
  const installed = await runBuiltCli('node', ['add', '--recipe', './button.recipe.json', '--yes', '--json'], root)
  expect(installed.code, installed.output).toBe(0)
  expect(jsonRecord(installed.data).recipe).toMatchObject({
    recipe: { hash: compiled.recipe.hash },
    preset: { hash: compiled.preset.hash },
    scope: compiled.scope,
    darkSelector: compiled.darkSelector,
  })
  const lock = JSON.parse(await fs.readFile(path.join(root, 'ui-library.lock.json'), 'utf8'))
  const identity = lock.recipes['button_recipe@1']
  expect(identity.recipe).toEqual(compiled.recipe)
  expect(identity.preset).toEqual(compiled.preset)
  expect(identity.scope).toBe(compiled.scope)
  expect(identity.darkSelector).toBe(compiled.darkSelector)
  const destinations: Record<string, string> = {
    [`recipes/button_recipe/r1/button.tsx`]: 'src/components/ui/recipes/button_recipe/r1/button.tsx',
    [`recipes/button_recipe/r1/button.css`]: 'src/components/ui/recipes/button_recipe/r1/button.css',
    [`examples/recipes/button_recipe/r1.tsx`]: 'src/ombelle-examples/recipes/button_recipe/r1.tsx',
  }
  for (const artifact of compiled.artifacts.filter((item) => item.kind !== 'utility')) {
    const destination = destinations[artifact.logicalPath]
    expect(destination, artifact.logicalPath).toBeDefined()
    const expected = artifact.kind === 'style' ? artifact.content : await rewriteModuleSpecifiers(
      artifact.content, (specifier) => recipeImportAlias(specifier, '@/lib/utils', '@/components/ui'),
    )
    expect(await fs.readFile(path.join(root, destination), 'utf8')).toBe(expected)
    expect(identity.artifacts[destination]).toMatchObject({ logicalPath: artifact.logicalPath, kind: artifact.kind })
    expect(identity.artifacts[destination].sha256).toBe(await sha256(expected))
    expect(lock.artifacts[destination]).toEqual(identity.artifacts[destination])
  }
})

it('installs an editor export that uses padding, typography, an icon and state colors', async () => {
  const draft = createEditorDraft('ombelle')
  const edited = updateDraftRecipe(draft, {
    ...draft.recipe,
    content: 'Search the catalog',
    icon: { name: 'search', position: 'end', iconOnly: false },
    overrides: {
      paddingXPx: 22, paddingYPx: 7, gapPx: 12,
      fontWeight: 700, fontSizePx: 15, letterSpacingEm: 0.04, uppercase: true,
      colors: {
        light: { hoverBackground: '#1d4ed8', pressedBackground: '#1e3a8a', pressedForeground: '#ffffff' },
        dark: { hoverBorder: 'oklch(80% 0.1 260)' },
      },
    },
  })
  const exported = serializeRecipe(edited)
  const compiled = await compileRecipe({ recipe: JSON.parse(exported) })
  expect(compiled.dependencies).toContainEqual({ name: 'lucide-react', version: '1.55.0' })
  const root = await createProject('vite')
  roots.push(root)
  const pkg = JSON.parse(await fs.readFile(path.join(root, 'package.json'), 'utf8'))
  for (const dependency of getCatalog('0.1.0').templates.button.dependencies)
    pkg.dependencies[dependency.name] = dependency.version
  delete pkg.dependencies['lucide-react']
  delete pkg.devDependencies?.['lucide-react']
  await fs.writeFile(path.join(root, 'package.json'), JSON.stringify(pkg))
  const init = await runBuiltCli('node', [
    'init', '--preset', path.resolve('packages/catalog/src/presets/ombelle.json'), '--yes', '--json',
  ], root)
  expect(init.code, init.output).toBe(0)
  await fs.writeFile(path.join(root, 'button.recipe.json'), exported)
  // The planned dependency is the catalog's pinned lucide-react, installed with lifecycle scripts disabled.
  const planned = await runBuiltCli('node', ['add', '--recipe', './button.recipe.json', '--dry-run', '--json'], root)
  expect(planned.code, planned.output).toBe(0)
  expect(jsonRecord(planned.data).dependencyPlan).toContainEqual({ name: 'lucide-react', version: '1.55.0' })
  // With the pinned version already present, the install needs no package manager run.
  const present = JSON.parse(await fs.readFile(path.join(root, 'package.json'), 'utf8'))
  present.dependencies['lucide-react'] = '1.55.0'
  await fs.writeFile(path.join(root, 'package.json'), JSON.stringify(present))
  const installed = await runBuiltCli('node', ['add', '--recipe', './button.recipe.json', '--yes', '--json'], root)
  expect(installed.code, installed.output).toBe(0)
  expect(jsonRecord(installed.data).recipe).toMatchObject({ recipe: { hash: compiled.recipe.hash }, scope: compiled.scope })
  const source = await fs.readFile(path.join(root, 'src/components/ui/recipes/button_recipe/r1/button.tsx'), 'utf8')
  expect(source).toContain("import { Search } from 'lucide-react'")
  expect(source).toBe(await rewriteModuleSpecifiers(
    compiled.artifacts.find((item) => item.kind === 'component')!.content,
    (specifier) => recipeImportAlias(specifier, '@/lib/utils', '@/components/ui'),
  ))
  const css = await fs.readFile(path.join(root, 'src/components/ui/recipes/button_recipe/r1/button.css'), 'utf8')
  expect(css).toBe(compiled.artifacts.find((item) => item.kind === 'style')!.content)
  for (const declaration of ['padding-inline: 22px', 'gap: 12px', 'font-weight: 700', 'text-transform: uppercase', 'background: #1d4ed8'])
    expect(css).toContain(declaration)
  // The global stylesheet stays free of recipe rules.
  const globals = await fs.readFile(path.join(root, 'src/index.css'), 'utf8').catch(() => '')
  expect(globals).not.toContain('data-ombelle-recipe')
})
