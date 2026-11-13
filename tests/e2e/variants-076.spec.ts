import { expect, test, type Page } from '@playwright/test'

// The 0.7.6 variants in both editions, on the edition pages
// (fixtures/shared/edition-scenario*.tsx, section "0.7.6 variants").
const open = async (page: Page, edition: string) => {
  await page.goto(`/editions/ombelle/${edition}/?mode=light`)
  await expect(page.getByTestId('variants-076')).toBeVisible({ timeout: 60000 })
  return page.getByTestId('variants-076')
}

for (const edition of ['radix', 'base'] as const) {
  test.describe(`${edition} Sheet snap points`, () => {
    const setup = async (page: Page) => {
      const section = await open(page, edition)
      const trigger = section.getByRole('button', { name: 'Filters', exact: true })
      const dialog = page.getByRole('dialog', { name: 'Filters', exact: true })
      const handle = page.getByRole('separator', { name: 'Resize Filters' })
      // The sheet's height as a percentage of the viewport, to a tenth.
      const percent = async () => Math.round((await dialog.boundingBox())!.height / page.viewportSize()!.height * 1000) / 10
      const settled = async (expected: number) => {
        await expect.poll(async () => Math.abs(await percent() - expected)).toBeLessThanOrEqual(1)
      }
      const show = async () => {
        await trigger.click()
        await expect(handle).toBeVisible()
      }
      // Drags the handle by a share of the viewport height (up is positive) and releases it.
      const drag = async (share: number) => {
        const box = (await handle.boundingBox())!
        const x = box.x + box.width / 2, y = box.y + box.height / 2
        await page.mouse.move(x, y)
        await page.mouse.down()
        await page.mouse.move(x, y - share * page.viewportSize()!.height, { steps: 10 })
        await page.mouse.up()
      }
      return { trigger, dialog, handle, percent, settled, show, drag }
    }

    test('opens at the first point and steps between the points by keyboard', async ({ page }) => {
      const { trigger, dialog, handle, settled, show } = await setup(page)
      await show()
      await settled(50)
      await expect(handle).toHaveAttribute('aria-valuetext', 'Half height')
      await expect(handle).toHaveAttribute('aria-valuenow', '50')
      await expect(handle).toHaveAttribute('aria-valuemin', '50')
      await expect(handle).toHaveAttribute('aria-valuemax', '90')
      await handle.focus()
      await page.keyboard.press('ArrowUp')
      await expect(handle).toHaveAttribute('aria-valuetext', 'Full height')
      await settled(90)
      // The highest point is the last: ArrowUp stays there.
      await page.keyboard.press('ArrowUp')
      await expect(handle).toHaveAttribute('aria-valuenow', '90')
      await page.keyboard.press('Home')
      await expect(handle).toHaveAttribute('aria-valuetext', 'Half height')
      await settled(50)
      await page.keyboard.press('End')
      await expect(handle).toHaveAttribute('aria-valuetext', 'Full height')
      await settled(90)
      await page.keyboard.press('ArrowDown')
      await settled(50)
      // ArrowDown on the lowest point closes the sheet and returns focus to its trigger.
      await page.keyboard.press('ArrowDown')
      await expect(dialog).toHaveCount(0)
      await expect(trigger).toBeFocused()
    })

    test('a drag settles on the nearer point, closes below a quarter, and a reopened sheet starts at the first point', async ({ page }) => {
      const { trigger, dialog, handle, settled, show, drag } = await setup(page)
      await show()
      await settled(50)
      // Released at 72 %: nearer 90 % than 50 %.
      await drag(0.22)
      await settled(90)
      await expect(handle).toHaveAttribute('aria-valuetext', 'Full height')
      // Released at 60 %: nearer 50 %.
      await drag(-0.3)
      await settled(50)
      await expect(handle).toHaveAttribute('aria-valuetext', 'Half height')
      // Up to 90 %, then closed by Escape: the sheet opens again at 50 %.
      await drag(0.4)
      await settled(90)
      await page.keyboard.press('Escape')
      await expect(dialog).toHaveCount(0)
      await show()
      await settled(50)
      await expect(handle).toHaveAttribute('aria-valuenow', '50')
      // Released at 20 %: below a quarter, the sheet closes and focus returns to the trigger.
      await drag(-0.3)
      await expect(dialog).toHaveCount(0)
      await expect(trigger).toBeFocused()
      await show()
      await settled(50)
      await expect(handle).toHaveAttribute('aria-valuetext', 'Half height')
    })
  })
}

