import { expect, test, type Page } from '@playwright/test'
import { createPresetDraft, setPresetEdit } from '../../apps/www/src/preset-editor/model.js'
import { segment, waitForCompiled } from '../helpers/preset-editor-ui.js'
import { arrowTo, tabTo } from '../helpers/keyboard-focus.js'

// The editor sends the preview its tokens as it handles the input; the iframe derives the CSS itself.
// These cases check that path end to end: first paint of a restored draft, speed with the compiler worker
// blocked, an unusable value, Liquid Glass (which keeps the full path) and the keyboard.
test.use({ viewport: { width: 1280, height: 800 } })

const url = 'http://127.0.0.1:3000/editor/preset?page=gallery'
const draftKey = 'ombelle:preset-editor:draft:v1'
const frame = (page: Page) => page.locator('iframe[title="Global preset gallery"]').contentFrame()
const radiusField = (page: Page) => page.getByLabel('Corner radius', { exact: true })
const status = (page: Page) => page.getByTestId('preset-preview-status')
const buttonRadius = (page: Page) =>
  frame(page).getByTestId('preset-button').evaluate((element) => getComputedStyle(element).borderTopLeftRadius)
async function previewReady(page: Page) {
  await expect(status(page)).toHaveText('Preview ready', { timeout: 30000 })
}
async function ready(page: Page) {
  await waitForCompiled(page)
  await previewReady(page)
}
async function restoreDraft(page: Page, radius: string, family: Parameters<typeof createPresetDraft>[0] = 'flat') {
  const draft = setPresetEdit(createPresetDraft(family), '/design/radiusRem', radius)
  await page.addInitScript(([key, value]) => localStorage.setItem(key, value), [draftKey, JSON.stringify(draft)])
}
/** Stops the compiler worker from ever answering; the preview must not depend on it. */
async function blockWorker(page: Page) {
  let blocked = 0
  await page.route('**/preset-compiler.worker.js*', () => {
    blocked++
    // Never fulfilled, never continued.
  })
  return () => blocked
}

// Records, inside the preview iframe, the first radius the Save changes button is ever painted with, and the
// time (absolute clock) at which its radius first differs from the one it had at the editor's input.
async function watchFrame(page: Page) {
  await page.addInitScript(() => {
    if (window === window.top) return
    const probe = ((window as any).__probe = { first: null as string | null, since: 0, from: '', changedAt: 0 })
    const tick = () => {
      const button = document.querySelector('[data-testid="preset-button"]')
      if (button) {
        const radius = getComputedStyle(button).borderTopLeftRadius
        probe.first ??= radius
        if (probe.since && !probe.changedAt && radius !== probe.from) probe.changedAt = performance.timeOrigin + performance.now()
      }
      requestAnimationFrame(tick)
    }
    requestAnimationFrame(tick)
    // A hidden frame (the phone's Customize pane) never runs animation frames, so the style change itself is observed.
    const check = () => {
      const button = document.querySelector('[data-testid="preset-button"]')
      if (!button || !probe.since || probe.changedAt) return
      if (getComputedStyle(button).borderTopLeftRadius !== probe.from) probe.changedAt = performance.timeOrigin + performance.now()
    }
    new MutationObserver(check).observe(document, { subtree: true, childList: true, characterData: true, attributes: true })
    window.addEventListener('message', (event) => {
      if (event.data?.type === 'ombelle-probe-arm') {
        const button = document.querySelector('[data-testid="preset-button"]')
        probe.from = button ? getComputedStyle(button).borderTopLeftRadius : ''
        probe.since = 1
        probe.changedAt = 0
      }
    })
  })
}
const firstRadius = (page: Page) => frame(page).locator('html').evaluate(() => (window as any).__probe.first as string | null)

/** Fills the radius field and returns how long the iframe took to paint a different radius, in ms. */
async function editRadiusAndTime(page: Page, value: string) {
  // The probe's baseline is read in the iframe itself, which a message tells to start watching.
  await frame(page).locator('html').evaluate(() => window.postMessage({ type: 'ombelle-probe-arm' }, '*'))
  await page.evaluate(() => {
    const w = window as any
    w.__inputAt = 0
    document.addEventListener('input', () => (w.__inputAt ||= performance.timeOrigin + performance.now()), { capture: true, once: true })
  })
  await radiusField(page).fill(value)
  await expect
    .poll(() => frame(page).locator('html').evaluate(() => (window as any).__probe.changedAt as number), { timeout: 5000 })
    .toBeGreaterThan(0)
  const [inputAt, changedAt] = await Promise.all([
    page.evaluate(() => (window as any).__inputAt as number),
    frame(page).locator('html').evaluate(() => (window as any).__probe.changedAt as number),
  ])
  return changedAt - inputAt
}

