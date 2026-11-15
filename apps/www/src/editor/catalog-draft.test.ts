import { expect, it } from 'vitest'
import badge from '../../../../examples/component-recipe.badge.json'
import { componentRecipeComponents } from '@ombelle/contracts'
import { resolveRecipePreset } from '@ombelle/catalog'
import { catalogDraftKey, changeCatalogFamily, withCatalogFont, createCatalogDraft, restoreCatalogDraft } from './catalog-draft'

it.each(componentRecipeComponents)('starts a fresh %s recipe in Ombelle', component => {
  expect(resolveRecipePreset(createCatalogDraft(component).recipe.presetRef).styleFamily).toBe('ombelle')
})

it('restores the matching draft and keeps invalid bytes recoverable', () => {
  expect(catalogDraftKey('badge')).toBe('ombelle.component-editor.badge.draft')
  expect(createCatalogDraft('badge').recipe).toMatchObject({ props: { variant: 'default' }, content: { label: 'Badge' } })
  expect(restoreCatalogDraft('badge', JSON.stringify({ storageVersion: 1, recipe: badge }))).toEqual({
    status: 'restored', draft: { storageVersion: 1, recipe: badge },
  })
  expect(restoreCatalogDraft('badge', '{"broken": true}')).toEqual({
    status: 'recovery-required', recoveryText: '{"broken": true}',
  })
})

it.each(['card', 'badge'] as const)('starts a %s recipe with its style\'s fonts and moves them with the style', component => {
  const draft = createCatalogDraft(component).recipe
  expect(draft.appearance?.fonts).toEqual({ fontFamilyId: 'figtree', headingFontFamilyId: 'bricolage-grotesque', monoFontFamilyId: 'geist-mono' })
  const papier = changeCatalogFamily(draft, 'papier')
  expect(papier.appearance?.fonts).toEqual({ fontFamilyId: 'instrument-sans', headingFontFamilyId: 'fraunces', monoFontFamilyId: 'ibm-plex-mono' })
  const picked = { ...papier, appearance: { fonts: { ...papier.appearance!.fonts, headingFontFamilyId: 'inter-tight' } } }
  expect(changeCatalogFamily(picked, 'flat').appearance?.fonts?.headingFontFamilyId).toBe('inter-tight')
})

it('sets and clears one font role, dropping an empty fonts group', () => {
  const draft = createCatalogDraft('card').recipe
  const set = withCatalogFont(draft, 'headingFontFamilyId', 'fraunces')
  expect(set.appearance?.fonts?.headingFontFamilyId).toBe('fraunces')
  expect(set.appearance?.fonts?.fontFamilyId).toBe('figtree')
  const cleared = withCatalogFont(withCatalogFont(withCatalogFont(set, 'headingFontFamilyId', undefined), 'fontFamilyId', undefined), 'monoFontFamilyId', undefined)
  expect(cleared.appearance).toBeUndefined()
})
