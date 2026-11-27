// What the specimen audit does to a block beyond measuring it at rest: the steps that put each
// overlay on screen, and the layout facts a block promises at 320px, 768px and desktop width.
import { expect, type Locator, type Page } from '@playwright/test'
import type { BlockId } from '../../packages/contracts/src/index.js'

export type BlockAuditAction = {
  label: string
  /** Role-based steps that put the overlay on screen. */
  open: (section: Locator) => Promise<void>
  /** The overlay once open. An Alert shown inside the block is found inside the section. */
  overlay: (page: Page, section: Locator) => Locator
  /** How it closes before the next step; a notice closes on its own. */
  closes: 'escape' | 'timer' | 'none'
}

const exampleToast = (page: Page) => page.locator('[data-slot$="toast"]').filter({ hasText: 'Example only' })

/** Put a control mid-window before using it: a menu opened at the window's edge flips or clips, which is the window's doing, not the block's. */
const centre = async (control: Locator) => { await control.evaluate(element => element.scrollIntoView({ block: 'center', inline: 'nearest' })) }
/** Select a tab the way a keyboard does. A click leaves Radix's tab list holding focus when it is focused again later. */
const selectTab = async (tab: Locator) => { if (await tab.isVisible()) await tab.focus({ timeout: 10000 }) }
const rowMenu = (section: Locator) => section.getByRole('button', { name: /^Actions for / }).first()

export const blockAuditActions: Record<BlockId, BlockAuditAction[]> = {
  'login-01': [{
    label: 'submit the form, so the Alert shows',
    open: async section => {
      await section.getByRole('textbox', { name: /email/i }).fill('jordan@ombelle.dev', { timeout: 10000 })
      await section.locator('input[name="password"]').fill('example-password', { timeout: 10000 })
      await section.getByRole('button', { name: 'Sign in' }).click({ timeout: 10000 })
    },
    overlay: (_page, section) => section.locator('[data-block-part="notice"] [data-slot$="alert"]'),
    closes: 'none',
  }],
  'settings-01': [
    {
      label: 'Save, so the Toast shows',
      open: async section => {
        await selectTab(section.getByRole('tab', { name: 'Profile' }))
        await section.getByRole('button', { name: 'Save changes' }).click({ timeout: 10000 })
      },
      overlay: page => exampleToast(page),
      closes: 'timer',
    },
    {
      label: 'Delete account, so the Alert Dialog opens',
      open: async section => {
        // The tab names the panel from 768px; below that every panel is already on screen.
        await selectTab(section.getByRole('tab', { name: 'Danger zone' }))
        await section.getByRole('button', { name: 'Delete account' }).click({ timeout: 10000 })
      },
      overlay: page => page.getByRole('alertdialog'),
      closes: 'escape',
    },
  ],
  'pricing-01': [{
    label: 'a plan button, so the Toast shows',
    open: async section => { await section.getByRole('button', { name: /^Choose / }).first().click({ timeout: 10000 }) },
    overlay: page => exampleToast(page),
    closes: 'timer',
  }],
  'dashboard-01': [
    {
      label: 'a row menu opens',
      open: async section => {
        await centre(rowMenu(section))
        await rowMenu(section).click({ timeout: 10000 })
      },
      overlay: page => page.getByRole('menu'),
      closes: 'escape',
    },
    {
      label: 'an item is chosen, so the Toast shows',
      open: async section => {
        await centre(rowMenu(section))
        await rowMenu(section).click({ timeout: 10000 })
        await section.page().getByRole('menu').getByRole('menuitem').first().click({ timeout: 10000 })
      },
      overlay: page => exampleToast(page),
      closes: 'timer',
    },
  ],
}

type Visible = (locator: Locator) => Promise<Locator[]>
const visible: Visible = async locator => {
  const all = await locator.all()
  const shown: Locator[] = []
  for (const item of all) if (await item.isVisible()) shown.push(item)
  return shown
}

