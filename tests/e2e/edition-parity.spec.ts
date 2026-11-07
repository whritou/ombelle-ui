import { test, expect, type Page } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import { supportedStyleFamilies } from '../../packages/contracts/src/style-families.js'
import {
  compareSlotStyles,
  focusOrder,
  portedComponents,
  slotStyles,
  type SlotStyles,
} from '../helpers/edition-parity.js'

type Edition = 'radix' | 'base'
const url = (family: string, edition: Edition, mode: string) =>
  'http://127.0.0.1:4173/editions/' + family + '/' + edition + '/?mode=' + mode
async function open(page: Page, family: string, edition: Edition, mode: string) {
  await page.goto(url(family, edition, mode))
  await expect(page.locator('main[data-ready="true"]')).toBeVisible()
}

for (const family of supportedStyleFamilies)
  for (const mode of ['light', 'dark'] as const)
    for (const { id, states } of portedComponents)
      test(`${family} ${mode} ${id} renders identically in both editions`, async ({ context }) => {
        const pages: Record<Edition, Page> = {
          radix: await context.newPage(),
          base: await context.newPage(),
        }
        const section = (edition: Edition) =>
          pages[edition].locator('[data-parity="' + id + '"]')
        for (const state of states) {
          const styles = {} as Record<Edition, SlotStyles>
          for (const edition of ['radix', 'base'] as const) {
            await open(pages[edition], family, edition, mode)
            await state.act?.(pages[edition], section(edition))
            styles[edition] = await slotStyles(section(edition))
          }
          expect(styles.radix.length, state.name).toBeGreaterThan(0)
          expect(compareSlotStyles(id, styles.radix, styles.base), state.name).toEqual([])
        }
        for (const edition of ['radix', 'base'] as const)
          await open(pages[edition], family, edition, mode)
        expect(
          await focusOrder(pages.base, section('base')),
          'keyboard focus order',
        ).toEqual(await focusOrder(pages.radix, section('radix')))
        const axe = await new AxeBuilder({ page: pages.base })
          .include('[data-parity="' + id + '"]')
          .analyze()
        expect(axe.violations.map((v) => v.id)).toEqual([])
        for (const page of Object.values(pages)) await page.close()
      })
