import { expect, test, type Locator, type Page } from '@playwright/test'

export async function snapshotPresetDom(locator: Locator) {
  return locator.evaluate((root) => {
    const nodes = [root, ...root.querySelectorAll('*')]
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
  })
}

export async function assertPresetGalleryButtonPixels(input: {
  page: Page
  iframe: Locator
  previewButton: Locator
  installedButton: Locator
  label: string
}) {
  const { page, iframe, previewButton, installedButton, label } = input
  await iframe.scrollIntoViewIfNeeded()
  // Match the standalone document's raster origin before comparing pixels.
  // A fractional host layout offset changes text antialiasing. Move the
  // iframe onto whole pixels through layout: a fractional transform leaves
  // the compositor free to round the layer either way, a 1px shift.
  await iframe.evaluate((element) => {
    for (let attempt = 0; attempt < 3; attempt++) {
      const box = element.getBoundingClientRect()
      const dx = Math.ceil(box.x) - box.x
      const dy = Math.ceil(box.y) - box.y
      if (!dx && !dy) return
      const style = getComputedStyle(element)
      element.style.marginLeft = `${parseFloat(style.marginLeft) + dx}px`
      element.style.marginTop = `${parseFloat(style.marginTop) + dy}px`
    }
  })
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
  expect(reference.equals(installed)).toBe(true)
}
