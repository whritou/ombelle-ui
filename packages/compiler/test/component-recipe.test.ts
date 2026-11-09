import { expect, it } from 'vitest'
import { getCatalog } from '@ombelle/catalog'
import { componentRecipeParts, styleFamilies } from '@ombelle/contracts'
import { recipeTemplateSlots } from '../src/component-recipe-source.js'
import { catalogRecipeFixtures } from '../../../tests/helpers/catalog-recipe-fixtures.js'
import badge from '../../../examples/component-recipe.badge.json'
import button from '../../../examples/recipe.example.json'
import { compileComponentRecipe, compileInstallableRecipe, compileRecipe } from '../src/index.js'

it('applies per-part colors and dimensions while keeping the pinned preset', async () => {
  const recipe = catalogRecipeFixtures().find(item => item.component === 'card')!
  const original = await compileComponentRecipe({ recipe })
  const result = await compileComponentRecipe({ recipe: { ...recipe, appearance: { parts: {
    card: { paddingXPx: 24, borderWidthPx: 2, colors: { light: { background: '#123456' }, dark: { background: '#234567' } } },
    'card-title': { fontSizePx: 20 },
  } } } })
  const css = result.artifacts.find(artifact => artifact.kind === 'style')!.content
  expect(result.preset).toEqual(original.preset)
  expect(result.scope).not.toBe(original.scope)
  expect(css).toMatch(/\[data-slot=['"]recipe-card['"]\][^{]*\{[^}]*padding-inline: 24px/)
  expect(css).toContain('border-width: 2px')
  expect(css).toContain('background: #123456')
  expect(css).toContain('background: #234567')
  expect(css).toMatch(/\[data-slot=['"]recipe-card-title['"]\][^{]*\{[^}]*font-size: 20px/)
})

it('compiles custom glass material and rejects an unrelated part', async () => {
  const preset = getCatalog('0.1.0').presets['liquid-glass']
  const recipe = { ...badge, presetRef: { id: preset.id, revision: preset.revision, catalogRelease: preset.catalogRelease, compilerVersion: preset.compilerVersion } }
  const original = await compileComponentRecipe({ recipe })
  const result = await compileComponentRecipe({ recipe: { ...recipe, appearance: { glass: { glassBlurPx: 17, glassHalo: 0.3, glassRefractionWidth: 0.1 } } } })
  const css = result.artifacts.find(artifact => artifact.kind === 'style')!.content
  expect(result.preset).toEqual(original.preset)
  expect(css).toContain('--glass-blur: 17px')
  expect(css).toContain('--glass-halo: 0.3')
  expect(css).toContain('--glass-refraction-width: 0.1')
  await expect(compileComponentRecipe({ recipe: { ...recipe, appearance: { parts: {
    'card-title': { fontSizePx: 20 },
  } } } })).rejects.toMatchObject({ path: '/appearance/parts/card-title' })
})

it('compiles an isolated Badge and its usage deterministically', async () => {
  const result = await compileComponentRecipe({ recipe: badge, darkSelector: '.night' })
  expect(result.recipe.data).toEqual(badge)
  expect(result.dependencies).toEqual(getCatalog('0.1.0').templates.badge.dependencies)
  const artifacts = Object.fromEntries(result.artifacts.map(a => [a.logicalPath, a.content]))
  expect(artifacts['recipes/catalog_badge/r1/badge.tsx']).toContain('export function RecipeBadge')
  expect(artifacts['recipes/catalog_badge/r1/badge.tsx']).toContain('Ready <now> & later')
  expect(artifacts['recipes/catalog_badge/r1/badge.css']).toMatch(/\[data-slot=['"]recipe-badge['"]\]/)
  expect(artifacts['recipes/catalog_badge/r1/badge.css']).toContain('.night')
  expect(artifacts['recipes/catalog_badge/r1/badge.css']).not.toContain(':root')
  expect(artifacts['examples/recipes/catalog_badge/r1.tsx']).toContain('<RecipeBadge />')
  const reordered = Object.fromEntries(Object.entries(badge).reverse())
  expect(await compileInstallableRecipe({ recipe: reordered, darkSelector: '.night' })).toEqual(result)
})

it('preserves Button output and rejects unavailable release references', async () => {
  expect(await compileInstallableRecipe({ recipe: button })).toEqual(await compileRecipe({ recipe: button }))
  await expect(compileInstallableRecipe({
    recipe: { ...badge, presetRef: { ...badge.presetRef, compilerVersion: '99.0.0' } },
  })).rejects.toMatchObject({ code: 'UNSUPPORTED_RELEASE' })
})

it('compiles progress without accepting an out-of-range value', async () => {
  const recipe = { ...badge, component: 'progress', props: { value: 25, max: 50 }, content: { label: 'Uploading' } }
  const result = await compileComponentRecipe({ recipe })
  const source = result.artifacts.find(artifact => artifact.logicalPath.endsWith('/progress.tsx'))!.content
  expect(source).toContain('value={25}')
  expect(source).toContain('max={50}')
  await expect(compileComponentRecipe({ recipe: { ...recipe, props: { value: 51, max: 50 } } })).rejects.toThrow()
})

it.each(catalogRecipeFixtures())('compiles $component in each supported family', async recipe => {
  const template = getCatalog('0.1.0').templates[recipe.component]
  expect(recipeTemplateSlots(template)).toEqual(expect.arrayContaining(componentRecipeParts[recipe.component].map(part => part.slot)))
  for (const family of styleFamilies) {
    const preset = getCatalog('0.1.0').presets[family]
    const result = await compileComponentRecipe({ recipe: { ...recipe, presetRef: {
      id: preset.id, revision: preset.revision, catalogRelease: preset.catalogRelease, compilerVersion: preset.compilerVersion,
    } } })
    const entry = result.artifacts.find(artifact => artifact.logicalPath.endsWith(`/${recipe.component}.tsx`))
    expect(entry?.content).toContain('createScopedPrimitives')
    // Template props (Table Head's `scope`) must not shadow the recipe scope the slots carry.
    const primitives = result.artifacts.filter(artifact => artifact.content.includes('export function createScopedPrimitives('))
    expect(primitives.length).toBeGreaterThan(0)
    for (const source of primitives.map(artifact => artifact.content)) {
      expect(source).toContain('data-ombelle-recipe={recipeScope}')
      expect(source).not.toContain('data-ombelle-recipe={scope}')
      expect(source).not.toMatch(/recipe(?:Scope|Instance)\s*=(?!=)/)
    }
    const css = result.artifacts.find(artifact => artifact.kind === 'style')!.content
    expect(css).toContain(result.scope)
    expect(css).not.toMatch(/\[data-slot=['"](?!recipe-)/)
    // The family's icon and dot rules survive, scoped under the recipe.
    const scoped = (marker: string) => new RegExp(`\\[data-ombelle-recipe=['"]${result.scope}['"]\\]\\s+\\[${marker}`)
    if (recipe.component === 'accordion') expect(css).toMatch(scoped('data-accordion-icon='))
    if (recipe.component === 'dropdown-menu') expect(css).toMatch(scoped('data-dropdown-menu-dot\\]'))
    if (family === 'liquid-glass') {
      const filter = result.artifacts.find(artifact => artifact.logicalPath.endsWith('/liquid-glass-filter.tsx'))
      expect(filter?.content).toContain('data-ombelle-recipe-instance')
      expect(filter?.content).not.toContain('root.style.')
    }
  }
})
