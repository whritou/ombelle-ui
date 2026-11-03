import { expect, type Locator, type Page } from '@playwright/test'

// Every focus stop in the host document must show a keyboard focus indicator.
// Focus inside a cross-origin preview frame reports the IFRAME as active and is
// checked by the component suites instead.
async function activeFocus(page: Page) {
  return page.evaluate(() => {
    const element = document.activeElement
    if (!element || element === document.body || element.tagName === 'IFRAME') return null
    const style = getComputedStyle(element)
    return {
      element: `${element.tagName.toLowerCase()}${element.id ? '#' + element.id : ''} ${element.getAttribute('aria-label') ?? element.textContent?.trim().slice(0, 40) ?? ''}`,
      focusVisible: element.matches(':focus-visible'),
      outlineStyle: style.outlineStyle,
      outlineWidth: Number.parseFloat(style.outlineWidth),
    }
  })
}

export async function expectVisibleFocus(page: Page) {
  const focus = await activeFocus(page)
  expect(focus, 'a host element has keyboard focus').not.toBeNull()
  expect(focus!.focusVisible, `${focus!.element} matches :focus-visible`).toBe(true)
  expect(focus!.outlineStyle, `${focus!.element} draws an outline`).not.toBe('none')
  expect(focus!.outlineWidth, `${focus!.element} outline width`).toBeGreaterThanOrEqual(2)
}

/** Presses Tab (or Shift+Tab) until `target` has focus, checking visible focus at every host stop. */
export async function tabTo(page: Page, target: Locator, { backward = false, max = 120 } = {}) {
  for (let presses = 0; presses <= max; presses++) {
    if (await target.evaluate((element) => element === document.activeElement)) {
      await expectVisibleFocus(page)
      return
    }
    if (presses > 0 && await activeFocus(page)) await expectVisibleFocus(page)
    await page.keyboard.press(backward ? 'Shift+Tab' : 'Tab')
  }
  throw new Error(`Focus did not reach the target within ${max} ${backward ? 'Shift+Tab' : 'Tab'} presses.`)
}
