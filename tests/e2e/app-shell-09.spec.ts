import { expect, test, type Page } from '@playwright/test'

// The 0.9 app shell components in both editions, on the edition pages
// (fixtures/shared/app-shell-09-scenario.tsx, section "0.9 app shell").
const open = async (page: Page, edition: string, family = 'ombelle') => {
  await page.goto(`/editions/${family}/${edition}/?mode=light`)
  await expect(page.getByTestId('app-shell-09')).toBeVisible({ timeout: 60000 })
  return page.getByTestId('app-shell-09')
}

for (const edition of ['radix', 'base'] as const) {
  test.describe(edition, () => {
    test('Navigation Menu opens a panel on click, closes on Escape and returns focus to the trigger', async ({ page }) => {
      const nav = (await open(page, edition)).getByTestId('s09-nav')
      const trigger = nav.getByRole('button', { name: 'Docs' })
      await trigger.click()
      await expect(page.getByRole('link', { name: /Installation/ })).toBeVisible()
      await page.keyboard.press('Escape')
      await expect(page.getByRole('link', { name: /Installation/ })).toBeHidden()
      await expect(trigger).toBeFocused()
    })

    test('Navigation Menu opens a panel on hover', async ({ page }) => {
      const nav = (await open(page, edition)).getByTestId('s09-nav')
      await nav.getByRole('button', { name: 'Components' }).hover()
      await expect(page.getByRole('link', { name: 'Sidebar' })).toBeVisible()
    })

    test('Navigation Menu arrow keys move between top-level items, and the current link is marked', async ({ page }) => {
      const nav = (await open(page, edition)).getByTestId('s09-nav')
      await nav.getByRole('button', { name: 'Docs' }).focus()
      await page.keyboard.press('ArrowRight')
      await expect(nav.getByRole('button', { name: 'Components' })).toBeFocused()
      await page.keyboard.press('ArrowRight')
      await expect(nav.getByRole('link', { name: 'Blog' })).toBeFocused()
      await expect(nav.getByRole('link', { name: 'Blog' })).toHaveAttribute('aria-current', 'page')
    })

    test('Sidebar collapses to icons, keeping names, and shows tooltips on focus', async ({ page }) => {
      const sidebar = (await open(page, edition)).getByTestId('s09-sidebar')
      const root = sidebar.locator('[data-slot="sidebar"]')
      await expect(root).toHaveAttribute('data-state', 'expanded')
      await sidebar.getByRole('button', { name: 'Toggle sidebar' }).click()
      await expect(root).toHaveAttribute('data-state', 'collapsed')
      await expect(root).toHaveAttribute('data-collapsible', 'icon')
      const overview = sidebar.getByRole('link', { name: 'Overview' })
      await expect(overview).toHaveAttribute('aria-current', 'page')
      // Reach the item with the keyboard: Base UI shows tooltips on keyboard focus, not after a click.
      await sidebar.getByRole('link', { name: 'Projects' }).focus()
      await page.keyboard.press('Shift+Tab')
      await expect(overview).toBeFocused()
      await expect(page.locator('[data-slot="sidebar-tooltip"]')).toContainText('Overview')
      // Labels take no room: the item is about as wide as the icon strip.
      expect((await overview.boundingBox())!.width).toBeLessThan(80)
    })

    test('Sidebar keeps a closed group out of the Tab order', async ({ page }) => {
      const sidebar = (await open(page, edition)).getByTestId('s09-sidebar')
      await expect(sidebar.getByRole('link', { name: 'Old presets' })).toBeHidden()
      await sidebar.getByRole('button', { name: 'Archive' }).click()
      await expect(sidebar.getByRole('link', { name: 'Old presets' })).toBeVisible()
      await sidebar.getByRole('button', { name: 'Archive' }).click()
      await expect(sidebar.getByRole('link', { name: 'Old presets' })).toBeHidden()
    })

    test('Ctrl/Cmd+B toggles the sidebar, but not while typing in an input, textarea or contenteditable', async ({ page }) => {
      const sidebar = (await open(page, edition)).getByTestId('s09-sidebar')
      const root = sidebar.locator('[data-slot="sidebar"]')
      await sidebar.getByRole('button', { name: 'Toggle sidebar' }).focus()
      await page.keyboard.press('ControlOrMeta+b')
      await expect(root).toHaveAttribute('data-state', 'collapsed')
      await page.keyboard.press('ControlOrMeta+b')
      await expect(root).toHaveAttribute('data-state', 'expanded')
      for (const name of ['Preset name', 'Notes', 'Caption']) {
        await sidebar.getByRole('textbox', { name }).focus()
        await page.keyboard.press('ControlOrMeta+b')
        await expect(root).toHaveAttribute('data-state', 'expanded')
      }
    })

    test('below 768 px the trigger opens a modal sheet that keeps focus and closes when a link is followed', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 800 })
      const sidebar = (await open(page, edition)).getByTestId('s09-sidebar')
      await sidebar.getByRole('button', { name: 'Toggle sidebar' }).click()
      const sheet = page.getByRole('dialog', { name: 'Workspace' })
      await expect(sheet).toBeVisible()
      for (let step = 0; step < 12; step++) {
        await page.keyboard.press('Tab')
        expect(await sheet.evaluate(element => element.contains(document.activeElement))).toBe(true)
      }
      await sheet.getByRole('link', { name: 'Projects' }).click()
      await expect(sheet).toBeHidden()
    })

    test('Resizable: arrow keys resize, Home and End jump to the limits', async ({ page }) => {
      await page.evaluate(() => localStorage.clear()).catch(() => {})
      const area = (await open(page, edition)).getByTestId('s09-resizable')
      const handle = area.getByRole('separator')
      const value = async () => Number(await handle.getAttribute('aria-valuenow'))
      await handle.focus()
      const start = await value()
      await page.keyboard.press('ArrowLeft')
      expect(await value()).toBeLessThan(start)
      await page.keyboard.press('Home')
      expect(await value()).toBeCloseTo(Number(await handle.getAttribute('aria-valuemin')), 0)
      await page.keyboard.press('End')
      expect(await value()).toBeCloseTo(Number(await handle.getAttribute('aria-valuemax')), 0)
    })

    test('Resizable: the handle can be grabbed 10px away from its line, and a collapsible panel folds', async ({ page }) => {
      const area = (await open(page, edition)).getByTestId('s09-resizable')
      await page.evaluate(() => localStorage.clear())
      await page.reload()
      await expect(area).toBeVisible({ timeout: 60000 })
      const handle = area.getByRole('separator')
      const box = (await handle.boundingBox())!
      const before = Number(await handle.getAttribute('aria-valuenow'))
      await page.mouse.move(box.x + box.width / 2 + 10, box.y + box.height / 2)
      await page.mouse.down()
      await page.mouse.move(box.x - 60, box.y + box.height / 2, { steps: 5 })
      await page.mouse.up()
      expect(Number(await handle.getAttribute('aria-valuenow'))).toBeLessThan(before)
      const frame = (await area.boundingBox())!
      const grab = (await handle.boundingBox())!
      await page.mouse.move(grab.x + grab.width / 2, grab.y + grab.height / 2)
      await page.mouse.down()
      await page.mouse.move(frame.x + frame.width - 2, grab.y + grab.height / 2, { steps: 10 })
      await page.mouse.up()
      const controls = (await area.getByTestId('s09-controls').evaluate(element => element.parentElement!.getBoundingClientRect().width))
      expect(controls).toBeLessThan(frame.width * 0.12)
    })

    test('Resizable: a saved layout comes back after reload, and a corrupt one falls back to the defaults', async ({ page }) => {
      const errors: string[] = []
      page.on('pageerror', error => errors.push(error.message))
      const area = (await open(page, edition)).getByTestId('s09-resizable')
      await page.evaluate(() => localStorage.clear())
      await page.reload()
      await expect(area).toBeVisible({ timeout: 60000 })
      const handle = area.getByRole('separator')
      await handle.focus()
      for (let step = 0; step < 3; step++) await page.keyboard.press('ArrowLeft')
      const resized = await handle.getAttribute('aria-valuenow')
      await expect.poll(() => page.evaluate(() => Object.keys(localStorage).some(key => key.includes('s09-split')))).toBe(true)
      await page.reload()
      await expect(area.getByRole('separator')).toHaveAttribute('aria-valuenow', resized!)
      for (const bad of ['{bad', JSON.stringify({ preview: 150, controls: 100 })]) {
        await page.evaluate(value => { for (const key of Object.keys(localStorage)) if (key.includes('s09-split')) localStorage.setItem(key, value) }, bad)
        await page.reload()
        await expect(area.getByRole('separator')).toHaveAttribute('aria-valuenow', '60')
      }
      expect(errors).toEqual([])
    })

    test('Menubar has one Tab stop and arrow keys move across its menus', async ({ page }) => {
      const bar = (await open(page, edition)).getByTestId('s09-menubar')
      await bar.getByRole('menuitem', { name: 'File' }).focus()
      await page.keyboard.press('ArrowRight')
      await expect(bar.getByRole('menuitem', { name: 'Edit' })).toBeFocused()
      await page.keyboard.press('Tab')
      await expect(bar.getByRole('button', { name: 'After the menubar' })).toBeFocused()
    })

    test('Menubar: with a menu open, Left and Right open the neighbouring menu, and Escape returns focus', async ({ page }) => {
      const bar = (await open(page, edition)).getByTestId('s09-menubar')
      const file = bar.getByRole('menuitem', { name: 'File' })
      await file.click()
      await expect(page.getByRole('menuitem', { name: /Download JSON/ })).toBeVisible()
      await page.keyboard.press('ArrowRight')
      await expect(page.getByRole('menuitem', { name: /Undo/ })).toBeVisible()
      await page.keyboard.press('ArrowLeft')
      await expect(page.getByRole('menuitem', { name: /Download JSON/ })).toBeVisible()
      await page.keyboard.press('Escape')
      await expect(page.getByRole('menuitem', { name: /Download JSON/ })).toBeHidden()
      await expect(file).toBeFocused()
    })

    test('Menubar checkbox and radio items toggle and report aria-checked', async ({ page }) => {
      const bar = (await open(page, edition)).getByTestId('s09-menubar')
      const view = bar.getByRole('menuitem', { name: 'View' })
      await view.click()
      await expect(page.getByRole('menuitemcheckbox', { name: 'Grid' })).toHaveAttribute('aria-checked', 'true')
      await page.getByRole('menuitemcheckbox', { name: 'Grid' }).click()
      await expect(bar.getByTestId('s09-menubar-state')).toHaveText('grid off, light')
      if (!(await page.getByRole('menuitemradio', { name: 'Dark' }).isVisible())) await view.click()
      await page.getByRole('menuitemradio', { name: 'Dark' }).click()
      await expect(bar.getByTestId('s09-menubar-state')).toHaveText('grid off, dark')
      if (!(await page.getByRole('menuitemradio', { name: 'Dark' }).isVisible())) await view.click()
      await expect(page.getByRole('menuitemradio', { name: 'Dark' })).toHaveAttribute('aria-checked', 'true')
    })

    test('Menubar submenu opens with ArrowRight and closes with ArrowLeft', async ({ page }) => {
      const bar = (await open(page, edition)).getByTestId('s09-menubar')
      await bar.getByRole('menuitem', { name: 'File' }).click()
      const exportItem = page.getByRole('menuitem', { name: 'Export' })
      await exportItem.focus()
      await page.keyboard.press('ArrowRight')
      await expect(page.getByRole('menuitem', { name: 'CSS variables' })).toBeVisible()
      await page.keyboard.press('ArrowLeft')
      await expect(page.getByRole('menuitem', { name: 'CSS variables' })).toBeHidden()
      await expect(exportItem).toBeFocused()
    })

    test('Menubar: pressing Alt alone does not move focus to the menubar', async ({ page }) => {
      const bar = (await open(page, edition)).getByTestId('s09-menubar')
      const after = bar.getByRole('button', { name: 'After the menubar' })
      await after.focus()
      await page.keyboard.press('Alt')
      await expect(after).toBeFocused()
    })

    test('Data Table: a sortable header cycles ascending, descending and unsorted', async ({ page }) => {
      const grid = (await open(page, edition)).getByTestId('s09-data-table')
      const header = grid.getByRole('columnheader', { name: 'Name' })
      const sort = header.getByRole('button', { name: 'Name' })
      await expect(header).not.toHaveAttribute('aria-sort', /.+/)
      await sort.click()
      await expect(header).toHaveAttribute('aria-sort', 'ascending')
      await sort.click()
      await expect(header).toHaveAttribute('aria-sort', 'descending')
      await expect(grid.getByRole('row').nth(1)).toContainText('Preset 40')
      await sort.click()
      await expect(header).not.toHaveAttribute('aria-sort', /.+/)
    })

    test('Data Table: the text filter and a facet narrow the rows, and no match shows No results.', async ({ page }) => {
      const grid = (await open(page, edition)).getByTestId('s09-data-table')
      await grid.getByRole('searchbox', { name: 'Filter presets' }).fill('Preset 0')
      await expect(grid.getByRole('cell', { name: 'Preset 09', exact: true })).toBeVisible()
      await expect(grid.getByRole('cell', { name: 'Preset 10', exact: true })).toHaveCount(0)
      await grid.getByRole('searchbox', { name: 'Filter presets' }).fill('')
      await grid.locator('[data-slot="data-table-toolbar"]').getByRole('button', { name: 'Status' }).click()
      await page.getByRole('checkbox', { name: /Experimental/ }).check()
      await page.keyboard.press('Escape')
      await expect(grid.getByRole('cell', { name: 'Stable' })).toHaveCount(0)
      await expect(grid.getByRole('cell', { name: 'Experimental' }).first()).toBeVisible()
      await grid.getByRole('searchbox', { name: 'Filter presets' }).fill('nothing matches this')
      await expect(grid.getByRole('status')).toHaveText('No results.')
    })

    test('Data Table: select one and select all on the page; the count is announced', async ({ page }) => {
      const grid = (await open(page, edition)).getByTestId('s09-data-table')
      const count = grid.locator('[data-slot="data-table-selection"]')
      await expect(count).toHaveAttribute('aria-live', 'polite')
      await grid.getByRole('row', { name: /Preset 03/ }).getByRole('checkbox').check()
      await expect(count).toHaveText('1 of 40 row(s) selected.')
      await grid.getByRole('checkbox', { name: 'Select all rows on this page' }).check()
      await expect(count).toHaveText('10 of 40 row(s) selected.')
    })

    test('Data Table: selection survives a filter that hides the selected rows', async ({ page }) => {
      const grid = (await open(page, edition)).getByTestId('s09-data-table')
      const count = grid.locator('[data-slot="data-table-selection"]')
      await grid.getByRole('row', { name: /Preset 01/ }).getByRole('checkbox').check()
      await grid.getByRole('row', { name: /Preset 02/ }).getByRole('checkbox').check()
      await grid.getByRole('searchbox', { name: 'Filter presets' }).fill('Preset 3')
      await expect(count).toHaveText('2 of 40 row(s) selected.')
      await grid.getByRole('searchbox', { name: 'Filter presets' }).fill('')
      await expect(grid.getByRole('row', { name: /Preset 01/ }).getByRole('checkbox')).toBeChecked()
      await expect(grid.getByRole('row', { name: /Preset 02/ }).getByRole('checkbox')).toBeChecked()
    })

    test('Data Table: the View menu hides and shows a column', async ({ page }) => {
      const grid = (await open(page, edition)).getByTestId('s09-data-table')
      await grid.getByRole('button', { name: 'View' }).click()
      await page.getByRole('menuitemcheckbox', { name: 'Family' }).click()
      await page.keyboard.press('Escape')
      await expect(grid.getByRole('columnheader', { name: 'Family' })).toHaveCount(0)
      await grid.getByRole('button', { name: 'View' }).click()
      await page.getByRole('menuitemcheckbox', { name: 'Family' }).click()
      await page.keyboard.press('Escape')
      await expect(grid.getByRole('columnheader', { name: 'Family' })).toBeVisible()
    })

    test('Data Table: pages move, and Previous is disabled on the first page', async ({ page }) => {
      const grid = (await open(page, edition)).getByTestId('s09-data-table')
      await expect(grid.getByRole('button', { name: 'Previous page' })).toBeDisabled()
      await grid.getByRole('button', { name: 'Next page' }).click()
      await expect(grid.getByText('Page 2 of 4')).toBeVisible()
      await expect(grid.getByRole('cell', { name: 'Preset 11', exact: true })).toBeVisible()
      await expect(grid.getByRole('button', { name: 'Previous page' })).toBeEnabled()
    })

    test('Data Table: the row actions menu opens with the keyboard', async ({ page }) => {
      const grid = (await open(page, edition)).getByTestId('s09-data-table')
      await grid.getByRole('button', { name: 'Actions for Preset 01' }).focus()
      await page.keyboard.press('Enter')
      await expect(page.getByRole('menuitem', { name: 'Open' })).toBeVisible()
      await page.keyboard.press('Escape')
      await expect(grid.getByRole('button', { name: 'Actions for Preset 01' })).toBeFocused()
    })

    test('Prose keeps long URLs, words and tables inside its box at 320 px', async ({ page }) => {
      await page.setViewportSize({ width: 320, height: 800 })
      const section = await open(page, edition)
      const prose = section.getByTestId('s09-prose')
      const box = await prose.evaluate(element => ({ scroll: element.scrollWidth, client: element.clientWidth }))
      expect(box.scroll).toBeLessThanOrEqual(box.client)
      const table = section.getByTestId('s09-prose-table')
      const scroll = await table.evaluate(element => ({ scroll: element.scrollWidth, client: element.clientWidth, overflow: getComputedStyle(element).overflowX }))
      expect(scroll.overflow).toBe('auto')
      expect(scroll.scroll).toBeGreaterThan(scroll.client)
    })

    test('Prose measure follows the chosen width', async ({ page }) => {
      await page.setViewportSize({ width: 1600, height: 900 })
      const section = await open(page, edition)
      const prose = section.getByTestId('s09-prose')
      const width = async (measure: string) => {
        await section.getByRole('group', { name: 'Measure' }).getByRole('button', { name: measure }).click()
        return prose.evaluate(element => getComputedStyle(element).maxWidth)
      }
      const widths = [await width('narrow'), await width('default'), await width('wide')]
      expect(new Set(widths).size).toBe(3)
      expect(parseFloat(widths[0]!)).toBeLessThan(parseFloat(widths[1]!))
      expect(parseFloat(widths[1]!)).toBeLessThan(parseFloat(widths[2]!))
    })
  })
}
