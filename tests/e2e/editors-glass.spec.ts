import { expect, test, type Page } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import type { StartingPresetId } from '@ombelle/catalog'
import { catalogDraftKey, catalogPresetRef, createCatalogDraft } from '../../apps/www/src/editor/catalog-draft.js'
import { applyStartingPreset, createPresetDraft, materializePreset, setPresetEdit, type PresetEditablePath } from '../../apps/www/src/preset-editor/model.js'
import { pickGlassScene } from '../../apps/www/src/site/glass-backdrops.js'
import { glassBackdropOptions } from '../../apps/www/src/site/glass-presets.js'
import { segment } from '../helpers/preset-editor-ui.js'

const presetKey = 'ombelle:preset-editor:draft:v1'
const sceneName = (value: string) => glassBackdropOptions.find((option) => option.value === value)!.label
const backdropRadios = (page: Page) => page.getByRole('radiogroup', { name: 'Preview backdrop', exact: true }).getByRole('radio')
const autoRadio = (page: Page) => backdropRadios(page).filter({ hasText: '(auto)' })
const gallery = (page: Page) => page.locator('iframe[title="Global preset gallery"]').contentFrame()
const cristal = () => applyStartingPreset(createPresetDraft('liquid-glass'), 'builtin-liquid-glass-cristal')

async function seed(page: Page, entries: [string, string][]) {
  await page.addInitScript((drafts) => {
    if (location.origin !== 'http://127.0.0.1:3000') return
    for (const [key, value] of drafts) localStorage.setItem(key, value)
  }, entries)
}

async function openPresetEditor(page: Page, draft = cristal()) {
  await seed(page, [[presetKey, JSON.stringify(draft)]])
  await page.goto('http://127.0.0.1:3000/editor/preset?page=gallery')
  await expect(page.getByTestId('preset-preview-status')).toHaveText('Preview ready', { timeout: 60000 })
}

const cardStyle = (page: Page) => gallery(page).locator("[data-slot='card']").first().evaluate((element) => {
  const style = getComputedStyle(element)
  return { filter: style.backdropFilter, background: style.backgroundColor }
})

test('backdrop menu names each scene with its ratio', async ({ page }) => {
  await openPresetEditor(page)
  const names = await backdropRadios(page).allTextContents()
  expect(names).toHaveLength(glassBackdropOptions.length)
  for (const name of names) expect(name).toMatch(/, \d+\.\d:1/)
  await expect(autoRadio(page)).toHaveCount(1)
  await expect(autoRadio(page)).toContainText(sceneName('mist'))
})

test('auto follows an edit that makes the text less readable', async ({ page }) => {
  let draft = cristal()
  const inverted = { foreground: '#f5f5f5', cardForeground: '#f5f5f5', popoverForeground: '#f5f5f5', mutedForeground: '#d4d4d4',
    secondaryForeground: '#f5f5f5', card: '#151515', popover: '#151515', background: '#151515', muted: '#262626', secondary: '#262626' }
  for (const [key, value] of Object.entries(inverted)) draft = setPresetEdit(draft, `/modes/light/${key}` as PresetEditablePath, value)
  const expected = pickGlassScene(materializePreset(draft), 'light', 'builtin-liquid-glass-cristal')
  expect(expected).not.toBe('mist')
  await openPresetEditor(page, draft)
  await expect(autoRadio(page)).toContainText(sceneName(expected))
  await expect(autoRadio(page)).toHaveAttribute('aria-checked', 'true')
})

