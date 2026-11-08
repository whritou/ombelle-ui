import { expect, test } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import { documentationGuides } from '../../apps/www/src/site/docs/navigation.js'
import { componentDocs } from '../../apps/www/src/site/components/catalog.js'

test('documentation guides are navigable, accessible, and link to real sections', async ({ page, request }) => {
  await page.goto('/docs')
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Build with Ombelle.')
  const anchors = new Map<string, Set<string>>()
  const links: string[] = []
  for (const guide of documentationGuides) {
    const response = await page.goto(`/docs/${guide.slug}`)
    expect(response!.status()).toBe(200)
    await expect(page).toHaveTitle(`${guide.title} · Ombelle UI`)
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(guide.title)
    await expect(page.getByRole('navigation', { name: 'Documentation', exact: true }).getByRole('link', { name: guide.title, exact: true })).toHaveAttribute('aria-current', 'page')
    anchors.set(`/docs/${guide.slug}`, new Set(await page.locator('[id]').evaluateAll(nodes => nodes.map(node => node.id))))
    links.push(...await page.locator('main a[href^="/docs/"]').evaluateAll(nodes => nodes.map(node => node.getAttribute('href')!)))
  }
  for (const href of new Set(links)) {
    const [path, fragment] = href.split('#')
    expect(anchors.has(path), href).toBe(true)
    if (fragment) expect(anchors.get(path)!.has(fragment), href).toBe(true)
  }
  expect((await request.get('/docs/unknown-guide')).status()).toBe(404)
  await page.goto('/docs/getting-started')
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([])
  for (const width of [390, 1280]) {
    await page.setViewportSize({ width, height: 844 })
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    await page.screenshot({ path: `.artifacts/website-guides-${width}.png`, fullPage: true })
  }
})

test('landing matrix shows a short sample with an accurate remainder and component CTA', async ({ page }) => {
  await page.goto('/')
  const matrix = page.getByRole('region', { name: new RegExp(`${componentDocs.length} components`) })
  await expect(matrix.locator('tbody tr')).toHaveCount(6)
  await expect(matrix.getByText(`${componentDocs.length - 6} more available`, { exact: true })).toBeVisible()
  await matrix.getByRole('button', { name: 'Select', exact: true }).click()
  await expect(matrix.getByRole('heading', { level: 3 })).toHaveText('Select')
  await matrix.getByRole('link', { name: `Explore all ${componentDocs.length} components` }).click()
  await expect(page).toHaveURL(/\/components$/)
})

test('component playground starts in Ombelle and still lets the visitor choose Flat', async ({ page }) => {
  await page.goto('/components/button')
  const families = page.getByRole('group', { name: 'Style family', exact: true })
  await expect(families.getByRole('button', { name: 'Ombelle', exact: true })).toHaveAttribute('data-state', 'on')
  await families.getByRole('button', { name: 'Flat', exact: true }).click()
  await expect(families.getByRole('button', { name: 'Flat', exact: true })).toHaveAttribute('data-state', 'on')
})

