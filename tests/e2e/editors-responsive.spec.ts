import { expect, test, type Page } from '@playwright/test'
import { waitForCompiled } from '../helpers/preset-editor-ui.js'

// Phone and tablet structures of both editors: docs/superpowers/specs/2026-11-13-responsive-editors-design.md.
const editors = [
  { name: 'preset editor', url: 'http://127.0.0.1:3000/editor/preset' },
  { name: 'Button editor', url: 'http://127.0.0.1:3000/editor/component/button' },
] as const
const sizes = [
  { width: 320, height: 640 },
  { width: 375, height: 812 },
  { width: 768, height: 1024 },
] as const

/** Console messages that report a hydration mismatch. */
function watchHydration(page: Page) {
  const messages: string[] = []
  page.on('console', message => { if (/hydrat/i.test(message.text())) messages.push(message.text()) })
  return messages
}

async function open(page: Page, url: string) {
  await page.goto(url)
  await waitForCompiled(page, 60000)
}

async function expectFitsViewport(page: Page, width: number) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width)
  // Below 1200px the panes scroll and the document does not.
  expect(await page.evaluate(() => document.scrollingElement!.scrollHeight - innerHeight)).toBeLessThanOrEqual(1)
}

for (const editor of editors) {
  for (const size of sizes) {
    test(`the ${editor.name} fits ${size.width}×${size.height} without the site header`, async ({ page }) => {
      const hydration = watchHydration(page)
      await page.setViewportSize(size)
      await open(page, editor.url)
      await expectFitsViewport(page, size.width)
      await expect(page.locator('header:has(a[href="#main"])')).toBeHidden()
      expect(hydration).toEqual([])
    })
  }

  test(`the ${editor.name} still fits 375px in Liquid glass`, async ({ page }) => {
    // The family is chosen at desktop width, where the picker is always shown; the draft is kept on resize.
    await page.setViewportSize({ width: 1440, height: 900 })
    await open(page, editor.url)
    await page.getByRole('radiogroup', { name: 'Style family', exact: true }).getByRole('radio', { name: /^Liquid glass/ }).click()
    const confirm = page.getByRole('button', { name: 'Confirm change', exact: true })
    if (await confirm.isVisible().catch(() => false)) await confirm.click()
    await waitForCompiled(page, 60000)
    await page.setViewportSize({ width: 375, height: 812 })
    await expectFitsViewport(page, 375)
  })
}

test('the desktop keeps the site header', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await open(page, editors[0].url)
  await expect(page.locator('header:has(a[href="#main"])')).toBeVisible()
})

for (const editor of editors) {
  test(`the ${editor.name} keeps a compact top bar and a More actions sheet on a phone`, async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 })
    await open(page, editor.url)
    const bar = page.locator('main[data-editor-root] > header').first()
    expect((await bar.boundingBox())!.height).toBeLessThanOrEqual(100)
    await expect(page.getByRole('button', { name: 'Redo', exact: true })).toBeHidden()
    await expect(page.getByRole('button', { name: /^Commands/ })).toBeHidden()
    const more = page.getByRole('button', { name: 'More actions', exact: true })
    expect((await more.boundingBox())!.height).toBeGreaterThanOrEqual(44)
    await more.click()
    const sheet = page.getByRole('dialog', { name: 'More actions' })
    await expect(sheet).toBeVisible()
    const box = (await sheet.boundingBox())!
    expect(Math.abs(box.y + box.height - 812)).toBeLessThanOrEqual(1)
    expect(Math.round(box.width)).toBe(375)
    await expect(sheet.getByRole('button', { name: 'Redo', exact: true })).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(sheet).toBeHidden()
    await expect(more).toBeFocused()
  })
}

test('a long preset name stays inside a 320px top bar', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 640 })
  await open(page, editors[0].url)
  await page.getByLabel('Preset name', { exact: true }).fill('A very long preset name '.repeat(5))
  await expectFitsViewport(page, 320)
})

