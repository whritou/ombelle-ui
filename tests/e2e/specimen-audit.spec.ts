import fs from 'node:fs/promises'
import path from 'node:path'
import { expect, test, type Locator, type Page } from '@playwright/test'
import { styleFamilies } from '../../packages/contracts/src/index.js'
import {
  checkFocusVisible, findClipping, findForcedColors, findOverflow, findSpacing, findTargetSize, installClock, listFocusables, pauseClock, markBorders, runAxe,
  type AuditCheck, type Finding,
} from '../helpers/specimen-audit.js'

const editions = ['radix', 'base'] as const
const modes = ['light', 'dark'] as const
const checks: AuditCheck[] = ['overflow', 'clipping', 'spacing', 'focus-visible', 'target-size', 'forced-colors', 'axe']
const artifacts = '.artifacts/specimen-audit'

/** How each overlay opens, and where its content appears once open (outside the section when portalled). */
const overlays: Record<string, { open: 'click' | 'focus'; content: (page: Page, section: Locator) => Locator; returnsFocus: boolean }> = {
  dialog: { open: 'click', content: page => page.getByRole('dialog'), returnsFocus: true },
  'alert-dialog': { open: 'click', content: page => page.getByRole('alertdialog'), returnsFocus: true },
  sheet: { open: 'click', content: page => page.getByRole('dialog'), returnsFocus: true },
  popover: { open: 'click', content: page => page.locator('[data-slot$="popover-content"]'), returnsFocus: true },
  'dropdown-menu': { open: 'click', content: page => page.getByRole('menu'), returnsFocus: true },
  select: { open: 'click', content: page => page.getByRole('listbox'), returnsFocus: true },
  tooltip: { open: 'focus', content: page => page.locator('[data-slot$="tooltip-content"]'), returnsFocus: true },
  // The trigger is the first collapsed item; its panel is found through aria-controls (both editions).
  accordion: { open: 'click', content: page => page.locator('[data-audit-accordion-panel]'), returnsFocus: false },
}

async function measure(page: Page, roots: Locator[], stop: Locator, prefix: string, counts: Record<AuditCheck, number>) {
  const findings: Finding[] = [...await findOverflow(roots), ...await findClipping(roots, stop), ...await findSpacing(roots), ...await findTargetSize(roots)]
  counts.overflow += roots.length; counts.clipping += roots.length; counts.spacing += roots.length; counts['target-size'] += roots.length
  for (const [index, root] of roots.entries())
    for (const control of await listFocusables(root, `${prefix}-${index}`)) {
      findings.push(...await checkFocusVisible(page, control))
      // The ring is drawn now: it must not be cut either.
      findings.push(...await findClipping([control], stop))
      counts['focus-visible']++
    }
  return findings
}

