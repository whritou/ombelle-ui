import { expect, test } from '@playwright/test'
import { compileRecipe } from '@ombelle/compiler'
import { createEditorDraft } from '../../apps/www/src/editor/model.js'
import { recipeFixtures } from '../../fixtures/shared/recipes.js'
import { recipeStyles } from '../helpers/recipe-measurements.js'
import exampleRecipe from '../../examples/recipe.example.json' with { type: 'json' }
import fs from 'node:fs'

const consumerPorts = JSON.parse(fs.readFileSync('.artifacts/consumers.json', 'utf8')) as Record<string, { port: number }>

async function buttonSnapshot(button: import('@playwright/test').Locator) {
  return {
    dom: await button.evaluate((element) => {
      const node = element as HTMLButtonElement
      return {
        tag: node.tagName.toLowerCase(),
        text: node.textContent,
        className: node.className,
        type: node.type,
        disabled: node.disabled,
        ariaBusy: node.getAttribute('aria-busy'),
        slot: node.getAttribute('data-slot'),
        variant: node.getAttribute('data-variant'),
        size: node.getAttribute('data-size'),
        scope: node.getAttribute('data-ombelle-recipe'),
      }
    }),
    styles: await recipeStyles(button),
    interaction: await button.evaluate((element) => {
      const css = getComputedStyle(element)
      return { opacity: css.opacity, pointerEvents: css.pointerEvents, cursor: css.cursor }
    }),
    dimensions: await button.evaluate((element) => {
      const rect = element.getBoundingClientRect()
      return { width: rect.width, height: rect.height }
    }),
  }
}

test('edits Button family, props, and bounded overrides', async ({ page }) => {
  await page.goto('http://127.0.0.1:3000/editor/component/button')
  await page.getByLabel('Corner radius value').fill('3')
  await expect(page.getByRole('alert').filter({ hasText: 'Enter a value from 0 to 2 rem.' })).toBeVisible()
  const before = await page.evaluate(() => localStorage.getItem('ombelle.button-editor.draft'))
  expect(JSON.parse(before!).recipe.overrides.radiusRem).toBe(0)
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
  await page.addInitScript(() => {
    if (!sessionStorage.getItem('seeded-invalid-draft')) {
      localStorage.setItem('ombelle.button-editor.draft', '{broken draft')
      sessionStorage.setItem('seeded-invalid-draft', '1')
    }
  })
  await page.goto('http://127.0.0.1:3000/editor/component/button')
  await expect(page.getByRole('alert', { name: 'Your saved draft needs recovery' })).toContainText('recovery')
  const downloadPromise = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Download recovery copy' }).click()
  expect((await downloadPromise).suggestedFilename()).toMatch(/recovery/)
  expect(await page.evaluate(() => localStorage.getItem('ombelle.button-editor.draft'))).toBe('{broken draft')
  await page.getByRole('button', { name: 'Start new draft' }).click()
  await expect(page.getByLabel('Button text')).toHaveValue('Create project')
  const archived = await page.evaluate(() => localStorage.getItem('ombelle.button-editor.recoveries'))
  expect(JSON.parse(archived!).texts).toContain('{broken draft')
  await expect(page.getByRole('button', { name: 'Download preserved draft' })).toBeVisible()
  await page.evaluate(() => localStorage.setItem('ombelle.button-editor.draft', '{skipped recovery'))
  await page.reload()
  await page.getByRole('button', { name: 'Start new draft' }).click()
  await expect(page.getByLabel('Button text')).toHaveValue('Create project')
  await page.reload()
  const archivedAfter = await page.evaluate(() => localStorage.getItem('ombelle.button-editor.recoveries'))
  expect(JSON.parse(archivedAfter!).texts).toContain('{skipped recovery')
  const preservedDownloadPromise = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Download preserved draft 2' }).click()
  const download = await preservedDownloadPromise
  expect(download.suggestedFilename()).toMatch(/recovery/)
  const { readFile } = await import('node:fs/promises')
  expect(await readFile((await download.path())!, 'utf8')).toBe('{skipped recovery')
})

