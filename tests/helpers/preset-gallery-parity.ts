import { expect, test, type Locator, type Page } from '@playwright/test'
import { maxPixelDifference } from './pixel-difference.js'

// The gallery skips rendering sections out of view (content-visibility: auto in
// fixtures/shared/preset-gallery.css), in the editor and in installed apps alike. A skipped section
// reports its 480px placeholder height and paints nothing until a frame after it scrolls in, so
// measurements and screenshots render every section while they run.
const renderAll = '* { content-visibility: visible !important; }'
const overrideId = 'ombelle-parity-render-all'
async function setRenderAll(locator: Locator, on: boolean) {
  await locator.evaluate((element, { on, css, id }) => {
    const document = element.ownerDocument
    document.getElementById(id)?.remove()
    if (!on) return
    const style = document.createElement('style')
    style.id = id
    style.textContent = css
    document.head.append(style)
  }, { on, css: renderAll, id: overrideId })
}

export async function snapshotPresetDom(locator: Locator) {
  return locator.evaluate((root) => {
    // Render every section while measuring (see renderAll above).
    const override = root.ownerDocument.createElement('style')
    override.textContent = '* { content-visibility: visible !important; }'
    root.ownerDocument.head.append(override)
    try {
      // <noscript> never renders while scripts run, and its text differs by renderer: server rendering
      // (a Next consumer) fills in input-otp's fallback style, client rendering (the editor) leaves it empty.
      const nodes = [root, ...root.querySelectorAll('*')].filter((node) => !node.closest('noscript'))
      return nodes.map((node) => {
        const css = getComputedStyle(node)
        return {
          tag: node.tagName,
          text: node.children.length ? null : node.textContent,
          slot: node.getAttribute('data-slot'),
          state: node.getAttribute('data-state'),
          invalid: node.getAttribute('aria-invalid'),
          disabled: node.hasAttribute('disabled'),
          styles: Object.fromEntries(
            ['color','background-color','font-family','font-size','font-weight','border-radius','border-width','border-color','box-shadow','min-height','height','padding','transition-duration','opacity'].map((key) => [key, css.getPropertyValue(key)]),
          ),
        }
      })
    } finally {
      override.remove()
    }
  })
}

export async function assertPresetGalleryButtonPixels(input: {
  page: Page
  iframe: Locator
  previewButton: Locator
  installedButton: Locator
  label: string
}) {
  const { installedButton, previewButton } = input
  await setRenderAll(previewButton, true)
  await setRenderAll(installedButton, true)
  try {
    await compareButtonPixels(input)
  } finally {
    await setRenderAll(previewButton, false)
    await setRenderAll(installedButton, false)
  }
}

async function compareButtonPixels(input: {
  page: Page
  iframe: Locator
  previewButton: Locator
  installedButton: Locator
  label: string
}) {
  const { page, iframe, previewButton, installedButton, label } = input
  await iframe.scrollIntoViewIfNeeded()
  // The gallery has grown taller than the frame and the window: bring the Button itself into
  // view, in the frame and on the page, or the clip falls outside the screenshot.
  await previewButton.evaluate((element) => element.scrollIntoView({ block: 'center', inline: 'nearest' }))
  // Match the standalone document's raster origin before comparing pixels.
  // A fractional host layout offset changes text antialiasing. Offset the
  // iframe onto whole pixels with relative positioning: unlike a fractional
  // transform it is resolved before pixel snapping, so the measured and
  // painted origins agree, and it moves only the iframe.
  const placed = await iframe.evaluate((element) => {
    element.style.position = 'relative'
    element.style.left = '0px'
    element.style.top = '0px'
    const box = element.getBoundingClientRect()
    element.style.left = `${Math.ceil(box.x) - box.x}px`
    element.style.top = `${Math.ceil(box.y) - box.y}px`
    const after = element.getBoundingClientRect()
    return { x: after.x, y: after.y }
  })
  expect(Number.isInteger(placed.x) && Number.isInteger(placed.y), `iframe at ${placed.x},${placed.y}`).toBe(true)
  const inner = await previewButton.evaluate((element) => {
    const box = element.getBoundingClientRect()
    return { x: box.x, y: box.y, width: box.width, height: box.height }
  })
  const host = await iframe.evaluate((element) => {
    const box = element.getBoundingClientRect()
    return { x: box.x + element.clientLeft, y: box.y + element.clientTop }
  })
  const box = { x: host.x + inner.x, y: host.y + inner.y, width: inner.width, height: inner.height }
  const clip = {
    x: Math.floor(box.x),
    y: Math.floor(box.y),
    width: Math.ceil(box.x + box.width) - Math.floor(box.x),
    height: Math.ceil(box.y + box.height) - Math.floor(box.y),
  }
  const reference = await page.screenshot({ clip, animations: 'disabled', timeout: 20000 })
  const installed = await installedButton.screenshot({ animations: 'disabled', timeout: 20000 })
  await test.info().attach(label + '-preview-button', { body: reference, contentType: 'image/png' })
  await test.info().attach(label + '-installed-button', { body: installed, contentType: 'image/png' })
  // Retro-futurism's striped Button rounds gradient stops by 1/255 between development and production CSS.
  expect(await maxPixelDifference(page, reference, installed)).toBeLessThanOrEqual(1)
}