for (const size of [{ width: 1440, height: 900 }, { width: 375, height: 812 }] as const) {
  test(`the component switcher replaces the component row at ${size.width}px`, async ({ page }) => {
    await page.setViewportSize(size)
    await open(page, editors[1].url)
    await expect(page.locator('[aria-label="Editable components"]')).toHaveCount(0)
    const switcher = page.getByRole('button', { name: 'Component: Button. Choose a component', exact: true })
    await switcher.click()
    const sheet = page.getByRole('dialog', { name: 'Choose a component' })
    await expect(sheet).toBeVisible()
    await expect(sheet.getByRole('link', { name: /^Button/ }).first()).toHaveAttribute('aria-current', 'page')
    await sheet.getByLabel('Search components', { exact: true }).fill('acc')
    const names = await sheet.getByRole('list', { name: 'Components' }).getByRole('link').allTextContents()
    expect(names.length).toBeGreaterThan(0)
    expect(names.every(name => /acc/i.test(name))).toBe(true)
    await expect(sheet.getByRole('link', { name: 'Browse all components', exact: true })).toHaveAttribute('href', '/components')
    await expect(sheet.getByRole('link', { name: 'Component editor guide', exact: true })).toHaveAttribute('href', '/docs/component-editor')
    await page.keyboard.press('Escape')
    await expect(sheet).toBeHidden()
    await expect(switcher).toBeFocused()
    if (size.width < 768) {
      const sheetBox = page.getByRole('link', { name: 'All components', exact: true })
      await expect(sheetBox).toHaveAttribute('href', '/editor/component')
    }
  })
}

test('the pinned specimen shows the Button inside its card on a phone', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await open(page, editors[1].url)
  const button = page.locator('iframe[title="Button recipe preview"]').contentFrame().locator('[data-slot="recipe-button"]')
  await expect(button).toBeVisible({ timeout: 20000 })
  const card = (await page.locator('iframe[title="Button recipe preview"]').locator('xpath=..').boundingBox())!
  const shown = (await button.boundingBox())!
  expect(card.height).toBeLessThanOrEqual(140)
  expect(shown.y).toBeGreaterThanOrEqual(card.y)
  expect(shown.y + shown.height).toBeLessThanOrEqual(card.y + card.height)
})

const presetDock = (page: Page) => page.getByRole('navigation', { name: 'Preset editor panes' })
const presetPane = (page: Page, name: string) => presetDock(page).getByRole('radio', { name: new RegExp('^' + name) })

test('the preset editor on a phone pins the live preview and moves between its panes', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 })
  await open(page, editors[0].url)
  await expect(presetPane(page, 'Customize')).toHaveAttribute('aria-checked', 'true')
  // A trail that is only the page's name does nothing on a phone; the bar leaves it out.
  await expect(page.getByRole('navigation', { name: 'Breadcrumb' })).toBeHidden()
  await expect(presetPane(page, 'Preview')).toBeVisible()
  await expect(presetPane(page, 'Checks')).toBeVisible()
  const peek = page.getByRole('region', { name: 'Live preview' })
  await expect(peek).toBeVisible()
  const before = (await peek.boundingBox())!
  expect(before.height).toBeLessThanOrEqual(130)
  await page.locator('[class*="workbench"]').first().evaluate(element => { element.scrollTop += 600 })
  await expect.poll(async () => Math.round((await peek.boundingBox())!.y)).toBe(Math.round(before.y))
  await peek.getByRole('button', { name: 'Open preview', exact: true }).click()
  await expect(presetPane(page, 'Preview')).toHaveAttribute('aria-checked', 'true')
  expect((await page.locator('iframe[title="Preset preview"], [aria-label="Preset preview"] iframe').first().boundingBox())!.height).toBeGreaterThan(300)
  await presetPane(page, 'Checks').click()
  await expect(page.getByRole('list', { name: 'Contrast results by mode' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Download preset JSON', exact: true })).toBeVisible()
  // The Export header is square inside its rounded box, which clips it; a pill header looks detached.
  expect(await page.getByRole('button', { name: 'Export', exact: true }).evaluate(element => getComputedStyle(element).borderTopLeftRadius)).toBe('0px')
  await expectFitsViewport(page, 375)
})

test('the preset editor on a tablet keeps the preview beside the inspector and opens Checks and export in a sheet', async ({ page }) => {
  await page.setViewportSize({ width: 768, height: 1024 })
  await open(page, editors[0].url)
  const inspector = (await page.getByRole('region', { name: 'Preset inspector' }).boundingBox())!
  const preview = (await page.getByRole('region', { name: 'Live preview' }).boundingBox())!
  expect(inspector.x + inspector.width).toBeLessThanOrEqual(preview.x)
  await expect(page.getByRole('complementary', { name: 'Review' })).toBeHidden()
  const opener = page.getByRole('button', { name: /^Checks and export/ })
  expect((await opener.boundingBox())!.height).toBeGreaterThanOrEqual(44)
  await opener.click()
  const sheet = page.getByRole('dialog', { name: 'Checks and export' })
  await expect(sheet).toBeVisible()
  const box = (await sheet.boundingBox())!
  expect(Math.abs(box.y + box.height - 1024)).toBeLessThanOrEqual(1)
  await page.keyboard.press('Escape')
  await expect(sheet).toBeHidden()
  await expect(opener).toBeFocused()
})

test('resizing with the review drawer open keeps the draft and the open review', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await open(page, editors[0].url)
  await page.getByLabel('Preset name', { exact: true }).fill('Resize check')
  await page.getByRole('button', { name: /^Open export/ }).click()
  await expect(page.getByRole('tab', { name: 'Export', exact: true })).toHaveAttribute('aria-selected', 'true')
  await page.setViewportSize({ width: 375, height: 812 })
  await expect(presetPane(page, 'Checks')).toHaveAttribute('aria-checked', 'true')
  await expect(page.getByLabel('Preset name', { exact: true })).toHaveValue('Resize check')
  await page.setViewportSize({ width: 1440, height: 900 })
  await expect(page.getByRole('tab', { name: 'Export', exact: true })).toHaveAttribute('aria-selected', 'true')
})

