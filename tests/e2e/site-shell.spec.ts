import { expect, test } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'

// The website's own shell on the 0.9 components (docs/superpowers/plans/2026-11-17-app-shell-09-site.md).
const site = 'http://127.0.0.1:3000'

test('the docs sidebar marks the current page', async ({ page }) => {
  await page.goto(`${site}/docs/installation`)
  const nav = page.getByRole('navigation', { name: 'Documentation' })
  await expect(nav.getByRole('link', { name: 'Installation and CLI' })).toHaveAttribute('aria-current', 'page')
  await expect(nav.getByRole('link', { name: 'Style families' })).not.toHaveAttribute('aria-current', /.+/)
})

test.describe('phones without JavaScript', () => {
  test.use({ javaScriptEnabled: false, viewport: { width: 375, height: 800 } })
  test('the docs links render inline and navigate', async ({ page }) => {
    await page.goto(`${site}/docs`)
    const link = page.getByRole('navigation', { name: 'Documentation' }).getByRole('link', { name: 'Style families' })
    await expect(link).toBeVisible()
    await link.click()
    await expect(page).toHaveURL(/\/docs\/style-families$/)
  })
})

test.describe('phones', () => {
  test.use({ viewport: { width: 375, height: 800 } })
  test('from a deep link, the sidebar sheet opens, and following a link closes it and loads the page', async ({ page }) => {
    await page.goto(`${site}/docs/getting-started`)
    // The trigger opens the sheet once the page has hydrated.
    await expect(page.locator('[data-slot="sidebar-wrapper"][data-hydrated]')).toBeAttached()
    await page.getByRole('button', { name: 'Documentation', exact: true }).click()
    const sheet = page.getByRole('dialog', { name: 'Documentation' })
    await expect(sheet).toBeVisible()
    await sheet.getByRole('link', { name: 'Global presets' }).click()
    await expect(page).toHaveURL(/\/docs\/presets$/)
    await expect(page.getByRole('dialog', { name: 'Documentation' })).toBeHidden()
    await expect(page.getByRole('heading', { level: 1, name: 'Global presets' })).toBeVisible()
  })

  test('guide text keeps the page within 375 px', async ({ page }) => {
    await page.goto(`${site}/docs/getting-started`)
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(375)
  })
})

test('the components sidebar lists every component and marks the current one', async ({ page }) => {
  await page.goto(`${site}/components/sidebar`)
  const nav = page.getByRole('navigation', { name: 'Components' })
  await expect(nav.getByRole('link', { name: 'Sidebar', exact: true })).toHaveAttribute('aria-current', 'page')
  // Grouped by category, alphabetical inside each group.
  await expect(nav.locator('a[href^="/components/"]')).toHaveCount(63)
  await expect(nav.getByRole('group', { name: 'Navigation' }).getByRole('link')).toHaveText(['Breadcrumb', 'Command', 'Menubar', 'Navigation Menu', 'Pagination', 'Sidebar', 'Stepper', 'Tabs'])
})

test.describe('header', () => {
  test.use({ viewport: { width: 1280, height: 900 } })
  test('panels open by click and by keyboard, and Escape closes them', async ({ page }) => {
    await page.goto(`${site}/`)
    const header = page.getByRole('navigation', { name: 'Primary' })
    await expect(page.locator('[data-slot="navigation-menu"]')).toBeVisible()
    await header.getByRole('button', { name: 'Docs' }).click()
    await expect(page.getByRole('link', { name: /Installation and CLI/ })).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(page.getByRole('link', { name: /Installation and CLI/ })).toBeHidden()
    await header.getByRole('button', { name: 'Components' }).focus()
    await page.keyboard.press('Enter')
    await expect(page.getByRole('link', { name: /All components/ })).toBeVisible()
  })

  test('marks the current section', async ({ page }) => {
    await page.goto(`${site}/docs/presets`)
    const header = page.getByRole('navigation', { name: 'Primary' })
    await expect(header.getByRole('button', { name: 'Docs' })).toHaveAttribute('data-current', '')
    await expect(header.getByRole('button', { name: 'Components' })).not.toHaveAttribute('data-current', /.*/)
  })

  test('is not pinned on editor pages, and is hidden there below 1200 px', async ({ page }) => {
    await page.goto(`${site}/editor/preset`)
    await expect(page.locator('header').first()).toHaveCSS('position', 'relative')
    await page.setViewportSize({ width: 1100, height: 900 })
    await expect(page.locator('header').first()).toBeHidden()
  })
})

