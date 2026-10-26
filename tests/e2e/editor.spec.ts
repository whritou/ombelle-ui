import { expect, test } from '@playwright/test'
import { compileRecipe } from '@ombelle/compiler'
import { createEditorDraft } from '../../apps/www/src/editor/model.js'

test('sandboxed preview receives validated recipe updates only over its port', async ({ page }) => {
  await page.addInitScript(() => {
    const NativeChannel = window.MessageChannel
    window.MessageChannel = class extends NativeChannel {
      constructor() {
        super()
        const probe = window as typeof window & { __previewTestPort?: MessagePort; __previewLastRender?: unknown }
        const send = this.port1.postMessage.bind(this.port1)
        this.port1.postMessage = ((data: unknown, options?: Transferable[] | StructuredSerializeOptions) => {
          if (typeof data === 'object' && data !== null && 'type' in data && data.type === 'render') {
            probe.__previewTestPort = this.port1
            probe.__previewLastRender = data
          }
          if (Array.isArray(options)) send(data, options)
          else send(data, options)
        }) as MessagePort['postMessage']
      }
    }
  })
  await page.goto('http://127.0.0.1:3000/editor/component/button')
  const iframe = page.locator('iframe[title="Button recipe preview"]')
  await expect(iframe).toHaveAttribute('src', 'http://127.0.0.1:4173/editor-preview/')
  await expect(iframe).toHaveAttribute('sandbox', 'allow-scripts')
  const frame = iframe.contentFrame()
  const button = frame.locator('[data-slot="recipe-button"]')
  await expect(button).toHaveText('Create project')
  const scope = await button.getAttribute('data-ombelle-recipe')
  expect(scope).toMatch(/^[a-f0-9]{64}$/)
  await page.evaluate(() => {
    const probe = window as typeof window & { __previewTestPort?: MessagePort; __originalPreviewPort?: MessagePort }
    probe.__originalPreviewPort = probe.__previewTestPort
  })
  await page.evaluate(() => {
    window.postMessage({ type: 'ombelle-preview-ready', version: 1 }, '*')
    const target = document.querySelector('iframe')!
    target.contentWindow!.postMessage({ type: 'render', requestId: 999, state: { content: 'Forged' } }, '*')
    const probe = window as typeof window & { __previewTestPort?: MessagePort; __previewLastRender?: any }
    const port = probe.__previewTestPort!
    const original = probe.__previewLastRender
    port.postMessage({ ...original, requestId: 999, state: { ...original.state, mode: 'sepia', requestId: 999 } })
    port.postMessage({ ...original, state: { ...original.state, recipe: { ...original.state.recipe, content: 'Replayed' } } })
  })
  await expect(button).toHaveText('Create project')
  await expect(button).toHaveAttribute('data-ombelle-recipe', scope!)
  expect(await page.evaluate(() => {
    const probe = window as typeof window & { __previewTestPort?: MessagePort; __originalPreviewPort?: MessagePort }
    return probe.__previewTestPort === probe.__originalPreviewPort
  })).toBe(true)

  for (const [index, family] of ['flat', 'minimalist'].entries()) {
    const recipe = createEditorDraft(family as 'flat' | 'minimalist').recipe
    const compiled = await compileRecipe({ recipe })
    const css = compiled.artifacts.find((artifact) => artifact.kind === 'style')!.content
    const requestId = index + 1000
    await page.evaluate((payload) => {
      const port = (window as typeof window & { __previewTestPort?: MessagePort }).__previewTestPort!
      port.postMessage(payload)
    }, {
      type: 'render', requestId, scope: compiled.scope,
      state: { recipe: compiled.recipe.data, css, mode: 'dark', viewport: 'narrow', forcedState: 'focus', requestId },
    })
    await expect(button).toHaveText('Save changes')
    await expect(button).toHaveAttribute('data-ombelle-recipe', compiled.scope)
    await expect(frame.locator('.editor-preview')).toHaveClass(/dark/)
    await expect(frame.locator('.editor-preview')).toHaveAttribute('data-viewport', 'narrow')
    expect(await frame.locator('style').last().textContent()).toBe(css)
  }
})