test('landing presents Ombelle first in the hero, style comparison, and journey', async ({ page }) => {
  await page.goto('/')
  const hero = page.locator('section[aria-labelledby="hero"]')
  const styles = hero.getByRole('group', { name: 'Component style', exact: true })
  await expect(styles.getByRole('button').first()).toHaveText('Ombelle')
  await expect(styles.getByRole('button', { name: 'Ombelle', exact: true })).toHaveAttribute('data-state', 'on')
  const demo = hero.locator('.o-btn-primary').first()
  await expect(demo).toHaveCSS('border-radius', '999px')
  // Chromium snaps a 1.5px border to 1px at DPR 1; higher DPR keeps 1.5px.
  await expect(demo).toHaveCSS('border-top-width', /^(1|1\.5)px$/)
  await expect(demo).toHaveCSS('box-shadow', /3px 3px 0px 0px$/)
  await hero.screenshot({ path: '.artifacts/website-hero-ombelle-desktop.png' })
  await styles.getByRole('button', { name: 'Flat', exact: true }).click()
  await expect(hero.locator('.o-kit')).toHaveAttribute('data-style', 'flat')
  await styles.getByRole('button', { name: 'Ombelle', exact: true }).click()
  await expect(hero.locator('.o-kit')).toHaveAttribute('data-style', 'ombelle')
  const comparison = page.locator('section[aria-labelledby="compare"]')
  const jump = comparison.getByRole('group', { name: 'Jump to style', exact: true })
  await expect(jump.getByRole('button')).toHaveCount(4)
  for (const name of ['Ombelle', 'Minimalist', 'Neo-Brutalism', 'Flat']) {
    await jump.getByRole('button', { name, exact: true }).click()
    await expect(comparison.getByRole('heading', { level: 2 })).toHaveText(name)
    await expect(jump.getByRole('button', { name, exact: true })).toHaveAttribute('aria-pressed', 'true')
  }
  const journey = page.locator('section[aria-labelledby="journey"]')
  const families = journey.getByRole('group', { name: 'Style family', exact: true })
  await expect(families.getByRole('button')).toHaveCount(4)
  await expect(families.getByRole('button', { name: /Ombelle/ })).toHaveAttribute('aria-pressed', 'true')
  await expect(journey).toContainText('styleFamily: "ombelle"')
  await page.setViewportSize({ width: 390, height: 844 })
  await hero.scrollIntoViewIfNeeded()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  await hero.screenshot({ path: '.artifacts/website-hero-ombelle-mobile.png' })
  await page.getByRole('button', { name: 'Dark theme', exact: true }).click()
  await expect(page.locator('html')).toHaveClass(/(?:^|\s)dark(?:\s|$)/)
  await expect(demo).toHaveCSS('border-top-width', /^(1|1\.5)px$/)
  await hero.screenshot({ path: '.artifacts/website-hero-ombelle-dark.png' })
})

for (const kind of ['preset', 'component/button', 'component/badge']) {
  test(`${kind} starts in Ombelle, links to its guide, and restores a saved Flat draft`, async ({ page }) => {
    await page.goto(`/editor/${kind}`)
    const families = page.getByRole('group', { name: 'Style family', exact: true })
    await expect(families.getByRole('button', { name: /^Ombelle/ })).toHaveAttribute('aria-pressed', 'true')
    await expect(page.getByRole('button', { name: 'Get code', exact: true })).toBeEnabled()
    const guide = kind === 'preset' ? 'preset-editor' : 'component-editor'
    await expect(page.getByRole('link', { name: kind === 'preset' ? 'Preset editor guide' : 'Component editor guide', exact: true })).toHaveAttribute('href', `/docs/${guide}`)
    await families.getByRole('button', { name: /^Flat/ }).click()
    if (kind === 'preset') await page.getByRole('button', { name: 'Confirm change', exact: true }).click()
    await expect(families.getByRole('button', { name: /^Flat/ })).toHaveAttribute('aria-pressed', 'true')
    const key = kind === 'preset' ? 'ombelle:preset-editor:draft:v1' : kind === 'component/button' ? 'ombelle.button-editor.draft' : 'ombelle.component-editor.badge.draft'
    await expect.poll(() => page.evaluate(key => {
      const saved = JSON.parse(localStorage.getItem(key) ?? '{}')
      return saved.family ?? saved.recipe?.presetRef?.id
    }, key)).toBe(kind === 'preset' ? 'flat' : 'builtin-flat')
    await page.reload()
    await expect(families.getByRole('button', { name: /^Flat/ })).toHaveAttribute('aria-pressed', 'true')
    await page.getByRole('link', { name: kind === 'preset' ? 'Preset editor guide' : 'Component editor guide', exact: true }).click()
    await expect(page).toHaveURL(new RegExp(`/docs/${guide}$`))
  })
}
