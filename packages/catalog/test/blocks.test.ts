import { describe, expect, it } from 'vitest'
import { supportedBlockIds } from '@ombelle/contracts'
import { blockImports, blockManifest, getBlockTemplate, getCatalog } from '../src/index.js'
import { catalogData } from '../src/generated.js'

const catalog = getCatalog('0.1.0')

describe('block catalog', () => {
  it.each(supportedBlockIds)('%s has a manifest entry, a Radix template and a stylesheet', (id) => {
    expect(blockManifest[id].id).toBe(id)
    expect(blockManifest[id].title).not.toBe('')
    expect(catalogData.blockTemplates[id]).toBeTruthy()
    expect(catalogData.blockStyles[id]).toBeTruthy()
  })

  it.each(supportedBlockIds)('%s imports exactly its manifest components in both editions', (id) => {
    const expected = [...blockManifest[id].components].sort()
    expect(expected).toEqual([...new Set(expected)])
    for (const edition of ['radix', 'base'] as const)
      expect(blockImports(getBlockTemplate(catalog, id, edition).content)).toEqual(expected)
  })

  it('falls back to the Radix template when a block has no Base UI file', () => {
    const id = supportedBlockIds.find((candidate) => !Object.hasOwn(catalogData.blockBaseTemplates, candidate))
    if (!id) return
    expect(getBlockTemplate(catalog, id, 'base')).toEqual(getBlockTemplate(catalog, id, 'radix'))
  })

  it('blockImports returns sorted unique component ids', () => {
    expect(
      blockImports(
        `import { B } from '@/components/ui/button'\nimport { A } from "@/components/ui/alert"\nimport { C } from '@/components/ui/button'\nimport x from 'react'`,
      ),
    ).toEqual(['alert', 'button'])
  })
})
