import { publishedSchemas } from '../../../site/schemas/published-schemas'

// Every schema is prerendered from the repository's schemas/ at build time; no other name exists.
export const dynamic = 'force-static'
export const dynamicParams = false

export function generateStaticParams() {
  return [...publishedSchemas().keys()].map((name) => ({ name }))
}

/** A JSON schema at its `$id` URL or its file name. Caching and CORS come from the site's header rules. */
export async function GET(_request: Request, { params }: { params: Promise<{ name: string }> }) {
  const schema = publishedSchemas().get((await params).name)
  if (schema === undefined) return new Response('Not found', { status: 404 })
  return new Response(schema, { headers: { 'Content-Type': 'application/schema+json; charset=utf-8' } })
}
