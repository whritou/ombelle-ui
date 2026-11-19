import { expect, test, type Page } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import { componentDocs } from '../../apps/www/src/site/components/catalog.js'

// Inline component previews on /components/[id] (docs/superpowers/specs/2026-11-19-inline-component-previews-design.md).
// Run pnpm build:packages and pnpm generate:preview first.
const site = 'http://127.0.0.1:3000'
const families = [
  ['ombelle', 'Ombelle'],
  ['papier', 'Papier'],
  ['organic', 'Organic'],
  ['retro-futurism', 'Retro futurism'],
  ['minimalist', 'Minimalist'],
  ['flat', 'Flat'],
  ['neo-brutalism', 'Neo-Brutalism'],
] as const
const sampled = ['color', 'background-color', 'border', 'border-radius', 'font-family', 'box-shadow'] as const

const stage = (page: Page) => page.locator('[data-preview-family]')
// The playground's status line, `<Family> · <light|dark>` (code blocks have their own status regions).
const previewStatus = (page: Page) => page.locator('section[aria-label="Example"] [role="status"]').first()
const familyButton = (page: Page, label: string) =>
  page.getByRole('group', { name: 'Style family' }).getByRole('button', { name: label, exact: true })
const modeButton = (page: Page, label: 'Light' | 'Dark') =>
  page.getByRole('group', { name: 'Preview mode' }).getByRole('button', { name: label, exact: true })

/** Loads a page and waits until React has hydrated it. */
async function open(page: Page, path: string) {
  await page.goto(`${site}${path}`)
  await expect(page.locator('[data-slot="sidebar-wrapper"][data-hydrated]')).toBeAttached({ timeout: 60000 })
}

/** Picks a family and waits for the stage and the status line to show it. */
async function pickFamily(page: Page, value: string, label: string) {
  await familyButton(page, label).click()
  await expect(stage(page)).toHaveAttribute('data-preview-family', value)
  await expect(previewStatus(page)).toHaveText(new RegExp(`^${label} · `))
}

/** The sampled computed styles of every element under `root`, in document order. */
function computedTree(page: Page, selector: string) {
  return page.locator(selector).first().evaluate((root, properties) =>
    [root, ...root.querySelectorAll('*')].map(element => {
      const style = getComputedStyle(element)
      return [element.getAttribute('data-slot') ?? element.tagName, ...properties.map(name => style.getPropertyValue(name))].join(' | ')
    }), [...sampled, 'padding', 'font-size', 'font-weight', 'outline', 'gap'])
}

/** The sampled computed styles of one element. */
function computedOf(page: Page, selector: string) {
  return page.locator(selector).first().evaluate((element, properties) => {
    const style = getComputedStyle(element)
    return Object.fromEntries(properties.map(name => [name, style.getPropertyValue(name)]))
  }, [...sampled])
}

test.describe('without JavaScript', () => {
  test.use({ javaScriptEnabled: false })
  test('renders the specimen without JavaScript', async ({ page }) => {
    await page.goto(`${site}/components/button`)
    const button = page.locator('[data-preview-family="ombelle"] [data-slot="pv-button"]').first()
    await expect(button).toBeVisible()
    const [specimen, siteBackground] = await button.evaluate((element) => {
      const probe = document.createElement('div')
      probe.style.backgroundColor = 'var(--background)'
      document.body.append(probe)
      const colors = [getComputedStyle(element).backgroundColor, getComputedStyle(probe).backgroundColor]
      probe.remove()
      return colors
    })
    expect(specimen).not.toBe('rgba(0, 0, 0, 0)')
    expect(specimen).not.toBe(siteBackground)
  })
})

test.describe('no hydration warning on any component page', () => {
  for (const { id } of componentDocs) {
    test(id, async ({ page }) => {
      const warnings: string[] = []
      page.on('console', message => {
        if ((message.type() === 'error' || message.type() === 'warning') && /hydrat|did not match/i.test(message.text())) warnings.push(message.text())
      })
      page.on('pageerror', error => { if (/hydrat|did not match/i.test(error.message)) warnings.push(error.message) })
      await open(page, `/components/${id}`)
      await page.waitForLoadState('load')
      // React reports a recoverable hydration error after the commit; give it a moment.
      await page.waitForTimeout(500)
      expect(warnings).toEqual([])
    })
  }
})

