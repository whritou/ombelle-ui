import { expect, test } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import { compileRecipe } from '@ombelle/compiler'
import { validateRecipe } from '@ombelle/contracts'
import { changeDraftFamily, createEditorDraft } from '../../apps/www/src/editor/model.js'
import { recipeFixtures } from '../../fixtures/shared/recipes.js'
import { recipeStyles } from '../helpers/recipe-measurements.js'
import { expectVisibleFocus, arrowTo, tabTo } from '../helpers/keyboard-focus.js'
import exampleRecipe from '../../examples/recipe.example.json' with { type: 'json' }
import {
  chooseFamily, closeMoreActions, expectRecipeDownloadEnabled, familyOption, menuItem, moreActions, openMenuItem, segment, toggle,
} from '../helpers/button-editor-ui.js'
import fs from 'node:fs'
import { publishedInstaller } from '../../apps/www/src/snapshots/install-command.js'

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

test('opens the saved Button draft from the component editor entry point', async ({ page }) => {
  const origin = 'http://127.0.0.1:3000'
  await page.goto(`${origin}/components/button`)
  await page.getByRole('link', { name: 'Customize' }).click()
  await expect(page).toHaveURL(`${origin}/editor/component/button`)
  await page.getByLabel('Button text').fill('Saved from Button docs')
  await expect(page.getByRole('status')).toContainText('Draft saved locally.')

  await page.goto(`${origin}/editor/component`)
  await expect(page).toHaveURL(`${origin}/editor/component/button`)
  await expect(page.getByRole('navigation', { name: 'Primary' }).getByRole('link', { name: 'Component editor' }))
    .toHaveAttribute('aria-current', 'page')
  await expect(page.getByLabel('Button text')).toHaveValue('Saved from Button docs')
})

test('offers keyboard access to the catalog on mobile', async ({ page }) => {
  const origin = 'http://127.0.0.1:3000'
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto(`${origin}/editor/component/button`)
  const navigation = page.getByRole('navigation', { name: 'Editable components' })
  await expect(navigation.getByRole('link', { name: 'Button', exact: true })).toHaveAttribute('aria-current', 'page')
  const browse = navigation.getByRole('link', { name: 'Browse all components' })
  await tabTo(page, browse)
  await page.keyboard.press('Enter')
  await expect(page).toHaveURL(`${origin}/components`)
})

test('returns 404 for unknown component editors', async ({ request }) => {
  const response = await request.get('http://127.0.0.1:3000/editor/component/unknown')
  expect(response.status()).toBe(404)
})

test('edits Button family, props, and bounded overrides', async ({ page }) => {
  await page.goto('http://127.0.0.1:3000/editor/component/button')
  await page.getByLabel('Corner radius', { exact: true }).fill('3')
  await expect(page.getByRole('alert').filter({ hasText: 'Enter a value from 0 to 2 rem.' })).toBeVisible()
  const before = await page.evaluate(() => localStorage.getItem('ombelle.button-editor.draft'))
  expect(JSON.parse(before!).recipe.overrides.radiusRem).toBe(0)
  await chooseFamily(page, 'flat')
  await segment(page, 'Variant', 'Outline').click()
  await segment(page, 'Size', 'S').click()
  await segment(page, 'Button type', 'submit').click()
  await page.getByLabel('Button text').fill('Ship release')
  await toggle(page, 'Disabled').click()
  await toggle(page, 'Loading').click()
  await page.getByLabel('Corner radius', { exact: true }).fill('1.5')
  await page.getByLabel('Border width', { exact: true }).fill('3')
  await page.getByLabel('Minimum height', { exact: true }).fill('52')
  await page.getByLabel('Shadow X offset', { exact: true }).fill('-4')
  await page.getByLabel('Shadow Y offset', { exact: true }).fill('8')
  await expect(page.locator('iframe[title="Button recipe preview"]').contentFrame().locator('[data-slot="recipe-button"]')).toHaveText('Ship release', { timeout: 20000 })
  await (await openMenuItem(page, 'Download recipe JSON')).click()
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
  await segment(page, 'Preview mode', 'Dark').click()
  await segment(page, 'Preview width', 'Narrow').click()
  for (const state of ['Hover', 'Focus', 'Active']) {
    await segment(page, 'Preview state', state).click()
    await expect(segment(page, 'Preview state', state)).toHaveAttribute('aria-checked', 'true')
    await expect(page.getByTestId('recipe-hash')).toHaveText(before!)
  }
  await expect(page.getByTestId('recipe-hash')).toHaveText(before!)
  await page.reload()
  await expect(page.getByLabel('Button text')).toHaveValue('Saved draft')
})