const columns = (locator: Locator) => locator.evaluate(element => getComputedStyle(element).gridTemplateColumns.split(' ').filter(Boolean).length)
const paddingTop = (section: Locator) => section.locator('[data-block]').first().evaluate(element => getComputedStyle(element).paddingBlockStart)

/**
 * Whether the block pushes the page sideways: something in it reaches past the window's right edge and is not
 * inside a box of its own that scrolls or clips (the activity table). The audit page also holds every component
 * specimen, so the document's own width is not the block's doing and is not what is measured.
 */
export async function blockScrollsPageSideways(section: Locator): Promise<string[]> {
  return section.evaluate(root => {
    const limit = document.documentElement.clientWidth + 1
    const own = (element: Element) => {
      for (let node = element.parentElement; node && node !== root.parentElement; node = node.parentElement) {
        const { overflowX } = getComputedStyle(node)
        if (['auto', 'scroll', 'hidden', 'clip'].includes(overflowX) && node.getBoundingClientRect().right <= limit) return true
      }
      return false
    }
    return [root, ...root.querySelectorAll('*')]
      .filter(element => element.getClientRects().length > 0 && element.getBoundingClientRect().right > limit && !own(element))
      .map(element => `${element.tagName.toLowerCase()}${element.getAttribute('data-block-part') ? `[${element.getAttribute('data-block-part')}]` : ''} reaches ${Math.round(element.getBoundingClientRect().right)}px`)
      .slice(0, 5)
  })
}

/**
 * The layout facts of a block at one viewport width. The page is already at that width.
 * Throws through expect, with the block and width in each message.
 */
export async function expectBlockLayout(page: Page, section: Locator, id: BlockId, width: number): Promise<void> {
  const where = `${id} at ${width}px`
  expect(await blockScrollsPageSideways(section), `${where}: the block pushes the page sideways`).toEqual([])
  const panels = await visible(section.locator('[role="tabpanel"]'))
  if (id === 'settings-01')
    // Tabs name one panel from 768px; below that the tab list is gone and all three panels stack.
    // The Base UI block follows the window width in an effect, so give it a moment after a resize.
    await expect.poll(async () => (await visible(section.locator('[role="tabpanel"], [data-block-part="panel"]'))).length,
      { message: `${where}: visible tab panels` }).toBe(width >= 768 ? 1 : 3)
  if (id === 'dashboard-01') {
    // One range panel shows at every width: the inactive one is hidden, in both editions.
    expect(panels.length, `${where}: visible range panels`).toBe(1)
    const stats = (await visible(section.locator('[data-block-part="stats"]')))[0]!
    expect(await columns(stats), `${where}: stat columns`).toBe(width >= 1024 ? 4 : width >= 768 ? 2 : 1)
    if (width <= 480) {
      // The activity table scrolls inside its own box, not the page.
      const scroller = await section.locator('table').first().evaluate(table => {
        for (let node = table.parentElement; node; node = node.parentElement) {
          const { overflowX } = getComputedStyle(node)
          if ((overflowX === 'auto' || overflowX === 'scroll') && node.scrollWidth > node.clientWidth) return true
          if (node.matches('section[data-audit]')) return false
        }
        return false
      })
      expect(scroller, `${where}: the activity table scrolls inside its own box`).toBe(true)
    }
  }
  if (id === 'pricing-01') {
    const plans = (await visible(section.locator('[data-block-part="plans"]')))[0]!
    expect(await columns(plans), `${where}: plan columns`).toBe(width >= 768 ? 3 : 1)
  }
}