test('failed recovery download cannot lose invalid bytes when replacement storage also fails', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('ombelle.button-editor.draft', '{failed recovery')
    URL.createObjectURL = () => { throw new Error('download blocked') }
    const original = Storage.prototype.setItem
    Storage.prototype.setItem = function (key, value) {
      if (key === 'ombelle.button-editor.recoveries') throw new Error('archive blocked')
      return original.call(this, key, value)
    }
  })
  await page.goto('http://127.0.0.1:3000/editor/component/button')
  await page.getByRole('button', { name: 'Download recovery copy' }).click()
  await expect(page.getByRole('status')).toContainText('Recovery download failed')
  await page.getByRole('button', { name: 'Start new draft' }).click()
  await expect(page.getByRole('alert', { name: 'Your saved draft needs recovery' })).toBeVisible()
  expect(await page.evaluate(() => localStorage.getItem('ombelle.button-editor.draft'))).toBe('{failed recovery')
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
  await page.getByRole('tab', { name: 'CLI' }).click()
  const command = await page.getByRole('tabpanel').textContent()
  expect(command).toContain(download.suggestedFilename())
  expect(command).toContain('packages/cli/dist/main.js add --recipe')
  await expect(page.getByText('Run from the Ombelle repository root')).toBeVisible()
  await page.evaluate(() => {
    const recipe = {
      schemaVersion: '1.0', id: 'button_recipe', revision: 1, component: 'button',
      presetRef: { id: 'builtin-flat', revision: 1, catalogRelease: '0.1.0', compilerVersion: '0.1.0' },
      props: {}, content: 'Sparse draft', overrides: {},
    }
    localStorage.setItem('ombelle.button-editor.draft', JSON.stringify({ storageVersion: 1, recipe }))
  })
  await page.reload()
  await expect(page.getByRole('button', { name: 'Download recipe JSON' })).toBeEnabled()
  await page.getByLabel('Loading').check()
  await expect(page.getByRole('button', { name: 'Download recipe JSON' })).toBeEnabled()
  await page.getByRole('button', { name: 'Undo' }).click()
  await expect(page.getByLabel('Loading')).not.toBeChecked()
  await expect(page.getByRole('button', { name: 'Download recipe JSON' })).toBeEnabled()
  const raw = await page.evaluate(() => localStorage.getItem('ombelle.button-editor.draft'))
  expect(JSON.parse(raw!).recipe.props).toEqual({})
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

