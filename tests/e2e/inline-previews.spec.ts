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
const modeToggle = (page: Page) => page.getByRole('button', { name: 'Dark preview', exact: true })
/** Picks an explicit preview mode with the one light/dark toggle; when it already shows that mode (following the site), it toggles away and back. */
async function pickMode(page: Page, label: 'Light' | 'Dark') {
  const toggle = modeToggle(page)
  if ((await toggle.getAttribute('aria-pressed') === 'true') === (label === 'Dark')) await toggle.click()
  await toggle.click()
}

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
    await pickMode(page, 'Light')
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

test("site component rules stay off the preview's catalog markers", async ({ page }) => {
  // The site's compiled components share catalog markers with the specimens (data-code-block-mode, data-menubar-dot…);
  // no site rule that names a data attribute may match an element inside the stage.
  for (const id of ['code-block', 'menubar', 'button-group', 'checkbox']) {
    await open(page, `/components/${id}`)
    const matched = await stage(page).evaluate(root => {
      const rules: string[] = []
      const collect = (list: CSSRuleList) => {
        for (const rule of list) {
          if (rule instanceof CSSStyleRule) rules.push(rule.selectorText)
          if ('cssRules' in rule && !(rule instanceof CSSStyleRule)) collect((rule as CSSGroupingRule).cssRules)
        }
      }
      for (const sheet of document.styleSheets) if (!sheet.href?.includes('/previews/')) collect(sheet.cssRules)
      const elements = [root, ...root.querySelectorAll('*')]
      return rules.filter(selector => /\[data-(?!preview-|focus)/.test(selector))
        .flatMap(selector => selector.split(/,(?![^(]*\))/))
        .filter(selector => { try { return elements.some(element => element.matches(selector.replace(/::?(before|after|placeholder|selection|marker|-webkit-[\w-]+)$/, ''))) } catch { return false } })
    })
    expect(matched, id).toEqual([])
  }
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
      // Only the playground counts: on phones the catalog Sidebar's pre-hydration fallback moves the whole page
      // once on every docs and component page, previews or not. Within it:
      // 1. the controls (toggles, status line, tabs) never move, input or not;
      // 2. the stage does not move while the page loads;
      // 3. after a family switch the stage moves only in the commit frame, the restyle the reader asked for:
      //    nothing may shift later, when a stylesheet or a font arrives.
      // `hadRecentInput` is not used: it would hide late shifts that follow a click.
      await page.addInitScript(() => {
        type Shift = { value: number; startTime: number; part: 'controls' | 'stage'; sources: string[] }
        type Commit = { family: string; mutation: number; frame: number }
        const record = { shifts: [] as Shift[], commits: [] as Commit[] }
        ;(window as unknown as { previewShifts: typeof record }).previewShifts = record
        const describe = (node: Node) => {
          if (!(node instanceof Element)) return node.nodeName
          return [node.tagName.toLowerCase(), node.getAttribute('data-slot') && `[${node.getAttribute('data-slot')}]`, typeof node.className === 'string' && node.className && `.${node.className.split(' ').slice(0, 3).join('.')}`].filter(Boolean).join('')
        }
        new PerformanceObserver(list => {
          const playground = document.querySelector('section[aria-label="Example"]')
          const stage = document.querySelector('[data-preview-family]')
          for (const entry of list.getEntries() as (PerformanceEntry & { value: number; sources: { node: Node | null }[] })[]) {
            const nodes = entry.sources.map(source => source.node).filter((node): node is Node => !!node && !!playground?.contains(node))
            if (!nodes.length) continue
            const part = nodes.every(node => stage?.contains(node)) ? 'stage' : 'controls'
            record.shifts.push({ value: entry.value, startTime: entry.startTime, part, sources: nodes.map(describe) })
          }
        }).observe({ type: 'layout-shift', buffered: true })
        // A switch's commit frame is the frame rendered right after the stage's family changes. `frame` is the
        // clock when the next frame starts its callbacks (rAF timestamps lag the clock in headless Chrome), so
        // commit-frame shifts are stamped between `mutation` and `frame`, and anything later is a late shift.
        new MutationObserver(mutations => {
          for (const mutation of mutations) {
            const stage = mutation.target as HTMLElement
            const commit = { family: stage.dataset.previewFamily!, mutation: performance.now(), frame: Number.NaN }
            record.commits.push(commit)
            requestAnimationFrame(() => requestAnimationFrame(() => { commit.frame = performance.now() }))
          }
        }).observe(document, { subtree: true, attributes: true, attributeFilter: ['data-preview-family'] })
      })
      await open(page, '/components/button')
      await page.waitForLoadState('load')
      await page.waitForTimeout(500)
      for (const [value, label] of [...families.slice(1), families[0]]) {
        await pickFamily(page, value, label)
        await page.waitForTimeout(700)
      }
      const { shifts, commits } = await page.evaluate(() => (window as unknown as { previewShifts: { shifts: { value: number; startTime: number; part: string; sources: string[] }[]; commits: { family: string; mutation: number; frame: number }[] } }).previewShifts)
      expect(commits.map(commit => commit.family)).toEqual([...families.slice(1), families[0]].map(([value]) => value))
      const sum = (list: { value: number }[]) => list.reduce((total, { value }) => total + value, 0)
      const commitFor = (time: number) => commits.find(commit => time >= commit.mutation && time < commit.frame)
      const controls = shifts.filter(shift => shift.part === 'controls')
      const stage = shifts.filter(shift => shift.part === 'stage')
      const loading = stage.filter(shift => !commits.length || shift.startTime < commits[0]!.mutation)
      const late = stage.filter(shift => !loading.includes(shift) && !commitFor(shift.startTime))
      const table = commits.map(commit => {
        const next = commits[commits.indexOf(commit) + 1]?.mutation ?? Infinity
        const after = stage.filter(shift => shift.startTime >= commit.mutation && shift.startTime < next)
        return `${commit.family}: commit frame ${sum(after.filter(shift => commitFor(shift.startTime) === commit)).toFixed(4)} (exempt), later ${sum(after.filter(shift => late.includes(shift))).toFixed(4)}`
      })
      const report = JSON.stringify({ table, commits, controls, loading, late }, null, 1)
      expect(sum(controls), report).toBeLessThan(0.01)
      expect(sum(loading), report).toBeLessThan(0.01)
      expect(sum(late), report).toBeLessThan(0.01)
    })
  })
}

