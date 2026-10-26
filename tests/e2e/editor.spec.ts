import { expect, test } from '@playwright/test'
import { compileRecipe } from '@ombelle/compiler'
import { createEditorDraft } from '../../apps/www/src/editor/model.js'
import exampleRecipe from '../../examples/recipe.example.json' with { type: 'json' }

test('edits Button family, props, and bounded overrides', async ({ page }) => {
  await page.goto('http://127.0.0.1:3000/editor/component/button')
  await page.getByLabel('Style family').selectOption('flat')
  await page.getByLabel('Variant').selectOption('outline')
  await page.getByLabel('Size').selectOption('sm')
  await page.getByLabel('Button type').selectOption('submit')
  await page.getByLabel('Button text').fill('Ship release')
  await page.getByLabel('Disabled').check()
  await page.getByLabel('Loading').check()
  await page.getByLabel('Corner radius value').fill('1.5')
  await page.getByLabel('Border width value').fill('3')
  await page.getByLabel('Minimum height value').fill('52')
  await page.getByLabel('Shadow X offset value').fill('-4')
  await page.getByLabel('Shadow Y offset value').fill('8')
  await expect(page.locator('iframe[title="Button recipe preview"]').contentFrame().locator('[data-slot="recipe-button"]')).toHaveText('Ship release', { timeout: 20000 })
  await page.getByRole('button', { name: 'Download recipe JSON' }).click()
  const raw = await page.evaluate(() => localStorage.getItem('ombelle.button-editor.draft'))
  expect(JSON.parse(raw!).recipe).toMatchObject({
    presetRef: { id: 'builtin-flat' }, content: 'Ship release',
    props: { variant: 'outline', size: 'sm', type: 'submit', disabled: true, loading: true },
    overrides: { radiusRem: 1.5, borderWidthPx: 3, minHeightPx: 52, shadowOffsetXPx: -4, shadowOffsetYPx: 8 },
  })
})

test('view mode does not change recipe hash and a draft restores after reload', async ({ page }) => {
  await page.goto('http://127.0.0.1:3000/editor/component/button')
  await page.getByLabel('Button text').fill('Saved draft')
  await expect(page.getByRole('status')).toContainText('saved')
  await expect(page.getByTestId('recipe-hash')).not.toHaveText('Pending')
  const before = await page.getByTestId('recipe-hash').textContent()
  await page.getByLabel('Preview mode').selectOption('dark')
  await page.getByLabel('Preview width').selectOption('narrow')
  await page.getByLabel('Demonstrate state').selectOption('focus')
  await expect(page.getByTestId('recipe-hash')).toHaveText(before!)
  await page.reload()
  await expect(page.getByLabel('Button text')).toHaveValue('Saved draft')
})

test('undo and redo preserve meaningful text edits', async ({ page }) => {
  await page.goto('http://127.0.0.1:3000/editor/component/button')
  await page.getByLabel('Button text').fill('First edit')
  await page.getByLabel('Variant').selectOption('secondary')
  await page.getByRole('button', { name: 'Undo' }).click()
  await expect(page.getByLabel('Variant')).toHaveValue('default')
  await page.getByRole('button', { name: 'Undo' }).click()
  await expect(page.getByLabel('Button text')).toHaveValue('Create project')
  await page.getByRole('button', { name: 'Redo' }).click()
  await expect(page.getByLabel('Button text')).toHaveValue('First edit')
})

test('invalid stored draft offers accessible recovery download before replacement', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('ombelle.button-editor.draft', '{broken draft'))
  await page.goto('http://127.0.0.1:3000/editor/component/button')
  await expect(page.getByRole('alert', { name: 'Your saved draft needs recovery' })).toContainText('recovery')
  const downloadPromise = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Download recovery copy' }).click()
  expect((await downloadPromise).suggestedFilename()).toMatch(/recovery/)
  expect(await page.evaluate(() => localStorage.getItem('ombelle.button-editor.draft'))).toBe('{broken draft')
  await page.getByRole('button', { name: 'Start new draft' }).click()
  await expect(page.getByLabel('Button text')).toHaveValue('Create project')
})

test('artifact tabs support copy and validated recipe JSON download', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write'])
  await page.goto('http://127.0.0.1:3000/editor/component/button')
  for (const name of ['Usage', 'Component', 'CSS', 'Dependencies', 'CLI']) {
    await page.getByRole('tab', { name }).click()
    await expect(page.getByRole('tabpanel')).not.toBeEmpty()
    await page.getByRole('button', { name: `Copy ${name}` }).click()
    await expect(page.getByRole('status')).toContainText('copied')
  }
  const downloadPromise = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Download recipe JSON' }).click()
  const download = await downloadPromise
  expect(download.suggestedFilename()).toMatch(/\.json$/)
  const file = await download.path()
  const { readFile } = await import('node:fs/promises')
  const { validateRecipe } = await import('@ombelle/contracts')
  const recipe = validateRecipe(JSON.parse(await readFile(file!, 'utf8')))
  expect(recipe.component).toBe('button')
  await expect(page.getByRole('status')).toContainText('downloaded')
})

test('mobile workspace tabs retain the draft and preview mode', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('http://127.0.0.1:3000/editor/component/button')
  await page.getByRole('button', { name: 'Customize' }).click()
  await page.getByLabel('Button text').fill('Mobile draft')
  await page.getByRole('button', { name: 'Preview', exact: true }).click()
  await page.getByLabel('Preview mode').selectOption('dark')
  await expect(page.locator('iframe[title="Button recipe preview"]').contentFrame().locator('[data-slot="recipe-button"]')).toHaveText('Mobile draft', { timeout: 20000 })
  await page.getByRole('button', { name: 'Code' }).click()
  await expect(page.getByRole('tab', { name: 'Usage' })).toBeVisible()
  await page.getByRole('button', { name: 'Customize' }).click()
  await expect(page.getByLabel('Button text')).toHaveValue('Mobile draft')
  await page.getByRole('button', { name: 'Preview', exact: true }).click()
  await expect(page.getByLabel('Preview mode')).toHaveValue('dark')
})

test('invalid bounded value reports a field error without changing the recipe', async ({ page }) => {
  await page.goto('http://127.0.0.1:3000/editor/component/button')
  await page.getByLabel('Corner radius value').fill('3')
  await expect(page.getByRole('alert').filter({ hasText: 'Enter a value from 0 to 2 rem.' })).toBeVisible()
  const raw = await page.evaluate(() => localStorage.getItem('ombelle.button-editor.draft'))
  expect(JSON.parse(raw!).recipe.overrides.radiusRem).toBe(0)
})

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