for (const edition of ['radix', 'base'] as const) {
  test.describe(`${edition} CardAction`, () => {
    test('keeps the title beside the action, whatever the action holds', async ({ page }) => {
      const section = await open(page, edition)
      const card = section.getByTestId('ca-card')
      const title = card.getByTestId('ca-title')
      const description = card.getByTestId('ca-description')
      const action = card.getByTestId('ca-action')
      const button = card.getByTestId('ca-button')
      const measure = async () => {
        const [header, t, d, a, b] = await Promise.all([card.locator('[data-slot="card-header"]'), title, description, action, button].map(async locator => (await locator.boundingBox())!))
        return { header, t, d, a, b }
      }
      // The header's padding, so the tracks are compared with its content box.
      const padding = await card.locator('[data-slot="card-header"]').evaluate(el => parseFloat(getComputedStyle(el).paddingInlineEnd) + parseFloat(getComputedStyle(el).paddingInlineStart))
      const narrow = await measure()
      expect(narrow.b.width).toBe(34)
      expect(narrow.b.height).toBe(34)
      // The action starts at the title's top and runs past the description's top.
      expect(Math.abs(narrow.a.y - narrow.t.y)).toBeLessThanOrEqual(1)
      expect(narrow.a.y + narrow.a.height).toBeGreaterThan(narrow.d.y)
      // Title and description share column 1; the action sits at the end, clear of both.
      expect(narrow.d.x).toBeCloseTo(narrow.t.x, 0)
      expect(narrow.t.x + narrow.t.width + 12).toBeLessThanOrEqual(narrow.a.x + 1)
      expect(narrow.t.width + 12 + narrow.a.width).toBeCloseTo(narrow.header.width - padding, 0)
      await section.getByRole('button', { name: 'Swap the card action' }).click()
      await expect(button).toHaveCSS('width', '120px')
      const wide = await measure()
      // The grid tracks hold: title, a 12px gap and the action fill the header, and the title's top and start do not move.
      expect(wide.t.width + 12 + wide.a.width).toBeCloseTo(wide.header.width - padding, 0)
      expect(wide.a.width).toBeCloseTo(120, 0)
      expect(wide.t.x - wide.header.x).toBeCloseTo(narrow.t.x - narrow.header.x, 0)
      // (Positions are viewport-relative and the click scrolls, so compare the offsets from the header.)
      expect(Math.abs((wide.t.y - wide.header.y) - (narrow.t.y - narrow.header.y))).toBeLessThanOrEqual(1)
      expect(Math.abs(wide.a.y - wide.t.y)).toBeLessThanOrEqual(1)
      expect(wide.t.x + wide.t.width + 12).toBeLessThanOrEqual(wide.a.x + 1)
    })

    test('a click on the action in a CardLink card runs its handler and does not follow the link', async ({ page }) => {
      const section = await open(page, edition)
      const button = section.getByRole('button', { name: 'More actions for Linked preset' })
      const box = (await button.boundingBox())!
      expect(box.width).toBeGreaterThanOrEqual(24)
      expect(box.height).toBeGreaterThanOrEqual(24)
      await button.click()
      await expect(section.getByTestId('ca-clicks')).toHaveText('Action clicks: 1')
      expect(new URL(page.url()).hash).not.toBe('#ca-followed')
      // The rest of the card still follows the link.
      const card = section.getByTestId('ca-link-card')
      const cardBox = (await card.boundingBox())!
      await page.mouse.click(cardBox.x + cardBox.width / 2, cardBox.y + cardBox.height - 6)
      await expect.poll(() => new URL(page.url()).hash).toBe('#ca-followed')
    })

    test('dense stat cards render', async ({ page }) => {
      const section = await open(page, edition)
      const cards = section.getByTestId('ca-stats').locator('[data-slot="card"]')
      await expect(cards).toHaveCount(2)
      await expect(cards.first()).toHaveAttribute('data-density', 'dense')
      await expect(cards.first()).toContainText('53')
      await expect(cards.last()).toContainText('style families')
    })
  })
}

