import { test, expect } from '@playwright/test'
import fs from 'node:fs'
import { supportedComponentIds } from '../../packages/contracts/src/component-ids.js'

// Production builds of genuine shadcn base-nova apps with every Ombelle
// component, shadcn's own Button and Ombelle's Button installed beside it.
const consumers = JSON.parse(
  fs.existsSync('.artifacts/base-consumers.json')
    ? fs.readFileSync('.artifacts/base-consumers.json', 'utf8')
    : '[]',
) as { id: string; port: number }[]

for (const consumer of consumers)
  test(consumer.id + ' renders every component and leaves shadcn components unstyled by Ombelle', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', (e) => errors.push(String(e)))
    page.on('response', (r) => {
      // The Avatar usage example points at a placeholder image the app doesn't
      // ship; Avatar shows its fallback.
      const file = new URL(r.url()).pathname
      if (r.status() >= 400 && file !== '/ada.png') errors.push(r.status() + ' ' + file)
    })
    page.on('console', (m) => {
      if (m.type() === 'error' && !m.text().startsWith('Failed to load resource')) errors.push(m.text())
    })
    await page.goto('http://127.0.0.1:' + consumer.port + '/')
    await expect(page.locator('main[data-ready="true"]')).toBeVisible()

    for (const id of supportedComponentIds)
      expect(
        // Dialog's trigger is the primitive's own part, without a data-slot.
        await page.locator('[data-component="' + id + '"] :is([data-slot], button, [role])').count(),
        id,
      ).toBeGreaterThan(0)

    // Selectors of rules that style an element through a named data-slot. The
    // family's reduced-motion rule targets every [data-slot] and is not counted.
    const slotRules = (check: string) =>
      page.evaluate((check) => {
        const element = document.querySelector('[data-check="' + check + '"]')!
        const matched: string[] = []
        const walk = (rules: CSSRuleList) => {
          for (const rule of Array.from(rules)) {
            if (rule instanceof CSSStyleRule) {
              if (rule.selectorText.includes('data-slot=') && element.matches(rule.selectorText))
                matched.push(rule.selectorText)
            } else if ('cssRules' in rule) walk((rule as CSSGroupingRule).cssRules)
          }
        }
        for (const sheet of Array.from(document.styleSheets)) walk(sheet.cssRules)
        return matched
      }, check)
    expect(await page.locator('[data-check="shadcn-button"]').getAttribute('data-slot')).toBe('button')
    expect(await slotRules('shadcn-button')).toEqual([])
    expect(await page.locator('[data-check="ombelle-button"]').getAttribute('data-slot')).toBe('ombelle-button')
    expect((await slotRules('ombelle-button')).length).toBeGreaterThan(0)
    expect(errors).toEqual([])
  })
