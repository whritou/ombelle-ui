import type { Locator, Page } from '@playwright/test'
import type { ComponentId } from '../../packages/contracts/src/component-ids.js'

export type ParityState = {
  name: string
  /** Puts the section into the state; the section is the [data-parity] element. */
  act?: (page: Page, section: Locator) => Promise<void>
}
/** Tabs from the section's start button and checks focus reached the element. */
export const focusFirst =
  (selector: string): ParityState['act'] =>
  async (page, section) => {
    await section.locator('[data-parity-start]').focus()
    await page.keyboard.press('Tab')
    await section
      .locator(selector)
      .first()
      .evaluate((el) => {
        if (document.activeElement !== el)
          throw new Error('Tab did not reach ' + el.outerHTML.slice(0, 80))
      })
  }
/**
 * A held key press: Radix moves roving focus in a timeout after keydown and
 * only selects while the arrow key is still down, as with a real keystroke.
 */
export async function holdKey(page: Page, key: string) {
  await page.keyboard.down(key)
  await page.waitForTimeout(50)
  await page.keyboard.up(key)
}
export const hoverFirst =
  (selector: string): ParityState['act'] =>
  async (_page, section) => {
    await section.locator(selector).first().hover()
  }
export const clickFirst =
  (selector: string): ParityState['act'] =>
  async (_page, section) => {
    await section.locator(selector).first().click()
  }

