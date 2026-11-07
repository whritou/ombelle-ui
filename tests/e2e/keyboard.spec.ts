import { test, expect } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import fs from 'node:fs'
import { expectColorParity } from '../helpers/color-compare.js'
import { supportedStyleFamilies } from '../../packages/contracts/src/style-families.js'
const map = JSON.parse(fs.readFileSync('.artifacts/consumers.json', 'utf8'))
for (const family of supportedStyleFamilies)
  for (const mode of ['light', 'dark'])
    for (const app of ['preview', 'vite', 'next', 'npm-vite', 'npm-next'])
      test(
        family + ' ' + mode + ' ' + app + ' keyboard and accessibility',
        async ({ page }) => {
          const url =
            app === 'preview'
              ? 'http://127.0.0.1:4173/' + family + '/'
              : 'http://127.0.0.1:' + map[app + '-' + family].port + '/'
          await page.goto(url + '?mode=' + mode)
          await expect(page.locator('main')).toHaveAttribute(
            'data-ready',
            'true',
          )
          await expect(
            page.getByRole('button', { name: 'Save changes' }),
          ).toBeVisible()
          await page.getByLabel('Email').focus()
          await expect(page.getByLabel('Email')).toBeFocused()
          expect((await new AxeBuilder({ page }).analyze()).violations).toEqual(
            [],
          )
          await page.getByRole('button', { name: 'Open dialog' }).click()
          await expect(page.getByRole('dialog')).toBeVisible()
          await expect(
            page.getByRole('button', { name: 'Confirm' }),
          ).toBeFocused()
          await page.keyboard.press('Tab')
          await expect(
            page.getByRole('button', { name: 'Close', exact: true }),
          ).toBeFocused()
          await page.keyboard.press('Tab')
          await expect(
            page.getByRole('button', { name: 'Confirm' }),
          ).toBeFocused()
          await page.keyboard.press('Shift+Tab')
          await expect(
            page.getByRole('button', { name: 'Close', exact: true }),
          ).toBeFocused()
          const surface = await page
            .getByRole('dialog')
            .evaluate((el) => {
              const probe = document.createElement('div')
              probe.style.cssText = 'background:var(--popover);color:var(--popover-foreground)'
              el.append(probe)
              const actual = getComputedStyle(el), expected = getComputedStyle(probe)
              const result = {
                actual: { background: actual.backgroundColor, color: actual.color },
                expected: { background: expected.backgroundColor, color: expected.color },
              }
              probe.remove()
              return result
            })
          expectColorParity(surface.actual, surface.expected)
          const close = page.getByRole('button', { name: 'Close', exact: true })
          await expect(close.locator('svg[aria-hidden="true"]')).toHaveCount(1)
          const closeLabel = await close
            .locator('span', { hasText: 'Close' })
            .evaluate((el) => {
              const r = el.getBoundingClientRect(),
                s = getComputedStyle(el)
              return {
                width: r.width,
                height: r.height,
                position: s.position,
                overflow: s.overflow,
                clip: s.clip,
              }
            })
          expect(closeLabel.width).toBeLessThanOrEqual(1)
          expect(closeLabel.height).toBeLessThanOrEqual(1)
          expect(closeLabel.position).toBe('absolute')
          expect(closeLabel.overflow).toBe('hidden')
          const closeBox = await close.boundingBox()
          expect(closeBox!.width).toBeGreaterThanOrEqual(24)
          expect(closeBox!.height).toBeGreaterThanOrEqual(24)
          const viewport = page.viewportSize()!
          await page.setViewportSize({ width: 320, height: 800 })
          const narrowClose = (await close.boundingBox())!
          const headingText = await page
            .getByRole('dialog')
            .getByRole('heading', { name: 'Confirm changes' })
            .evaluate((element) => {
              // A title can paint a full-width header while reserving padded space
              // for Close. Check text line boxes rather than the decorative shell.
              const range = document.createRange()
              range.selectNodeContents(element)
              return Array.from(range.getClientRects()).map((rect) => ({
                x: rect.x, y: rect.y, width: rect.width, height: rect.height,
              }))
            })
          expect(narrowClose.width).toBeGreaterThanOrEqual(24)
          expect(narrowClose.height).toBeGreaterThanOrEqual(24)
          expect(headingText.length).toBeGreaterThan(0)
          for (const line of headingText)
            expect(
              line.x + line.width <= narrowClose.x ||
                narrowClose.x + narrowClose.width <= line.x ||
                line.y + line.height <= narrowClose.y ||
                narrowClose.y + narrowClose.height <= line.y,
            ).toBe(true)
          await page.setViewportSize(viewport)
          expect((await new AxeBuilder({ page }).analyze()).violations).toEqual(
            [],
          )
          await page.keyboard.press('Escape')
          await expect(page.getByRole('dialog')).not.toBeVisible()
          await expect(
            page.getByRole('button', { name: 'Open dialog' }),
          ).toBeFocused()
          expect(
            await page
              .getByRole('button', { name: 'Open dialog' })
              .evaluate((el) => getComputedStyle(el).outlineStyle),
          ).not.toBe('none')
        },
      )
