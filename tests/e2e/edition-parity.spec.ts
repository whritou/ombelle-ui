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
// Each load gets its own URL: reloading the same URL lets Chromium restore
// form controls (such as hidden radio inputs) from the previous state.
let load = 0
const url = (family: string, edition: Edition, mode: string) =>
  'http://127.0.0.1:4173/editions/' + family + '/' + edition + '/?mode=' + mode + '&load=' + ++load
async function open(page: Page, family: string, edition: Edition, mode: string) {
  // Both editions share a context; act on the foreground page so focus
  // behaves like a real window.
  await page.bringToFront()
  await page.goto(url(family, edition, mode))
  await expect(page.locator('main[data-ready="true"]')).toBeVisible()
  // States start from a clean pointer: a hover from the previous state lingers.
  await page.mouse.move(0, 0)
}

for (const family of supportedStyleFamilies)
  for (const mode of ['light', 'dark'] as const)
    for (const { id, states, portal } of portedComponents)
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
            styles[edition] = await slotStyles(section(edition), portal)
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
