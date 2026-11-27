import { buildAgentCatalog } from '../../../../site/agents/catalog-json'

export const dynamic = 'force-static'

/** The agent catalog: every component and block with install state, glass and docs links. Static; headers come from the site's header rules. */
export function GET() {
  return new Response(JSON.stringify(buildAgentCatalog()), { headers: { 'Content-Type': 'application/json; charset=utf-8' } })
}
