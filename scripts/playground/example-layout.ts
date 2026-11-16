import { expect, type Page } from '@playwright/test'
export const spacedExampleIds = [
  'alert',
  'card',
  'checkbox',
  'progress',
  'avatar',
  'badge',
  'button-group',
  'calendar',
  'chip',
  'code-block',
  'color-picker',
  'input-group',
  'input',
  'label',
  'native-select',
  'number-input',
  'password-field',
  'radio-group',
  'select',
  'separator',
  'skeleton',
  'slider',
  'spinner',
  'switch',
  'tag-input',
  'textarea',
  'toggle',
] as const
export async function verifyExampleLayout(page: Page) {
  for (const id of spacedExampleIds) {
    const sample = page
      .locator('[data-component="' + id + '"] [data-example-root] > *')
      .first()
    // The playground uses its stage as the example host; the audit uses a named host.
    const root = (await sample.count())
      ? sample
      : page.locator('[data-component="' + id + '"] .pg-stage > *').first()
    const result = await root.evaluate((element) => {
      const css = getComputedStyle(element)
      const children = Array.from(element.children)
        .map((child) => ({
          rect: child.getBoundingClientRect(),
          css: getComputedStyle(child),
        }))
        .filter(
          (item) =>
            item.rect.width > 0 &&
            item.rect.height > 0 &&
            !['absolute', 'fixed'].includes(item.css.position),
        )
      const gaps = children.slice(1).map((item, i) => {
        const previous = children[i]!.rect
        return Math.max(
          item.rect.left - previous.right,
          item.rect.top - previous.bottom,
        )
      })
      return {
        display: css.display,
        rowGap: parseFloat(css.rowGap),
        columnGap: parseFloat(css.columnGap),
        gaps,
      }
    })
    expect(
      ['grid', 'flex', 'inline-flex'],
      id + ' has an explicit example layout',
    ).toContain(result.display)
    expect(
      Math.max(result.rowGap, result.columnGap),
      id + ' declares spacing',
    ).toBeGreaterThan(0)
    for (const gap of result.gaps)
      expect(gap, id + ' separate sample bounds').toBeGreaterThan(0)
  }
  for (const id of ['terms', 'selection']) {
    const label = await page
      .locator('[data-component="checkbox"] label[for="' + id + '"]')
      .boundingBox()
    const control = await page
      .locator('[data-component="checkbox"] [data-slot="checkbox"]')
      .nth(id === 'terms' ? 0 : 1)
      .boundingBox()
    expect(label).not.toBeNull()
    expect(control).not.toBeNull()
    expect(
      control!.x - label!.x - label!.width,
      'checkbox label gap',
    ).toBeGreaterThanOrEqual(7.5)
  }
  const joined = page.locator(
    '[data-component="button-group"] [aria-label="History"] [data-slot="button"]',
  )
  const left = await joined.nth(0).boundingBox(),
    right = await joined.nth(1).boundingBox()
  const group = page.locator(
    '[data-component="button-group"] [aria-label="History"]',
  )
  const allowance = await group.evaluate((element) => {
    const gap = parseFloat(getComputedStyle(element).columnGap) || 0
    const border =
      parseFloat(
        getComputedStyle(element.firstElementChild!).borderLeftWidth,
      ) || 0
    const separator =
      element
        .querySelector('[data-slot="button-group-separator"]')
        ?.getBoundingClientRect().width ?? 0
    return 2 * gap + separator + border + 1
  })
  expect(
    Math.abs(right!.x - left!.x - left!.width),
    'buttons retain group-owned spacing',
  ).toBeLessThanOrEqual(allowance)
  const avatars = page.locator(
    '[data-component="avatar"] [data-slot="avatar-group"] > [data-slot="avatar"]',
  )
  const firstAvatar = await avatars.nth(0).boundingBox(),
    secondAvatar = await avatars.nth(1).boundingBox()
  expect(
    secondAvatar!.x - firstAvatar!.x - firstAvatar!.width,
    'avatars inside their group stay overlapped',
  ).toBeLessThan(0)
  await expect(page.locator('[data-slot="toast-close"]')).toHaveText(
    String.fromCharCode(215),
  )
}
