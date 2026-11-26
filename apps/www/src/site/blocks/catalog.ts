import { blockManifest } from '@ombelle/catalog'
import { isBlockId, styleSupport, supportedBlockIds, type BlockId, type ComponentId } from '@ombelle/contracts'

// The catalog index is large: import this module from server components only, and pass what a client needs as props.

export type BlockDoc = {
  id: BlockId
  title: string
  description: string
  /** Every catalog component the block uses, which `add <block>` installs with it. */
  components: ComponentId[]
  /** The flows the block fakes, as its file header lists them. */
  exampleOnly: string[]
}

/** The block pages, in catalog order, from the catalog's block metadata. */
export const blockDocs: BlockDoc[] = supportedBlockIds.map(id => {
  const meta = blockManifest[id]
  return { id, title: meta.title, description: meta.description, components: [...meta.components], exampleOnly: [...meta.exampleOnly] }
})

export function blockDoc(id: string): BlockDoc | undefined {
  return isBlockId(id) ? blockDocs.find(doc => doc.id === id) : undefined
}

/** A block renders in liquid glass only when every component it uses has a glass style. */
export function blockGlassAvailable(doc: Pick<BlockDoc, 'components'>): boolean {
  return doc.components.every(id => styleSupport(id, 'liquid-glass') !== 'unavailable')
}
