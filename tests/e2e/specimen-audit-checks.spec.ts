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

test('target-size: crowded 16px targets are reported, spaced or 24px ones are not', async ({ page }) => {
  const small = (label: string) => `<button style="inline-size:16px;block-size:16px;padding:0;margin:0 2px" aria-label="${label}"></button>`
  await fixture(page, small('One') + small('Two'),
    '<button style="inline-size:24px;block-size:24px;padding:0" aria-label="Large"></button><p>' + small('Alone') + '</p>')
  const [defect, clean] = both(page)
  expect((await findTargetSize([defect])).map(f => f.check)).toEqual(['target-size', 'target-size'])
  expect(await findTargetSize([clean])).toEqual([])
})

test('visually hidden helpers and focus-delegating containers are not judged', async ({ page }) => {
  await fixture(page, '', `<span tabindex="0" style="position:absolute;inline-size:1px;block-size:1px;overflow:hidden;clip:rect(0 0 0 0)">Skip</span>
    <div id="group" tabindex="0"><button id="item" style="outline-offset:2px">Item</button></div>`,
    '#item:focus-visible{outline:2px solid #1a56db}')
  await page.locator('#group').evaluate(group => group.addEventListener('focus', () => (group.firstElementChild as HTMLElement).focus({ focusVisible: true } as FocusOptions)))
  const [, clean] = both(page)
  expect(await findTargetSize([clean])).toEqual([])
  expect(await findOverflow([clean])).toEqual([])
  expect(await checkFocusVisible(page, page.locator('#group'))).toEqual([])
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

test('focus-visible: list items are judged by keyboard highlight', async ({ page }) => {
  const list = (id: string) => `<div role="listbox" id="${id}" aria-label="${id}"><div role="option" tabindex="0">One</div><div role="option" tabindex="0">Two</div></div>`
  await fixture(page, list('plain'), list('styled'), '#styled [data-highlighted]{outline:2px solid #1a56db;outline-offset:-2px}[role=option]:focus{outline:none}')
  await page.evaluate(() => document.querySelectorAll('[role=listbox]').forEach(box => box.addEventListener('keydown', event => {
    const items = [...box.querySelectorAll<HTMLElement>('[role=option]')]
    const index = items.indexOf(document.activeElement as HTMLElement)
    const next = items[(index + ((event as KeyboardEvent).key === 'ArrowDown' ? 1 : items.length - 1)) % items.length]!
    items.forEach(item => item.removeAttribute('data-highlighted'))
    next.setAttribute('data-highlighted', '')
    next.focus()
  })))
  expect((await checkFocusVisible(page, page.locator('#plain [role=option]').first())).map(f => f.check)).toEqual(['focus-visible'])
  expect(await checkFocusVisible(page, page.locator('#styled [role=option]').first())).toEqual([])
  expect(await checkFocusVisible(page, page.locator('#styled [role=option]').last())).toEqual([])
})

test('overflow: text inside an svg is never painted and is not judged', async ({ page }) => {
  await fixture(page, '', '<span style="display:inline-block;inline-size:16px"><svg width="16" height="16" aria-hidden="true">▼▼▼▼▼▼</svg></span>')
  expect(await findOverflow([both(page)[1]])).toEqual([])
})

test('focus-visible: a 1px ring around a rounded control passes despite anti-aliased corners', async ({ page }) => {
  await fixture(page, '', '<input id="field" aria-label="Field" style="inline-size:240px;block-size:36px;border:1px solid #767676;border-radius:8px;padding:0 8px">',
    '#field:focus{outline:1px solid #1a56db;outline-offset:1px}')
  expect(await checkFocusVisible(page, page.locator('#field'))).toEqual([])
})

test('clipping: a fully transparent shadow is not judged', async ({ page }) => {
  await fixture(page, '', '<div style="overflow:auto;padding:32px"><div style="block-size:40px;box-shadow:0 0 24px #000, rgba(0, 10, 37, 0) 12px 28px 44px 0px">x</div></div>')
  const clean = both(page)[1]
  expect(await findClipping([clean], clean)).toEqual([])
})

test('focus-visible: a control flush with the viewport edge is measured with its whole ring in view', async ({ page }) => {
  await fixture(page, '', '<div style="block-size:900px"></div><button id="edge" style="inline-size:600px;block-size:24px">Edge</button><div style="block-size:1200px"></div>',
    '#edge:focus-visible{outline:1px solid #1a56db;outline-offset:2px}')
  // Fully visible, bottom edge on the viewport's bottom edge: nothing asks the page to scroll.
  await page.locator('#edge').evaluate(element => window.scrollBy(0, element.getBoundingClientRect().bottom - innerHeight))
  expect(await checkFocusVisible(page, page.locator('#edge'))).toEqual([])
})
