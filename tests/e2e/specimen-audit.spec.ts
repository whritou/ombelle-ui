import fs from 'node:fs/promises'
import path from 'node:path'
import { expect, test, type Locator, type Page } from '@playwright/test'
import { familyAccessibilityCaveat, styleFamilies, supportedBlockIds, supportedComponentIds, type BlockId } from '../../packages/contracts/src/index.js'
import {
  checkFocusVisible, findClipping, findForcedColors, findOverflow, findSpacing, findTargetSize, installClock, listFocusables, markSurfaces, parkPointer, pauseClock, markBorders, runAxe,
  type AuditCheck, type Finding,
} from '../helpers/specimen-audit.js'
import { editions, modes, specimenArtifacts as artifacts, specimenRunIsPartial } from '../helpers/specimen-run.js'
import { inShard, specimenShard } from '../helpers/specimen-shard.js'
import { blockAuditActions, expectBlockLayout, expectBlockSwitchesAt768, expectLoginNotice, expectSettingsKeepsInput } from '../helpers/block-audit.js'

const isBlock = (id: string): id is BlockId => (supportedBlockIds as readonly string[]).includes(id)
// A block is page-sized: it is measured at a phone and at a desktop width, not in the specimen column.
const blockWidths = [1280, 320] as const

const checks: AuditCheck[] = ['overflow', 'clipping', 'spacing', 'focus-visible', 'target-size', 'forced-colors', 'axe']
// Contrast findings: a focus ring short of 3:1 and axe's color-contrast rule. A focus finding for any other
// reason (no focus, focus moved) is not one of them.
const contrastFinding = (finding: Finding) =>
  (finding.check === 'focus-visible' && finding.detail.includes(' focus pixels at 3:1 ')) ||
  (finding.check === 'axe' && finding.detail.startsWith('color-contrast:'))
// Liquid glass guarantees contrast on its surfaces only when they are opaque; text and rings on the bare page
// backdrop are outside its guarantee in every mode (docs/components/liquid-glass.md). So a contrast finding is
// advisory on a translucent surface or the bare backdrop, and with reduced transparency, which promises opaque
// surfaces, only on the bare backdrop. On an opaque surface it fails like any family (TST-07).
const advisoryFinding = (finding: Finding, reduced: boolean) =>
  contrastFinding(finding) && (finding.surface === 'backdrop' || (!reduced && finding.surface === 'translucent'))

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

/**
 * A pressed Toolbar item measured hovered, on purpose: its hover background once beat the pressed background and
 * left the pressed text at 1.21:1 (flat and neo-brutalism, dark). Axe runs on the hovered section, and the hovered
 * pressed item must keep a fill or ring that a hovered item that is not pressed does not have.
 */
async function auditPressedHover(page: Page, section: Locator, id: string, mode: (typeof modes)[number], counts: Record<AuditCheck, number>): Promise<Finding[]> {
  const items = section.locator('[data-slot$="toolbar-toggle-item"]').filter({ visible: true })
  const pressed = items.and(section.locator('[data-state="on"], [aria-pressed="true"]')).first()
  const unpressed = items.and(section.locator('[data-state="off"], [aria-pressed="false"]')).first()
  await expect(pressed, `${id}: a pressed toggle item is on screen`).toBeVisible()
  await expect(unpressed, `${id}: an unpressed toggle item is on screen`).toBeVisible()
  // The hovered fill and ring, without waiting for the colour transition. Text colour alone does not show a state.
  const hoverLook = async (item: Locator) => {
    await item.hover()
    return item.evaluate((element) => {
      element.getAnimations().forEach(animation => animation.finish())
      const style = getComputedStyle(element)
      return `background ${style.backgroundColor}, box-shadow ${style.boxShadow}`
    })
  }
  const hoveredOff = await hoverLook(unpressed)
  const hoveredOn = await hoverLook(pressed)
  const findings = await markSurfaces(page, await runAxe(page, [`section[data-audit="${id}"]`]))
  counts.axe++
  expect.soft(hoveredOn, `${id}: a hovered pressed item looks different from a hovered unpressed one`).not.toBe(hoveredOff)
  // Under forced colors the pressed item is Highlight with HighlightText; hovered, it must not lose its Highlight
  // fill and leave HighlightText on the plain button face. Measured once, with the light pass.
  if (mode === 'light') {
    await page.emulateMedia({ forcedColors: 'active' })
    const ratio = await pressed.evaluate((element) => {
      element.getAnimations().forEach(animation => animation.finish())
      const style = getComputedStyle(element)
      const channels = (value: string) => {
        const context = document.createElement('canvas').getContext('2d')!
        context.fillStyle = value
        context.fillRect(0, 0, 1, 1)
        return [...context.getImageData(0, 0, 1, 1).data].slice(0, 3)
      }
      const luminance = (value: string) => {
        const [r, g, b] = channels(value).map(channel => channel / 255).map(c => c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4)
        return 0.2126 * r! + 0.7152 * g! + 0.0722 * b!
      }
      const [light, dark] = [luminance(style.color), luminance(style.backgroundColor)].sort((a, b) => b - a)
      return (light! + 0.05) / (dark! + 0.05)
    })
    await page.emulateMedia({ forcedColors: 'none' })
    expect.soft(ratio, `${id}: a hovered pressed item keeps 4.5:1 text under forced colors`).toBeGreaterThanOrEqual(4.5)
  }
  await parkPointer(page)
  return findings
}

