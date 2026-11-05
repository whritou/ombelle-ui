import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import ButtonEditorPage from '../../apps/www/src/app/editor/component/button/page.js'
import PresetEditorPage from '../../apps/www/src/app/editor/preset/page.js'
import PrivacyPage from '../../apps/www/src/app/privacy/page.js'
import SecurityPage from '../../apps/www/src/app/security/page.js'
import HomePage from '../../apps/www/src/app/page.js'
import { SiteFooter } from '../../apps/www/src/site/footer.js'
import { publishedInstaller } from '../../apps/www/src/snapshots/install-command.js'

describe('Button editor route', () => {
  it('renders the Button editor heading and breadcrumb context in the main landmark', () => {
    const html = renderToStaticMarkup(createElement(ButtonEditorPage))

    expect(html).toMatch(/<main\b[^>]*>[\s\S]*Breadcrumb[\s\S]*Components[\s\S]*<h1\b[^>]*>Button editor<\/h1>/)
  })
})

it('renders the preset editor heading in the main landmark', () => {
  const html = renderToStaticMarkup(createElement(PresetEditorPage))
  expect(html).toMatch(/<main\b[^>]*>[\s\S]*Breadcrumb[\s\S]*Presets[\s\S]*<h1\b[^>]*>Preset editor<\/h1>/)
  expect(html).toContain('Draft — automated token contrast only')
})

it('publishes privacy, support and security pages without exposing an email address', () => {
  const privacy = renderToStaticMarkup(createElement(PrivacyPage))
  const security = renderToStaticMarkup(createElement(SecurityPage))
  expect(privacy).toContain('operated by Arthur Thomas')
  expect(privacy).toContain('keyed hash (HMAC)')
  expect(privacy).toContain('href="/security"')
  expect(security).toContain('href="https://github.com/whritou/ombelle-ui/security/advisories/new"')
  expect(security).toContain('href="/privacy"')
  for (const html of [privacy, security]) expect(html).not.toMatch(/[\w.+-]+@[a-z0-9-]+\.[a-z]{2,}/i)
  // Every page links to both through the shared footer in the root layout.
  const footer = renderToStaticMarkup(createElement(SiteFooter))
  expect(footer).toMatch(/<footer\b[\s\S]*href="\/privacy"[\s\S]*href="\/security"/)
})

it('renders the public landing page with editor links and the published installer', () => {
  const html = renderToStaticMarkup(createElement(HomePage))
  expect(html).toMatch(/<main\b[^>]*>[\s\S]*<h1\b[^>]*>Your components\.<br\/>[\s\S]*Your style\.[\s\S]*<\/h1>/)
  expect(html).toContain('href="/editor/component/button"')
  expect(html).toContain('href="/editor/preset"')
  const runner = `${publishedInstaller.packageName}@${publishedInstaller.version}`
  expect(html).toContain(`npx ${runner} init --preset PRESET --cwd APP --dry-run --json`)
  expect(html).toContain(`npx ${runner} init --preset PRESET --cwd APP --yes`)
  expect(html).toContain(`npx ${runner} add button --cwd APP --yes`)
  expect(html).toContain(`npx ${runner} theme add PRESET --cwd APP --dry-run --json`)
  for (const prefix of ['pnpm dlx', 'bunx', 'yarn dlx --quiet']) expect(html).toContain(`${prefix} ${runner}`)
  expect(html).toContain('24 hours')
  expect(html.match(/<h1\b/g)).toHaveLength(1)
  // The design's placeholder installer is gone.
  expect(html).toContain('React Native is not supported')
  // Liquid glass is shipped as experimental for six components only.
  expect(html).toContain('Experimental for Button, Badge, Card, Dialog, Tabs and Tooltip')
  // Components newer than the published installer stay off the home page copy.
  expect(html).not.toContain('Experimental for Alert')
  expect(html).not.toMatch(/coming soon/i)
  expect(html).not.toContain('ombelle@alpha')
})

