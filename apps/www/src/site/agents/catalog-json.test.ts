import { describe, expect, it } from 'vitest'
import { supportedBlockIds, supportedComponentIds } from '@ombelle/contracts'
import { componentDocs } from '../components/catalog'
import { compareVersions } from '../../snapshots/install-command'
import { buildAgentCatalog } from './catalog-json'
import { agentRules } from './rules'
import { GET } from '../../app/api/v1/catalog/route'

describe('buildAgentCatalog', () => {
  const catalog = buildAgentCatalog()

  it('lists every component and block exactly once', () => {
    expect(catalog.components.map((entry) => entry.id).sort()).toEqual([...supportedComponentIds].sort())
    expect(catalog.blocks.map((entry) => entry.id).sort()).toEqual([...supportedBlockIds].sort())
  })

  it('names the published installer', () => {
    expect(catalog.installCommand).toBe('npx @ombelle-ui/cli@1.1.2')
    expect(catalog.cliVersion).toBe('1.1.2')
    expect(catalog.skills.install).toBe('npx skills add whritou/ombelle-ui')
  })

  it('honours an older installer', () => {
    const gated = componentDocs.find((doc) => doc.minimumCli && compareVersions('0.7.0', doc.minimumCli) < 0)
    expect(gated).toBeDefined()
    const older = buildAgentCatalog({ packageName: '@ombelle-ui/cli', version: '0.7.0' })
    const entry = older.components.find((item) => item.id === gated!.id)!
    expect(entry.installable).toBe(false)
    expect(entry.minimumCli).toBe(gated!.minimumCli)
    expect(older.blocks.every((block) => !block.installable)).toBe(true)
    expect(catalog.blocks.every((block) => block.installable)).toBe(true)
  })

  it('carries the glass caveat', () => {
    expect(catalog.families.find((family) => family.id === 'liquid-glass')?.accessibilityCaveat).toMatch(/^Accessibility not guaranteed/)
    expect(catalog.families.find((family) => family.id === 'flat')?.accessibilityCaveat).toBeNull()
  })

  it('carries the install rules', () => {
    expect(catalog.rules).toEqual(agentRules())
    expect(catalog.rules.map((rule) => rule.id)).toContain('no-preset')
    const older = buildAgentCatalog({ packageName: '@ombelle-ui/cli', version: '0.7.0' })
    expect(older.rules.find((rule) => rule.id === 'published-cli')?.text).toContain('@ombelle-ui/cli@0.7.0')
  })

  it('links markdown docs', () => {
    const button = catalog.components.find((entry) => entry.id === 'button')!
    expect(button.docs.markdown).toBe('https://ombelle-ui.com/components/button.md')
    expect(button.docs.html).toBe('https://ombelle-ui.com/components/button')
    expect(button.category).toBe('Actions')
  })
})

describe('GET /api/v1/catalog', () => {
  it('serves the catalog as JSON', async () => {
    const response = await GET()
    expect(response.status).toBe(200)
    expect(response.headers.get('Content-Type')).toBe('application/json; charset=utf-8')
    expect(JSON.parse(await response.text())).toEqual(buildAgentCatalog())
  })
})