test('undo and redo preserve meaningful text edits', async ({ page }) => {
  await page.goto('http://127.0.0.1:3000/editor/component/button')
  await page.getByLabel('Button text').fill('First edit')
  await segment(page, 'Variant', 'Secondary').click()
  await expect(segment(page, 'Variant', 'Secondary')).toHaveAttribute('aria-checked', 'true')
  await page.getByRole('button', { name: 'Undo' }).click()
  await expect(segment(page, 'Variant', 'Default')).toHaveAttribute('aria-checked', 'true')
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
  await expect(await openMenuItem(page, 'Download preserved draft')).toBeVisible()
  await closeMoreActions(page)
  await page.evaluate(() => localStorage.setItem('ombelle.button-editor.draft', '{skipped recovery'))
  await page.reload()
  await page.getByRole('button', { name: 'Start new draft' }).click()
  await expect(page.getByLabel('Button text')).toHaveValue('Create project')
  await page.reload()
  const archivedAfter = await page.evaluate(() => localStorage.getItem('ombelle.button-editor.recoveries'))
  expect(JSON.parse(archivedAfter!).texts).toContain('{skipped recovery')
  const preservedDownloadPromise = page.waitForEvent('download')
  await (await openMenuItem(page, 'Download preserved draft 2')).click()
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

test('output panel stays open and ends with the build details', async ({ page }) => {
  await page.goto('http://127.0.0.1:3000/editor/component/button')
  await expect(page.getByRole('tab', { name: 'Usage' })).toBeVisible()
  await expect(page.getByRole('button', { name: /generated output/ })).toHaveCount(0)
  await expect(page.getByTestId('recipe-hash')).not.toHaveText('Pending')
  const tabsBottom = (await page.getByRole('tabpanel').boundingBox())!
  const meta = (await page.getByTestId('artifact-meta').boundingBox())!
  expect(meta.y).toBeGreaterThan(tabsBottom.y + tabsBottom.height)
})

test('artifact tabs support copy and validated recipe JSON download', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write'])
  await page.goto('http://127.0.0.1:3000/editor/component/button')
  for (const name of ['Usage', 'Component', 'CSS', 'Recipe', 'Install']) {
    await page.getByRole('tab', { name }).click()
    await expect(page.getByRole('tabpanel')).not.toBeEmpty()
    await page.getByRole('button', { name: `Copy ${name}` }).click()
    await expect(page.getByRole('status')).toContainText('copied')
  }
  const downloadPromise = page.waitForEvent('download')
  await (await openMenuItem(page, 'Download recipe JSON')).click()
  const download = await downloadPromise
  expect(download.suggestedFilename()).toMatch(/\.json$/)
  const file = await download.path()
  const { readFile } = await import('node:fs/promises')
  const { validateRecipe } = await import('@ombelle/contracts')
  const recipe = validateRecipe(JSON.parse(await readFile(file!, 'utf8')))
  expect(recipe.component).toBe('button')
  await expect(page.getByRole('status')).toContainText('downloaded')
  await page.getByRole('tab', { name: 'Install' }).click()
  const command = await page.getByRole('tabpanel').textContent()
  expect(command).toContain(download.suggestedFilename())
  expect(command).toContain(`npx ${publishedInstaller.packageName}@${publishedInstaller.version} add --recipe ./`)
  expect(command).not.toContain('packages/cli/dist/main.js')
  await expect(page.getByText('Run from the folder containing the downloaded')).toBeVisible()
  await page.evaluate(() => {
    const recipe = {
      schemaVersion: '1.0', id: 'button_recipe', revision: 1, component: 'button',
      presetRef: { id: 'builtin-flat', revision: 1, catalogRelease: '0.1.0', compilerVersion: '0.1.0' },
      props: {}, content: 'Sparse draft', overrides: {},
    }
    localStorage.setItem('ombelle.button-editor.draft', JSON.stringify({ storageVersion: 1, recipe }))
  })
  await page.reload()
  await expectRecipeDownloadEnabled(page)
  await toggle(page, 'Loading').click()
  await expect(toggle(page, 'Loading')).toBeChecked()
  await expectRecipeDownloadEnabled(page)
  await page.getByRole('button', { name: 'Undo' }).click()
  await expect(toggle(page, 'Loading')).not.toBeChecked()
  await expectRecipeDownloadEnabled(page)
  const raw = await page.evaluate(() => localStorage.getItem('ombelle.button-editor.draft'))
  expect(JSON.parse(raw!).recipe.props).toEqual({})
})

test('mobile workspace tabs retain the draft and preview mode', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('http://127.0.0.1:3000/editor/component/button')
  await page.getByRole('button', { name: 'Customize', exact: true }).click()
  await page.getByLabel('Button text').fill('Mobile draft')
  await page.getByRole('button', { name: 'Preview', exact: true }).click()
  await segment(page, 'Preview mode', 'Dark').click()
  await expect(page.locator('iframe[title="Button recipe preview"]').contentFrame().locator('[data-slot="recipe-button"]')).toHaveText('Mobile draft', { timeout: 20000 })
  await page.getByRole('button', { name: 'Code', exact: true }).click()
  await expect(page.getByRole('tab', { name: 'Usage' })).toBeVisible()
  await page.getByRole('button', { name: 'Customize', exact: true }).click()
  await expect(page.getByLabel('Button text')).toHaveValue('Mobile draft')
  await page.getByRole('button', { name: 'Preview', exact: true }).click()
  await expect(segment(page, 'Preview mode', 'Dark')).toHaveAttribute('aria-checked', 'true')
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
        await segment(editor, 'Preview mode', mode === 'dark' ? 'Dark' : 'Light').click()
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
            await toggle(editor, state === 'disabled' ? 'Disabled' : 'Loading').click()
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
            await toggle(editor, state === 'disabled' ? 'Disabled' : 'Loading').click()
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
  const initial = await compileRecipe({ recipe: changeDraftFamily({ storageVersion: 1, recipe: validateRecipe(exampleRecipe) }, 'ombelle').recipe })
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

  // Validated renders apply the recipe's interaction colors to the same specimen.
  const forcedRecipe = {
    ...createEditorDraft('flat').recipe,
    overrides: { colors: { light: { background: '#123456', hoverBackground: '#234567', pressedBackground: '#345678' } } },
  }
  const forced = await compileRecipe({ recipe: forcedRecipe })
  const forcedCss = forced.artifacts.find((artifact) => artifact.kind === 'style')!.content
  const states = [
    ['hover', 'rgb(35, 69, 103)'],
    ['active', 'rgb(52, 86, 120)'],
    ['none', 'rgb(18, 52, 86)'],
  ] as const
  for (const [index, [forcedState, background]] of states.entries()) {
    const requestId = index + 1500
    await page.evaluate((payload) => {
      const port = (window as typeof window & { __previewTestPort?: MessagePort }).__previewTestPort!
      port.postMessage(payload)
    }, {
      type: 'render', requestId, scope: forced.scope,
      state: { recipe: forced.recipe.data, css: forcedCss, mode: 'light', viewport: 'wide', forcedState, requestId },
    })
    await expect(button).toHaveAttribute('data-forced-state', forcedState)
    await expect(button).toHaveCSS('background-color', background)
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

test('operates every Button editor control, artifact tab, download and publish dialog by keyboard', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write'])
  await page.goto('http://127.0.0.1:3000/editor/component/button')
  await expect(page.getByTestId('recipe-hash')).not.toHaveText('Pending', { timeout: 30000 })
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([])
  const stored = async () => JSON.parse((await page.evaluate(() => localStorage.getItem('ombelle.button-editor.draft')))!).recipe

  // The top bar comes first, then the inspector (style family first), the preview controls and generated output.
  const minimalist = familyOption(page, 'minimalist')
  await arrowTo(page, minimalist)
  await page.keyboard.press('Enter')
  await expect(minimalist).toHaveAttribute('aria-checked', 'true')
  await expect(minimalist).toBeFocused()
  await tabTo(page, page.getByLabel('Button text'))
  await page.keyboard.press('ControlOrMeta+A')
  await page.keyboard.type('Keyboard ship')
  for (const [group, option] of [['Variant', 'Secondary'], ['Size', 'M'], ['Button type', 'submit']] as const) {
    await arrowTo(page, segment(page, group, option))
    await page.keyboard.press('Enter')
    await expect(segment(page, group, option)).toHaveAttribute('aria-checked', 'true')
  }
  for (const name of ['Disabled', 'Loading'] as const) {
    await tabTo(page, toggle(page, name))
    await page.keyboard.press('Space')
    await expect(toggle(page, name)).toBeChecked()
  }
  // Each number field takes typed text; the sliders then step it with the arrow keys.
  for (const [id, label, typed] of [['radiusRem', 'Corner radius', '0.1'], ['borderWidthPx', 'Border width', '2.1'], ['minHeightPx', 'Minimum height', '45']] as const) {
    await tabTo(page, page.getByLabel(label, { exact: true }))
    await page.keyboard.press('ControlOrMeta+A')
    await page.keyboard.type(typed)
    // The slider's thumb is the focusable control, named after its row.
    void id
    await tabTo(page, page.getByLabel(`${label} slider`, { exact: true }))
    await page.keyboard.press('ArrowRight')
  }
  for (const label of ['Shadow X offset', 'Shadow Y offset']) {
    await tabTo(page, page.getByLabel(label, { exact: true }))
    await page.keyboard.press('ControlOrMeta+A')
    await page.keyboard.type('8')
  }
  for (const [group, option] of [['Preview mode', 'Dark'], ['Preview width', 'Narrow'], ['Preview state', 'Active']] as const) {
    await arrowTo(page, segment(page, group, option))
    await page.keyboard.press('Enter')
    await expect(segment(page, group, option)).toHaveAttribute('aria-checked', 'true')
  }

  await tabTo(page, page.getByRole('tab', { name: 'Usage' }))
  for (const name of ['Component', 'CSS', 'Recipe', 'Install', 'Usage']) {
    await page.keyboard.press('ArrowRight')
    await expect(page.getByRole('tab', { name, exact: true })).toBeFocused()
    await expect(page.getByRole('tab', { name, exact: true })).toHaveAttribute('aria-selected', 'true')
    await expectVisibleFocus(page)
  }
  await page.keyboard.press('ArrowLeft')
  await expect(page.getByRole('tab', { name: 'Install' })).toBeFocused()
  await expect(page.getByRole('tabpanel')).toContainText('add --recipe ./')
  await tabTo(page, page.getByRole('button', { name: 'Copy Install' }))
  await page.keyboard.press('Enter')
  await expect(page.getByRole('status')).toContainText('Install copied.')
  await tabTo(page, page.getByRole('tabpanel'))

  const expected = {
    presetRef: { id: 'builtin-minimalist' }, content: 'Keyboard ship',
    props: { variant: 'secondary', size: 'default', type: 'submit', disabled: true, loading: true },
    overrides: { radiusRem: 0.2, borderWidthPx: 2.2, minHeightPx: 46, shadowOffsetXPx: 8, shadowOffsetYPx: 8 },
  }
  await expect.poll(stored).toMatchObject(expected)
  await expect(page.locator('iframe[title="Button recipe preview"]').contentFrame().locator('[data-slot="recipe-button"]'))
    .toHaveText('Keyboard ship', { timeout: 20000 })

  // The download lives in the top bar's overflow menu; keyboard focus returns to its trigger afterwards.
  const more = moreActions(page)
  await tabTo(page, more, { backward: true, max: 250 })
  await page.keyboard.press('Enter')
  const download = menuItem(page, 'Download recipe JSON')
  await expect(download).toBeEnabled()
  await tabTo(page, download)
  const pending = page.waitForEvent('download')
  await page.keyboard.press('Enter')
  const file = await (await pending).path()
  const { readFile } = await import('node:fs/promises')
  expect(JSON.parse(await readFile(file, 'utf8'))).toMatchObject(expected)
  await expect(more).toBeFocused()
  await expectVisibleFocus(page)

  const getCode = page.getByRole('button', { name: 'Get code', exact: true })
  await tabTo(page, getCode)
  await page.keyboard.press('Enter')
  const dialog = page.getByRole('dialog', { name: 'Get code' })
  await expect(dialog.getByTestId('get-code-reference')).toHaveText(/^rc_[a-f0-9]{32}@1$/)
  const npm = dialog.getByRole('button', { name: 'npm', exact: true })
  await npm.focus()
  await page.keyboard.press('Enter')
  await expect(npm).toHaveAttribute('aria-pressed', 'true')
  await expect(dialog.getByTestId('get-code-command')).toContainText(/^npx /)
  await expectVisibleFocus(page)
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([])
  await page.keyboard.press('Escape')
  await expect(dialog).toHaveCount(0)
  await expect(getCode).toBeFocused()
  await expectVisibleFocus(page)

  await page.reload()
  const text = page.getByLabel('Button text')
  await expect(text).toHaveValue('Keyboard ship')
  await tabTo(page, text)
  await page.keyboard.press('End')
  await page.keyboard.type(' now')
  const undo = page.getByRole('button', { name: 'Undo', exact: true })
  const redo = page.getByRole('button', { name: 'Redo', exact: true })
  await tabTo(page, undo, { backward: true })
  await page.keyboard.press('Enter')
  await expect(text).toHaveValue('Keyboard ship')
  await expect(redo).toBeFocused()
  await expectVisibleFocus(page)
  await page.keyboard.press('Enter')
  await expect(text).toHaveValue('Keyboard ship now')
  await expect(undo).toBeFocused()
  await expectVisibleFocus(page)
})
