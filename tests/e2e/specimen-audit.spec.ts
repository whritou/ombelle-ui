import fs from 'node:fs/promises'
import path from 'node:path'
import { expect, test, type Locator, type Page } from '@playwright/test'
import { familyAccessibilityCaveat, styleFamilies, supportedComponentIds } from '../../packages/contracts/src/index.js'
import {
  checkFocusVisible, findClipping, findForcedColors, findOverflow, findSpacing, findTargetSize, installClock, listFocusables, markTranslucent, pauseClock, markBorders, runAxe,
  type AuditCheck, type Finding,
} from '../helpers/specimen-audit.js'
import { editions, modes, specimenArtifacts as artifacts, specimenRunIsPartial } from '../helpers/specimen-run.js'
import { inShard, specimenShard } from '../helpers/specimen-shard.js'

const checks: AuditCheck[] = ['overflow', 'clipping', 'spacing', 'focus-visible', 'target-size', 'forced-colors', 'axe']
// Findings whose outcome depends on the colours behind the specimen: a focus ring short of 3:1 and axe's
// color-contrast rule, each on an element over a translucent surface (TST-07). A focus finding for any
// other reason (no focus, focus moved), or contrast on an opaque surface, is not one of them.
const backdropDependent = (finding: Finding) => finding.translucent === true && (
  (finding.check === 'focus-visible' && finding.detail.includes(' focus pixels at 3:1 ')) ||
  (finding.check === 'axe' && finding.detail.startsWith('color-contrast:')))

/** How each overlay opens, and where its content appears once open (outside the section when portalled). */
const overlays: Record<string, {
  open: 'click' | 'focus' | 'contextmenu'
  content: (page: Page, section: Locator) => Locator
  returnsFocus: boolean
  /** The element that opens it; default the section's first button or combobox. */
  trigger?: (section: Locator) => Locator
}> = {
  dialog: { open: 'click', content: page => page.getByRole('dialog'), returnsFocus: true },
  'alert-dialog': { open: 'click', content: page => page.getByRole('alertdialog'), returnsFocus: true },
  sheet: { open: 'click', content: page => page.getByRole('dialog'), returnsFocus: true },
  popover: { open: 'click', content: page => page.locator('[data-slot$="popover-content"]'), returnsFocus: true },
  'dropdown-menu': { open: 'click', content: page => page.getByRole('menu'), returnsFocus: true },
  // Its own content: a Command list elsewhere on the page is a listbox too.
  // Base UI keeps a closed list in the DOM, so the open one is the visible one.
  select: { open: 'click', content: page => page.locator('[data-slot$="select-content"]').filter({ visible: true }), returnsFocus: true },
  tooltip: { open: 'focus', content: page => page.locator('[data-slot$="tooltip-content"]'), returnsFocus: true },
  // The trigger is the first collapsed item; its panel is found through aria-controls (both editions).
  // The panel is looked up in its own section: variant sections of the same component are on the page too.
  accordion: { open: 'click', content: (_page, section) => section.locator('[data-audit-accordion-panel]'), returnsFocus: false },
  combobox: { open: 'click', content: page => page.locator('[data-slot$="combobox-content"]'), returnsFocus: true },
  'hover-card': { open: 'focus', content: page => page.locator('[data-slot$="hover-card-content"]'), returnsFocus: true,
    trigger: section => section.locator('[data-slot$="hover-card-trigger"]') },
  // Only the picker specimen has a trigger; a plain calendar is measured in place.
  calendar: { open: 'click', content: page => page.locator('[data-slot$="date-picker-content"]'), returnsFocus: true,
    trigger: section => section.locator('[data-slot$="date-picker-trigger"]') },
  'context-menu': { open: 'contextmenu', content: page => page.getByRole('menu'), returnsFocus: true,
    trigger: section => section.locator('[data-slot$="context-menu-trigger"]') },
}
// Limit a run to some components, for example after a fix to them: OMBELLE_AUDIT_COMPONENTS=combobox,command
const onlyComponents = process.env.OMBELLE_AUDIT_COMPONENTS?.split(',').map(id => id.trim()).filter(Boolean)
// Audit with registry fonts, as <body>,<heading>,<mono>: OMBELLE_AUDIT_FONTS=inter,fraunces,jetbrains-mono
const auditFonts = process.env.OMBELLE_AUDIT_FONTS
// Limit a run to some families: OMBELLE_AUDIT_FAMILIES=ombelle,flat
const onlyFamilies = process.env.OMBELLE_AUDIT_FAMILIES?.split(',').map(id => id.trim()).filter(Boolean)

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