for (const width of [375, 1440]) {
  test.describe(`${width} px without JavaScript`, () => {
    test.use({ javaScriptEnabled: false, viewport: { width, height: 900 } })
    test('Docs and Components are reachable through plain links on the home page', async ({ page }) => {
      await page.goto(`${site}/`)
      for (const href of ['/docs', '/components']) await expect(page.locator(`footer a[href="${href}"]`)).toBeVisible()
      await page.locator('footer a[href="/docs"]').click()
      await expect(page).toHaveURL(/\/docs$/)
    })
  })
}

test.describe('desktop editors', () => {
  test.use({ viewport: { width: 1440, height: 900 } })
  for (const path of ['/editor/component/button', '/editor/component/sidebar', '/editor/preset']) {
    test(`${path} splits the inspector and the preview with a keyboard-resizable handle that survives a reload`, async ({ page }) => {
      await page.goto(`${site}${path}`)
      await page.evaluate(() => localStorage.clear())
      await page.reload()
      const handle = page.getByRole('separator', { name: 'Resize the inspector and the preview' })
      await expect(handle).toBeVisible({ timeout: 60000 })
      // The saved layout is applied after hydration, which remounts the split once.
      await expect(page.locator('[data-editor-split]')).toBeVisible()
      await page.waitForTimeout(500)
      const start = Number(await handle.getAttribute('aria-valuenow'))
      await handle.focus()
      for (let step = 0; step < 3; step++) await page.keyboard.press('ArrowRight')
      const resized = Number(await handle.getAttribute('aria-valuenow'))
      expect(resized).toBeGreaterThan(start)
      await expect.poll(() => page.evaluate(() => Object.keys(localStorage).some(key => key.includes('ombelle-editor-')))).toBe(true)
      await page.reload()
      await expect(page.getByRole('separator', { name: 'Resize the inspector and the preview' })).toHaveAttribute('aria-valuenow', String(resized), { timeout: 60000 })
      await page.evaluate(() => { for (const key of Object.keys(localStorage)) if (key.includes('ombelle-editor-')) localStorage.removeItem(key) })
      await page.reload()
      await expect(page.getByRole('separator', { name: 'Resize the inspector and the preview' })).toHaveAttribute('aria-valuenow', String(start), { timeout: 60000 })
    })
  }
})

test.describe('saved editor splits', () => {
  test.use({ viewport: { width: 1440, height: 900 } })
  test('a stale or malformed split is dropped and the default split loads', async ({ page }) => {
    const handle = page.getByRole('separator', { name: 'Resize the inspector and the preview' })
    await page.goto(`${site}/editor/component/button`)
    await page.evaluate(() => localStorage.clear())
    await page.reload()
    await expect(handle).toBeVisible({ timeout: 60000 })
    await page.waitForTimeout(500)
    const start = await handle.getAttribute('aria-valuenow')
    const key = await page.evaluate(() => Object.keys(localStorage).find(name => name.includes('ombelle-editor-')) ?? 'ombelle-editor-button')
    for (const value of ['{"a":50,"b":50}', '{"inspector":30,"main":70}', '{"editor-inspector":100}', 'not json']) {
      const errors: string[] = []
      page.on('pageerror', error => errors.push(error.message))
      await page.evaluate(([name, saved]) => localStorage.setItem(name, saved), [key, value])
      await page.reload()
      await expect(handle).toHaveAttribute('aria-valuenow', start!, { timeout: 60000 })
      expect(errors).toEqual([])
      page.removeAllListeners('pageerror')
    }
  })
  test('loading below 1200 px keeps the desktop split', async ({ page }) => {
    const handle = page.getByRole('separator', { name: 'Resize the inspector and the preview' })
    await page.goto(`${site}/editor/component/button`)
    await page.evaluate(() => localStorage.clear())
    await page.reload()
    await expect(handle).toBeVisible({ timeout: 60000 })
    await page.waitForTimeout(500)
    await handle.focus()
    for (let step = 0; step < 3; step++) await page.keyboard.press('ArrowRight')
    const resized = await handle.getAttribute('aria-valuenow')
    await page.setViewportSize({ width: 1024, height: 900 })
    await page.reload()
    await page.waitForTimeout(1000)
    await page.setViewportSize({ width: 1440, height: 900 })
    await page.reload()
    await expect(handle).toHaveAttribute('aria-valuenow', resized!, { timeout: 60000 })
  })
})