test('a manual choice survives an edit and resets on a new starting preset', async ({ page }) => {
  await openPresetEditor(page)
  await backdropRadios(page).filter({ hasText: /^Nuit,/ }).click()
  await page.getByLabel('Corner radius', { exact: true }).fill('0.25')
  await expect(backdropRadios(page).filter({ hasText: /^Nuit,/ })).toHaveAttribute('aria-checked', 'true')
  // Undoing the edit matches Cristal again, but the starting preset never changed.
  await page.getByRole('button', { name: 'Undo', exact: true }).click()
  await expect(page.getByLabel('Corner radius', { exact: true })).not.toHaveValue('0.25')
  await expect(backdropRadios(page).filter({ hasText: /^Nuit,/ })).toHaveAttribute('aria-checked', 'true')
  await page.locator('[data-preset="builtin-liquid-glass-givre"]').click()
  await expect(autoRadio(page)).toHaveAttribute('aria-checked', 'true')
})

test('an unedited lab preset gets the dark lab ink on its own scene only', async ({ page }) => {
  await openPresetEditor(page, applyStartingPreset(createPresetDraft('liquid-glass'), 'builtin-liquid-glass-givre'))
  await segment(page, 'Preview mode', 'Dark').click()
  const root = gallery(page).locator('html')
  await expect(root).toHaveAttribute('data-glass-backdrop', 'night')
  await expect(root).toHaveAttribute('data-glass-lab-ink', 'dark')
  await expect(gallery(page).locator("[data-slot='card']").first()).toHaveCSS('-webkit-text-stroke-width', '0px')
  const results = await new AxeBuilder({ page })
    .include(['iframe[title="Global preset gallery"]', "[data-slot='card']"])
    .withRules(['color-contrast']).analyze()
  expect(results.violations.flatMap((violation) => violation.nodes.map((node) => node.target.join(' ')))).toEqual([])
  await backdropRadios(page).filter({ hasText: /^Brume,/ }).click()
  await expect(root).not.toHaveAttribute('data-glass-lab-ink', /.*/)
})

