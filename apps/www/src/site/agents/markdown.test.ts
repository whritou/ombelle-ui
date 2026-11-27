import { describe, expect, it } from 'vitest'
import { GET, generateStaticParams } from '../../app/md/[kind]/[id]/route'
import { blockDoc, blockDocs } from '../blocks/catalog'
import { componentDoc, componentDocs } from '../components/catalog'
import { documentationGuides } from '../docs/navigation'
import { blockMarkdown, componentMarkdown, guideMarkdown } from './markdown'

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

  it.each(documentationGuides.map((guide) => guide.slug))('renders the %s guide', (slug) => {
    const text = guideMarkdown(slug)
    expect(text.startsWith('# ')).toBe(true)
    expect(text.length).toBeGreaterThan(300)
    expect(text).not.toMatch(/<\/?(div|p|span|button|svg)[\s>]/)
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