test('paints a restored draft radius on the first frame, not the family default', async ({ page }) => {
  await watchFrame(page)
  await restoreDraft(page, '1.5')
  await page.goto(url)
  await ready(page)
  const settled = await buttonRadius(page)
  expect(await firstRadius(page)).toBe(settled)
  // 1.5 rem is not what the Flat family starts with.
  await radiusField(page).fill('0')
  await expect.poll(() => buttonRadius(page)).not.toBe(settled)
})

test('applies a radius edit within 200 ms while the compiler worker is blocked', async ({ page }) => {
  const blocked = await blockWorker(page)
  await watchFrame(page)
  await restoreDraft(page, '0.5')
  await page.goto(url)
  // The compiler never answers, so only the token message can render the preview.
  await expect(frame(page).getByTestId('preset-button')).toBeVisible({ timeout: 30000 })
  await expect.poll(blocked).toBeGreaterThan(0)
  const before = await buttonRadius(page)
  const elapsed = await editRadiusAndTime(page, '1.5')
  expect(elapsed).toBeGreaterThanOrEqual(0)
  expect(elapsed).toBeLessThan(200)
  expect(await buttonRadius(page)).not.toBe(before)
})

test('keeps the previous radius and says so when the radius is empty', async ({ page }) => {
  await restoreDraft(page, '0.5')
  await page.goto(url)
  await ready(page)
  const valid = await buttonRadius(page)
  await radiusField(page).fill('')
  await expect(page.getByText('Previous valid preview')).toBeVisible()
  expect(await buttonRadius(page)).toBe(valid)
  await radiusField(page).fill('1.5')
  await expect(page.getByText('Previous valid preview')).toHaveCount(0)
  await expect.poll(() => buttonRadius(page)).not.toBe(valid)
})

test('shows "Preview ready" only after the iframe DOM carries the edit', async ({ page }) => {
  await restoreDraft(page, '0.5')
  await page.goto(url)
  await ready(page)
  let previous = await buttonRadius(page)
  for (const value of ['1.5', '0.2', '1']) {
    await radiusField(page).fill(value)
    await previewReady(page)
    // The acknowledgement the editor waited for is only sent after the iframe rendered the tokens.
    const painted = await buttonRadius(page)
    expect(painted, `radius ${value} is in the DOM when the editor says ready`).not.toBe(previous)
    previous = painted
  }
})

test('Liquid Glass still renders through the full path', async ({ page }) => {
  await restoreDraft(page, '0.5', 'liquid-glass')
  await page.goto(url)
  await ready(page)
  await expect(frame(page).locator('html')).toHaveAttribute('data-preset-hash', /.+/)
  await expect(frame(page).getByTestId('preset-gallery')).toBeVisible()
  // The glass sheet comes from the compiler's result, so it is one sheet with the material rules.
  const sheets = await frame(page)
    .locator('style[data-preset-styles]')
    .evaluateAll((styles) => styles.map((style) => style.textContent ?? ''))
  expect(sheets).toHaveLength(1)
  expect(sheets[0]).toContain('backdrop-filter')
  // An edit reaches the preview through the compiler's result, so it only appears once the worker has answered.
  const before = await buttonRadius(page)
  await radiusField(page).fill('1.5')
  await ready(page)
  await expect.poll(() => buttonRadius(page)).not.toBe(before)
})

test('is reachable and operable by keyboard with a visible focus', async ({ page }) => {
  await restoreDraft(page, '0.5')
  await page.goto(url)
  await ready(page)
  await arrowTo(page, segment(page, 'Style family', 'Flat'))
  await tabTo(page, radiusField(page))
  await radiusField(page).fill('1')
  await previewReady(page)
  await arrowTo(page, segment(page, 'Preview page', 'Projects'))
  await page.keyboard.press('Space')
  await expect(frame(page).getByRole('heading', { name: 'Projects', level: 1 })).toBeVisible()
})

test.describe('phone viewport', () => {
  test.use({ viewport: { width: 375, height: 812 } })
  test('applies a radius edit within 200 ms while the compiler worker is blocked', async ({ page }) => {
    const blocked = await blockWorker(page)
    await watchFrame(page)
    await restoreDraft(page, '0.5')
    await page.goto(url)
    // The phone shows the preview in its own pane; while Customize is open the frame is hidden but still applies tokens.
    await expect(frame(page).getByTestId('preset-button')).toBeAttached({ timeout: 30000 })
    await expect.poll(blocked).toBeGreaterThan(0)
    const before = await buttonRadius(page)
    const elapsed = await editRadiusAndTime(page, '1.5')
    expect(elapsed).toBeGreaterThanOrEqual(0)
    expect(elapsed).toBeLessThan(200)
    expect(await buttonRadius(page)).not.toBe(before)
    await page.getByRole('navigation', { name: 'Preset editor panes' }).getByRole('radio', { name: /^Preview/ }).click()
    await expect(frame(page).getByTestId('preset-button')).toBeVisible()
    expect(await buttonRadius(page)).not.toBe(before)
  })
})
