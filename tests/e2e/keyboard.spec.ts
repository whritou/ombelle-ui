import { test, expect } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import fs from 'node:fs'
const map = JSON.parse(fs.readFileSync('.artifacts/consumers.json', 'utf8'))
for (const family of ['flat', 'neo-brutalism'])
  for (const mode of ['light', 'dark'])
    for (const app of ['preview', 'vite', 'next'])
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
          const background = await page
            .getByRole('dialog')
            .evaluate((el) => getComputedStyle(el).backgroundColor)
          expect(background).toBe(
            mode === 'dark' ? 'rgb(39, 39, 42)' : 'rgb(255, 255, 255)',
          )
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