it('lists the catalog and offers install commands only for components the published installer accepts', async () => {
  const { default: ComponentsPage } = await import('../../apps/www/src/app/components/page.js')
  const { default: ComponentPage, generateStaticParams } = await import('../../apps/www/src/app/components/[id]/page.js')
  const { supportedComponentIds, styleSupport } = await import('@ombelle/contracts')
  const { componentDocs, componentInstallable, glassOnSite } = await import('../../apps/www/src/site/components/catalog.js')
  const { compareVersions } = await import('../../apps/www/src/snapshots/install-command.js')
  const listed = componentDocs.map((doc) => doc.id)
  expect([...listed].sort()).toEqual([...supportedComponentIds].sort())
  const overview = renderToStaticMarkup(createElement(ComponentsPage))
  for (const id of listed) expect(overview).toContain(`href="/components/${id}"`)
  expect(generateStaticParams().map(({ id }) => id).sort()).toEqual([...listed].sort())
  const runner = `${publishedInstaller.packageName}@${publishedInstaller.version}`
  // Input is experimental in the catalog's glass family but needs a newer installer than the published one.
  expect(styleSupport('input', 'liquid-glass')).toBe('experimental')
  expect(glassOnSite('input')).toBe(false)
  for (const doc of componentDocs) {
    const { id } = doc
    const html = renderToStaticMarkup(await ComponentPage({ params: Promise.resolve({ id }) }))
    expect(html.match(/<h1\b/g)).toHaveLength(1)
    const command = `pnpm dlx ${runner} add ${id} --cwd APP --dry-run`
    if (componentInstallable(doc)) {
      if (doc.minimumCli) expect(compareVersions(publishedInstaller.version, doc.minimumCli)).toBeGreaterThanOrEqual(0)
      expect(html).toContain(command)
      if (!glassOnSite(id)) expect(html).toContain(`add ${id} is refused with STYLE_UNAVAILABLE`)
    } else {
      expect(html).not.toContain(command)
      expect(html).toContain(`Requires CLI ${doc.minimumCli}`)
    }
    expect(html).toContain('Liquid glass: experimental.')
    // Only Button has a per-component editor.
    expect(html.includes('href="/editor/component/button"')).toBe(id === 'button')
    // Glass Button previews show the 0.5.0 restyle, so the Button page says so.
    expect(html.includes('Liquid glass Buttons were restyled to one ink in 0.5.0.')).toBe(id === 'button')
  }
})

it('previews form controls in Liquid Glass while gating installation on 0.5.0', async () => {
  const { styleSupport } = await import('@ombelle/contracts')
  const { componentDoc, glassOnSite } = await import('../../apps/www/src/site/components/catalog.js')
  const formControls = ['label', 'textarea', 'native-select', 'checkbox', 'switch', 'radio-group', 'select'] as const
  expect(publishedInstaller.version).toBe('0.4.1')
  for (const id of formControls) {
    expect(styleSupport(id, 'liquid-glass'), id).toBe('experimental')
    const doc = componentDoc(id)
    expect(doc?.glassMinimumCli ?? doc?.minimumCli, id).toBe('0.5.0')
    expect(glassOnSite(id), id).toBe(false)
  }
})

it('offers the lab glass presets in the component directory and previews Select ahead of the published installer', async () => {
  const { default: ComponentsPage } = await import('../../apps/www/src/app/components/page.js')
  const { default: ComponentPage } = await import('../../apps/www/src/app/components/[id]/page.js')
  const overview = renderToStaticMarkup(createElement(ComponentsPage))
  expect(overview).toContain('Glass preview preset')
  for (const label of ['Cristal', 'Givré', 'Fumé', 'Relief']) expect(overview).toContain(label)
  expect(overview).toContain('href="/components/select"')
  const select = renderToStaticMarkup(await ComponentPage({ params: Promise.resolve({ id: 'select' }) }))
  expect(select).toContain('Requires CLI 0.5.0')
  expect(select).not.toContain('add select --cwd APP --dry-run')
})
