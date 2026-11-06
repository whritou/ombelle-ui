import { expect, test, type Locator } from '@playwright/test'
import type { ComponentRecipe } from '@ombelle/contracts'
import { catalogDraftKey, catalogPresetRef } from '../../apps/www/src/editor/catalog-draft.js'
import { catalogRecipeFixtures } from '../helpers/catalog-recipe-fixtures.js'
import { withCatalogRecipeConsumer } from '../helpers/catalog-recipe-browser.js'

test('edits, reloads, and publishes a Badge recipe', async ({ page }) => {
  await page.goto('http://127.0.0.1:3000/editor/component/badge')
  const label = page.getByLabel('Label', { exact: true })
  await label.fill('Ready <now> & later')
  const specimen = page.frameLocator('iframe[title="Badge recipe preview"]').locator('[data-slot="recipe-badge"]')
  await expect(specimen).toHaveText('Ready <now> & later')
  await page.reload()
  await expect(label).toHaveValue('Ready <now> & later')
  await page.getByRole('button', { name: 'Get code', exact: true }).click()
  await page.getByRole('dialog', { name: 'Get code' }).getByTestId('get-code-reference').click()
  await expect(page.getByRole('heading', { name: 'Published Badge recipe' })).toBeVisible()
  await expect(specimen).toHaveText('Ready <now> & later')
})

const fields = {
  accordion: 'Heading', alert: 'Title', avatar: 'Fallback initials', card: 'Title',
  checkbox: 'Label', dialog: 'Trigger label', 'dropdown-menu': 'Trigger label',
  input: 'Label', label: 'Label', 'native-select': 'Label', popover: 'Trigger label',
  progress: 'Accessible label', 'radio-group': 'Group label', select: 'Label',
  separator: 'Label', skeleton: 'Loading region label', switch: 'Label',
  table: 'Caption', tabs: 'Label', textarea: 'Label', tooltip: 'Trigger label',
} as const

for (const [id, field] of Object.entries(fields)) test(`edits and restores ${id}`, async ({ page }) => {
  await page.goto(`http://127.0.0.1:3000/editor/component/${id}`)
  if (id === 'separator') await page.getByRole('checkbox', { name: 'Decorative' }).uncheck()
  const control = page.getByLabel(field, { exact: true }).first()
  const text = `Edited ${id}`
  await control.fill(text)
  await expect(page.getByRole('button', { name: 'Get code', exact: true })).toBeEnabled()
  const preview = page.locator('iframe[title$="recipe preview"]').contentFrame()
  if (id === 'dialog') await preview.getByRole('button', { name: text }).click()
  await expect(preview.locator('[data-ombelle-recipe][data-slot]').first()).toBeAttached()
  await page.getByRole('tab', { name: 'Component', exact: true }).click()
  await expect(page.getByRole('tabpanel')).toContainText(text)
  await page.reload()
  await expect(control).toHaveValue(text)
  if (id === 'card') {
    const appearance = page.getByRole('region', { name: 'Appearance' })
    const card = preview.locator('[data-slot="recipe-card"]')
    await appearance.getByLabel('Background', { exact: true }).fill('#123456')
    await appearance.getByLabel('Horizontal padding', { exact: true }).fill('24')
    await appearance.getByLabel('Border width', { exact: true }).fill('2')
    await expect(card).toHaveCSS('background-color', 'rgb(18, 52, 86)')
    await expect(card).toHaveCSS('padding-inline-start', '24px')
    await expect(card).toHaveCSS('border-top-width', '2px')
    await page.getByRole('group', { name: 'Preview mode' }).getByRole('button', { name: 'Dark' }).click()
    await expect(card).not.toHaveCSS('background-color', 'rgb(18, 52, 86)')
    await appearance.getByRole('group', { name: 'Color mode' }).getByRole('button', { name: 'Dark' }).click()
    await appearance.getByLabel('Background', { exact: true }).fill('#234567')
    await expect(card).toHaveCSS('background-color', 'rgb(35, 69, 103)')
    await page.getByRole('button', { name: /Liquid glass/ }).click()
    await page.getByLabel('Glass blur', { exact: true }).fill('17')
    await expect.poll(() => card.evaluate(element => getComputedStyle(element).getPropertyValue('--glass-blur').trim())).toBe('17px')
    await page.getByRole('tab', { name: 'CSS', exact: true }).click()
    await expect(page.getByRole('tabpanel')).toContainText('--glass-blur: 17px')
    await expect(page.getByRole('tabpanel')).toContainText('padding-inline: 24px')
    const tabs = page.getByRole('tablist', { name: 'Generated artifacts' })
    const space = await tabs.evaluate(element =>
      element.nextElementSibling!.getBoundingClientRect().top - element.getBoundingClientRect().bottom)
    expect(space).toBeGreaterThanOrEqual(8)
  }
  if (id === 'progress') {
    await page.getByRole('checkbox', { name: 'Indeterminate' }).check()
    const progress = preview.getByRole('progressbar', { name: text })
    await expect(progress).toHaveAttribute('data-state', 'indeterminate')
    await expect(progress).not.toHaveAttribute('aria-valuenow', /./)
  }
  if (id === 'tabs') {
    const selected = page.getByLabel('Initial selection')
    const initialId = await selected.inputValue()
    const first = page.getByRole('group', { name: 'Tabs 1', exact: true })
    await expect(first.getByRole('button', { name: 'Remove' })).toBeDisabled()
    await first.getByRole('button', { name: 'Move down' }).click()
    await expect(selected).toHaveValue(initialId)
    await expect(page.getByRole('group', { name: 'Tabs 2', exact: true }).getByRole('button', { name: 'Remove' })).toBeDisabled()
  }
})

