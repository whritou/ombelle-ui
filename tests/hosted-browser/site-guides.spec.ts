import { expect, test, type Page } from '@playwright/test'
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

test('landing names every catalog component and links to the component directory', async ({ page }) => {
  await page.goto('/')
  const catalog = page.getByRole('region', { name: `${componentDocs.length} components in the catalog`, exact: true })
  // Each row is repeated once to close the loop; the copy is hidden from assistive technology.
  await expect(catalog.locator('ul:not([aria-hidden]) li')).toHaveCount(componentDocs.length)
  await catalog.getByRole('link', { name: `Explore all ${componentDocs.length} components` }).click()
  await expect(page).toHaveURL(/\/components$/)
})

test('component playground starts in Ombelle and still lets the visitor choose Flat', async ({ page }) => {
  await page.goto('/components/button')
  const families = page.getByRole('group', { name: 'Style family', exact: true })
  await expect(families.getByRole('button', { name: 'Ombelle', exact: true })).toHaveAttribute('data-state', 'on')
  await families.getByRole('button', { name: 'Flat', exact: true }).click()
  await expect(families.getByRole('button', { name: 'Flat', exact: true })).toHaveAttribute('data-state', 'on')
})

test('landing starts in Ombelle and wears any family from the dock, a tile, or a palette', async ({ page }) => {
  await page.goto('/')
  const main = page.locator('main')
  const hero = page.locator('section[aria-labelledby="hero"]')
  const dock = page.getByRole('group', { name: 'Page style', exact: true })
  await expect(dock.getByRole('button').first()).toHaveText('Ombelle')
  // Choosing a family stops the hero's one-lap cycle, so the page holds still for the checks below.
  await dock.getByRole('button', { name: 'Ombelle', exact: true }).click()
  await expect(main).toHaveAttribute('data-family', 'ombelle')
  await expect(dock.getByRole('button', { name: 'Cycle', exact: true })).toHaveAttribute('aria-pressed', 'false')
  const demo = hero.getByRole('link', { name: 'Get started' })
  await expect(demo).toHaveCSS('border-radius', '999px')
  // Chromium snaps a 1.5px border to 1px at DPR 1; higher DPR keeps 1.5px.
  await expect(demo).toHaveCSS('border-top-width', /^(1|1\.5)px$/)
  await expect(demo).toHaveCSS('box-shadow', /3px 3px 0px 0px$/)
  await hero.screenshot({ path: '.artifacts/website-hero-ombelle-desktop.png' })
  await dock.getByRole('button', { name: 'Flat', exact: true }).click()
  await expect(main).toHaveAttribute('data-family', 'flat')
  await expect(demo).toHaveCSS('border-top-width', '0px')

  // One tile per offered family; wearing one from its tile restyles the page.
  const styles = page.locator('section#styles')
  await expect(styles.locator('article')).toHaveCount(await dock.locator('.ol-dot[data-family]').count() - 1)
  const papier = styles.locator('article[data-family="papier"]')
  await papier.getByRole('button', { name: 'Wear this style', exact: true }).click()
  await expect(main).toHaveAttribute('data-family', 'papier')
  await expect(papier.getByRole('button', { name: 'Wearing it now', exact: true })).toHaveAttribute('aria-pressed', 'true')

  // A palette recolours the page and changes the example code; the install command keeps its placeholder.
  const journey = page.locator('section#get-started')
  const code = journey.locator('.ol-pcode-v')
  const before = await code.textContent()
  expect(before).toMatch(/^ps_[0-9a-f]{32}@1$/)
  await journey.getByRole('group', { name: 'Palette', exact: true }).getByRole('button').nth(1).click()
  await expect(code).not.toHaveText(before!)
  await expect(journey.locator('.ol-term-cmd code')).toContainText('init --preset PRESET')
  await journey.getByRole('button', { name: 'Existing shadcn', exact: true }).click()
  await expect(journey.locator('.ol-term-cmd code')).toContainText('theme add PRESET')

  await dock.getByRole('button', { name: 'Ombelle', exact: true }).click()
  await expect(main).toHaveAttribute('data-family', 'ombelle')
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([])
  await page.setViewportSize({ width: 390, height: 844 })
  await hero.scrollIntoViewIfNeeded()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  await hero.screenshot({ path: '.artifacts/website-hero-ombelle-mobile.png' })
  await page.getByRole('button', { name: 'Dark theme', exact: true }).click()
  await expect(page.locator('html')).toHaveClass(/(?:^|\s)dark(?:\s|$)/)
  await expect(demo).toHaveCSS('border-top-width', /^(1|1\.5)px$/)
  await hero.screenshot({ path: '.artifacts/website-hero-ombelle-dark.png' })
})

