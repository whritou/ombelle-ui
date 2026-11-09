import { expect, test, type Locator, type Page } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import fs from 'node:fs/promises'
import { compile } from '../../packages/compiler/src/index.js'
import { getCatalog } from '../../packages/catalog/src/index.js'
import { supportedComponentIds } from '../../packages/contracts/src/index.js'
import { presetRuntimeStyles } from '../../apps/www/src/preset-editor/preview-protocol.js'

const families = ['flat', 'minimalist', 'neo-brutalism', 'ombelle', 'liquid-glass'] as const
const editions = ['radix', 'base'] as const

for (const id of ['builtin-liquid-glass', 'builtin-liquid-glass-cristal', 'builtin-liquid-glass-prism'] as const)
  for (const mode of ['light', 'dark'] as const)
    test(`${id}/${mode}: bounded material text and explicit appearances`, async ({ page }) => {
      const preset = getCatalog('0.1.0').startingPresets[id]
      const result = await compile({ preset, componentIds: supportedComponentIds,
        catalogRelease: '0.1.0', compilerVersion: '0.1.0', glassContrast: 'report' })
      await page.goto(`/editions/liquid-glass/radix/?mode=${mode}`)
      await expect(page.locator('main')).toHaveAttribute('data-ready', 'true')
      await page.addStyleTag({ content: presetRuntimeStyles(result) })
      await page.addStyleTag({ content: await fs.readFile('apps/preview/src/glass-backdrop.css', 'utf8') })
      await page.addStyleTag({ content: '[data-expansion].specimen{background:transparent}' })
      await page.evaluate(() => document.documentElement.dataset.backdrop = 'glass')
      const underline = page.getByRole('tablist', { name: 'Expansion horizontal tabs' })
      const paint = await underline.evaluate(element => {
        const css = getComputedStyle(element)
        return { background: css.backgroundColor, radius: css.borderTopLeftRadius, filter: css.backdropFilter, shadow: css.boxShadow }
      })
      expect(paint.radius).toBe('0px')
      expect(paint.filter).toBe('none')
      expect(paint.shadow).toBe('none')
      expect(paint.background).not.toBe('rgba(0, 0, 0, 0)')
      for (const appearance of ['outlined', 'subtle']) {
        const card = page.locator(`[data-expansion='surfaces'] [data-slot='card'][data-appearance='${appearance}']`)
        expect(await card.evaluate(element => getComputedStyle(element).boxShadow)).toBe('none')
        expect(await card.evaluate(element => getComputedStyle(element).backdropFilter)).toBe('none')
        expect(await card.evaluate(element => getComputedStyle(element, '::before').display)).toBe('none')
      }
      if (id !== 'builtin-liquid-glass') {
        for (const slot of ['input-group-input', 'input-group-textarea', 'breadcrumb-link', 'pagination-link']) {
          const node = page.locator(`[data-expansion] [data-slot='${slot}']`).first()
          expect(await node.evaluate(element => parseFloat(getComputedStyle(element).webkitTextStrokeWidth))).toBeGreaterThan(0)
          expect(await node.evaluate(element => getComputedStyle(element).getPropertyValue('--glass-plate').trim())).not.toBe('')
        }
        await page.getByRole('button', { name: 'Open expansion sheet' }).click()
        const popup = page.getByRole('dialog', { name: 'Expansion project details' })
        await expect(popup).toBeVisible()
        expect(await popup.evaluate(element => parseFloat(getComputedStyle(element).webkitTextStrokeWidth))).toBeGreaterThan(0)
        await page.keyboard.press('Escape')
      }
      await page.locator('[data-expansion="surfaces"]').screenshot({ path: `.artifacts/catalog-expansion-${id}-${mode}.png` })
    })

async function accessible(page: Page, include: string) {
  const result = await new AxeBuilder({ page }).include(include).analyze()
  expect(result.violations.map(({ id, nodes }) => ({
    id, targets: nodes.map(({ target }) => target),
  }))).toEqual([])
}

async function surface(element: Locator) {
  return element.evaluate((node) => {
    const css = getComputedStyle(node)
    return {
      background: css.backgroundColor,
      shadow: css.boxShadow,
      filter: css.backdropFilter,
      border: css.borderBlockStartStyle,
      padding: parseFloat(css.paddingBlockStart),
      font: parseFloat(css.fontSize),
    }
  })
}

