import { supportedBlockIds } from '@ombelle/contracts'
import { blockDoc } from '../../../../site/blocks/catalog'
import { componentDoc, componentDocs } from '../../../../site/components/catalog'
import { documentationGuides, type GuideSlug } from '../../../../site/docs/navigation'
import { blockMarkdown, componentMarkdown, guideMarkdown } from '../../../../site/agents/markdown'

// Every markdown page is prerendered at build time; the site's rewrites map /components/<id>.md here.
export const dynamic = 'force-static'
export const dynamicParams = false

export function generateStaticParams() {
  return [
    ...componentDocs.map((doc) => ({ kind: 'components', id: doc.id })),
    ...supportedBlockIds.map((id) => ({ kind: 'blocks', id })),
    ...documentationGuides.map((guide) => ({ kind: 'docs', id: guide.slug })),
  ]
}

function render(kind: string, id: string): string | undefined {
  if (kind === 'components') {
    const doc = componentDoc(id)
    return doc && componentMarkdown(doc)
  }
  if (kind === 'blocks') {
    const doc = blockDoc(id)
    return doc && blockMarkdown(doc)
  }
  if (kind === 'docs') return documentationGuides.some((guide) => guide.slug === id) ? guideMarkdown(id as GuideSlug) : undefined
  return undefined
}

/** A component, block or guide page as plain markdown for coding agents. */
export async function GET(_request: Request, { params }: { params: Promise<{ kind: string; id: string }> }) {
  const { kind, id } = await params
  const text = render(kind, id)
  if (text === undefined) return new Response('Not found', { status: 404 })
  return new Response(text, { headers: { 'Content-Type': 'text/markdown; charset=utf-8' } })
}
