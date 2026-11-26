import { expect, it } from 'vitest'
import { blockManifest } from '@ombelle/catalog'
import { supportedBlockIds, supportedComponentIds } from '@ombelle/contracts'
import { blockDoc, blockDocs, blockGlassAvailable } from './catalog'

it('lists the four blocks in id order', () => {
  expect(blockDocs.map(doc => doc.id)).toEqual(['login-01', 'settings-01', 'pricing-01', 'dashboard-01'])
  expect(blockDocs.map(doc => doc.id)).toEqual([...supportedBlockIds])
})

it('takes each block page from the catalog metadata', () => {
  for (const doc of blockDocs) {
    const meta = blockManifest[doc.id]
    expect(doc).toEqual({ id: meta.id, title: meta.title, description: meta.description, components: [...meta.components], exampleOnly: [...meta.exampleOnly] })
    for (const component of doc.components) expect(supportedComponentIds).toContain(component)
  }
  expect(blockDoc('login-01')?.title).toBe('Sign in')
  expect(blockDoc('button')).toBeUndefined()
  expect(blockDoc('no-such-block')).toBeUndefined()
})

it('offers liquid glass for a block only when every component it uses has glass', () => {
  for (const doc of blockDocs) expect(typeof blockGlassAvailable(doc)).toBe('boolean')
  expect(blockGlassAvailable({ ...blockDocs[0]!, components: ['button'] })).toBe(true)
})