test('landing links styled as buttons read like the buttons beside them, in every family and both modes', async ({ page }) => {
  await page.goto('/')
  const dock = page.getByRole('group', { name: 'Page style', exact: true })
  // The hero's "Get started" link and its form's "Continue" button are both the primary variant.
  const link = page.locator('section[aria-labelledby="hero"]').getByRole('link', { name: 'Get started' })
  const button = page.locator('section[aria-labelledby="hero"]').getByRole('button', { name: /^(Continue|Workspace created)$/ })
  for (const dark of [false, true]) {
    await page.evaluate((on) => document.documentElement.classList.toggle('dark', on), dark)
    for (const name of ['Ombelle', 'Papier', 'Organic', 'Retro', 'Minimalist', 'Neo-brutal', 'Flat', 'Glass']) {
      await dock.getByRole('button', { name, exact: true }).click()
      // Colours fade between families, so poll until they settle instead of reading them mid-fade.
      const colors = async () => ({
        link: await link.evaluate((node) => getComputedStyle(node).color),
        button: await button.evaluate((node) => getComputedStyle(node).color),
      })
      await expect.poll(async () => { const c = await colors(); return c.link === c.button }, { message: `${name}, ${dark ? 'dark' : 'light'}` }).toBe(true)
    }
  }
})

test('the Cycle button restyles the page from anywhere on it, and stops when pressed again', async ({ page }) => {
  await page.goto('/')
  const main = page.locator('main')
  const dock = page.getByRole('group', { name: 'Page style', exact: true })
  const cycle = dock.getByRole('button', { name: 'Cycle', exact: true })
  // Start from a family the visitor chose, so the automatic first lap is not running.
  await dock.getByRole('button', { name: 'Ombelle', exact: true }).click()
  await expect(cycle).toHaveAttribute('aria-pressed', 'false')
  await page.locator('section#cascade').scrollIntoViewIfNeeded()
  expect(await page.evaluate(() => document.getElementById('hero-section')!.getBoundingClientRect().bottom)).toBeLessThan(0)
  await cycle.click()
  // It answers the press at once, with the hero far out of view.
  await expect(main).not.toHaveAttribute('data-family', 'ombelle')
  await expect(cycle).toHaveAttribute('aria-pressed', 'true')
  await cycle.click()
  await expect(cycle).toHaveAttribute('aria-pressed', 'false')
})

/** The editor's guide link: in the preset editor's header, or in a component editor's switcher sheet. */
async function guideLink(page: Page, kind: string) {
  if (kind === 'preset') return page.getByRole('link', { name: 'Preset editor guide', exact: true })
  await page.getByRole('button', { name: /^Component: .*Choose a component$/ }).click()
  return page.getByRole('dialog', { name: 'Choose a component' }).getByRole('link', { name: 'Component editor guide', exact: true })
}

for (const kind of ['preset', 'component/button', 'component/badge']) {
  test(`${kind} starts in Ombelle, links to its guide, and restores a saved Flat draft`, async ({ page }) => {
    await page.goto(`/editor/${kind}`)
    // The editors pick the family in a radio group.
    const families = page.getByRole('radiogroup', { name: 'Style family', exact: true })
    await expect(families.getByRole('radio', { name: /^Ombelle/ })).toHaveAttribute('aria-checked', 'true')
    await expect(page.getByRole('button', { name: 'Get code', exact: true })).toBeEnabled()
    const guide = kind === 'preset' ? 'preset-editor' : 'component-editor'
    const link = await guideLink(page, kind)
    await expect(link).toHaveAttribute('href', `/docs/${guide}`)
    if (kind !== 'preset') await page.keyboard.press('Escape')
    const flat = families.getByRole('radio', { name: /^Flat/ })
    await flat.click()
    // The preset editor asks first only when the change would drop edits.
    const confirm = page.getByRole('button', { name: 'Confirm change', exact: true })
    await expect(confirm.or(flat.and(page.locator('[aria-checked="true"]')))).toBeVisible()
    if (await confirm.isVisible()) await confirm.click()
    await expect(flat).toHaveAttribute('aria-checked', 'true')
    const key = kind === 'preset' ? 'ombelle:preset-editor:draft:v1' : kind === 'component/button' ? 'ombelle.button-editor.draft' : 'ombelle.component-editor.badge.draft'
    await expect.poll(() => page.evaluate(key => {
      const saved = JSON.parse(localStorage.getItem(key) ?? '{}')
      return saved.family ?? saved.recipe?.presetRef?.id
    }, key)).toBe(kind === 'preset' ? 'flat' : 'builtin-flat')
    await page.reload()
    await expect(flat).toHaveAttribute('aria-checked', 'true')
    await (await guideLink(page, kind)).click()
    await expect(page).toHaveURL(new RegExp(`/docs/${guide}$`))
  })
}
