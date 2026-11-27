import { llmsTxt } from '../../site/agents/llms'

export const dynamic = 'force-static'

/** Plain text for coding agents. Static; headers come from the site's header rules. */
export function GET() {
  return new Response(llmsTxt(), { headers: { 'Content-Type': 'text/plain; charset=utf-8' } })
}