test('explicit light preview stays light under a dark site', async ({ page }) => {
  const cases = [
    { id: 'dropdown-menu', trigger: 'Project actions', content: '[data-slot="pv-dropdown-menu-content"]', key: 'Escape' },
    { id: 'dialog', trigger: 'Open dialog', content: '[data-slot="pv-dialog-content"]', key: 'Escape' },
  ]
  for (const { id, trigger, content, key } of cases) {
    const background = async () => {
      await stage(page).getByRole('button', { name: trigger }).click()
      await expect(page.locator(content)).toBeVisible()
      const value = await page.locator(content).evaluate(element => getComputedStyle(element).backgroundColor)
      await page.keyboard.press(key)
      await expect(page.locator(content)).toBeHidden()
      return value
    }
    // The light value: a light site with the preview following it.
    await page.emulateMedia({ colorScheme: 'light' })
    await page.goto(`${site}/`)
    await page.evaluate(() => localStorage.setItem('ombelle-theme', 'light'))
    await open(page, `/components/${id}`)
    const light = await background()
    await page.evaluate(() => localStorage.setItem('ombelle-theme', 'dark'))
    await open(page, `/components/${id}`)
    await expect(page.locator('html')).toHaveClass(/\bdark\b/)
    const followingDark = await background()
    expect(followingDark).not.toBe(light)
    await modeButton(page, 'Light').click()
    await expect(stage(page)).toHaveAttribute('data-preview-mode', 'light')
    expect(await background()).toBe(light)
  }
  await page.evaluate(() => localStorage.removeItem('ombelle-theme'))
})

test('last family wins on rapid switches', async ({ page, context }) => {
  await open(page, '/components/button')
  const cdp = await context.newCDPSession(page)
  await cdp.send('Network.enable')
  await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: 400, downloadThroughput: 200 * 1024, uploadThroughput: 200 * 1024 })
  await familyButton(page, 'Papier').click()
  await familyButton(page, 'Organic').click()
  // The pick shows at once, before its styles arrive.
  await expect(familyButton(page, 'Organic')).toHaveAttribute('aria-pressed', 'true', { timeout: 300 })
  await expect(familyButton(page, 'Papier')).toHaveAttribute('aria-pressed', 'false')
  await expect(stage(page)).toHaveAttribute('data-preview-family', 'organic', { timeout: 30000 })
  await expect(previewStatus(page)).toHaveText('Organic · light')
  // Let any late Papier response land before sampling.
  await page.waitForTimeout(2000)
  await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: 0, downloadThroughput: -1, uploadThroughput: -1 })
  const switched = await computedTree(page, '[data-preview-family]')

  const fresh = await context.newPage()
  await open(fresh, '/components/button')
  await pickFamily(fresh, 'organic', 'Organic')
  expect(switched).toEqual(await computedTree(fresh, '[data-preview-family]'))
})

test('client navigation keeps the next specimen styled', async ({ page }) => {
  // Every frame of every document records whether the stage it shows has its stylesheets.
  await page.addInitScript(() => {
    const frames: { focus: string; styled: boolean }[] = []
    ;(window as unknown as { previewFrames: typeof frames }).previewFrames = frames
    const loaded = (suffix: string) => [...document.styleSheets].some(sheet => sheet.href?.endsWith(suffix) && sheet.cssRules.length > 0)
    const sample = () => {
      const stage = document.querySelector<HTMLElement>('[data-preview-family][data-focus]')
      if (stage) {
        const { previewFamily: family, focus } = stage.dataset
        frames.push({ focus: focus!, styled: loaded(`/previews/${family}/base.css`) && loaded(`/previews/${family}/${focus}.css`) })
      }
      requestAnimationFrame(sample)
    }
    requestAnimationFrame(sample)
  })
  await open(page, '/components/button')
  const next = page.locator('a[href^="/components/"]').filter({ has: page.locator('svg') }).last()
  const href = (await next.getAttribute('href'))!
  const id = href.split('/').pop()!
  await next.click()
  await expect(page).toHaveURL(new RegExp(`/components/${id}$`))
  await expect(page.locator(`[data-preview-family][data-focus="${id}"]`)).toBeVisible()
  await page.waitForTimeout(500)
  const frames = await page.evaluate(() => (window as unknown as { previewFrames: { focus: string; styled: boolean }[] }).previewFrames)
  const shown = frames.filter(frame => frame.focus === id)
  expect(shown.length).toBeGreaterThan(0)
  expect(shown.filter(frame => !frame.styled)).toEqual([])
})