for (const family of families)
  for (const edition of editions)
    for (const mode of ['light', 'dark'] as const)
      test(`${family}/${edition}/${mode}: expanded catalog keyboard, semantics, styles and accessibility`, async ({ page }) => {
        const errors: string[] = []
        page.on('pageerror', (error) => errors.push(error.message))
        await page.goto(`/editions/${family}/${edition}/?mode=${mode}`)
        await expect(page.locator('main')).toHaveAttribute('data-ready', 'true')
        const section = (name: string) => page.locator(`[data-expansion="${name}"]`)
        await expect(section('input-group')).toBeVisible()

        await test.step('native form controls and safe default button', async () => {
          const form = section('input-group')
          const input = form.getByLabel('Expansion search', { exact: true })
          await input.fill('Button recipes')
          await form.getByRole('button', { name: 'Check', exact: true }).click()
          await expect(form.locator('[data-check-count]')).toHaveText('1')
          await expect(form.locator('[data-submit-count]')).toHaveText('0')
          await form.getByRole('button', { name: 'Go', exact: true }).click()
          await expect(form.locator('[data-submit-count]')).toHaveText('1')
          const invalid = form.getByLabel('Expansion email', { exact: true })
          await expect(invalid).toHaveAttribute('aria-invalid', 'true')
          await expect(invalid).toHaveAttribute('aria-describedby', 'expansion-email-error')
          expect(await invalid.evaluate((element: HTMLInputElement) => element.checkValidity())).toBe(false)
          await expect(form.getByLabel('Expansion disabled field', { exact: true })).toBeDisabled()
          await form.getByLabel('Expansion message', { exact: true }).fill('Review the generated source.')
          await expect(form.locator('textarea')).toHaveValue('Review the generated source.')
          await input.focus()
          await expect.poll(() => input.evaluate((element) => {
            const group = element.closest('[data-slot="input-group"]')!
            const css = getComputedStyle(group)
            return css.outlineStyle !== 'none' || css.boxShadow !== 'none'
          })).toBe(true)
        })

        await test.step('native navigation and disabled paging', async () => {
          const navigation = section('navigation')
          const breadcrumb = navigation.getByRole('navigation', { name: 'Project breadcrumb' })
          await expect(breadcrumb.locator('ol')).toHaveCount(1)
          await expect(breadcrumb.locator('[aria-current="page"]')).toHaveText('Component review')
          await expect(breadcrumb.locator('[aria-current="page"]')).not.toHaveAttribute('href')
          await expect(breadcrumb.locator('[data-slot="breadcrumb-separator"]').first()).toHaveAttribute('aria-hidden', 'true')
          const previous = navigation.locator('[data-direction="previous"]')
          await expect(previous).toHaveAttribute('aria-disabled', 'true')
          await expect(previous).toHaveAttribute('tabindex', '-1')
          await expect(previous).not.toHaveAttribute('href')
          await previous.dispatchEvent('click')
          await expect(navigation.locator('[data-page-count]')).toHaveText('0')
          await navigation.getByRole('button', { name: 'Before pagination' }).focus()
          await page.keyboard.press('Tab')
          await expect(navigation.getByRole('link', { name: 'Page 1', exact: true })).toBeFocused()
          const paging = navigation.getByRole('navigation', { name: 'Project pagination' })
          await expect(paging.getByRole('link', { name: 'Page 2', exact: true })).toHaveAttribute('aria-current', 'page')
          await paging.getByRole('link', { name: 'Go to next page' }).click()
          await expect(navigation.locator('[data-page-count]')).toHaveText('1')
        })

        await test.step('surface variants and decorative status dot', async () => {
          const surfaces = section('surfaces')
          for (const appearance of ['outlined', 'subtle']) {
            expect((await surface(surfaces.locator(`[data-appearance="${appearance}"]`))).shadow).toBe('none')
          }
          const normal = surfaces.getByRole('table', { name: 'Default density projects' })
          const compact = surfaces.getByRole('table', { name: 'Compact projects' })
          const normalCell = normal.locator('[data-slot="table-cell"]').first()
          const compactCell = compact.locator('[data-slot="table-cell"]').first()
          expect((await surface(compactCell)).padding).toBeLessThan((await surface(normalCell)).padding)
          await expect(compact).toHaveAttribute('data-striped', '')
          const rows = compact.locator('[data-slot="table-body"] > [data-slot="table-row"]')
          expect((await surface(rows.nth(1).locator('[data-slot="table-cell"]').first())).background)
            .not.toBe((await surface(rows.nth(0).locator('[data-slot="table-cell"]').first())).background)
          expect((await surface(rows.nth(2).locator('[data-slot="table-cell"]').first())).background)
            .toBe((await surface(rows.nth(3).locator('[data-slot="table-cell"]').first())).background)
          const badges = surfaces.locator('[data-slot="badge"]')
          expect((await surface(badges.filter({ hasText: 'Small status' }))).font)
            .toBeLessThan((await surface(badges.filter({ hasText: 'Default status' }))).font)
          await expect(surfaces.locator('[data-slot="badge-dot"]').first()).toHaveAttribute('aria-hidden', 'true')
          await expect(section('alerts').locator('[data-variant="destructive"]')).toHaveAttribute('role', 'alert')
          for (const variant of ['success', 'warning', 'info']) {
            await expect(section('alerts').locator(`[data-variant="${variant}"]`)).toHaveAttribute('role', 'status')
          }
        })

        await test.step('underline Tabs keyboard behavior in both orientations', async () => {
          const tabs = section('tabs')
          for (const [orientation, arrow] of [['horizontal', 'ArrowRight'], ['vertical', 'ArrowDown']] as const) {
            const list = tabs.getByRole('tablist', { name: `Expansion ${orientation} tabs` })
            await expect(list).toHaveAttribute('data-appearance', 'underline')
            await expect(list).toHaveAttribute('data-orientation', orientation)
            // Horizontal is the ARIA default; Base UI omits that redundant
            // attribute while explicitly marking a vertical tablist.
            expect(await list.getAttribute('aria-orientation') ?? 'horizontal').toBe(orientation)
            const first = list.getByRole('tab', { name: 'Summary', exact: true })
            const second = list.getByRole('tab', { name: 'History', exact: true })
            await first.focus()
            await page.keyboard.press(arrow)
            await expect(second).toBeFocused()
            await expect(second).toHaveAttribute('aria-selected', 'true')
            await page.keyboard.press(arrow)
            const unavailable = list.getByRole('tab', { name: 'Unavailable', exact: true })
            if (edition === 'base') {
              // Base UI deliberately lets arrow navigation discover a
              // disabled tab, without activating its unavailable panel.
              await expect(unavailable).toBeFocused()
              await expect(unavailable).toHaveAttribute('aria-selected', 'false')
              await expect(second).toHaveAttribute('aria-selected', 'true')
              await page.keyboard.press(arrow)
            }
            await expect(first).toBeFocused()
            await expect(unavailable).toBeDisabled()
          }
        })

        await accessible(page, '[data-expansion]')

        await test.step('Sheet traps focus, scrolls, mirrors logical sides and restores focus', async () => {
          const trigger = section('sheet').getByRole('button', { name: 'Open expansion sheet' })
          await trigger.focus()
          await page.keyboard.press('Enter')
          const sheet = page.getByRole('dialog', { name: 'Expansion project details' })
          await expect(sheet).toBeVisible()
          await expect(sheet.getByRole('button', { name: 'Close', exact: true })).toBeVisible()
          expect(await sheet.evaluate((element) => element.scrollHeight > element.clientHeight)).toBe(true)
          await sheet.getByLabel('Sheet project name').focus()
          await page.keyboard.press('Shift+Tab')
          await expect(sheet.getByRole('button', { name: 'Close', exact: true })).toBeFocused()
          await page.keyboard.press('Tab')
          await expect(sheet.getByLabel('Sheet project name')).toBeFocused()
          await accessible(page, '[data-expansion="sheet-content"]')
          await page.keyboard.press('Escape')
          await expect(sheet).toBeHidden()
          await expect(trigger).toBeFocused()
          await page.evaluate(() => { document.documentElement.dir = 'rtl' })
          await trigger.press('Enter')
          await expect(sheet).toBeVisible()
          await expect.poll(async () => (await sheet.boundingBox())!.x).toBeLessThan(2)
          await sheet.getByRole('button', { name: 'Close', exact: true }).click()
          await expect(sheet).toBeHidden()
          await expect(trigger).toBeFocused()
          await page.evaluate(() => { document.documentElement.dir = 'ltr' })
        })

        await test.step('Alert Dialog protects the safe default and resists outside dismissal', async () => {
          const trigger = section('alert-dialog').getByRole('button', { name: 'Open expansion confirmation' })
          await trigger.focus()
          await trigger.press('Enter')
          const dialog = page.getByRole('alertdialog', { name: 'Archive expansion project?' })
          const cancel = dialog.getByRole('button', { name: 'Keep project' })
          const action = dialog.getByRole('button', { name: 'Archive project', exact: true })
          await expect(dialog).toBeVisible()
          await expect(cancel).toBeFocused()
          expect(await cancel.evaluate((element) => Boolean(element.compareDocumentPosition(
            element.closest('[role="alertdialog"]')!.querySelector('[data-slot="alert-dialog-action"]')!,
          ) & Node.DOCUMENT_POSITION_FOLLOWING))).toBe(true)
          await page.mouse.click(2, 2)
          await expect(dialog).toBeVisible()
          await expect(section('alert-dialog').locator('[data-archive-count]')).toHaveText('0')
          await cancel.focus()
          await page.keyboard.press('Shift+Tab')
          await expect(action).toBeFocused()
          await page.keyboard.press('Tab')
          await expect(cancel).toBeFocused()
          await accessible(page, '[data-expansion="alert-dialog-content"]')
          await cancel.press('Enter')
          await expect(dialog).toBeHidden()
          await expect(trigger).toBeFocused()
          await trigger.press('Enter')
          await action.click()
          await expect(dialog).toBeHidden()
          await expect(section('alert-dialog').locator('[data-archive-count]')).toHaveText('1')
          await expect(trigger).toBeFocused()
        })

        await test.step('Toast timer pauses on hover, resumes, and supports explicit dismissal', async () => {
          await page.clock.install()
          const trigger = section('toast').getByRole('button', { name: 'Show expansion notification' })
          await trigger.click()
          const toast = page.locator('[data-slot="toast"][data-expansion="toast-content"]')
          await expect(toast).toBeVisible()
          await expect(toast.locator('[data-slot="toast-title"]')).toHaveText('Expansion saved')
          await toast.hover()
          await page.clock.fastForward(2400)
          await expect(toast).toBeVisible()
          await accessible(page, '[data-expansion="toast-content"]')
          await page.mouse.move(0, 0)
          await page.clock.fastForward(2400)
          await expect(toast).toBeHidden()
          await trigger.click()
          await expect(toast).toBeVisible()
          // Base hides close controls from announcements until the viewport is
          // expanded or the control receives focus; native tab focus unhides it.
          const close = toast.locator('[data-slot="toast-close"]')
          await close.focus()
          await expect(toast.getByRole('button', { name: 'Dismiss notification' })).toBeFocused()
          await page.keyboard.press('Space')
          await expect(toast).toBeHidden()
        })

        await test.step('forced-color surfaces keep borders, focus and opaque fallbacks', async () => {
          await page.emulateMedia({ forcedColors: 'active', reducedMotion: 'reduce' })
          const input = section('input-group').getByLabel('Expansion search', { exact: true })
          await input.focus()
          const group = input.locator('..')
          await expect.poll(() => group.evaluate((element) => getComputedStyle(element).outlineStyle)).toBe('solid')
          for (const appearance of ['outlined', 'subtle']) {
            const style = await surface(section('surfaces').locator(`[data-appearance="${appearance}"]`))
            expect(style.border).toBe('solid')
            expect(style.shadow).toBe('none')
            expect(style.filter).toBe('none')
          }
          await section('sheet').getByRole('button', { name: 'Open expansion sheet' }).click()
          const sheet = page.getByRole('dialog', { name: 'Expansion project details' })
          expect((await surface(sheet)).filter).toBe('none')
          expect((await surface(sheet)).shadow).toBe('none')
          await page.keyboard.press('Escape')
          await expect(sheet).toBeHidden()
        })
        expect(errors).toEqual([])
        await test.info().attach('catalog-expansion-environment', {
          body: Buffer.from(JSON.stringify({ family, edition, mode, node: process.version,
            browser: page.context().browser()?.version(), errors }, null, 2)),
          contentType: 'application/json',
        })
      })