test.describe('preset editor review drawer', () => {
  test.use({ viewport: { width: 1440, height: 900 } })
  test('Ctrl/Cmd+B toggles the Review drawer, but not while typing in an inspector field', async ({ page }) => {
    await page.goto(`${site}/editor/preset`)
    const drawer = page.getByRole('complementary', { name: 'Review' })
    await expect(drawer).toBeVisible({ timeout: 60000 })
    await expect(page.getByRole('button', { name: 'Get code', exact: true })).toBeEnabled({ timeout: 60000 })
    const state = () => drawer.getAttribute('data-state')
    const before = await state()
    await page.locator('body').click({ position: { x: 5, y: 5 } })
    await page.keyboard.press('ControlOrMeta+b')
    await expect.poll(state).not.toBe(before)
    // The drawer owns the shortcut here: the inspector stays unfolded.
    await expect(page.getByRole('button', { name: 'Fold preset inspector' })).toBeVisible()
    await page.keyboard.press('ControlOrMeta+b')
    await expect.poll(state).toBe(before)
    // The first input on screen inside the inspector, whatever kind it is.
    await page.evaluate(() => {
      const fields = [...document.querySelectorAll<HTMLInputElement>('[aria-label="Inspector controls"] input:not([type="hidden"])')]
      const field = fields.find(element => !element.disabled && element.checkVisibility())
      if (!field) throw new Error('No input on screen in the preset inspector')
      field.setAttribute('data-test-field', '')
      field.focus()
    })
    const field = page.locator('[data-test-field]')
    await expect(field).toBeFocused()
    await page.keyboard.press('ControlOrMeta+b')
    await expect.poll(state).toBe(before)
  })
})

test.describe('folding inspector', () => {
  test.use({ viewport: { width: 1440, height: 900 } })
  test('folds to one named icon per section, and an icon unfolds it at its section with focus on its first control', async ({ page }) => {
    await page.goto(`${site}/editor/component/button`)
    await expect(page.getByRole('button', { name: 'Get code', exact: true })).toBeEnabled({ timeout: 60000 })
    await page.getByRole('button', { name: 'Fold button inspector' }).click()
    const rail = page.getByRole('group', { name: 'Button inspector sections' })
    await expect(rail.getByRole('button', { name: 'Colors' })).toBeVisible()
    expect(await rail.getByRole('listitem').count()).toBeGreaterThan(3)
    // The preview takes the room the inspector gave up.
    expect((await page.locator('[data-editor-split-group] > [data-panel]').first().boundingBox())!.width).toBeLessThan(100)
    await rail.getByRole('button', { name: 'Colors' }).click()
    await expect(page.getByRole('button', { name: 'Fold button inspector' })).toBeVisible()
    await expect.poll(() => page.evaluate(() => document.activeElement?.closest('section')?.getAttribute('aria-labelledby'))).toBe('inspector-colors')
  })

  test('Ctrl/Cmd+B folds and unfolds the inspector in the component editor', async ({ page }) => {
    await page.goto(`${site}/editor/component/sidebar`)
    await expect(page.getByRole('button', { name: 'Get code', exact: true })).toBeEnabled({ timeout: 60000 })
    await page.locator('body').click({ position: { x: 5, y: 5 } })
    await page.keyboard.press('ControlOrMeta+b')
    await expect(page.getByRole('button', { name: 'Unfold sidebar inspector' })).toBeVisible()
    await page.keyboard.press('ControlOrMeta+b')
    await expect(page.getByRole('button', { name: 'Fold sidebar inspector' })).toBeVisible()
  })

  test('below 1200 px Ctrl/Cmd+B leaves the inspector alone, so it is not folded on returning to desktop', async ({ page }) => {
    await page.setViewportSize({ width: 1024, height: 900 })
    await page.goto(`${site}/editor/component/sidebar`)
    await expect(page.getByRole('button', { name: 'Get code', exact: true })).toBeEnabled({ timeout: 60000 })
    await page.locator('body').click({ position: { x: 5, y: 5 } })
    await page.keyboard.press('ControlOrMeta+b')
    await page.setViewportSize({ width: 1440, height: 900 })
    await expect(page.getByRole('button', { name: 'Fold sidebar inspector' })).toBeVisible()
  })
})