test('the transparency toggle makes the glass opaque and back', async ({ page }) => {
  await openPresetEditor(page)
  const auto = await cardStyle(page)
  expect(auto.filter).not.toBe('none')
  await segment(page, 'Preview transparency', 'Reduced').click()
  await expect(gallery(page).locator('html')).toHaveAttribute('data-reduced-transparency', '')
  const toggled = await cardStyle(page)
  expect(toggled.filter).toBe('none')
  expect(toggled.background).toMatch(/^rgb\(/)
  await segment(page, 'Preview transparency', 'Auto').click()
  await expect(gallery(page).locator('html')).not.toHaveAttribute('data-reduced-transparency', /.*/)
  expect(await cardStyle(page)).toEqual(auto)
})

// Chromium's CDP media emulation reaches matchMedia in the sandboxed editor preview but not
// its cascade, so the parity check runs on the top-level audit page: the mirror on one page,
// the emulated preference on another, compared on every slot.
for (const mode of ['light', 'dark'] as const) test(`the mirror matches the emulated preference on every glass slot in ${mode} mode`, async ({ browser }) => {
  const url = `http://127.0.0.1:4173/audit/liquid-glass/radix/?mode=${mode}`
  const slots = (page: Page) => page.locator('[data-slot]').evaluateAll((elements) => elements.map((element) => {
    const style = getComputedStyle(element)
    return [element.getAttribute('data-slot'), style.backdropFilter, style.backgroundColor, style.backgroundImage].join(' | ')
  }))
  const mirrored = await browser.newPage()
  await mirrored.goto(url)
  await expect(mirrored.locator("[data-slot='recipe-card']").first()).toBeVisible({ timeout: 60000 })
  await mirrored.evaluate(async () => {
    const path = '/src/reduced-transparency-mirror.ts'
    const { startReducedTransparencyMirror } = await import(/* @vite-ignore */ path)
    startReducedTransparencyMirror(document)
    document.documentElement.setAttribute('data-reduced-transparency', '')
    await new Promise((resolve) => setTimeout(resolve, 100))
  })
  const emulated = await browser.newPage()
  const cdp = await emulated.context().newCDPSession(emulated)
  await cdp.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-transparency', value: 'reduce' }] })
  await emulated.goto(url)
  await expect(emulated.locator("[data-slot='recipe-card']").first()).toBeVisible({ timeout: 60000 })
  expect(await emulated.evaluate(() => matchMedia('(prefers-reduced-transparency: reduce)').matches)).toBe(true)
  const expected = await slots(emulated)
  expect(expected.some((row) => row.includes(' | none | '))).toBe(true)
  expect(await slots(mirrored)).toEqual(expected)
})

// Every copy sits in an @media all block and names the attribute; the same CSS
// recompiled must hold the same number of copies, never one more per recompile.
const mirrorCopies = (page: Page) => gallery(page).locator('html').evaluate(() => {
  let count = 0
  const walk = (list: CSSRuleList) => {
    for (const rule of Array.from(list)) {
      if (rule instanceof CSSMediaRule && rule.conditionText === 'all' && rule.cssText.includes('data-reduced-transparency]')) count++
      else if ('cssRules' in rule) walk((rule as CSSGroupingRule).cssRules)
    }
  }
  for (const sheet of Array.from(document.styleSheets)) { try { walk(sheet.cssRules) } catch { /* cross-origin */ } }
  return count
})

test('the mirror copies each rule once across recompiles', async ({ page }) => {
  await openPresetEditor(page)
  await segment(page, 'Preview transparency', 'Reduced').click()
  await expect(gallery(page).locator('html')).toHaveAttribute('data-reduced-transparency', '')
  const first = await mirrorCopies(page)
  expect(first).toBeGreaterThan(0)
  for (const radius of ['0.3', '0.4', '0.5']) {
    await page.getByLabel('Corner radius', { exact: true }).fill(radius)
    await expect(page.getByTestId('preset-preview-status')).toHaveText('Preview ready', { timeout: 60000 })
  }
  await expect.poll(() => mirrorCopies(page)).toBe(first)
})

test('leaving glass removes the attribute and the toggle', async ({ page }) => {
  await openPresetEditor(page)
  await segment(page, 'Preview transparency', 'Reduced').click()
  await expect(gallery(page).locator('html')).toHaveAttribute('data-reduced-transparency', '')
  await segment(page, 'Style family', 'Flat').click()
  await page.getByRole('button', { name: 'Confirm change', exact: true }).click()
  await expect(gallery(page).locator('html')).not.toHaveAttribute('data-backdrop', /.*/, { timeout: 60000 })
  await expect(gallery(page).locator('html')).not.toHaveAttribute('data-reduced-transparency', /.*/)
  await expect(page.getByRole('radiogroup', { name: 'Preview transparency', exact: true })).toHaveCount(0)
})

for (const [path, title] of [['card', 'Card recipe preview'], ['button', 'Button recipe preview']] as const)
  test(`the ${path} editor offers the toggle in glass only`, async ({ page }) => {
    const glass: StartingPresetId = 'builtin-liquid-glass-cristal'
    if (path === 'card') {
      const recipe = { ...createCatalogDraft('card').recipe, presetRef: catalogPresetRef('liquid-glass', glass) }
      await seed(page, [[catalogDraftKey('card'), JSON.stringify({ storageVersion: 1, recipe })]])
    }
    await page.goto(`http://127.0.0.1:3000/editor/component/${path}`)
    const family = (name: RegExp) => page.getByRole('radiogroup', { name: 'Style family', exact: true }).getByRole('radio', { name })
    if (path === 'button') await family(/^Liquid glass/).click()
    const toggle = page.getByRole('radiogroup', { name: 'Preview transparency', exact: true })
    await expect(toggle).toHaveCount(1)
    await toggle.getByRole('radio', { name: 'Reduced', exact: true }).click()
    const root = page.locator(`iframe[title="${title}"]`).contentFrame().locator('html')
    await expect(root).toHaveAttribute('data-reduced-transparency', '')
    await family(/^Flat/).click()
    await expect(toggle).toHaveCount(0)
    await expect(root).not.toHaveAttribute('data-reduced-transparency', /.*/)
  })