test('input group clear works inline', async ({ page }) => {
  await open(page, '/components/input-group')
  const search = stage(page).getByRole('textbox', { name: 'Search' })
  await search.fill('glass toast and more')
  await stage(page).getByRole('button', { name: 'Clear search' }).click()
  await expect(search).toHaveValue('')
})

test('does not leak styles', async ({ page, context }) => {
  const chrome = {
    header: 'header nav[aria-label="Primary"] a',
    sidebarLink: '[data-slot="sidebar"] a:not([aria-current])',
  }
  await open(page, '/docs')
  const docs = { header: await computedOf(page, chrome.header), sidebarLink: await computedOf(page, chrome.sidebarLink) }

  // The Code tab with no preview stylesheet at all.
  const bare = await context.newPage()
  await bare.route('**/previews/**', route => route.abort())
  await bare.goto(`${site}/components/dialog`)
  await expect(bare.locator('[data-slot="sidebar-wrapper"][data-hydrated]')).toBeAttached({ timeout: 60000 })
  const codeTab = await computedOf(bare, '[role="tab"]:has-text("Code")')
  await bare.close()

  await open(page, '/components/dialog')
  await pickFamily(page, 'papier', 'Papier')
  expect(await computedOf(page, chrome.header)).toEqual(docs.header)
  expect(await computedOf(page, chrome.sidebarLink)).toEqual(docs.sidebarLink)
  expect(await computedOf(page, '[role="tab"]:has-text("Code")')).toEqual(codeTab)

  // The inline specimen against the same family in the sandboxed preview, slot by slot.
  const inline = async () => {
    const trigger = stage(page).getByRole('button', { name: 'Open dialog' })
    const closed = await trigger.evaluate((element, properties) => {
      const style = getComputedStyle(element)
      return properties.map(name => style.getPropertyValue(name))
    }, [...sampled])
    await trigger.click()
    const content = page.locator('[data-slot="pv-dialog-content"]')
    await expect(content).toBeVisible()
    const open = await content.evaluate((element, properties) =>
      [element, ...element.querySelectorAll('[data-slot]')].map(node => {
        const style = getComputedStyle(node)
        return [node.getAttribute('data-slot')!.replace(/^pv-/, ''), ...properties.map(name => style.getPropertyValue(name))].join(' | ')
      }), [...sampled])
    await page.keyboard.press('Escape')
    return { closed, open }
  }
  const ours = await inline()

  // The sandboxed preview of the same family: the preset editor's gallery frame with Papier picked.
  const editor = await context.newPage()
  await editor.goto(`${site}/editor/preset?page=gallery`)
  await editor.evaluate(() => localStorage.clear())
  await editor.reload()
  await editor.getByRole('radiogroup', { name: 'Style family' }).getByRole('radio', { name: 'Papier' }).click()
  await editor.getByRole('alertdialog', { name: 'Change style family?' }).getByRole('button', { name: 'Confirm change' }).click()
  const frame = editor.frameLocator('iframe[title="Global preset gallery"]')
  const trigger = frame.locator('[data-component="dialog"]').getByRole('button', { name: 'Open dialog' })
  const triggerStyles = () => trigger.evaluate((element, properties) => {
    const style = getComputedStyle(element)
    return properties.map(name => style.getPropertyValue(name))
  }, [...sampled])
  // The frame shows Ombelle until the Papier compile lands, so wait for its trigger to settle on ours.
  await expect.poll(triggerStyles, { timeout: 60000 }).toEqual(ours.closed)
  await trigger.click()
  const content = frame.locator('[data-slot="dialog-content"]')
  await expect(content).toBeVisible()
  const theirsOpen = await content.evaluate((element, properties) =>
    [element, ...element.querySelectorAll('[data-slot]')].map(node => {
      const style = getComputedStyle(node)
      return [node.getAttribute('data-slot')!, ...properties.map(name => style.getPropertyValue(name))].join(' | ')
    }), [...sampled])
  expect(ours.open).toEqual(theirsOpen)
})