for (const edition of ['radix', 'base'] as const) {
  test.describe(`${edition} SliderValue`, () => {
    test('the readout follows the thumb', async ({ page }) => {
      const section = await open(page, edition)
      const field = section.locator('[data-slot="slider-field"]').filter({ has: page.getByTestId('sv-radius') })
      const readout = field.locator('[data-slot="slider-value"]')
      await expect(readout).toHaveText('12 px')
      const thumb = section.getByRole('slider', { name: 'Radius', exact: true })
      await expect(thumb).toHaveAttribute('aria-valuetext', '12 px')
      await thumb.focus()
      await page.keyboard.press('ArrowRight')
      await expect(readout).toHaveText('13 px')
      await expect(thumb).toHaveAttribute('aria-valuetext', '13 px')
      expect(await readout.getAttribute('for')).toBe(await thumb.getAttribute('id'))
    })

    test('an editable value commits on Enter and blur, restores bad text and Escape, and follows a drag', async ({ page }) => {
      const section = await open(page, edition)
      const input = section.getByRole('textbox', { name: 'Shadow opacity', exact: true })
      const thumb = section.getByRole('slider', { name: 'Shadow opacity', exact: true })
      await expect(input).toHaveValue('0.75')
      const box = (await input.boundingBox())!
      expect(Math.round(box.width)).toBe(76)
      expect(Math.round(box.height)).toBe(34)
      // 0.33 lands on the nearest 0.05 step.
      await input.fill('0.33')
      await input.press('Enter')
      await expect(thumb).toHaveAttribute('aria-valuenow', '0.35')
      await expect(input).toHaveValue('0.35')
      await expect(input).toBeFocused()
      // Not a number: the value is restored and the thumb stays.
      await input.fill('abc')
      await input.press('Enter')
      await expect(input).toHaveValue('0.35')
      await expect(thumb).toHaveAttribute('aria-valuenow', '0.35')
      await input.fill('')
      await input.press('Enter')
      await expect(input).toHaveValue('0.35')
      // Above the maximum, committed on blur: clamped to 1.
      await input.fill('5')
      await input.blur()
      await expect(thumb).toHaveAttribute('aria-valuenow', '1')
      await expect(input).toHaveValue('1')
      // Escape restores the text and leaves the thumb.
      await input.fill('0.2')
      await input.press('Escape')
      await expect(input).toHaveValue('1')
      await expect(thumb).toHaveAttribute('aria-valuenow', '1')
      await input.blur()
      await expect(thumb).toHaveAttribute('aria-valuenow', '1')
      // A drag to the start of the track updates the field.
      const root = section.getByTestId('sv-opacity')
      const handle = (await root.locator('[data-slot="slider-thumb"]').boundingBox())!
      const track = (await root.locator('[data-slot="slider-track"]').boundingBox())!
      await page.mouse.move(handle.x + handle.width / 2, handle.y + handle.height / 2)
      await page.mouse.down()
      await page.mouse.move(track.x - 20, handle.y + handle.height / 2, { steps: 8 })
      await page.mouse.up()
      await expect(thumb).toHaveAttribute('aria-valuenow', '0')
      await expect(input).toHaveValue('0')
    })

    test('a press on the track while the field has focus keeps the pressed value', async ({ page }) => {
      const section = await open(page, edition)
      const input = section.getByRole('textbox', { name: 'Shadow opacity', exact: true })
      const thumb = section.getByRole('slider', { name: 'Shadow opacity', exact: true })
      await input.focus()
      await expect(input).toHaveValue('0.75')
      const track = (await section.getByTestId('sv-opacity').locator('[data-slot="slider-track"]').boundingBox())!
      await page.mouse.click(track.x + track.width * 0.25, track.y + track.height / 2)
      await expect(thumb).toHaveAttribute('aria-valuenow', '0.25')
      await expect(input).toHaveValue('0.25')
      await expect(input).not.toBeFocused()
      // Still there once every event of the press has run.
      await page.waitForTimeout(200)
      await expect(thumb).toHaveAttribute('aria-valuenow', '0.25')
      await expect(input).toHaveValue('0.25')
    })
  })

  test.describe(`${edition} Progress and Meter rings`, () => {
    const size = async (locator: ReturnType<Page['locator']>) => {
      const box = (await locator.boundingBox())!
      return [Math.round(box.width), Math.round(box.height)]
    }

    test('the lg ring is named, valued and shows its number outside the accessibility tree', async ({ page }) => {
      const section = await open(page, edition)
      const upload = section.getByRole('progressbar', { name: 'Uploading preset', exact: true })
      await expect(upload).toHaveAttribute('aria-valuetext', /^64\s?%$/)
      await expect(upload.locator('[data-slot="progress-ring-value"]')).toHaveText('64%')
      await expect(upload.locator('[data-slot="progress-ring"]')).toHaveAttribute('aria-hidden', 'true')
      // The number and the ring are hidden from assistive technology, so the name is just the label.
      await expect(upload).toMatchAriaSnapshot('- progressbar "Uploading preset"')
      await expect(section.getByRole('progressbar', { name: '64%' })).toHaveCount(0)
      expect(await size(upload)).toEqual([96, 96])
      expect(await upload.locator('[data-slot="progress-ring-value"]').evaluate(node => getComputedStyle(node).fontSize)).toBe('16px')
    })

    test('the meter ring is 72 by 72 and the button ring 18 by 18', async ({ page }) => {
      const section = await open(page, edition)
      const meter = section.getByRole('meter', { name: 'Storage used', exact: true })
      await expect(meter).toHaveAttribute('aria-valuenow', '72')
      await expect(meter.locator('[data-slot="meter-ring-value"]')).toHaveText('72%')
      expect(await size(meter)).toEqual([72, 72])
      const saving = section.getByRole('button', { name: /Saving/ })
      await expect(saving).toBeDisabled()
      expect(await size(saving.locator('[data-slot="progress"]'))).toEqual([18, 18])
      await expect(saving.locator('[data-slot="progress-ring-value"]')).toHaveCount(0)
    })

    test('the indeterminate ring does not spin with reduced motion, and does when motion is allowed', async ({ page }) => {
      const section = await open(page, edition)
      const spinner = section.getByRole('progressbar', { name: 'Syncing', exact: true }).locator('[data-slot="progress-ring"]')
      expect(await size(section.getByRole('progressbar', { name: 'Syncing', exact: true }))).toEqual([48, 48])
      await expect.poll(() => spinner.evaluate(node => getComputedStyle(node).animationName)).toBe('none')
      await page.emulateMedia({ reducedMotion: 'no-preference' })
      await expect.poll(() => spinner.evaluate(node => getComputedStyle(node).animationName)).toBe('progress-ring-spin')
      await expect.poll(() => spinner.evaluate(node => getComputedStyle(node).animationDuration)).toBe('1s')
    })
  })

  test.describe(`${edition} Code Block diff`, () => {
    test('Copy writes exactly the new version', async ({ page }) => {
      await page.addInitScript(() => {
        const w = window as unknown as { copied: string[] }
        w.copied = []
        Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: async (text: string) => { w.copied.push(text) } } })
      })
      const section = await open(page, edition)
      await section.getByRole('button', { name: 'Copy the new ui-style.css', exact: true }).click()
      await expect(section.getByRole('status').filter({ hasText: 'Copied' })).toHaveCount(1)
      expect(await page.evaluate(() => (window as unknown as { copied: string[] }).copied))
        .toEqual([':root {\n  --radius: 0.75rem;\n  --shadow-offset: 3px;\n}\n'])
    })

    test('the code region reads Removed and Added, and the count reads aloud', async ({ page }) => {
      const section = await open(page, edition)
      const diff = section.getByTestId('rg-diff')
      const region = diff.getByRole('region', { name: 'ui-style.css source' })
      const text = (await region.evaluate(node => (node as HTMLElement).textContent)) ?? ''
      expect(text).toContain('Removed:   --radius: 0.5rem;')
      expect(text).toContain('Added:   --radius: 0.75rem;')
      expect(text).toContain('Added:   --shadow-offset: 3px;')
      await expect(region.locator('[data-slot="code-block-diff-marker"]').first()).toHaveAttribute('aria-hidden', 'true')
      await expect(diff.locator('[data-slot="code-block-diff-count"]')).toContainText('2 added, 1 removed')
      await expect(diff.locator('[data-slot="code-block-diff-count"] [aria-hidden="true"]')).toHaveText('+2 −1')
      // The default block has no markers.
      await expect(section.getByTestId('rg-nodiff').locator('[data-slot="code-block-diff-marker"]')).toHaveCount(0)
    })

    test('lines are tinted, one line high, and the marker column moves the text by less than its width', async ({ page }) => {
      const section = await open(page, edition)
      const lines = section.getByTestId('rg-diff').locator('[data-slot="code-block-line"]')
      const plain = section.getByTestId('rg-nodiff').locator('[data-slot="code-block-line"]')
      const background = (index: number) => lines.nth(index).evaluate(node => getComputedStyle(node).backgroundColor)
      expect(await background(0)).toBe('rgba(0, 0, 0, 0)')
      expect(await background(1)).not.toBe('rgba(0, 0, 0, 0)')
      expect(await background(2)).not.toBe('rgba(0, 0, 0, 0)')
      expect(await background(1)).not.toBe(await background(2))
      const heights = await Promise.all([0, 1, 2, 3, 4].map(async index => Math.round((await lines.nth(index).boundingBox())!.height * 10) / 10))
      expect(new Set(heights).size).toBe(1)
      // The same line pitch as the default block, whose lines are inline.
      const pitch = (await plain.nth(1).boundingBox())!.y - (await plain.nth(0).boundingBox())!.y
      expect(Math.abs(heights[0]! - pitch)).toBeLessThan(1)
      const start = async (locator: ReturnType<Page['locator']>) => (await locator.first().locator('[data-token]').first().boundingBox())!.x
      const offset = (await start(lines)) - (await start(plain))
      expect(offset).toBeGreaterThanOrEqual(0)
      expect(offset).toBeLessThanOrEqual(28)
    })
  })

  test.describe(`${edition} TooltipShortcut`, () => {
    const checks = async (page: Page, show: (trigger: ReturnType<Page['locator']>) => Promise<void>) => {
      const section = await open(page, edition)
      const trigger = section.getByTestId('ts-undo')
      await expect(trigger).toHaveAttribute('aria-keyshortcuts', 'Control+Z')
      const tip = page.locator('[data-slot="tooltip-content"]').filter({ has: page.locator('[data-slot="tooltip-shortcut"]') })
      // The page may still be hydrating on a cold start: repeat the gesture until the tooltip opens.
      await expect(async () => {
        await page.mouse.move(0, 0)
        await trigger.evaluate(node => (node as HTMLElement).blur())
        await show(trigger)
        await expect(tip.first()).toBeVisible({ timeout: 1500 })
      }).toPass({ timeout: 30000 })
      const keys = tip.first().locator('[data-slot="tooltip-shortcut-key"]')
      await expect(keys).toHaveText(['Ctrl', 'Z'])
      await expect(tip.first().locator('[data-slot="tooltip-shortcut"]')).toHaveAttribute('aria-hidden', 'true')
      // Key caps are drawn: a border and a 11px mono font, in a row after the text.
      const cap = await keys.first().evaluate(node => {
        const style = getComputedStyle(node)
        return { border: style.borderTopWidth, size: style.fontSize, family: style.fontFamily }
      })
      expect(cap.border).toBe('1px')
      expect(cap.size).toBe('11px')
      expect(cap.family).toContain('monospace')
      const [first, second] = [await keys.nth(0).boundingBox(), await keys.nth(1).boundingBox()]
      expect(second!.x).toBeGreaterThan(first!.x)
      expect(Math.abs(second!.y - first!.y)).toBeLessThan(2)
      return trigger
    }

    // Announced once: the trigger's aria-keyshortcuts carries the keys, and what is read as its
    // description or as the tooltip's text is "Undo" with no key names. The browser computes it.
    const announcedOnce = async (page: Page, trigger: ReturnType<Page['locator']>) => {
      const describedBy = await trigger.getAttribute('aria-describedby')
      if (describedBy) {
        await expect(trigger).toHaveAccessibleDescription('Undo')
        return
      }
      // No description wiring (Base UI): the open tooltip's own accessible text.
      expect(edition).toBe('base')
      const tip = page.locator('[data-slot="tooltip-content"]').filter({ has: page.locator('[data-slot="tooltip-shortcut"]') }).first()
      await expect(tip).toMatchAriaSnapshot(`- text: Undo`)
      const snapshot = await tip.ariaSnapshot()
      expect(snapshot).not.toMatch(/Ctrl|Z/)
    }

    test('hover shows the key caps; the trigger announces the shortcut once', async ({ page }) => {
      const trigger = await checks(page, locator => locator.hover())
      await announcedOnce(page, trigger)
    })

    test('focus shows the key caps; the trigger announces the shortcut once', async ({ page }) => {
      const trigger = await checks(page, locator => locator.focus())
      await announcedOnce(page, trigger)
    })
  })
}
