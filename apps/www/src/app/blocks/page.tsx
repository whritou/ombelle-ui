import { BlockGallery } from '../../site/blocks/block-gallery'
import { blockDocs, blockGlassAvailable } from '../../site/blocks/catalog'

export const metadata = {
  title: 'Blocks · Ombelle UI',
  description: 'Composed sections built from Ombelle components: sign in, account settings, pricing and a dashboard overview, in every style family.',
}

export default function BlocksPage() {
  const blocks = blockDocs.map(doc => ({ id: doc.id, title: doc.title, description: doc.description, components: doc.components, glass: blockGlassAvailable(doc) }))
  return (
    <div className="py-10">
      <p className="font-mono text-xs uppercase tracking-[0.2em] text-primary">Blocks</p>
      <h1 className="mt-3 text-4xl font-black md:text-5xl">Blocks</h1>
      <p className="mt-4 max-w-2xl text-lg text-muted-foreground">
        Whole sections built only from catalog components. One command adds a block and the components it uses, styled by your project preset.
      </p>
      <BlockGallery blocks={blocks} />
    </div>
  )
}