// Every configuration, in a fixed order: a shard takes its share by index, before any filter.
// Liquid glass is measured a second time with reduced transparency, the setting its accessibility
// caveat says restores the full guarantee: those configurations are held to every check, contrast included.
type Configuration = { family: (typeof styleFamilies)[number]; edition: (typeof editions)[number]; mode: (typeof modes)[number]; transparency?: 'reduced' }
const configurations: Configuration[] = [
  ...styleFamilies.flatMap(family => editions.flatMap(edition => modes.map(mode => ({ family, edition, mode })))),
  ...editions.flatMap(edition => modes.map(mode => ({ family: 'liquid-glass' as const, edition, mode, transparency: 'reduced' as const }))),
]
// One configuration measures every specimen: 3.6 to 5.2 minutes each on a CI runner (22 November nightly).
const configurationTimeout = 900000

for (const [index, { family, edition, mode, transparency }] of configurations.entries())
  if (inShard(index) && (!onlyFamilies || onlyFamilies.includes(family)))
      test(`${family}/${edition}/${mode}${transparency ? '/reduced-transparency' : ''}: every specimen passes the measured checks`, async ({ page, browser }) => {
        test.setTimeout(configurationTimeout)
        const counts = Object.fromEntries(checks.map(check => [check, 0])) as Record<AuditCheck, number>
        const findings: (Finding & { component: string })[] = []
        const errors: string[] = []
        page.on('pageerror', error => errors.push(error.message))
        // Time runs normally; it is paused only while a toast is measured, so the toast stays open.
        await installClock(page)
        await page.goto(`/audit/${family}/${edition}/?mode=${mode}${transparency ? '&transparency=reduced' : ''}${auditFonts ? `&fonts=${encodeURIComponent(auditFonts)}` : ''}`)
        await expect(page.locator('main[data-audit-page]')).toHaveAttribute('data-ready', 'true', { timeout: 60000 })
        if (transparency) expect(await page.evaluate(() => [...document.styleSheets].some(sheet => {
          try { return [...sheet.cssRules].some(rule => rule.cssText.includes('data-reduced-transparency')) } catch { return false }
        })), 'reduced transparency rules are applied').toBe(true)
        const sections = page.locator('section[data-audit]')
        // Toast first: the Radix toast is open from page load and its timer must not run out before it is measured.
        const components = (await sections.evaluateAll(list => list.map(section => section.getAttribute('data-audit')!)))
          // A variant section is component~variant; the filter and the count go by component.
          .filter(id => !onlyComponents?.length || onlyComponents.includes(id.split('~')[0]!))
          .sort((a, b) => Number(b.split('~')[0] === 'toast') - Number(a.split('~')[0] === 'toast'))
        const shots = path.join(artifacts, family, edition, mode)
        await fs.mkdir(shots, { recursive: true })
        const body = page.locator('body')
        for (const id of components) {
          const component = id.split('~')[0]!
          const section = page.locator(`section[data-audit="${id}"]`)
          const record = (list: Finding[]) => findings.push(...list.map(finding => ({ ...finding, component: id })))
          let paused = false
          // Toasts are measured first and stay open; once done, their fixed viewports must not cover later overlays.
          if (component !== 'toast') await page.locator('[data-slot$="toast-viewport"]').evaluateAll(list => list.forEach(element => { (element as HTMLElement).style.display = 'none' }))
          try {
          await section.scrollIntoViewIfNeeded()
          // Radix Toast is open from the start; a closed toast would leave nothing to measure.
          if (component === 'toast' && edition === 'radix') {
            await expect(section.locator('[data-slot$="toast"]').first(), 'toast is still open').toBeVisible()
            await pauseClock(page)
            paused = true
          }
          // A toast stack spreads out while focus is inside it: measure it spread, as a keyboard user sees it,
          // so focusing an older toast does not move it away from where its ring is measured.
          await section.locator('[data-stack]').evaluateAll(list => list.forEach(element => element.setAttribute('data-expanded', '')))
          await section.screenshot({ path: path.join(shots, `${id}.png`), animations: 'disabled' })
          record(await measure(page, [section], section, id, counts))
          record(await markTranslucent(page, await runAxe(page, [`section[data-audit="${id}"]`])))
          counts.axe++
          const listed = overlays[component]
          const overlay = component === 'accordion' && !await section.locator('[aria-expanded="false"][aria-controls]').count()
            ? undefined
            : listed?.trigger && !await listed.trigger(section).count() ? undefined : listed
          const isBaseToast = component === 'toast' && edition === 'base'
          if (overlay || isBaseToast) {
            const trigger = isBaseToast ? section.getByRole('button', { name: 'Show notification' })
              : component === 'accordion' ? section.locator('[aria-expanded="false"][aria-controls]').first()
              : overlay?.trigger ? overlay.trigger(section).first()
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
            } else if (overlay?.open === 'contextmenu') await trigger.click({ button: 'right' })
            else await trigger.click()
            if (component === 'accordion') await trigger.evaluate(element =>
              document.getElementById(element.getAttribute('aria-controls')!)?.setAttribute('data-audit-accordion-panel', ''))
            // The Base toast this section opened: earlier sections' toasts may still be on screen.
            const content = isBaseToast ? section.locator('[data-slot$="toast"]').first() : overlay!.content(page, section).first()
            await expect(content, `${component} opens`).toBeVisible()
            if (isBaseToast) { await pauseClock(page); paused = true }
            await content.evaluate((element, name) => element.setAttribute('data-audit-open', name), id)
            await page.screenshot({ path: path.join(shots, `${id}-open.png`), animations: 'disabled' })
            const inside = await content.evaluate((element, owner) => element.closest(`section[data-audit="${owner}"]`) !== null, id)
            record(await measure(page, [content], inside ? section : body, `${id}-open`, counts))
            record(await markTranslucent(page, await runAxe(page, [`[data-audit-open="${id}"]`])))
            counts.axe++
            // Overlays are the surfaces that carry backdrop filters: check them under forced colors while they are open.
            if (mode === 'light') {
              await markBorders([content])
              await page.emulateMedia({ forcedColors: 'active' })
              record(await findForcedColors([content], await listFocusables(content, `${id}-open-forced`)))
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
        // A family without an accessibility guarantee (liquid glass) is held to every check except contrast,
        // which depends on the backdrop behind it: its focus-contrast and axe color-contrast findings are
        // recorded and attached as advisory. Everything else fails it like any stable family.
        const caveat = familyAccessibilityCaveat(family) !== null && !transparency
        const advisory = caveat ? findings.filter(backdropDependent) : []
        const blocking = findings.filter(finding => !advisory.includes(finding))
        if (advisory.length)
          test.info().annotations.push({ type: 'contrast advisory findings', description: JSON.stringify(advisory) })
        const part = { runId: process.env.OMBELLE_SPECIMEN_RUN_ID, family, edition, mode, ...(transparency ? { transparency } : {}), specimens: new Set(components.map(id => id.split('~')[0])).size, sections: components.length, checks: counts, failures: blocking.length + errors.length,
          contrastAdvisoryFindings: advisory.length,
          browser: { engine: 'chromium', version: browser.version(), channel: process.env.OMBELLE_BROWSER_CHANNEL || 'bundled' } }
        // A run limited to some components writes its findings apart and leaves the evidence file alone.
        // A font or family run is never the standard evidence either.
        const partial = specimenRunIsPartial()
        const partsDirectory = path.join(artifacts, partial ? 'partial' : 'parts')
        await fs.mkdir(partsDirectory, { recursive: true })
        const name = `${family}-${edition}-${mode}${transparency ? '-reduced-transparency' : ''}`
        if (!partial) await fs.writeFile(path.join(partsDirectory, `${name}.json`), JSON.stringify(part, null, 2) + '\n')
        const fontTag = auditFonts ? '.' + auditFonts.replaceAll(',', '_') : ''
        await fs.writeFile(path.join(partsDirectory, `${name}${fontTag}.findings.json`), JSON.stringify(findings, null, 2) + '\n')
        expect(new Set(components.map(id => id.split('~')[0]))).toHaveProperty('size', onlyComponents?.length ? onlyComponents.length : supportedComponentIds.length)
        expect(errors, 'page errors').toEqual([])
        expect(blocking, JSON.stringify(blocking, null, 2)).toEqual([])
      })

// Parts are merged once, after every worker, in specimen-audit.teardown.ts.

// The page is the measurement surface: it must match what an install renders. One shard runs it.
if ((specimenShard()?.current ?? 1) === 1) test('audit pages draw the glass backdrop and lay specimens out in normal flow', async ({ page }) => {
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