test.describe('content pages', () => {
  test.use({ viewport: { width: 1280, height: 900 } })
  for (const path of ['/docs/getting-started', '/components/sidebar']) {
    test(`${path} keeps its navigation on Ctrl/Cmd+B, which has no on-screen way back`, async ({ page }) => {
      await page.goto(`${site}${path}`)
      const nav = page.locator('[data-slot="sidebar"]').first()
      await expect(nav).toBeVisible()
      await page.waitForLoadState('load')
      await page.locator('body').click({ position: { x: 5, y: 300 } })
      await page.keyboard.press('ControlOrMeta+b')
      await page.waitForTimeout(300)
      await expect(nav).toHaveAttribute('data-state', 'expanded')
    })
  }
})

test.describe('editor menubar', () => {
  test.use({ viewport: { width: 1440, height: 900 } })
  test('the menubar has File and Edit only, and the preview controls keep their choice across the 1200 px breakpoint', async ({ page }) => {
    await page.goto(`${site}/editor/component/button`)
    await expect(page.getByRole('button', { name: 'Get code', exact: true })).toBeEnabled({ timeout: 60000 })
    // The preview's own bar holds the preview controls, so the menubar has no View menu repeating them.
    await expect(page.getByRole('menubar', { name: 'Editor menus' }).getByRole('menuitem')).toHaveText(['File', 'Edit'])
    const mode = page.getByRole('radiogroup', { name: 'Preview mode', exact: true })
    const width = page.getByRole('radiogroup', { name: 'Preview width', exact: true })
    await mode.getByRole('radio', { name: 'Dark' }).click()
    await width.getByRole('radio', { name: 'Narrow' }).click()
    await page.setViewportSize({ width: 1100, height: 900 })
    // Below 1200px the width control is not shown, so only the mode can be read here; the width is read back at 1440px.
    await expect(mode.getByRole('radio', { name: 'Dark' })).toHaveAttribute('aria-checked', 'true')
    await expect(width).toBeHidden()
    await page.setViewportSize({ width: 1440, height: 900 })
    await expect(mode.getByRole('radio', { name: 'Dark' })).toHaveAttribute('aria-checked', 'true')
    await expect(width.getByRole('radio', { name: 'Narrow' })).toHaveAttribute('aria-checked', 'true')
  })

  test('every top bar action is reachable by keyboard through the menubar', async ({ page }) => {
    await page.goto(`${site}/editor/component/button`)
    await expect(page.getByRole('button', { name: 'Get code', exact: true })).toBeEnabled({ timeout: 60000 })
    const file = page.getByRole('menubar', { name: 'Editor menus' }).getByRole('menuitem', { name: 'File' })
    await file.focus()
    await page.keyboard.press('Enter')
    await expect(page.getByRole('menuitem', { name: 'Download recipe JSON' })).toBeVisible()
    await page.keyboard.press('ArrowRight')
    await expect(page.getByRole('menuitem', { name: /^Undo/ })).toBeVisible()
    await expect(page.getByRole('menuitem', { name: 'Reset recipe' })).toBeVisible()
    await page.keyboard.press('Escape')
  })
})