/**
 * The open list of a Native Select is drawn by the browser, outside the page, so axe and screenshots never see it.
 * Measure what drives it instead. Chromium paints each option's own background, else the select's background
 * (blended over white), else the canvas of the select's color-scheme, and writes the option's colour on it. A
 * minimalist select is transparent, so in dark mode its light text was drawn on a white list.
 */
async function auditOptionList(section: Locator, id: string): Promise<void> {
  const selects = section.locator('select[data-slot$="native-select"]:not([multiple])')
  expect(await selects.count(), `${id}: a Native Select is on screen`).toBeGreaterThan(0)
  for (const select of await selects.all()) {
    const options = await select.evaluate((element) => {
      const channels = (value: string) => {
        const context = document.createElement('canvas').getContext('2d')!
        context.fillStyle = value
        context.fillRect(0, 0, 1, 1)
        return [...context.getImageData(0, 0, 1, 1).data].map(channel => channel / 255)
      }
      const over = (top: number[], bottom: number[]) => top.slice(0, 3).map((channel, index) => channel * top[3]! + bottom[index]! * (1 - top[3]!)).concat(1)
      const luminance = (rgb: number[]) => {
        const [r, g, b] = rgb.slice(0, 3).map(c => c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4)
        return 0.2126 * r! + 0.7152 * g! + 0.0722 * b!
      }
      const selectStyle = getComputedStyle(element)
      // Chromium's list canvas: dark only when the select itself uses a dark color-scheme.
      const canvas = /\bdark\b/.test(selectStyle.colorScheme) && !/\blight\b/.test(selectStyle.colorScheme) ? [0.23, 0.23, 0.23, 1] : [1, 1, 1, 1]
      const selectFill = channels(selectStyle.backgroundColor)
      const list = selectFill[3]! > 0 ? over(selectFill, [1, 1, 1, 1]) : canvas
      return [...(element as HTMLSelectElement).options].map((option) => {
        const style = getComputedStyle(option)
        const fill = channels(style.backgroundColor)
        const background = fill[3]! > 0 ? over(fill, list) : list
        const text = over(channels(style.color), background)
        const [light, dark] = [luminance(text), luminance(background)].sort((a, b) => b - a)
        return { option: option.textContent!.trim(), ratio: (light! + 0.05) / (dark! + 0.05), color: style.color, background: style.backgroundColor, select: selectStyle.backgroundColor }
      })
    })
    for (const option of options)
      expect.soft(option.ratio, `${id}: option "${option.option}" in the open list is readable (${JSON.stringify(option)})`).toBeGreaterThanOrEqual(4.5)
  }
}

type BlockRun = {
  edition: (typeof editions)[number]; mode: (typeof modes)[number]; shots: string
  counts: Record<AuditCheck, number>; record: (id: string, list: Finding[]) => void
}

/**
 * Each block at 1280px and at 320px: every check on the block, then (at desktop width) each step that puts an
 * overlay on screen, with focus, contrast and axe run again on the overlay. The layout promises are asserted too.
 */