/** Ported components and the states the parity test drives them through. */
export const portedComponents: readonly {
  id: ComponentId
  states: readonly ParityState[]
  /** Slots rendered in a portal, outside the section, compared after it. */
  portal?: string
}[] = [
  {
    id: 'button',
    states: [
      { name: 'default' },
      { name: 'hover', act: hoverFirst("[data-slot='button']") },
      { name: 'focus-visible', act: focusFirst("[data-slot='button']") },
    ],
  },
  { id: 'separator', states: [{ name: 'default' }] },
  { id: 'progress', states: [{ name: 'default' }] },
  { id: 'avatar', states: [{ name: 'default' }] },
  {
    id: 'dialog',
    portal: "[data-slot='dialog-overlay'], [data-slot='dialog-content'], [data-slot='dialog-content'] [data-slot]",
    states: [
      { name: 'closed' },
      { name: 'click open', act: async (page, section) => { await section.locator("[data-slot='button']").click(); await page.locator("[data-slot='dialog-content']").waitFor() } },
      { name: 'keyboard open', act: async (page, section) => { await focusFirst("[data-slot='button']")!(page, section); await page.keyboard.press('Enter'); await page.locator("[data-slot='dialog-content']").waitFor() } },
      { name: 'tab inside', act: async (page, section) => { await section.locator("[data-slot='button']").click(); await page.locator("[data-slot='dialog-content']").waitFor(); await page.keyboard.press('Tab') } },
      { name: 'escape closes', act: async (page, section) => { await section.locator("[data-slot='button']").click(); await page.locator("[data-slot='dialog-content']").waitFor(); await page.keyboard.press('Escape'); await page.locator("[data-slot='dialog-content']").waitFor({ state: 'detached' }) } },
    ],
  },
  {
    id: 'popover',
    portal: "[data-slot='popover-content'], [data-slot='popover-content'] [data-slot]",
    states: [
      { name: 'closed' },
      { name: 'hover', act: hoverFirst("[data-slot='popover-trigger']") },
      { name: 'click open', act: async (page, section) => { await section.locator("[data-slot='popover-trigger']").click(); await page.locator("[data-slot='popover-content']").waitFor() } },
      { name: 'keyboard open', act: async (page, section) => { await focusFirst("[data-slot='popover-trigger']")!(page, section); await page.keyboard.press('Enter'); await page.locator("[data-slot='popover-content']").waitFor() } },
      { name: 'escape closes', act: async (page, section) => { await section.locator("[data-slot='popover-trigger']").click(); await page.locator("[data-slot='popover-content']").waitFor(); await page.keyboard.press('Escape'); await page.locator("[data-slot='popover-content']").waitFor({ state: 'detached' }) } },
    ],
  },
  {
    id: 'tooltip',
    portal: "[data-slot='tooltip-content'], [data-slot='tooltip-arrow']",
    states: [
      { name: 'closed' },
      // Scroll first, then focus, as tests/e2e/tooltip.spec.ts does: Radix closes
      // a tooltip when the page scrolls, so focusing an off-screen trigger would
      // open and immediately close it.
      { name: 'focus open', act: async (page, section) => { const trigger = section.locator("[data-slot='tooltip-trigger']"); await trigger.scrollIntoViewIfNeeded(); await page.evaluate(() => new Promise(requestAnimationFrame)); await trigger.focus(); await page.locator("[data-slot='tooltip-content']").waitFor() } },
      { name: 'hover open', act: async (page, section) => { await hoverFirst("[data-slot='tooltip-trigger']")!(page, section); await page.locator("[data-slot='tooltip-content']").waitFor() } },
    ],
  },
  {
    id: 'accordion',
    states: [
      { name: 'default' },
      { name: 'open second', act: async (page, section) => { await section.locator("[data-slot='accordion-trigger']").nth(1).click(); await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur()) } },
      { name: 'collapse first', act: async (page, section) => { await section.locator("[data-slot='accordion-trigger']").first().click(); await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur()) } },
      { name: 'hover', act: hoverFirst("[data-slot='accordion-trigger']") },
      { name: 'focus-visible', act: focusFirst("[data-slot='accordion-trigger']") },
      { name: 'keyboard', act: async (page, section) => { await focusFirst("[data-slot='accordion-trigger']")!(page, section); await holdKey(page, 'ArrowDown'); await page.keyboard.press('Enter') } },
    ],
  },
  {
    id: 'tabs',
    states: [
      { name: 'default' },
      // Radix focuses a clicked tab programmatically, which Chromium shows as
      // :focus-visible; Base UI does not. Blur to compare the selected styling;
      // docs/components/tabs.md records the focus-ring difference.
      { name: 'click second', act: async (page, section) => { await section.locator("[data-slot='tabs-trigger']").nth(1).click(); await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur()) } },
      { name: 'hover', act: async (_page, section) => { await section.locator("[data-slot='tabs-trigger']").nth(1).hover() } },
      { name: 'focus-visible', act: focusFirst("[data-slot='tabs-trigger']") },
      { name: 'arrow key', act: async (page, section) => { await focusFirst("[data-slot='tabs-trigger']")!(page, section); await holdKey(page, 'ArrowRight') } },
    ],
  },
  {
    id: 'radio-group',
    states: [
      { name: 'default' },
      { name: 'select first', act: clickFirst("[data-slot='radio-group-item']") },
      { name: 'hover', act: hoverFirst("[data-slot='radio-group-option']") },
      { name: 'focus-visible', act: async (page, section) => { await section.locator('[data-parity-start]').focus(); await page.keyboard.press('Tab') } },
      { name: 'arrow key', act: async (page, section) => { await section.locator('[data-parity-start]').focus(); await page.keyboard.press('Tab'); await holdKey(page, 'ArrowUp') } },
    ],
  },
  {
    id: 'checkbox',
    states: [
      { name: 'default' },
      { name: 'checked', act: clickFirst("[data-slot='checkbox']") },
      { name: 'indeterminate cleared', act: async (_page, section) => { await section.locator("[data-slot='checkbox']").nth(2).click() } },
      { name: 'hover', act: hoverFirst("[data-slot='checkbox']") },
      { name: 'focus-visible', act: focusFirst("[data-slot='checkbox']") },
    ],
  },
  {
    id: 'switch',
    states: [
      { name: 'default' },
      { name: 'toggled', act: clickFirst("[data-slot='switch']") },
      { name: 'hover', act: hoverFirst("[data-slot='switch']") },
      { name: 'focus-visible', act: focusFirst("[data-slot='switch']") },
      { name: 'keyboard toggle', act: async (page, section) => { await focusFirst("[data-slot='switch']")!(page, section); await page.keyboard.press('Space') } },
    ],
  },
]

