import { describe, expect, it } from 'vitest'
import { GET, generateStaticParams } from '../../app/md/[kind]/[id]/route'
import { blockDoc, blockDocs } from '../blocks/catalog'
import { componentDoc, componentDocs } from '../components/catalog'
import { documentationGuides } from '../docs/navigation'
import { agentHref, blockMarkdown, componentMarkdown, guideMarkdown } from './markdown'

const cli = 'npx @ombelle-ui/cli@1.1.2'
const get = (kind: string, id: string) => GET(new Request(`http://localhost/md/${kind}/${id}`), { params: Promise.resolve({ kind, id }) })

describe('markdown pages for agents', () => {
  it('renders a component with its API, states, usage and install command', () => {
    const doc = componentDoc('button')!
    const text = componentMarkdown(doc)
    expect(text.startsWith('# Button')).toBe(true)
    expect(text).toContain(doc.api)
    expect(text).toContain(doc.states)
    expect(text).toContain('```tsx\n' + doc.usage)
    expect(text).toContain(`${cli} add button`)
    expect(text).toContain('/llms.txt')
    expect(text).toContain('Accessibility not guaranteed')
  })

  it('names the minimum CLI instead of a command when the published CLI is too old', () => {
    const doc = { ...componentDoc('button')!, minimumCli: '9.0.0' }
    const text = componentMarkdown(doc)
    expect(text).toContain('Requires CLI 9.0.0')
    expect(text).not.toContain(`${cli} add button`)
  })

  it('renders a block with its components and example-only flows', () => {
    const doc = blockDoc('login-01')!
    const text = blockMarkdown(doc)
    expect(text.startsWith(`# ${doc.title}`)).toBe(true)
    for (const id of doc.components) expect(text).toContain(`/components/${id}.md`)
    for (const flow of doc.exampleOnly) expect(text).toContain(flow)
    expect(text).toContain(`${cli} add login-01`)
    expect(text).toContain('/llms.txt')
  })

  it('renders a guide as plain markdown with the command as text', () => {
    const text = guideMarkdown('getting-started')
    expect(text).toContain(`${cli} init --preset`)
    expect(text).not.toMatch(/<\/?(div|p|code|pre|span|button|ul|li|a)[\s>]/)
    expect(text).not.toContain('Copy command')
    expect(text).not.toMatch(/\bpnpm dlx @ombelle-ui\/cli/)
    expect(text).toContain('/llms.txt')
  })

  it('keeps the lines of a guide code block', () => {
    const text = guideMarkdown('getting-started')
    expect(text).toContain('```tsx\nimport { Button }')
    expect(text).toMatch(/import \{ Button \}[^\n]*\n\nexport function SaveAction/)
  })

  it('renders definition lists as bullets', () => {
    expect(guideMarkdown('style-families')).toMatch(/^- \*\*[^*\n]+\*\*: \S/m)
  })

  it.each(documentationGuides.map((guide) => guide.slug))('renders the %s guide', (slug) => {
    const text = guideMarkdown(slug)
    expect(text.startsWith('# ')).toBe(true)
    expect(text.length).toBeGreaterThan(300)
    expect(text).not.toMatch(/<\/?(div|p|span|button|svg)[\s>]/)
  })

  it('tells agents how to run the install command, right after it', () => {
    const agents = 'Agents: run it with `--dry-run --json` first, then `--yes` when the plan is clean; see the install rules at https://ombelle-ui.vercel.app/llms.txt.'
    expect(componentMarkdown(componentDoc('button')!)).toContain(`${cli} add button\n\`\`\`\n\n${agents}`)
    expect(blockMarkdown(blockDoc('login-01')!)).toContain(`${cli} add login-01\n\`\`\`\n\n${agents}`)
    expect(componentMarkdown({ ...componentDoc('button')!, minimumCli: '9.0.0' })).not.toContain(agents)
  })

  it('makes links absolute and points at the markdown pages', () => {
    const component = componentMarkdown(componentDoc('button')!)
    expect(component).toContain('](https://ombelle-ui.vercel.app/docs/getting-started.md)')
    const block = blockMarkdown(blockDoc('login-01')!)
    expect(block).toContain('](https://ombelle-ui.vercel.app/components/button.md)')
    const started = guideMarkdown('getting-started')
    expect(started).toContain('](https://ombelle-ui.vercel.app/docs/installation.md#existing-projects)')
    expect(started).toContain('](https://ombelle-ui.vercel.app/editor/preset)')
    for (const text of [component, block, ...documentationGuides.map((guide) => guideMarkdown(guide.slug))])
      expect(text).not.toMatch(/\]\(\//)
  })

  it('rewrites site links for agents', () => {
    expect(agentHref('/docs/presets')).toBe('https://ombelle-ui.vercel.app/docs/presets.md')
    expect(agentHref('/docs/troubleshooting#draft-recovery')).toBe('https://ombelle-ui.vercel.app/docs/troubleshooting.md#draft-recovery')
    expect(agentHref('/components/button')).toBe('https://ombelle-ui.vercel.app/components/button.md')
    expect(agentHref('/blocks/login-01')).toBe('https://ombelle-ui.vercel.app/blocks/login-01.md')
    expect(agentHref('/components')).toBe('https://ombelle-ui.vercel.app/components')
    expect(agentHref('/components/nope')).toBe('https://ombelle-ui.vercel.app/components/nope')
    expect(agentHref('/security')).toBe('https://ombelle-ui.vercel.app/security')
    expect(agentHref('https://example.com/a')).toBe('https://example.com/a')
    expect(agentHref('#local')).toBe('#local')
  })

  it('has a static param for every component, block and guide', () => {
    const params = generateStaticParams()
    expect(params).toHaveLength(componentDocs.length + blockDocs.length + documentationGuides.length)
    expect(params).toContainEqual({ kind: 'components', id: 'button' })
    expect(params).toContainEqual({ kind: 'blocks', id: 'login-01' })
    expect(params).toContainEqual({ kind: 'docs', id: 'getting-started' })
  })

  it('serves markdown and 404s unknown ids', async () => {
    const response = await get('components', 'button')
    expect(response.status).toBe(200)
    expect(response.headers.get('content-type')).toBe('text/markdown; charset=utf-8')
    expect(await response.text()).toBe(componentMarkdown(componentDoc('button')!))
    expect((await get('components', 'nope')).status).toBe(404)
    expect((await get('widgets', 'button')).status).toBe(404)
    expect((await get('docs', 'nope')).status).toBe(404)
    expect((await get('blocks', 'nope')).status).toBe(404)
  })
})