for (const family of styleFamilies)
  for (const edition of editions)
    for (const mode of modes)
      test(`${family}/${edition}/${mode}: every specimen passes the measured checks`, async ({ page, browser }) => {
        const counts = Object.fromEntries(checks.map(check => [check, 0])) as Record<AuditCheck, number>
        const findings: (Finding & { component: string })[] = []
        const errors: string[] = []
        page.on('pageerror', error => errors.push(error.message))
        // Time runs normally; it is paused only while a toast is measured, so the toast stays open.
        await installClock(page)
        await page.goto(`/audit/${family}/${edition}/?mode=${mode}`)
        await expect(page.locator('main[data-audit-page]')).toHaveAttribute('data-ready', 'true', { timeout: 60000 })
        const sections = page.locator('section[data-audit]')
        // Toast first: the Radix toast is open from page load and its timer must not run out before it is measured.
        const components = (await sections.evaluateAll(list => list.map(section => section.getAttribute('data-audit')!)))
          .sort((a, b) => Number(b === 'toast') - Number(a === 'toast'))
        const shots = path.join(artifacts, family, edition, mode)
        await fs.mkdir(shots, { recursive: true })
        const body = page.locator('body')
        for (const component of components) {
          const section = page.locator(`section[data-audit="${component}"]`)
          const record = (list: Finding[]) => findings.push(...list.map(finding => ({ ...finding, component })))
          let paused = false
          try {
          await section.scrollIntoViewIfNeeded()
          // Radix Toast is open from the start; a closed toast would leave nothing to measure.
          if (component === 'toast' && edition === 'radix') {
            await expect(section.locator('[data-slot$="toast"]').first(), 'toast is still open').toBeVisible()
            await pauseClock(page)
            paused = true
          }
          await section.screenshot({ path: path.join(shots, `${component}.png`), animations: 'disabled' })
          record(await measure(page, [section], section, component, counts))
          record(await runAxe(page, [`section[data-audit="${component}"]`]))
          counts.axe++
          const overlay = component === 'accordion' && !await section.locator('[aria-expanded="false"][aria-controls]').count()
            ? undefined : overlays[component]
          const isBaseToast = component === 'toast' && edition === 'base'
          if (overlay || isBaseToast) {
            const trigger = isBaseToast ? section.getByRole('button', { name: 'Show notification' })
              : component === 'accordion' ? section.locator('[aria-expanded="false"][aria-controls]').first()
              : section.locator('button, [role="combobox"]').first()
            await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur())
            if (overlay?.open === 'focus') {
              // Real keyboard focus: Base UI opens tooltips only for keyboard focus, not a programmatic focus().
              await trigger.evaluate(element => {
                const tabbable = [...document.querySelectorAll<HTMLElement>('button, a[href], input, select, textarea, [tabindex]')]
                  .filter(item => item.tabIndex >= 0 && !item.matches(':disabled'))
                tabbable[tabbable.indexOf(element as HTMLElement) - 1]?.focus()
              })
              await page.keyboard.press('Tab')
              await expect(trigger).toBeFocused()
              // Base UI opens its tooltip after a delay timer; the page clock is frozen to keep toasts open.
              await page.clock.runFor(1500)
            } else await trigger.click()
            if (component === 'accordion') await trigger.evaluate(element =>
              document.getElementById(element.getAttribute('aria-controls')!)?.setAttribute('data-audit-accordion-panel', ''))
            const content = isBaseToast ? page.locator('[data-slot$="toast"]').first() : overlay!.content(page, section).first()
            await expect(content, `${component} opens`).toBeVisible()
            if (isBaseToast) { await pauseClock(page); paused = true }
            await content.evaluate((element, name) => element.setAttribute('data-audit-open', name), component)
            await page.screenshot({ path: path.join(shots, `${component}-open.png`), animations: 'disabled' })
            const inside = await content.evaluate((element, owner) => element.closest(`section[data-audit="${owner}"]`) !== null, component)
            record(await measure(page, [content], inside ? section : body, `${component}-open`, counts))
            record(await runAxe(page, [`[data-audit-open="${component}"]`]))
            counts.axe++
            // Overlays are the surfaces that carry backdrop filters: check them under forced colors while they are open.
            if (mode === 'light') {
              await markBorders([content])
              await page.emulateMedia({ forcedColors: 'active' })
              record(await findForcedColors([content], await listFocusables(content, `${component}-open-forced`)))
              counts['forced-colors']++
              await page.emulateMedia({ forcedColors: 'none' })
            }
            if (overlay && component !== 'accordion') {
              await page.keyboard.press('Escape')
              // Closing and focus return run on timers, which the frozen clock only fires when advanced.
              await page.clock.runFor(500)
              await expect(content, `${component} closes on Escape`).toBeHidden()
              if (overlay.returnsFocus) await expect(trigger, `${component} returns focus to its trigger`).toBeFocused()
            }
          }
          } finally { if (paused) await page.clock.resume() }
        }
        if (mode === 'light') {
          await markBorders([sections])
          await page.emulateMedia({ forcedColors: 'active' })
          for (const component of components) {
            const section = page.locator(`section[data-audit="${component}"]`)
            const list = await findForcedColors([section], await listFocusables(section, `${component}-forced`))
            findings.push(...list.map(finding => ({ ...finding, component })))
            counts['forced-colors']++
          }
          await page.emulateMedia({ forcedColors: 'none' })
        }
        const part = { family, edition, mode, specimens: components.length, checks: counts, failures: findings.length + errors.length,
          browser: { engine: 'chromium', version: browser.version(), channel: process.env.OMBELLE_BROWSER_CHANNEL || 'bundled' } }
        await fs.mkdir(path.join(artifacts, 'parts'), { recursive: true })
        await fs.writeFile(path.join(artifacts, 'parts', `${family}-${edition}-${mode}.json`), JSON.stringify(part, null, 2) + '\n')
        await fs.writeFile(path.join(artifacts, 'parts', `${family}-${edition}-${mode}.findings.json`), JSON.stringify(findings, null, 2) + '\n')
        expect(components).toHaveLength(29)
        expect(errors, 'page errors').toEqual([])
        expect(findings, JSON.stringify(findings, null, 2)).toEqual([])
      })

// Merge every configuration's part into the evidence file the foundation gate validates.
test.afterAll(async () => {
  const directory = path.join(artifacts, 'parts')
  const names = (await fs.readdir(directory).catch(() => [] as string[])).filter(name => name.endsWith('.json') && !name.endsWith('.findings.json'))
  const parts = await Promise.all(names.map(async name => JSON.parse(await fs.readFile(path.join(directory, name), 'utf8'))))
  if (!parts.length) return
  const order = (part: { family: string; edition: string; mode: string }) =>
    [styleFamilies.indexOf(part.family as never), editions.indexOf(part.edition as never), modes.indexOf(part.mode as never)]
  parts.sort((a, b) => { const x = order(a), y = order(b); return x[0] - y[0] || x[1] - y[1] || x[2] - y[2] })
  const evidence = {
    schemaVersion: 1, node: process.version, browser: parts[0].browser,
    configurations: parts.map(({ family, edition, mode, specimens, checks }) => ({ family, edition, mode, specimens, checks })),
    failures: parts.reduce((sum, part) => sum + part.failures, 0),
  }
  await fs.writeFile('.artifacts/specimen-audit.json', JSON.stringify(evidence, null, 2) + '\n')
})

// The page is the measurement surface: it must match what an install renders.
test('audit pages draw the glass backdrop and lay specimens out in normal flow', async ({ page }) => {
  for (const mode of modes) {
    await page.goto(`/audit/liquid-glass/radix/?mode=${mode}`)
    await expect(page.locator('main[data-audit-page]')).toHaveAttribute('data-ready', 'true', { timeout: 60000 })
    expect(await page.evaluate(() => getComputedStyle(document.documentElement).backgroundImage), `${mode} backdrop`).not.toBe('none')
  }
  await page.goto('/audit/ombelle/radix/?mode=light')
  await expect(page.locator('main[data-audit-page]')).toHaveAttribute('data-ready', 'true', { timeout: 60000 })
  const badge = await page.locator('section[data-audit="badge"] [data-slot$="badge"]').first().boundingBox()
  expect(badge!.width, 'Badge keeps its intrinsic width').toBeLessThan(200)
})