test.describe('the specimen sits inside the stage', () => {
  // The focus layout centres the specimen in the stage and sizes it to the stage, not to the page:
  // the first slot of each specimen lies within the stage's client box, whatever the viewport.
  for (const viewport of [{ width: 375, height: 812 }, { width: 1100, height: 800 }, { width: 1440, height: 1000 }]) {
    test(`at ${viewport.width}x${viewport.height}`, async ({ page }) => {
      await page.setViewportSize(viewport)
      for (const id of ['button', 'dropdown-menu', 'slider', 'alert']) {
        await open(page, `/components/${id}`)
        const { box, slot } = await stage(page).evaluate(element => {
          const rect = element.getBoundingClientRect()
          const first = element.querySelector('[data-slot]')!.getBoundingClientRect()
          return {
            box: { top: rect.top + element.clientTop, left: rect.left + element.clientLeft, bottom: rect.top + element.clientTop + element.clientHeight, right: rect.left + element.clientLeft + element.clientWidth },
            slot: { top: first.top, left: first.left, bottom: first.bottom, right: first.right },
          }
        })
        const report = `${id}: slot ${JSON.stringify(slot)} in stage ${JSON.stringify(box)}`
        expect(slot.top, report).toBeGreaterThanOrEqual(box.top)
        expect(slot.left, report).toBeGreaterThanOrEqual(box.left)
        expect(slot.bottom, report).toBeLessThanOrEqual(box.bottom)
        expect(slot.right, report).toBeLessThanOrEqual(box.right)
      }
    })
  }
})

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
          await pickMode(page, mode)
          await expect(stage(page)).toHaveAttribute('data-preview-mode', mode.toLowerCase())
          expect((await axe(page).analyze()).violations).toEqual([])
        })
  // Intent colours (the warning badge, the alert intents) come from each family or its fallbacks, never the site's tokens.
  for (const id of ['badge', 'alert'])
    for (const [value, label] of families)
      test(`/components/${id} in ${label} light has no violations`, async ({ page }) => {
        await open(page, `/components/${id}`)
        if (value !== 'ombelle') await pickFamily(page, value, label)
        await pickMode(page, 'Light')
        await expect(stage(page)).toHaveAttribute('data-preview-mode', 'light')
        expect((await axe(page).analyze()).violations).toEqual([])
      })
})
