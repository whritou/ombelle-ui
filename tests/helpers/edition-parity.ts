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
export async function slotStyles(section: Locator): Promise<SlotStyles> {
  return section.locator('[data-slot]').evaluateAll(
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
