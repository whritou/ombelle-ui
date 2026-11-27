import { describe, expect, it } from 'vitest'
import { publishedInstaller } from '../../snapshots/install-command'
import { agentRules } from '../agents/rules'
import { guideMarkdown } from '../agents/markdown'
import { documentationGuides } from './navigation'
import { guideSections } from './guides'

describe('agents guide', () => {
  const markdown = guideMarkdown('agents')

  it('is listed after troubleshooting', () => {
    const slugs = documentationGuides.map((guide) => guide.slug)
    expect(slugs.indexOf('agents')).toBe(slugs.indexOf('troubleshooting') + 1)
    expect(guideSections.agents.map((section) => section.id)).toEqual(['rules', 'machine-readable', 'skills', 'tell-your-agent'])
  })

  it('contains every install rule', () => {
    for (const rule of agentRules()) expect(markdown).toContain(rule.text)
  })

  it('links the machine-readable docs and skills install', () => {
    expect(markdown).toContain('https://ombelle-ui.vercel.app/llms.txt')
    expect(markdown).toContain('https://ombelle-ui.vercel.app/llms-full.txt')
    expect(markdown).toContain('https://ombelle-ui.vercel.app/api/v1/catalog')
    expect(markdown).toContain('npx skills add whritou/ombelle-ui')
  })

  it('has a paste-ready AGENTS.md snippet in a code fence', () => {
    const fenced = markdown.match(/```\n([\s\S]*?)\n```/g) ?? []
    const snippet = fenced.find((block) => block.includes('https://ombelle-ui.vercel.app/llms.txt') && block.includes('--dry-run'))
    expect(snippet).toBeDefined()
    for (const part of ['--yes', 'resolutions', '--overwrite', '--beside', 'Accessibility not guaranteed']) expect(snippet).toContain(part)
    expect(snippet).toContain(`${publishedInstaller.packageName}@${publishedInstaller.version}`)
  })
})