/** The block switches to its desktop layout at 768px: one pixel either side differs. */
export async function expectBlockSwitchesAt768(page: Page, section: Locator, id: BlockId): Promise<void> {
  const height = page.viewportSize()!.height
  await page.setViewportSize({ width: 767, height })
  const narrow = await paddingTop(section)
  const tabList = id === 'settings-01' ? await section.getByRole('tablist').first().isVisible() : undefined
  await page.setViewportSize({ width: 768, height })
  const wide = await paddingTop(section)
  expect(wide, `${id}: block padding at 768px matches 767px`).not.toBe(narrow)
  // The grids change columns with the padding: one column at 767px, the desktop count at 768px.
  const grid = id === 'pricing-01' ? '[data-block-part="plans"]' : id === 'dashboard-01' ? '[data-block-part="stats"]' : undefined
  if (grid) {
    expect(await columns((await visible(section.locator(grid)))[0]!), `${id}: columns at 768px`).toBe(id === 'pricing-01' ? 3 : 2)
    await page.setViewportSize({ width: 767, height })
    expect(await columns((await visible(section.locator(grid)))[0]!), `${id}: columns at 767px`).toBe(1)
    await page.setViewportSize({ width: 768, height })
  }
  if (id === 'settings-01') {
    expect(tabList, `${id}: tab list at 767px`).toBe(false)
    expect(await section.getByRole('tablist').first().isVisible(), `${id}: tab list at 768px`).toBe(true)
  }
}

/** login-01's notice region: empty, it takes no room; after a submit, the Alert is inside it. */
export async function expectLoginNotice(section: Locator): Promise<void> {
  const notice = section.locator('[data-block-part="notice"]')
  await expect(notice, 'the notice region is a live region').toHaveAttribute('aria-live', 'polite')
  expect(await notice.locator('*').count(), 'the empty notice region has no content').toBe(0)
  const box = await notice.boundingBox()
  expect(box?.height ?? 0, 'the empty notice region has no height').toBe(0)
  const first = section.locator('[data-block-part="form"] [data-slot$="field"]').first()
  const gap = await first.evaluate((field, region) => field.getBoundingClientRect().top - region.getBoundingClientRect().top, await notice.elementHandle())
  expect(gap, 'the empty notice region adds no gap above the first field').toBe(0)
}

/**
 * Pricing plans side by side line up: every Choose button at one height at the bottom of its card, and the
 * Recommended badge apart from the plan name, on screen and in the name a screen reader reads.
 */
export async function expectPricingAligned(section: Locator): Promise<void> {
  const layout = await section.locator('[data-block-part="card"]').evaluateAll(cards => cards.map(card => {
    const button = card.querySelector('[data-block-part="choose"]')!.getBoundingClientRect()
    return { buttonTop: Math.round(button.top), belowButton: Math.round(card.getBoundingClientRect().bottom - button.bottom) }
  }))
  expect(new Set(layout.map(plan => plan.buttonTop)).size, `Choose buttons line up: ${JSON.stringify(layout)}`).toBe(1)
  expect(new Set(layout.map(plan => plan.belowButton)).size, `Choose buttons sit at the card bottom: ${JSON.stringify(layout)}`).toBe(1)
  const name = section.locator('[data-highlighted] [data-block-part="plan-name"]')
  const gap = await name.evaluate(heading => {
    const range = document.createRange()
    range.selectNodeContents(heading.firstChild!)
    return heading.querySelector('[data-slot$="badge"]')!.getBoundingClientRect().left - range.getBoundingClientRect().right
  })
  expect(gap, 'the badge keeps a gap after the plan name').toBeGreaterThanOrEqual(4)
  await expect(name, 'the plan name and badge read as two words').toHaveText(/\S \S/)
}

/** What a person typed survives the 768px breakpoint, in both directions (a phone turned on its side). */
export async function expectSettingsKeepsInput(page: Page, section: Locator): Promise<void> {
  const height = page.viewportSize()!.height
  const width = page.viewportSize()!.width
  const field = section.getByRole('textbox').first()
  await field.fill('Typed before the resize', { timeout: 10000 })
  for (const next of [320, width])
    await expect.poll(async () => {
      await page.setViewportSize({ width: next, height })
      return field.inputValue()
    }, { message: `settings-01: typed text after resizing to ${next}px` }).toBe('Typed before the resize')
}
