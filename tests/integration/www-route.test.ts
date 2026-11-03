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
  it('renders the Button workbench heading and editor context in the main landmark', () => {
    const html = renderToStaticMarkup(createElement(ButtonEditorPage))

    expect(html).toMatch(/<main\b[^>]*>[\s\S]*Component editor[\s\S]*<h1\b[^>]*>Button workbench<\/h1>/)
  })
})

it('renders the global preset editor heading in the main landmark', () => {
  const html = renderToStaticMarkup(createElement(PresetEditorPage))
  expect(html).toMatch(/<main\b[^>]*>[\s\S]*<h1\b[^>]*>Global preset editor<\/h1>/)
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
  // Unshipped work is labelled as such; the design's placeholder installer is gone.
  expect(html).toContain('React Native is not supported')
  expect(html).toContain('Liquid Glass (soon)')
  expect(html).not.toContain('ombelle@alpha')
})
