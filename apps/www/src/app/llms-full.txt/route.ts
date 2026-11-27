import { llmsFullTxt } from '../../site/agents/llms'

export const dynamic = 'force-static'

/** Plain text for coding agents. Static; headers come from the site's header rules. */
export function GET() {
  return new Response(llmsFullTxt(), { headers: { 'Content-Type': 'text/plain; charset=utf-8' } })
}