/** The surface's box sits on the bottom edge and spans the 375px phone. */
async function expectBottomSheet(surface: import('@playwright/test').Locator) {
  await expect(surface).toBeVisible()
  const box = (await surface.boundingBox())!
  expect(Math.abs(box.y + box.height - 812)).toBeLessThanOrEqual(1)
  expect(Math.round(box.x)).toBe(0)
  expect(Math.round(box.width)).toBe(375)
}

test.describe('on a 375px phone', () => {
  test.use({ viewport: { width: 375, height: 812 } })

  for (const editor of editors) {
    test(`Get code opens from the bottom in the ${editor.name}`, async ({ page }) => {
      await open(page, editor.url)
      await page.getByRole('button', { name: 'Get code', exact: true }).click()
      await expectBottomSheet(page.locator('[data-slot="dialog-content"]'))
    })
  }

  test('the family confirmation and ID & revision open from the bottom', async ({ page }) => {
    await open(page, editors[0].url)
    await page.getByRole('radiogroup', { name: 'Style family', exact: true }).getByRole('radio', { name: /^Neo-brutalism/ }).click()
    await expectBottomSheet(page.locator('[data-slot="alert-dialog-content"]'))
    await page.getByRole('button', { name: 'Cancel', exact: true }).click()
    await page.getByRole('button', { name: 'More actions', exact: true }).click()
    await page.getByRole('dialog', { name: 'More actions' }).getByRole('button', { name: 'ID & revision…', exact: true }).click()
    await expectBottomSheet(page.locator('[data-slot="dialog-content"]'))
  })

  test('a colour token opens its editor from the bottom', async ({ page }) => {
    await open(page, editors[0].url)
    await page.getByRole('button', { name: /^Muted foreground colors/ }).click()
    await expectBottomSheet(page.getByRole('dialog', { name: 'Muted foreground colors' }))
  })

  test('the Button colour picker opens from the bottom', async ({ page }) => {
    await open(page, editors[1].url)
    await page.getByRole('button', { name: 'Open Light background color picker', exact: true }).click()
    await expectBottomSheet(page.locator('[data-slot="color-picker-content"]'))
  })

  for (const editor of editors) {
    test(`the ${editor.name} shows 44px steppers instead of sliders`, async ({ page }) => {
      await open(page, editor.url)
      const inspector = page.locator('main[data-editor-root] [aria-label="Inspector controls"]')
      await expect(inspector.locator('[data-slot="slider"]').first()).toBeHidden()
      const heights = await inspector.locator('[data-slot="number-input"]').evaluateAll(elements =>
        elements.filter(element => (element as HTMLElement).offsetParent !== null).map(element => element.getBoundingClientRect().height))
      expect(heights.length).toBeGreaterThan(0)
      expect(Math.min(...heights)).toBeGreaterThanOrEqual(44)
    })
  }
})

// Final review findings.
test('closing ID & revision or the reset confirmation on a phone returns focus to More actions', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 })
  await open(page, editors[0].url)
  const more = page.getByRole('button', { name: 'More actions', exact: true })
  for (const item of ['ID & revision…', 'Reset all tokens…']) {
    await more.click()
    await page.getByRole('dialog', { name: 'More actions' }).getByRole('button', { name: item, exact: true }).click()
    await expect(page.locator('[data-slot="dialog-content"], [data-slot="alert-dialog-content"]').first()).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(more).toBeFocused()
  }
})

