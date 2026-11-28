import { officialSnapshotOrigin } from '@ombelle/contracts'
import { describe, expect, it } from 'vitest'
import { GET as getLlms } from '../../app/llms.txt/route'
import { GET as getLlmsFull } from '../../app/llms-full.txt/route'
import { headerRules } from '../../security-headers'
import { blockDocs } from '../blocks/catalog'
import { componentDocs } from '../components/catalog'
import { documentationGuides } from '../docs/navigation'
import { buildAgentCatalog } from './catalog-json'
import { llmsFullTxt, llmsTxt } from './llms'
import { agentRules } from './rules'
import { blockMarkdown, componentMarkdown, guideMarkdown } from './markdown'

const linkCount = (text: string, url: string) => text.split(`](${url})`).length - 1

describe('llms.txt', () => {
  const text = llmsTxt()

  it('follows the llmstxt.org shape', () => {
    const lines = text.split('\n')
    expect(lines[0]).toBe('# Ombelle UI')
    expect(lines[2].startsWith('> ')).toBe(true)
    const headings = lines.filter((line) => line.startsWith('## '))
    expect(headings).toEqual(['## Install rules', '## Guides', '## Components', '## Blocks', '## Optional'])
  })

  it('states every install rule', () => {
    for (const rule of agentRules()) expect(text).toContain(rule.text)
  })

  it('links every guide, component and block exactly once', () => {
    for (const guide of documentationGuides) {
      expect(linkCount(text, `${officialSnapshotOrigin}/docs/${guide.slug}.md`)).toBe(1)
    }
    for (const doc of componentDocs) expect(linkCount(text, `${officialSnapshotOrigin}/components/${doc.id}.md`)).toBe(1)
    for (const doc of blockDocs) expect(linkCount(text, `${officialSnapshotOrigin}/blocks/${doc.id}.md`)).toBe(1)
  })

  it('shows the skills command, the catalog JSON and the optional links', () => {
    expect(text).toContain('Install the Ombelle agent skills: `npx skills add whritou/ombelle-ui`')
    const optional = text.slice(text.indexOf('## Optional'))
    expect(optional).toContain(`${officialSnapshotOrigin}/llms-full.txt`)
    expect(optional).toContain(`${officialSnapshotOrigin}/api/v1/catalog`)
    expect(optional).toContain(`${officialSnapshotOrigin}/schemas/preset-1.0.json`)
  })

  it('marks components the published CLI cannot install, and labels glass', () => {
    const old = { packageName: '@ombelle-ui/cli', version: '0.0.1' }
    const gated = buildAgentCatalog(old).components.find((entry) => !entry.installable)
    if (gated) expect(llmsTxt(old)).toContain(`(needs CLI ${gated.minimumCli})`)
    expect(llmsTxt(old)).toContain('(needs CLI 1.1.0)')
    expect(text).toContain('Accessibility not guaranteed')
  })

  it('names the published CLI, never a hard-coded one', () => {
    expect(llmsTxt({ packageName: '@ombelle-ui/cli', version: '7.7.7' })).toContain('@ombelle-ui/cli@7.7.7')
  })
})

describe('llms-full.txt', () => {
  const text = llmsFullTxt()

  it('contains every guide, component and block as markdown', () => {
    for (const guide of documentationGuides) expect(text).toContain(guideMarkdown(guide.slug))
    for (const doc of componentDocs) expect(text).toContain(componentMarkdown(doc))
    for (const doc of blockDocs) expect(text).toContain(blockMarkdown(doc))
  })

  it('has only absolute links, with guides as their .md pages, so it reads as raw text', () => {
    expect(text).not.toMatch(/\]\(\//)
    expect(text).not.toMatch(/\]\(https:\/\/ombelle-ui\.vercel\.app\/docs\/[a-z-]+\)/)
  })
})

describe('routes and headers', () => {
  it('serve plain text', async () => {
    for (const get of [getLlms, getLlmsFull]) {
      const response = get()
      expect(response.headers.get('Content-Type')).toBe('text/plain; charset=utf-8')
      expect((await response.text()).length).toBeGreaterThan(100)
    }
  })

  it('allow any origin on the agent files', () => {
    for (const path of ['/llms.txt', '/llms-full.txt', '/api/v1/catalog', '/components/:id([a-z0-9-]+)\\.md', '/blocks/:id([a-z0-9-]+)\\.md', '/docs/:id([a-z0-9-]+)\\.md']) {
      expect(headerRules().some((item) => item.source === path && item.headers.some((header) => header.key === 'Access-Control-Allow-Origin'))).toBe(true)
    }
  })
})