test('editor and CLI-installed Button recipe have matching DOM and computed styles', async ({ context }) => {
  test.setTimeout(240000)
  for (const recipe of recipeFixtures()) {
    const family = recipe.presetRef.id.replace('builtin-', '')
    const compiled = await compileRecipe({ recipe })
    const usage = compiled.artifacts.find((artifact) => artifact.kind === 'usage')!
    const component = compiled.artifacts.find((artifact) => artifact.kind === 'component')!
    const style = compiled.artifacts.find((artifact) => artifact.kind === 'style')!
    for (const mode of ['light', 'dark'] as const) {
      const editor = await context.newPage()
      const consumer = await context.newPage()
      try {
        await editor.addInitScript((seed) => {
          localStorage.setItem('ombelle.button-editor.draft', JSON.stringify({ storageVersion: 1, recipe: seed }))
        }, recipe)
        await editor.goto('http://127.0.0.1:3000/editor/component/button')
        await editor.getByLabel('Preview mode').selectOption(mode)
        await expect(editor.getByTestId('recipe-hash')).toHaveText(compiled.recipe.hash)
        const frame = editor.locator('iframe[title="Button recipe preview"]').contentFrame()
        const editorButton = frame.locator('[data-slot="recipe-button"]')
        await expect(editorButton).toHaveText(recipe.content)
        await expect(editorButton).toHaveAttribute('data-ombelle-recipe', compiled.scope)
        await expect(frame.locator('.editor-preview')).toHaveClass(mode === 'dark' ? /dark/ : /editor-preview/)
        expect(await frame.locator('style').last().textContent()).toBe(style.content)

        for (const [tab, artifact] of [['Usage', usage], ['Component', component], ['CSS', style]] as const) {
          await editor.getByRole('tab', { name: tab }).click()
          const bytes = await editor.getByRole('tabpanel').textContent()
          expect(bytes).toBe(artifact.content)
          const digest = await editor.evaluate(async (source) => {
            const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(source))
            return Array.from(new Uint8Array(hash), (byte) => byte.toString(16).padStart(2, '0')).join('')
          }, bytes!)
          expect(digest).toBe(artifact.sha256)
        }

        const installedPort = consumerPorts[`npm-vite-${family}`]?.port
        expect(installedPort, `Missing prepared npm ${family} fixture`).toBeDefined()
        await consumer.goto(`http://127.0.0.1:${installedPort}/?mode=${mode}&recipes=1&recipe=${recipe.id}&recipeStates=1`)
        await expect(consumer.locator('main')).toHaveAttribute('data-ready', 'true')
        const installedButton = consumer.getByTestId('recipe-default')
        await expect(installedButton).toHaveText(recipe.content)
        const editorSnapshot = await buttonSnapshot(editorButton)
        const installedSnapshot = await buttonSnapshot(installedButton)
        expect(editorSnapshot.dom).toEqual(installedSnapshot.dom)
        expect(editorSnapshot.styles).toEqual(installedSnapshot.styles)
        expect(editorSnapshot.interaction).toEqual(installedSnapshot.interaction)
        expect(editorSnapshot.dimensions).toEqual(installedSnapshot.dimensions)
        expect(editorSnapshot.styles.minHeight).toBe('44px')
        expect(editorSnapshot.styles.border).toContain('2px')

        const focusStyle = async (button: import('@playwright/test').Locator) => {
          await button.focus()
          return button.evaluate((element) => {
            const css = getComputedStyle(element)
            return { outline: css.outline, outlineOffset: css.outlineOffset }
          })
        }
        expect(await focusStyle(editorButton)).toEqual(await focusStyle(installedButton))

        if (family === 'flat' && mode === 'light') {
          for (const state of ['disabled', 'loading'] as const) {
            await editor.getByLabel(state === 'disabled' ? 'Disabled' : 'Loading').check()
            await expect(editor.getByTestId('recipe-hash')).not.toHaveText(compiled.recipe.hash)
            await consumer.getByRole('button', { name: state === 'disabled' ? 'Toggle recipe disabled' : 'Toggle recipe loading' }).click()
            await expect(editorButton).toBeDisabled()
            await expect(installedButton).toBeDisabled()
            const expected = await buttonSnapshot(installedButton)
            await expect.poll(() => editorButton.getAttribute('aria-busy')).toBe(expected.dom.ariaBusy)
            const actual = await buttonSnapshot(editorButton)
            expect(actual.dom.disabled).toBe(expected.dom.disabled)
            expect(actual.dom.ariaBusy).toBe(expected.dom.ariaBusy)
            expect(actual.styles).toEqual(expected.styles)
            expect(actual.interaction).toEqual(expected.interaction)
            await editor.getByLabel(state === 'disabled' ? 'Disabled' : 'Loading').uncheck()
            await consumer.getByRole('button', { name: state === 'disabled' ? 'Toggle recipe disabled' : 'Toggle recipe loading' }).click()
          }
          const longText = 'Long escaped text " } <script> & \\ '.repeat(4)
          await editor.getByLabel('Button text').fill(longText)
          await expect(editorButton).toHaveText(longText)
          await expect(consumer.getByTestId('recipe-long')).toHaveText(longText)
          expect(await editorButton.locator('script').count()).toBe(0)
          expect((await buttonSnapshot(editorButton)).styles).toEqual((await buttonSnapshot(consumer.getByTestId('recipe-long'))).styles)
        }
      } finally {
        await editor.close()
        await consumer.close()
      }
    }
  }
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
