import { expect, test } from '@playwright/test'
import { compileRecipe } from '@ombelle/compiler'
import { createEditorDraft } from '../../apps/www/src/editor/model.js'
import exampleRecipe from '../../examples/recipe.example.json' with { type: 'json' }

test('sandboxed preview receives validated recipe updates only over its port', async ({ page }) => {
  await page.addInitScript(() => {
    if (window === window.top) {
      window.addEventListener('message', (event) => {
        const probe = window as typeof window & { __droppedReady?: number }
        if (typeof event.data === 'object' && event.data?.type === 'ombelle-preview-ready' && !probe.__droppedReady) {
          probe.__droppedReady = 1
          event.stopImmediatePropagation()
        }
      }, true)
    }
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
  const initial = await compileRecipe({ recipe: exampleRecipe })
  expect(exampleRecipe.presetRef.id).toBe('builtin-neo-brutalism')
  const scope = await button.getAttribute('data-ombelle-recipe')
  expect(scope).toBe(initial.scope)
  expect(await page.evaluate(() => (window as typeof window & { __droppedReady?: number }).__droppedReady)).toBe(1)
  await page.evaluate(() => {
    const probe = window as typeof window & { __previewTestPort?: MessagePort; __originalPreviewPort?: MessagePort }
    probe.__originalPreviewPort = probe.__previewTestPort
  })
  const rejected = await page.evaluate(() => new Promise<Array<{ requestId: number; status: string }>>((resolve) => {
    window.postMessage({ type: 'ombelle-preview-ready', version: 1 }, '*')
    const target = document.querySelector('iframe')!
    target.contentWindow!.postMessage({ type: 'render', requestId: 999, state: { content: 'Forged' } }, '*')
    const probe = window as typeof window & { __previewTestPort?: MessagePort; __previewLastRender?: any }
    const port = probe.__previewTestPort!
    const original = probe.__previewLastRender
    const replies: Array<{ requestId: number; status: string }> = []
    const onAck = (event: MessageEvent) => {
      if (event.data?.type !== 'render-ack') return
      replies.push(event.data)
      if (replies.some((ack) => ack.requestId === 998) &&
        replies.some((ack) => ack.requestId === 999) &&
        replies.some((ack) => ack.requestId === original.requestId && ack.status === 'rejected')) {
        port.removeEventListener('message', onAck)
        resolve(replies)
      }
    }
    port.addEventListener('message', onAck)
    port.start()
    port.postMessage({ ...original, requestId: 998, state: { ...original.state,
      css: original.state.css + '\nbody { display: none; }', requestId: 998 } })
    port.postMessage({ ...original, requestId: 999, state: { ...original.state, mode: 'sepia', requestId: 999 } })
    port.postMessage({ ...original, state: { ...original.state, recipe: { ...original.state.recipe, content: 'Replayed' } } })
  }))
  expect(rejected).toEqual(expect.arrayContaining([
    expect.objectContaining({ requestId: 998, status: 'rejected' }),
    expect.objectContaining({ requestId: 999, status: 'rejected' }),
    expect.objectContaining({ status: 'rejected' }),
  ]))
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

  await iframe.evaluate((element: HTMLIFrameElement) => { element.src = element.src })
  await expect(button).toHaveText('Create project')
  await expect(button).toHaveAttribute('data-ombelle-recipe', initial.scope)
  expect(await page.evaluate(() => {
    const probe = window as typeof window & { __previewTestPort?: MessagePort; __originalPreviewPort?: MessagePort }
    return probe.__previewTestPort !== probe.__originalPreviewPort
  })).toBe(true)
  const staleRecipe = { ...exampleRecipe, content: 'Stale frame' }
  const staleResult = await compileRecipe({ recipe: staleRecipe })
  await page.evaluate((payload) => {
    const probe = window as typeof window & { __originalPreviewPort?: MessagePort }
    probe.__originalPreviewPort!.postMessage(payload)
  }, { type: 'render', requestId: 2000, scope: staleResult.scope,
    state: { recipe: staleResult.recipe.data,
      css: staleResult.artifacts.find((artifact) => artifact.kind === 'style')!.content,
      mode: 'light', viewport: 'wide', forcedState: 'none', requestId: 2000 } })
  await expect(button).toHaveText('Create project')
})