async function appearance(parts: Locator) {
  return parts.evaluateAll(elements => elements.map(element => {
    const style = getComputedStyle(element)
    return {
      tag: element.tagName, text: element.textContent?.trim(),
      slot: element.getAttribute('data-slot'), state: element.getAttribute('data-state'),
      role: element.getAttribute('role'), checked: element.getAttribute('aria-checked'),
      selected: element.getAttribute('aria-selected'), value: element.getAttribute('aria-valuenow'),
      disabled: element.hasAttribute('disabled'),
      color: style.color, background: style.backgroundColor, border: style.borderTopColor,
      radius: style.borderTopLeftRadius, display: style.display,
    }
  }))
}

const overlayParts = {
  dialog: ['button', 'recipe-dialog-content'],
  'dropdown-menu': ['button', 'recipe-dropdown-menu-content'],
  popover: ['button', 'recipe-popover-content'],
  tooltip: ['button', 'recipe-tooltip-content'],
  select: ['combobox', 'recipe-select-content'],
} as const

for (const framework of ['vite', 'next'] as const) test(`installed catalog recipes match the editor in ${framework}`, async ({ page, context }) => {
  test.setTimeout(480_000)
  const recipes = catalogRecipeFixtures().filter(recipe =>
    framework === 'vite' || ['badge', 'checkbox', 'dialog'].includes(recipe.component))
  await page.addInitScript(drafts => {
    if (location.origin !== 'http://127.0.0.1:3000') return
    for (const [key, value] of drafts) localStorage.setItem(key, value)
  }, recipes.map(recipe => [catalogDraftKey(recipe.component), JSON.stringify({ storageVersion: 1, recipe })]))
  const popover = recipes.find(recipe => recipe.component === 'popover')
  const glass: ComponentRecipe[] = popover?.component === 'popover' ? ['first', 'second'].map(suffix => ({
    ...popover, id: `glass_popover_${suffix}`, presetRef: catalogPresetRef('liquid-glass'),
    content: { ...popover.content, trigger: `Glass ${suffix}` },
  })) : []
  await withCatalogRecipeConsumer(framework, [...recipes, ...glass], async url => {
    const consumer = await context.newPage()
    try {
      for (const recipe of recipes) {
        await page.goto(`http://127.0.0.1:3000/editor/component/${recipe.component}`)
        await expect(page.getByRole('button', { name: 'Get code', exact: true })).toBeEnabled()
        const iframe = page.locator('iframe[title$="recipe preview"]')
        const preview = iframe.contentFrame()
        const box = await iframe.boundingBox()
        expect(box).not.toBeNull()
        await consumer.setViewportSize({ width: Math.round(box!.width), height: Math.round(box!.height) })
        const parts = '[data-ombelle-recipe][data-slot]'
        for (const mode of ['light', 'dark'] as const) {
          await page.getByRole('group', { name: 'Preview mode' }).getByRole('button', { name: mode, exact: false }).click()
          const frameRoot = preview.locator('html')
          if (mode === 'dark') await expect(frameRoot).toHaveClass(/\bdark\b/)
          else await expect(frameRoot).not.toHaveClass(/\bdark\b/)
          await consumer.goto(`${url}/?recipe=${recipe.id}&mode=${mode}`)
          await expect(consumer.locator('main')).toHaveAttribute('data-ready', 'true')
          const id = recipe.component
          const left = preview.locator(parts), right = consumer.locator(parts)
          if (id in overlayParts) {
            const [role, slot] = overlayParts[id as keyof typeof overlayParts]
            const name = 'trigger' in recipe.content ? recipe.content.trigger : 'Edited select'
            const leftTrigger = preview.getByRole(role, { name, exact: true })
            const rightTrigger = consumer.getByRole(role, { name, exact: true })
            const leftContent = preview.locator(`[data-slot="${slot}"]`)
            const rightContent = consumer.locator(`[data-slot="${slot}"]`)
            await leftTrigger.focus()
            await rightTrigger.focus()
            if (id !== 'tooltip') {
              await leftTrigger.press('Enter')
              await rightTrigger.press('Enter')
            }
            await expect(leftContent).toBeVisible()
            await expect(rightContent).toBeVisible()
            await expect.poll(() => appearance(left), { message: `${id} in ${mode}` }).toEqual(await appearance(right))
            await page.keyboard.press('Escape')
            await consumer.keyboard.press('Escape')
            await expect(leftContent).toBeHidden()
            await expect(rightContent).toBeHidden()
            await expect(leftTrigger).toBeFocused()
            await expect(rightTrigger).toBeFocused()
          } else {
            await expect(left.first()).toBeAttached()
            await expect(right.first()).toBeAttached()
            await expect.poll(() => appearance(left), { message: `${id} in ${mode}` }).toEqual(await appearance(right))
          }
          if (id === 'progress') {
            await expect(preview.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '25')
            await expect(preview.locator('[data-slot="recipe-progress-indicator"]')).toHaveAttribute('style', /inline-size: 50%/)
          }
          if (id === 'checkbox') await expect(preview.getByRole('checkbox')).toHaveAttribute('aria-checked', 'mixed')
          if (id === 'tabs') {
            const tabs = preview.getByRole('tab')
            await expect(tabs.first()).toHaveAttribute('aria-selected', 'true')
            await tabs.first().press('ArrowRight')
            await expect(tabs.nth(1)).toBeFocused()
            await expect(tabs.nth(1)).toHaveAttribute('aria-selected', 'true')
            await tabs.nth(1).press('ArrowLeft')
            await expect(tabs.first()).toHaveAttribute('aria-selected', 'true')
          }
        }
      }
      if (glass.length) {
        await consumer.goto(`${url}/?recipe=glass-isolation&mode=dark`)
        await expect(consumer.locator('main')).toHaveAttribute('data-ready', 'true')
        const filterIds = await consumer.locator('filter[id^="ombelle-recipe-"]').evaluateAll(filters => filters.map(filter => filter.id))
        expect(new Set(filterIds).size).toBe(2)
        for (const suffix of ['first', 'second']) {
          const trigger = consumer.getByRole('button', { name: `Glass ${suffix}` })
          await trigger.focus()
          await consumer.keyboard.press('Enter')
          const content = consumer.locator('[data-slot="recipe-popover-content"]')
          await expect(content).toBeVisible()
          const instance = await content.getAttribute('data-ombelle-recipe-instance')
          expect(filterIds).toContain('ombelle-recipe-' + instance)
          await consumer.keyboard.press('Escape')
          await expect(trigger).toBeFocused()
        }
        await expect(consumer.getByRole('button', { name: 'Ordinary popover' })).not.toHaveAttribute('data-ombelle-recipe', /./)
      }
    } finally { await consumer.close() }
  })
})
