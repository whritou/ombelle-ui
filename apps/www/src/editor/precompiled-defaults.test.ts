import fs from 'node:fs'
import { describe, expect, it } from 'vitest'
import { canonicalize, compileComponentRecipe, compileRecipe } from '@ombelle/compiler'
import { componentRecipeComponents, type ComponentRecipe } from '@ombelle/contracts'
import { defaultSiteFamily } from '../snapshots/install-command'
import { createCatalogDraft } from './catalog-draft'
import {
  defaultButtonRecipe, defaultCatalogRecipe, initialButtonDraft, precompiledButtonFamily, precompiledCatalogFamily, precompiledDefaults, precompiledFamilies,
} from './precompiled-defaults'

// Written by pnpm generate:preview (scripts/generate-editor-defaults.ts) and bundled into the editor preview.
const generated = new URL('../../../preview/src/generated/editor-defaults/', import.meta.url)
const bundled = (component: string, family: string) =>
  JSON.parse(fs.readFileSync(new URL(`${component}/${family}.json`, generated), 'utf8')) as unknown

describe('precompiled editor defaults', () => {
  it('start from the recipe a fresh editor shows', () => {
    for (const component of componentRecipeComponents)
      expect(canonicalize(defaultCatalogRecipe(component, defaultSiteFamily))).toBe(canonicalize(createCatalogDraft(component).recipe))
    expect(canonicalize(defaultButtonRecipe(defaultSiteFamily))).toBe(canonicalize(initialButtonDraft.recipe))
  })

  it('name a family only while the recipe is that family\'s default', () => {
    expect(precompiledCatalogFamily(createCatalogDraft('card').recipe)).toBe('ombelle')
    // Only the family a fresh editor starts in is precompiled.
    expect(precompiledFamilies).toEqual([defaultSiteFamily])
    expect(precompiledCatalogFamily(defaultCatalogRecipe('dialog', 'papier'))).toBeNull()
    const edited = { ...createCatalogDraft('badge').recipe, revision: 2 } as ComponentRecipe
    expect(precompiledCatalogFamily(edited)).toBeNull()
    expect(precompiledCatalogFamily(defaultCatalogRecipe('card', 'liquid-glass'))).toBeNull()
    expect(precompiledButtonFamily(initialButtonDraft.recipe)).toBe('ombelle')
    expect(precompiledButtonFamily(defaultButtonRecipe('flat'))).toBeNull()
    expect(precompiledButtonFamily({ ...initialButtonDraft.recipe, content: 'Edited' })).toBeNull()
    expect(precompiledButtonFamily(defaultButtonRecipe('liquid-glass'))).toBeNull()
  })

  it('are generated for every component and family, and nothing else', () => {
    const files = (fs.readdirSync(generated, { recursive: true }) as string[])
      .filter(file => file.endsWith('.json')).map(file => file.replace(/\\/g, '/')).sort()
    expect(files).toEqual(precompiledDefaults().map(({ component, family }) => `${component}/${family}.json`).sort())
  })

  it.each([
    ['button', 'ombelle'], ['badge', 'ombelle'], ['card', 'ombelle'], ['dialog', 'ombelle'], ['select', 'ombelle'], ['tabs', 'ombelle'],
  ] as const)('the bundled %s default in %s equals a fresh compile', async (component, family) => {
    const fresh = component === 'button'
      ? await compileRecipe({ recipe: defaultButtonRecipe(family) })
      : await compileComponentRecipe({ recipe: defaultCatalogRecipe(component, family) })
    expect(canonicalize(bundled(component, family))).toBe(canonicalize(fresh))
  })
})