/**
 * Expected edition differences with their reason, keyed
 * `<component>:<slot index>:<slot>:<property>`. Document every entry in the
 * component doc's Base UI section.
 */
export const allowedDifferences: Record<string, string> = {}

export const comparedProperties = [
  'color',
  'background-color',
  'background-image',
  'opacity',
  'visibility',
  'display',
  'border-top-width',
  'border-right-width',
  'border-bottom-width',
  'border-left-width',
  'border-top-color',
  'border-top-style',
  'border-top-left-radius',
  'border-bottom-right-radius',
  'box-shadow',
  'outline-style',
  'outline-width',
  'outline-color',
  'outline-offset',
  'padding-top',
  'padding-right',
  'padding-bottom',
  'padding-left',
  'width',
  'height',
  'font-family',
  'font-size',
  'font-weight',
  'line-height',
  'letter-spacing',
  'text-decoration-line',
  'transform',
  'cursor',
] as const

export type SlotStyles = { slot: string; styles: Record<string, string> }[]

/** Computed styles of every [data-slot] element inside a parity section, in DOM order. */
export async function slotStyles(
  section: Locator,
  portal?: string,
): Promise<SlotStyles> {
  // Read settled styles: the editions update state on different ticks, so a
  // running transition would compare intermediate values.
  await section.page().evaluate(async () => {
    await new Promise(requestAnimationFrame)
    await Promise.all(
      document.getAnimations().map((a) => a.finished.catch(() => undefined)),
    )
  })
  const read = (locator: Locator) => locator.evaluateAll(
    (elements, properties) =>
      elements.map((el) => {
        const style = getComputedStyle(el)
        return {
          slot: el.getAttribute('data-slot')!,
          styles: Object.fromEntries(
            properties.map((p) => [p, style.getPropertyValue(p)]),
          ),
        }
      }),
    [...comparedProperties] as string[],
  )
  const inside = await read(section.locator('[data-slot]'))
  if (!portal) return inside
  // Portal content lives under body, outside every parity section.
  return [
    ...inside,
    ...(await read(
      section.page().locator(':is(' + portal + '):not([data-parity] *)'),
    )),
  ]
}

/** Differences between editions as `<index>:<slot>:<property> radix → base` lines. */
export function compareSlotStyles(
  id: string,
  radix: SlotStyles,
  base: SlotStyles,
): string[] {
  const out: string[] = []
  const names = (list: SlotStyles) => list.map((entry) => entry.slot).join()
  if (names(radix) !== names(base))
    out.push('slots differ: ' + names(radix) + ' → ' + names(base))
  radix.forEach((r, i) => {
    const b = base[i]
    if (!b) return
    for (const p of comparedProperties)
      if (
        r.styles[p] !== b.styles[p] &&
        !allowedDifferences[id + ':' + i + ':' + r.slot + ':' + p]
      )
        out.push(i + ':' + r.slot + ':' + p + ' ' + r.styles[p] + ' → ' + b.styles[p])
  })
  return out
}

/** Data-slot (or tag) of the focused element after each Tab from the section start. */
export async function focusOrder(page: Page, section: Locator, steps = 30) {
  await page.bringToFront()
  await section.locator('[data-parity-start]').focus()
  const order: string[] = []
  for (let i = 0; i < steps; i++) {
    await page.keyboard.press('Tab')
    if (!(await section.evaluate((s) => s.contains(document.activeElement)))) break
    order.push(
      await page.evaluate(
        () =>
          document.activeElement?.getAttribute('data-slot') ??
          document.activeElement?.tagName ??
          '',
      ),
    )
  }
  return order
}
