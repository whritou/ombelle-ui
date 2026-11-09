import { expect, test, type Page } from '@playwright/test'
import { checkFocusVisible, findClipping, findForcedColors, findOverflow, findTargetSize, markBorders, runAxe } from '../helpers/specimen-audit.js'

// Each check must report its planted defect and stay silent on the clean twin,
// so a check that passes everything fails here first.
const fixture = (page: Page, defect: string, clean: string, style = '') => page.setContent(`<!doctype html>
<style>body{margin:0;padding:40px;font:16px/1.4 sans-serif;background:#fff;color:#111}[data-case]{margin:24px 0}${style}</style>
<div data-case="defect">${defect}</div><div data-case="clean">${clean}</div>`)
const both = (page: Page) => [page.locator('[data-case="defect"]'), page.locator('[data-case="clean"]')] as const

test('overflow: squeezed button text is reported', async ({ page }) => {
  await fixture(page, '<button style="inline-size:2rem;white-space:nowrap;overflow:hidden">Dismiss</button>',
    '<button aria-label="Dismiss" style="inline-size:2rem">×</button>')
  const [defect, clean] = both(page)
  expect((await findOverflow([defect])).map(f => f.check)).toContain('overflow')
  expect(await findOverflow([clean])).toEqual([])
})

test('clipping: a shadow cut by a scroll container is reported', async ({ page }) => {
  const box = (padding: string) => `<div style="overflow:auto;padding:${padding}"><div style="block-size:40px;box-shadow:0 0 24px #000">x</div></div>`
  await fixture(page, box('0'), box('32px'))
  const [defect, clean] = both(page)
  expect((await findClipping([defect], defect)).map(f => f.check)).toContain('clipping')
  expect(await findClipping([clean], clean)).toEqual([])
})

test('focus-visible: a control with no ring or an invisible ring is reported', async ({ page }) => {
  await fixture(page, '<button id="none">None</button> <button id="same">Same</button>', '<button id="ring">Ring</button>',
    '#none:focus{outline:none}#same:focus{outline:2px solid #fff}#ring:focus-visible{outline:2px solid #1a56db;outline-offset:2px}')
  expect((await checkFocusVisible(page, page.locator('#none'))).map(f => f.check)).toEqual(['focus-visible'])
  expect((await checkFocusVisible(page, page.locator('#same'))).map(f => f.check)).toEqual(['focus-visible'])
  expect(await checkFocusVisible(page, page.locator('#ring'))).toEqual([])
})

test('target-size: a 16px target is reported', async ({ page }) => {
  await fixture(page, '<button style="inline-size:16px;block-size:16px;padding:0" aria-label="Small"></button>',
    '<button style="inline-size:24px;block-size:24px;padding:0" aria-label="Large"></button>')
  const [defect, clean] = both(page)
  expect((await findTargetSize([defect])).map(f => f.check)).toEqual(['target-size'])
  expect(await findTargetSize([clean])).toEqual([])
})

test('forced-colors: a surface losing its border is reported', async ({ page }) => {
  await fixture(page, '<div class="surface lose">Card</div>', '<div class="surface">Card</div>',
    '.surface{border:1px solid #888;padding:8px}@media (forced-colors: active){.lose{border:none}}')
  const [defect, clean] = both(page)
  await markBorders([defect, clean])
  await page.emulateMedia({ forcedColors: 'active' })
  expect((await findForcedColors([defect], [])).map(f => f.check)).toEqual(['forced-colors'])
  expect(await findForcedColors([clean], [])).toEqual([])
})

test('axe: an unnamed button is reported', async ({ page }) => {
  await fixture(page, '<button></button>', '<button>Save</button>')
  expect((await runAxe(page, ['[data-case="defect"]'])).map(f => f.check)).toContain('axe')
  expect(await runAxe(page, ['[data-case="clean"]'])).toEqual([])
})