async function auditBlocks(page: Page, blocks: BlockId[], run: BlockRun): Promise<number> {
  if (!blocks.length) return 0
  const { edition, mode, shots, counts, record } = run
  const body = page.locator('body')
  const height = page.viewportSize()!.height
  const toasts = page.locator('[data-slot$="toast-viewport"]')
  const setToasts = (display: string) => toasts.evaluateAll((list, value) => list.forEach(element => { (element as HTMLElement).style.display = value }), display)
  let steps = 0
  for (const width of blockWidths) {
    await page.setViewportSize({ width, height })
    for (const id of blocks) {
      const section = page.locator(`section[data-audit="${id}"]`)
      const label = `${id}@${width}`
      // Components' toasts were measured already; their fixed viewports must not cover the block.
      await setToasts('none')
      await parkPointer(page)
      await section.scrollIntoViewIfNeeded()
      await expectBlockLayout(page, section, id, width)
      // Before the 1280px pass submits the form: later the Alert is in the region.
      if (id === 'login-01' && width === blockWidths[0]) await expectLoginNotice(section)
      if (id === 'settings-01' && width === blockWidths[0]) await expectSettingsKeepsInput(page, section)
      if (width === blockWidths[0]) await expectBlockSwitchesAt768(page, section, id)
      await page.setViewportSize({ width, height })
      await section.screenshot({ path: path.join(shots, `${id}-${width}.png`), animations: 'disabled' })
      // The page is the block's stop: a block fills it, so clipping is judged against the block itself.
      const findings: Finding[] = [...await findOverflow([section]), ...await findClipping([section], section), ...await findSpacing([section]), ...await findTargetSize([section])]
      counts.overflow++; counts.clipping++; counts.spacing++; counts['target-size']++
      for (const control of await listFocusables(section, label)) {
        findings.push(...await checkFocusVisible(page, control), ...await findClipping([control], section))
        counts['focus-visible']++
      }
      findings.push(...await markSurfaces(page, await runAxe(page, [`section[data-audit="${id}"]`])))
      counts.axe++
      record(label, findings)
      if (width !== blockWidths[0]) continue
      for (const action of blockAuditActions[id]) {
        const named = `${id}: ${action.label}`
        let paused = false, covered = false
        try {
          await setToasts('none')
          await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur())
          await action.open(section)
          // The block's own toast viewport is fixed to a corner and was hidden with the others; the other sections' stay hidden.
          await section.locator('[data-slot$="toast-viewport"]').evaluateAll(list => list.forEach(element => { (element as HTMLElement).style.display = '' }))
          const content = action.overlay(page, section).first()
          await expect(content, `${named}: the overlay is on screen`).toBeVisible()
          if (action.closes === 'timer') {
            await pauseClock(page); paused = true
            // A toast is always laid over something. Measure it over the plain page, as a component's toast is,
            // so what the ring is judged against is the toast's own doing and not the block under it.
            await section.locator('[data-block] > :not(:has([data-slot$="toast-viewport"]), [data-slot$="toast-viewport"])').evaluateAll(list => list.forEach(element => { (element as HTMLElement).style.visibility = 'hidden' }))
            covered = true
          }
          await content.evaluate((element, name) => element.setAttribute('data-audit-open', name), label)
          await page.screenshot({ path: path.join(shots, `${id}-${steps}-open.png`), animations: 'disabled' })
          const inside = await content.evaluate((element, owner) => element.closest(`section[data-audit="${owner}"]`) !== null, id)
          const overlayFindings = await measure(page, [content], inside ? section : body, `${label}-open-${steps}`, counts)
          overlayFindings.push(...await markSurfaces(page, await runAxe(page, [`[data-audit-open="${label}"]`])))
          counts.axe++
          if (mode === 'light') {
            await markBorders([content])
            await page.emulateMedia({ forcedColors: 'active' })
            overlayFindings.push(...await findForcedColors([content], await listFocusables(content, `${label}-forced-${steps}`)))
            counts['forced-colors']++
            await page.emulateMedia({ forcedColors: 'none' })
          }
          record(`${named} (${edition})`, overlayFindings)
          if (action.closes === 'escape') {
            await page.keyboard.press('Escape')
            await page.clock.runFor(500)
            await expect(content, `${named}: closes on Escape`).toBeHidden()
          }
        } finally {
          if (paused) await page.clock.resume()
          if (covered) await section.locator('[data-block] > :not(:has([data-slot$="toast-viewport"]), [data-slot$="toast-viewport"])').evaluateAll(list => list.forEach(element => { (element as HTMLElement).style.visibility = '' }))
        }
        steps++
      }
    }
  }
  await page.setViewportSize({ width: 1100, height })
  await setToasts('none')
  return steps
}

// Every configuration, in a fixed order: a shard takes its share by index, before any filter.
// Liquid glass is measured a second time with reduced transparency, the setting its accessibility
// caveat says restores the full guarantee: those configurations are held to every check, contrast included.
type Configuration = { family: (typeof styleFamilies)[number]; edition: (typeof editions)[number]; mode: (typeof modes)[number]; transparency?: 'reduced' }
const configurations: Configuration[] = [
  ...styleFamilies.flatMap(family => editions.flatMap(edition => modes.map(mode => ({ family, edition, mode })))),
  ...editions.flatMap(edition => modes.map(mode => ({ family: 'liquid-glass' as const, edition, mode, transparency: 'reduced' as const }))),
]
// Each configuration is two tests on its own page: the component specimens, then the blocks. Together they took
// up to 15.5 minutes for liquid-glass/base/light on a CI runner (Foundation run of 1.1.0, 26 November), over
// the 15-minute limit; apart, neither carries the other's time. The teardown merges the two halves into the
// configuration's one evidence row (specimens from one, blocks from the other), so a missing half fails the gate.
const configurationTimeout = 900000
const halves = ['components', 'blocks'] as const

