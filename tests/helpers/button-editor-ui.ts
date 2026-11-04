import { expect, type Locator, type Page } from '@playwright/test'

export { segment } from './preset-editor-ui.js'

const familyNames = {
  flat: 'Flat',
  minimalist: 'Minimalist',
  'neo-brutalism': 'Neo-brutalism',
  'liquid-glass': 'Liquid glass',
} as const

export const moreActions = (page: Page) => page.getByRole('button', { name: 'More actions', exact: true })
export const familyChip = (page: Page) => page.getByRole('button', { name: /^Style family: / })
export const familyOption = (page: Page, family: keyof typeof familyNames) =>
  page.getByRole('group', { name: 'Style family', exact: true }).getByRole('button', { name: new RegExp('^' + familyNames[family]) })
export const menuItem = (page: Page, name: string) => page.getByRole('menuitem', { name, exact: true })
/** A Disabled or Loading switch of the inspector. */
export const toggle = (page: Page, name: 'Disabled' | 'Loading') => page.getByRole('switch', { name, exact: true })

/** Opens the "More actions" menu; safe to call when it is already open. */
export async function openMoreActions(page: Page) {
  const menu = page.getByRole('menu', { name: 'More actions' })
  if (!(await menu.isVisible())) await moreActions(page).click()
  await expect(menu).toBeVisible()
}

/** Opens the menu, returns the named item, and leaves the menu open for the caller to act on. */
export async function openMenuItem(page: Page, name: string): Promise<Locator> {
  await openMoreActions(page)
  return menuItem(page, name)
}

export async function closeMoreActions(page: Page) {
  const menu = page.getByRole('menu', { name: 'More actions' })
  if (await menu.isVisible()) await page.keyboard.press('Escape')
  await expect(menu).toBeHidden()
}

/** Asserts the recipe JSON download is available, then closes the menu again. */
export async function expectRecipeDownloadEnabled(page: Page) {
  await expect(await openMenuItem(page, 'Download recipe JSON')).toBeEnabled()
  await closeMoreActions(page)
}

/** Chooses a recipe style family through the top-bar chip. */
export async function chooseFamily(page: Page, family: keyof typeof familyNames) {
  await familyChip(page).click()
  await familyOption(page, family).click()
  await expect(familyChip(page)).toHaveAccessibleName('Style family: ' + familyNames[family])
}
