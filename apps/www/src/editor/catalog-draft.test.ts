import { expect, it } from 'vitest'
import badge from '../../../../examples/component-recipe.badge.json'
import { catalogDraftKey, createCatalogDraft, restoreCatalogDraft } from './catalog-draft'

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