test('the More actions sheet closes when the screen widens past a phone', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 })
  await open(page, editors[1].url)
  await page.getByRole('button', { name: 'More actions', exact: true }).click()
  const sheet = page.getByRole('dialog', { name: 'More actions' })
  await expect(sheet).toBeVisible()
  await page.setViewportSize({ width: 800, height: 1024 })
  await expect(sheet).toBeHidden()
  await page.setViewportSize({ width: 375, height: 812 })
  await expect(sheet).toBeHidden()
})

test('the tablet Checks and export sheet does not reopen after the screen widens and narrows', async ({ page }) => {
  await page.setViewportSize({ width: 900, height: 1024 })
  await open(page, editors[0].url)
  await page.getByRole('button', { name: /^Checks and export/ }).click()
  const sheet = page.getByRole('dialog', { name: 'Checks and export' })
  await expect(sheet).toBeVisible()
  await page.setViewportSize({ width: 1300, height: 900 })
  await expect(sheet).toBeHidden()
  await page.setViewportSize({ width: 900, height: 1024 })
  await page.waitForTimeout(500)
  await expect(sheet).toBeHidden()
})

test('a long component name shortens in the switcher at 320px and keeps its chevron', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 640 })
  await page.goto('http://127.0.0.1:3000/editor/component/dropdown-menu')
  const switcher = page.getByRole('button', { name: 'Component: Dropdown Menu. Choose a component', exact: true })
  await expect(switcher).toBeVisible({ timeout: 60000 })
  const box = (await switcher.boundingBox())!
  const nav = (await page.getByRole('navigation', { name: 'Breadcrumb' }).boundingBox())!
  const chevron = (await switcher.locator('svg').boundingBox())!
  expect(box.x + box.width).toBeLessThanOrEqual(nav.x + nav.width + 0.5)
  expect(chevron.x + chevron.width).toBeLessThanOrEqual(box.x + box.width)
  expect(await switcher.locator('span').evaluate(element => getComputedStyle(element).textOverflow)).toBe('ellipsis')
  await expectFitsViewport(page, 320)
})

// Neither the pinned preview at the top nor the dock at the bottom may cover a focused control.
for (const editor of editors) {
  test(`a focused control in the ${editor.name} stays clear of the pinned preview and the dock`, async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 })
    await open(page, editor.url)
    const pinned = page.locator('main[data-editor-root] [class*="paneCustomize"], main[data-editor-root] [class*="peek"]').first()
    const dock = page.getByRole('navigation', { name: /editor panes$/ })
    const controls = page.locator('main[data-editor-root] [aria-label="Inspector controls"] :is(input, button):not(:disabled):visible')
    const count = await controls.count()
    for (const index of [count - 1, 0, Math.floor(count / 2)]) {
      await controls.nth(index).focus()
      await page.waitForTimeout(150)
      const box = (await controls.nth(index).boundingBox())!
      const top = (await pinned.boundingBox())!
      const bottom = (await dock.boundingBox())!
      expect(box.y, `control ${index} is below the pinned preview`).toBeGreaterThanOrEqual(top.y + top.height - 1)
      expect(box.y + box.height, `control ${index} is above the dock`).toBeLessThanOrEqual(bottom.y + 1)
    }
  })
}

test('the phone preview fits between the toolbar and the dock and scrolls inside', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 })
  await open(page, editors[0].url)
  await page.getByRole('navigation', { name: 'Preset editor panes' }).getByRole('radio', { name: 'Preview', exact: true }).click()
  const frame = page.locator('[aria-label="Preset preview"] iframe')
  await expect(frame.contentFrame().locator('body')).toBeVisible({ timeout: 30000 })
  const box = (await frame.boundingBox())!
  const dock = (await page.getByRole('navigation', { name: 'Preset editor panes' }).boundingBox())!
  expect(box.y + box.height).toBeLessThanOrEqual(dock.y + 1)
  expect(box.height).toBeGreaterThan(200)
  // The pane itself has nothing left to scroll; the page inside the frame does.
  const pane = page.locator('main[data-editor-root] [class*="workbench"]').first()
  expect(await pane.evaluate(element => element.scrollHeight - element.clientHeight)).toBeLessThanOrEqual(1)
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
  await page.mouse.wheel(0, 400)
  await expect.poll(() => frame.contentFrame().locator('html').evaluate(() => scrollY)).toBeGreaterThan(0)
})