test('portals, focus and keyboard', async ({ page }) => {
  await open(page, '/components/dialog')
  const trigger = stage(page).getByRole('button', { name: 'Open dialog' })
  await trigger.focus()
  await page.keyboard.press('Enter')
  const dialog = page.getByRole('dialog', { name: 'Ready to publish?' })
  await expect(dialog).toBeVisible()
  // The overlay covers the sticky site header.
  const hit = await page.evaluate(() => {
    const header = document.querySelector('header')!.getBoundingClientRect()
    const element = document.elementFromPoint(header.left + header.width / 2, header.top + header.height / 2)
    return element?.closest('[data-slot]')?.getAttribute('data-slot') ?? element?.tagName
  })
  expect(hit).toBe('pv-dialog-overlay')
  for (let step = 0; step < 4; step++) {
    await page.keyboard.press('Tab')
    expect(await dialog.evaluate(element => element.contains(document.activeElement))).toBe(true)
  }
  await page.keyboard.press('Escape')
  await expect(dialog).toBeHidden()
  await expect(trigger).toBeFocused()

  await open(page, '/components/dropdown-menu')
  const menuTrigger = stage(page).getByRole('button', { name: 'Project actions' })
  await menuTrigger.focus()
  await page.keyboard.press('ArrowDown')
  const menu = page.getByRole('menu')
  await expect(menu).toBeVisible()
  await expect(menu.getByRole('menuitem', { name: /Rename/ })).toBeFocused()
  await page.keyboard.press('ArrowDown')
  await expect(menu.getByRole('menuitem', { name: /Duplicate/ })).toBeFocused()
  await page.keyboard.press('ArrowDown')
  await expect(menu.getByRole('menuitem', { name: 'Archive' })).toBeFocused()
  await page.keyboard.press('Escape')
  await expect(menu).toBeHidden()
  await expect(menuTrigger).toBeFocused()
})

for (const viewport of [{ width: 375, height: 812 }, { width: 1100, height: 800 }]) {
  test.describe(`at ${viewport.width} px`, () => {
    test.use({ viewport })
    test('no layout shift', async ({ page }) => {
      await page.addInitScript(() => {
        type Shift = { value: number; sources: string[] }
        const shifts: Shift[] = []
        ;(window as unknown as { layoutShifts: Shift[] }).layoutShifts = shifts
        const describe = (node: Node | null) => {
          if (!(node instanceof Element)) return String(node?.nodeName)
          return [node.tagName.toLowerCase(), node.id && `#${node.id}`, node.getAttribute('data-slot') && `[${node.getAttribute('data-slot')}]`, typeof node.className === 'string' && node.className && `.${node.className.split(' ').slice(0, 3).join('.')}`].filter(Boolean).join('')
        }
        new PerformanceObserver(list => {
          for (const entry of list.getEntries() as (PerformanceEntry & { value: number; hadRecentInput: boolean; sources: { node: Node | null }[] })[])
            if (!entry.hadRecentInput) shifts.push({ value: entry.value, sources: entry.sources.map(source => describe(source.node)) })
        }).observe({ type: 'layout-shift', buffered: true })
      })
      // The shifts come back with their sources, so a failure names what moved.
      const shifts = () => page.evaluate(() => (window as unknown as { layoutShifts: { value: number; sources: string[] }[] }).layoutShifts)
      const total = async () => {
        const all = await shifts()
        return { total: all.reduce((sum, { value }) => sum + value, 0), all }
      }
      await open(page, '/components/button')
      await page.waitForLoadState('load')
      await page.waitForTimeout(500)
      const loaded = await total()
      expect(loaded.total, JSON.stringify(loaded.all)).toBeLessThan(0.01)
      for (const [value, label] of [...families.slice(1), families[0]]) {
        await pickFamily(page, value, label)
        await page.waitForTimeout(700)
      }
      const switched = await total()
      expect(switched.total, JSON.stringify(switched.all)).toBeLessThan(0.01)
    })
  })
}

test.describe('axe stays clean', () => {
  // Radix Navigation Menu's hidden focus proxy, left out as in site-shell.spec.ts.
  const axe = (page: Page) => new AxeBuilder({ page }).exclude('[data-slot="navigation-menu"] li > span[aria-hidden="true"][tabindex="0"]')
  for (const path of ['/components', '/components/data-table']) {
    test(`${path} has no violations`, async ({ page }) => {
      await open(page, path)
      expect((await axe(page).analyze()).violations).toEqual([])
    })
  }
  for (const id of ['button', 'dropdown-menu'])
    for (const [value, label] of families)
      for (const mode of ['Light', 'Dark'] as const)
        test(`/components/${id} in ${label} ${mode.toLowerCase()} has no violations`, async ({ page }) => {
          await open(page, `/components/${id}`)
          if (value !== 'ombelle') await pickFamily(page, value, label)
          await modeButton(page, mode).click()
          await expect(stage(page)).toHaveAttribute('data-preview-mode', mode.toLowerCase())
          expect((await axe(page).analyze()).violations).toEqual([])
        })
})