for (const [index, { family, edition, mode, transparency }] of configurations.entries())
  if (inShard(index) && (!onlyFamilies || onlyFamilies.includes(family)))
    for (const half of halves)
      test(`${family}/${edition}/${mode}${transparency ? '/reduced-transparency' : ''}: every ${half === 'components' ? 'specimen' : 'block'} passes the measured checks`, async ({ page, browser }) => {
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
        const everySection = (await sections.evaluateAll(list => list.map(section => section.getAttribute('data-audit')!)))
          // A variant section is component~variant; the filter and the count go by component.
          .filter(id => !onlyComponents?.length || onlyComponents.includes(id.split('~')[0]!))
          .sort((a, b) => Number(b.split('~')[0] === 'toast') - Number(a.split('~')[0] === 'toast'))
        // Each half measures its own sections; blocks are measured at their own widths.
        const components = half === 'components' ? everySection.filter(id => !isBlock(id)) : []
        const blocks = half === 'blocks' ? everySection.filter(isBlock) : []
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
          // Every section is measured at rest: an earlier section's click must not leave the pointer over this one.
          await parkPointer(page)
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
          record(await markSurfaces(page, await runAxe(page, [`section[data-audit="${id}"]`])))
          counts.axe++
          // Recorded under its own name, so a finding says the pressed item was hovered.
          if (component === 'native-select') await auditOptionList(section, id)
          if (component === 'toolbar') findings.push(...(await auditPressedHover(page, section, id, mode, counts)).map(finding => ({ ...finding, component: `${id} (pressed item hovered)` })))
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
            record(await markSurfaces(page, await runAxe(page, [`[data-audit-open="${id}"]`])))
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
        await auditBlocks(page, blocks, { edition, mode, shots, counts, record: (id, list) => findings.push(...list.map(finding => ({ ...finding, component: id }))) })
        if (mode === 'light') {
          await markBorders([sections])
          await page.emulateMedia({ forcedColors: 'active' })
          for (const component of [...components, ...blocks]) {
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
        // A family without an accessibility guarantee (liquid glass) is held to every check; only contrast that
        // depends on what is behind it is recorded as advisory (see advisoryFinding) and bounded by the baseline.
        const caveat = familyAccessibilityCaveat(family) !== null
        const advisory = caveat ? findings.filter(finding => advisoryFinding(finding, Boolean(transparency))) : []
        const blocking = findings.filter(finding => !advisory.includes(finding))
        if (advisory.length)
          test.info().annotations.push({ type: 'contrast advisory findings', description: JSON.stringify(advisory) })
        const part = { runId: process.env.OMBELLE_SPECIMEN_RUN_ID, family, edition, mode, ...(transparency ? { transparency } : {}), half, specimens: new Set(components.map(id => id.split('~')[0])).size, blocks: blocks.length, sections: components.length + blocks.length, checks: counts, failures: blocking.length + errors.length,
          contrastAdvisoryFindings: advisory.length,
          browser: { engine: 'chromium', version: browser.version(), channel: process.env.OMBELLE_BROWSER_CHANNEL || 'bundled' } }
        // A run limited to some components writes its findings apart and leaves the evidence file alone.
        // A font or family run is never the standard evidence either.
        const partial = specimenRunIsPartial()
        const partsDirectory = path.join(artifacts, partial ? 'partial' : 'parts')
        await fs.mkdir(partsDirectory, { recursive: true })
        const name = `${family}-${edition}-${mode}${transparency ? '-reduced-transparency' : ''}`
        // One part per half: the teardown merges a configuration's two halves into its evidence row.
        if (!partial) await fs.writeFile(path.join(partsDirectory, `${name}.${half}.json`), JSON.stringify(part, null, 2) + '\n')
        const fontTag = auditFonts ? '.' + auditFonts.replaceAll(',', '_') : ''
        await fs.writeFile(path.join(partsDirectory, `${name}${fontTag}.${half}.findings.json`), JSON.stringify(findings, null, 2) + '\n')
        // Every component and every block has a section on the page.
        expect(new Set(everySection.map(id => id.split('~')[0]))).toHaveProperty('size', onlyComponents?.length ? onlyComponents.length : supportedComponentIds.length + supportedBlockIds.length)
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
