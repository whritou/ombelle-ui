import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { supportedComponentIds } from '@ombelle/contracts'
import ButtonEditorPage from '../../apps/www/src/app/editor/component/button/page.js'
import PresetEditorPage from '../../apps/www/src/app/editor/preset/page.js'
import PrivacyPage from '../../apps/www/src/app/privacy/page.js'
import SecurityPage from '../../apps/www/src/app/security/page.js'
import HomePage from '../../apps/www/src/app/(home)/page.js'
import { siteStableFamilies } from '../../apps/www/src/site/families.js'
import { SiteFooter } from '../../apps/www/src/site/footer.js'
import { catalog076MinimumCli, compareVersions, publishedInstaller } from '../../apps/www/src/snapshots/install-command.js'

// The Code Block command wraps its runner in a keyword token span, so commands are read from the text.
const textOf = (html: string) => html.replace(/<[^>]*>/g, '')

describe('Button editor route', () => {
  it('renders the Button editor heading and breadcrumb context in the main landmark', () => {
    const html = renderToStaticMarkup(createElement(ButtonEditorPage))

    expect(html).toMatch(/<main\b[^>]*>[\s\S]*Breadcrumb[\s\S]*Components[\s\S]*<h1\b[^>]*>Button editor<\/h1>/)
  })

  it('names Button in the component switcher and links back to the component editors', () => {
    const html = renderToStaticMarkup(createElement(ButtonEditorPage))
    // The switcher's list and catalog links render in a sheet when it opens.
    expect(html).toMatch(/<button\b(?=[^>]*aria-label="Component: Button. Choose a component")(?=[^>]*aria-haspopup="dialog")[^>]*><span>Button<\/span>/)
    expect(html).toMatch(/<a\b(?=[^>]*href="\/editor\/component")(?=[^>]*aria-label="All components")[^>]*>/)
    expect(html).not.toContain('aria-label="Editable components"')
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
  expect(html).toContain('href="/editor/component"')
  expect(html).toContain('href="/editor/preset"')
  const runner = `${publishedInstaller.packageName}@${publishedInstaller.version}`
  // The install step shows the published installer with a placeholder for the visitor's own preset code.
  expect(html).toContain(`npx ${runner} init --preset PRESET<`)
  expect(html).toContain('href="/docs/getting-started"')
  expect(html).not.toMatch(/--cwd APP|--dry-run --json/)
  expect(html.match(/<h1\b/g)).toHaveLength(1)
  expect(html).toContain('React Native is not supported')
  // The header's Get started link lands on the install journey.
  expect(html).toMatch(/<section\b[^>]*id="get-started"/)
  // The only preset code on the page is the labelled example; it never appears inside a command.
  const codes = html.match(/ps_[0-9a-f]{32}@1/g) ?? []
  expect(codes).toHaveLength(1)
  expect(html).toContain('This code is only an example and does not install.')
  // The component marquee links to the whole current catalog, including preview-only additions.
  expect(html).toContain(`Explore all ${supportedComponentIds.length} components`)
  // Every offered family has a tile, and the page starts in the first one.
  const families = [...siteStableFamilies, 'liquid-glass']
  for (const family of families) expect(html).toContain(`id="tile-${family}"`)
  expect(html).toMatch(new RegExp(`<main\\b[^>]*data-family="${families[0]}"`))
  expect(html).not.toContain('need a newer installer')
  expect(html).not.toMatch(/coming soon/i)
  expect(html).not.toContain('ombelle@alpha')
})

it('lists the catalog and offers install commands only for components the published installer accepts', async () => {
  const { default: ComponentsPage } = await import('../../apps/www/src/app/components/page.js')
  const { default: ComponentPage, generateStaticParams } = await import('../../apps/www/src/app/components/[id]/page.js')
  const { supportedComponentIds, styleSupport } = await import('@ombelle/contracts')
  const { componentDocs, componentInstallable, glassOnSite } = await import('../../apps/www/src/site/components/catalog.js')
  const { catalogRecipeInstallerSupported, compareVersions } = await import('../../apps/www/src/snapshots/install-command.js')
  const listed = componentDocs.map((doc) => doc.id)
  expect([...listed].sort()).toEqual([...supportedComponentIds].sort())
  const overview = renderToStaticMarkup(createElement(ComponentsPage))
  for (const id of listed) expect(overview).toContain(`href="/components/${id}"`)
  expect(generateStaticParams().map(({ id }) => id).sort()).toEqual([...listed].sort())
  const runner = `${publishedInstaller.packageName}@${publishedInstaller.version}`
  // Input is stable in the catalog's glass family, and the published 0.5.0 installer accepts it.
  expect(styleSupport('input', 'liquid-glass')).toBe('stable')
  expect(glassOnSite('input')).toBe(true)
  for (const doc of componentDocs) {
    const { id } = doc
    const html = renderToStaticMarkup(await ComponentPage({ params: Promise.resolve({ id }) }))
    expect(html.match(/<h1\b/g)).toHaveLength(1)
    const command = `pnpm dlx ${runner} add ${id}`
    if (componentInstallable(doc)) {
      if (doc.minimumCli) expect(compareVersions(publishedInstaller.version, doc.minimumCli)).toBeGreaterThanOrEqual(0)
      expect(textOf(html)).toContain(command)
      if (!glassOnSite(id)) expect(html).toContain(`add ${id} is refused with STYLE_UNAVAILABLE`)
    } else {
      expect(textOf(html)).not.toContain(command)
      expect(html).toContain(`Requires CLI ${doc.minimumCli}`)
    }
    expect(html).toContain('Liquid glass: stable, accessibility not guaranteed.')
    expect(html.includes(`href="/editor/component/${id}"`)).toBe(id === 'button' || catalogRecipeInstallerSupported(publishedInstaller.version))
    // Glass Button previews show the 0.5.0 restyle, so the Button page says so.
    expect(html.includes('Liquid glass Buttons were restyled to one ink in 0.5.0.')).toBe(id === 'button')
  }
})

it('exposes every component editor and Customize link with the published installer', async () => {
  const { supportedComponentIds } = await import('@ombelle/contracts')
  const { editableComponents } = await import('../../apps/www/src/editor/editable-components.js')
  const { default: EditorPage } = await import('../../apps/www/src/app/editor/component/[id]/page.js')
  const { default: ComponentPage } = await import('../../apps/www/src/app/components/[id]/page.js')
  const { filterComponents } = await import('../../apps/www/src/editor/components/component-switcher.js')
  expect(editableComponents.map(({ id }) => id).sort()).toEqual([...supportedComponentIds].sort())
  // The component switcher lists every editor; its sheet renders in a portal, so the list it shows is checked.
  const chooser = filterComponents('').map(component => `href="${component.href}"`).join(' ')
  for (const id of supportedComponentIds) {
    const href = `href="/editor/component/${id}"`
    expect(chooser).toContain(href)
    expect(renderToStaticMarkup(await ComponentPage({ params: Promise.resolve({ id }) }))).toContain(href)
  }
  await expect(EditorPage({ params: Promise.resolve({ id: 'missing' }) })).rejects.toMatchObject({ digest: 'NEXT_HTTP_ERROR_FALLBACK;404' })
})

it('offers form controls in Liquid Glass once the published installer meets the minimum', async () => {
  const { styleSupport } = await import('@ombelle/contracts')
  const { componentDoc, glassOnSite } = await import('../../apps/www/src/site/components/catalog.js')
  const formControls = ['label', 'textarea', 'native-select', 'checkbox', 'switch', 'radio-group', 'select'] as const
  for (const id of formControls) {
    expect(styleSupport(id, 'liquid-glass'), id).toBe('stable')
    const doc = componentDoc(id)
    expect(doc?.glassMinimumCli ?? doc?.minimumCli, id).toBe('0.5.0')
    expect(glassOnSite(id), id).toBe(true)
  }
})

it('offers the lab glass presets in the component directory and installs Select with the published installer', async () => {
  const { default: ComponentsPage } = await import('../../apps/www/src/app/components/page.js')
  const { default: ComponentPage } = await import('../../apps/www/src/app/components/[id]/page.js')
  const overview = renderToStaticMarkup(createElement(ComponentsPage))
  expect(overview).toContain('Glass preview preset')
  // The picker is a closed Combobox: it shows the standard preview, and its
  // options render only when it opens, so read them from its source list.
  expect(overview).toMatch(/<input[^>]*role="combobox"[^>]*value="Standard preview"|<input[^>]*value="Standard preview"[^>]*role="combobox"/)
  const { glassPresetOptions } = await import('../../apps/www/src/site/glass-presets.js')
  const labels = glassPresetOptions().map((option) => option.label)
  for (const label of ['Cristal', 'Givré', 'Fumé', 'Relief']) expect(labels).toContain(label)
  expect(overview).toContain('href="/components/select"')
  const select = renderToStaticMarkup(await ComponentPage({ params: Promise.resolve({ id: 'select' }) }))
  expect(select).not.toContain('Requires CLI')
  expect(textOf(select)).toContain(`pnpm dlx ${publishedInstaller.packageName}@${publishedInstaller.version} add select`)
  expect(select).toContain('Liquid glass: stable, accessibility not guaranteed.')
})