test.describe('support matrix', () => {
  test.use({ viewport: { width: 1280, height: 900 } })
  test('opens as a Data Table that sorts by component, hides a family column and filters by name', async ({ page }) => {
    await page.goto(`${site}/components`)
    await expect(page.locator('[data-slot="sidebar-wrapper"][data-hydrated]')).toBeAttached()
    await page.getByText('Component support by style family').click()
    const table = page.getByRole('table', { name: 'Support for every catalog component in each style family' })
    await expect(table).toBeVisible({ timeout: 30000 })
    const header = table.getByRole('columnheader', { name: 'Component' })
    await header.getByRole('button', { name: 'Component' }).click()
    await expect(header).toHaveAttribute('aria-sort', 'ascending')
    await header.getByRole('button', { name: 'Component' }).click()
    await expect(header).toHaveAttribute('aria-sort', 'descending')
    await page.getByRole('button', { name: 'View' }).click()
    await page.getByRole('menuitemcheckbox', { name: 'Papier' }).click()
    await page.keyboard.press('Escape')
    await expect(table.getByRole('columnheader', { name: 'Papier' })).toHaveCount(0)
    await page.getByRole('searchbox', { name: 'Filter components' }).fill('no component has this name')
    await expect(page.getByRole('status').filter({ hasText: 'No results.' })).toBeAttached()
  })
})

test.describe('support matrix without JavaScript', () => {
  test.use({ javaScriptEnabled: false })
  test('renders as a plain table', async ({ page }) => {
    await page.goto(`${site}/components`)
    await page.getByText('Component support by style family').click()
    await expect(page.getByRole('rowheader', { name: 'Sidebar' })).toBeVisible()
  })
})

// The pages rebuilt on the app shell components pass axe at desktop and phone widths, with the header panel open.
for (const width of [1440, 375]) {
  test.describe(`axe at ${width} px`, () => {
    test.use({ viewport: { width, height: 900 } })
    for (const path of ['/', '/docs', '/docs/getting-started', '/components', '/components/data-table', '/editor/preset', '/editor/component/button']) {
      test(`${path} has no violations`, async ({ page }) => {
        await page.goto(`${site}${path}`)
        await page.waitForLoadState('load')
        if (width === 1440) {
          await page.getByRole('navigation', { name: 'Primary' }).getByRole('button', { name: 'Components' }).click()
          await expect(page.getByRole('link', { name: /^All components/ })).toBeVisible()
        }
        // Radix Navigation Menu puts a hidden focus proxy (aria-hidden, tabindex 0) after the open trigger, which moves
        // Tab into the panel; axe reports it as aria-hidden-focus. Only that element is left out.
        const axe = new AxeBuilder({ page }).exclude('[data-slot="navigation-menu"] li > span[aria-hidden="true"][tabindex="0"]')
        expect((await axe.analyze()).violations).toEqual([])
      })
    }
  })
}

// From 768 px the header is one line of links; it must fit without scrolling the page sideways.
for (const width of [768, 1024]) {
  test.describe(`header at ${width} px`, () => {
    test.use({ viewport: { width, height: 900 } })
    test('fits the width with every link on screen', async ({ page }) => {
      await page.goto(`${site}/docs`)
      await page.waitForLoadState('load')
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width)
      const nav = page.getByRole('navigation', { name: 'Primary' })
      for (const name of ['Docs', 'Components']) await expect(nav.getByRole('button', { name, exact: true })).toBeInViewport({ ratio: 1 })
      for (const link of await nav.getByRole('link').all()) await expect(link).toBeInViewport({ ratio: 1 })
      await expect(page.getByRole('button', { name: 'Dark theme' })).toBeInViewport({ ratio: 1 })
    })
  })
}

test.describe('header panels', () => {
  test.use({ viewport: { width: 1440, height: 900 } })
  for (const name of ['Docs', 'Components']) {
    test(`the ${name} panel opens under its trigger`, async ({ page }) => {
      await page.goto(`${site}/docs`)
      await page.waitForLoadState('load')
      const trigger = page.getByRole('navigation', { name: 'Primary' }).getByRole('button', { name, exact: true })
      await trigger.click()
      const panel = page.locator('[data-slot="navigation-menu-viewport"]')
      await expect(panel).toBeVisible()
      // The panel's start edge lines up with the trigger's (it only shifts when it would leave the window).
      await expect.poll(async () => Math.abs((await panel.boundingBox())!.x - (await trigger.boundingBox())!.x)).toBeLessThan(2)
    })
  }
})
