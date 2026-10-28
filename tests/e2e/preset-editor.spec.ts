import { expect, test, type Page } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import fs from 'node:fs/promises'
import path from 'node:path'
import {
  canonicalize,
  sha256,
  rewriteModuleSpecifiers,
} from '@ombelle/compiler'
import {
  supportedComponentIds,
  supportedStyleFamilies,
} from '@ombelle/contracts'
import {
  createPresetDraft,
  setPresetEdit,
} from '../../apps/www/src/preset-editor/model.js'
import { withEditorPresetConsumer } from '../helpers/editor-preset-consumer.js'
import { assertPresetGalleryButtonPixels, snapshotPresetDom } from '../helpers/preset-gallery-parity.js'
import {
  presetRuntimeStyles,
  type PresetRender,
} from '../../apps/www/src/preset-editor/preview-protocol.js'

type FrameProbe = {
  hold: boolean
  blocked: boolean
  release: () => void
  completed: number
  acks: Array<{
    requestId: number
    status: string
    presetHash: string
    domHash?: string
    domRequest?: string
    css: string | null
    gallery: boolean
  }>
}

const url = 'http://127.0.0.1:3000/editor/preset'
const frame = (page: Page) =>
  page.locator('iframe[title="Global preset gallery"]').contentFrame()
async function ready(page: Page) {
  await expect(page.getByTestId('preset-hash')).not.toHaveText('Pending', {
    timeout: 30000,
  })
  await expect(page.getByTestId('preset-preview-status')).toHaveText(
    'Preview ready',
    { timeout: 30000 },
  )
}
async function download(page: Page) {
  const pending = page.waitForEvent('download')
  await page
    .getByRole('button', { name: 'Download preset JSON', exact: true })
    .click()
  const item = await pending
  expect(item.suggestedFilename()).toBe('project-preset.json')
  return fs.readFile((await item.path())!, 'utf8')
}
async function seed(
  page: Page,
  family: (typeof supportedStyleFamilies)[number],
) {
  let draft = createPresetDraft(family)
  draft = setPresetEdit(draft, '/modes/light/background', '#f4f5f6')
  draft = setPresetEdit(draft, '/modes/dark/background', '#111827')
  draft = setPresetEdit(draft, '/design/radiusRem', '1.25')
  draft = setPresetEdit(draft, '/design/density', 'compact')
  draft = setPresetEdit(draft, '/design/fontFamilyId', 'system-serif')
  await page.addInitScript(
    (draft) =>
      localStorage.setItem(
        'ombelle:preset-editor:draft:v1',
        JSON.stringify(draft),
      ),
    draft,
  )
  await page.goto(url)
  await ready(page)
}

for (const family of supportedStyleFamilies)
  for (const mode of ['light', 'dark'] as const) {
    test(`renders all twelve ${family} gallery components in ${mode}`, async ({
      page,
    }) => {
      await seed(page, family)
      await page.getByLabel('Preview mode', { exact: true }).selectOption(mode)
      await expect(frame(page).locator('html')).toHaveClass(
        mode === 'dark' ? 'dark' : '',
      )
      for (const id of supportedComponentIds)
        await expect(
          frame(page).locator(`[data-component="${id}"]`),
        ).toBeVisible()
      await expect(
        frame(page).getByLabel('Email', { exact: true }),
      ).toHaveAttribute('aria-invalid', 'true')
      await expect(
        frame(page).getByRole('button', { name: 'Disabled', exact: true }),
      ).toBeDisabled()
      await expect(
        frame(page).getByRole('button', { name: 'Saving…' }),
      ).toHaveAttribute('aria-busy', 'true')
      await expect(
        frame(page).getByRole('tab', { name: 'Overview' }),
      ).toHaveAttribute('aria-selected', 'true')
      await frame(page).getByTestId('preset-button').focus()
      expect(
        await frame(page)
          .getByTestId('preset-button')
          .evaluate((e) => getComputedStyle(e).outlineStyle),
      ).not.toBe('none')
      await frame(page)
        .getByRole('button', { name: 'Open dialog', exact: true })
        .click()
      await expect(frame(page).getByRole('dialog')).toBeVisible()
      expect(await page.getByRole('dialog').count()).toBe(0)
      await frame(page)
        .getByRole('button', { name: 'Close', exact: true })
        .click()
      await expect(
        page
          .getByRole('region', { name: 'Token contrast', exact: true })
          .locator('p')
          .filter({ hasText: /:1 —/ }),
      ).toHaveCount(16)
      const requests: string[] = []
      page.on('request', (request) => requests.push(request.url()))
      await page.getByLabel('Corner radius', { exact: true }).fill('1.5')
      await ready(page)
      expect(
        requests.filter((request) => !request.includes('__nextjs')),
      ).toEqual([])
    })
    for (const framework of ['vite', 'next'] as const)
      test(`matches downloaded ${family} ${mode} preset in installed ${framework}`, async ({
        page,
        context,
      }) => {
        test.setTimeout(360000)
        await seed(page, family)
        await page
          .getByLabel('Preview mode', { exact: true })
          .selectOption(mode)
        await ready(page)
        const text = await download(page)
        expect(text).toBe(canonicalize(JSON.parse(text)) + '\n')
        await withEditorPresetConsumer(
          { family, framework, presetJson: text },
          async ({ root, url, result }) => {
            expect(await page.getByTestId('preset-hash').textContent()).toBe(
              result.preset.hash,
            )
            const width = await frame(page)
              .locator('html')
              .evaluate(() => window.innerWidth)
            const consumer = await context.newPage()
            await consumer.setViewportSize({ width, height: 760 })
            try {
              await consumer.goto(url)
              await consumer
                .locator('html')
                .evaluate(
                  (element, mode) =>
                    element.classList.toggle('dark', mode === 'dark'),
                  mode,
                )
              await consumer.evaluate(() => document.fonts.ready)
              const specimen = consumer.getByTestId('preset-gallery')
              await expect(specimen).toBeVisible()
              expect(
                await snapshotPresetDom(frame(page).getByTestId('preset-gallery')),
              ).toEqual(await snapshotPresetDom(specimen))
              for (const artifact of result.artifacts.filter(
                (a) => a.kind === 'component' || a.kind === 'utility',
              )) {
                const installed = await fs.readFile(
                  path.join(root, 'src', artifact.logicalPath),
                  'utf8',
                )
                expect(await sha256(installed)).toBe(
                  await sha256(
                    await rewriteModuleSpecifiers(artifact.content, (s) => s),
                  ),
                )
              }
              await test.step('Compare rendered Button pixels', async () => {
                await assertPresetGalleryButtonPixels({
                  page,
                  iframe: page.locator('iframe[title="Global preset gallery"]'),
                  previewButton: frame(page).getByTestId('preset-button'),
                  installedButton: consumer.getByTestId('preset-button'),
                  label: 'preset',
                })
              })
              await frame(page)
                .getByRole('button', { name: 'Open dialog', exact: true })
                .click()
              await consumer
                .getByRole('button', { name: 'Open dialog', exact: true })
                .click()
              expect(await snapshotPresetDom(frame(page).getByRole('dialog'))).toEqual(
                await snapshotPresetDom(consumer.getByRole('dialog')),
              )
              await frame(page)
                .getByRole('button', { name: 'Close', exact: true })
                .click()
              await consumer
                .getByRole('button', { name: 'Close', exact: true })
                .click()
            } finally {
              await consumer.close()
            }
          },
        )
      })
  }

test('restores raw draft and history after refresh', async ({ page }) => {
  await page.goto(url)
  await ready(page)
  await page.evaluate(() =>
    localStorage.setItem('ombelle:preset-editor:history:v1', '{broken'),
  )
  await page.reload()
  await expect(
    page
      .getByRole('alert')
      .filter({ hasText: 'Saved history could not be restored' }),
  ).toBeVisible()
  await page.getByLabel('Corner radius', { exact: true }).fill('-')
  await expect(page.getByRole('status')).toContainText('saved')
  await page.reload()
  await expect(page.getByLabel('Corner radius', { exact: true })).toHaveValue(
    '-',
  )
  await page.getByRole('button', { name: 'Undo', exact: true }).click()
  await expect(page.getByLabel('Corner radius', { exact: true })).toHaveValue(
    '0.5',
  )
  await page.getByRole('button', { name: 'Redo', exact: true }).click()
  await expect(page.getByLabel('Corner radius', { exact: true })).toHaveValue(
    '-',
  )
  await page
    .getByRole('button', { name: 'Reset corner radius', exact: true })
    .click()
  await ready(page)
  await page.getByLabel('Border width', { exact: true }).fill('3')
  await page
    .getByRole('button', { name: 'Reset all tokens', exact: true })
    .click()
  await page
    .getByRole('button', { name: 'Confirm change', exact: true })
    .click()
  await expect(page.getByLabel('Border width', { exact: true })).toHaveValue(
    '1',
  )
})
test('preserves explicit edits through confirmed and cancelled family changes', async ({
  page,
}) => {
  await page.goto(url)
  await ready(page)
  await page.getByLabel('Corner radius', { exact: true }).fill('0.6')
  await page.getByLabel('Corner radius', { exact: true }).fill('0.5')
  await page.getByLabel('Dark primary', { exact: true }).fill('invalid')
  await page
    .getByLabel('Style family', { exact: true })
    .selectOption('neo-brutalism')
  await page.getByRole('button', { name: 'Cancel', exact: true }).click()
  await expect(page.getByLabel('Style family', { exact: true })).toHaveValue(
    'flat',
  )
  await page
    .getByLabel('Style family', { exact: true })
    .selectOption('neo-brutalism')
  await page
    .getByRole('button', { name: 'Confirm change', exact: true })
    .click()
  await expect(page.getByLabel('Corner radius', { exact: true })).toHaveValue(
    '0.5',
  )
  await expect(page.getByLabel('Dark primary', { exact: true })).toHaveValue(
    'invalid',
  )
  await expect(page.getByLabel('Preset id', { exact: true })).toHaveValue(
    'project_preset',
  )
  await page.getByRole('button', { name: 'Undo', exact: true }).click()
  await expect(page.getByLabel('Style family', { exact: true })).toHaveValue(
    'flat',
  )
})
test('downloads corrupt and unknown-version recovery before reset', async ({
  page,
}) => {
  for (const raw of ['{broken', '{"storageVersion":99}']) {
    await page.goto(url)
    await page.evaluate((raw) => {
      localStorage.clear()
      localStorage.setItem('ombelle:preset-editor:draft:v1', raw)
    }, raw)
    await page.reload()
    await expect(
      page.getByRole('heading', { name: 'Recover your saved draft' }),
    ).toBeVisible()
    const pending = page.waitForEvent('download')
    await page.getByRole('button', { name: 'Download recovery data' }).click()
    expect(await fs.readFile((await (await pending).path())!, 'utf8')).toBe(raw)
    expect(
      await page.evaluate(() =>
        localStorage.getItem('ombelle:preset-editor:draft:v1'),
      ),
    ).toBe(raw)
    page.once('dialog', (dialog) => dialog.accept())
    await page.getByRole('button', { name: 'Reset saved draft' }).click()
    await expect(
      page.getByRole('heading', { name: 'Recover your saved draft' }),
    ).toHaveCount(0)
    await expect(
      page.getByRole('alert').filter({ hasText: 'Saved draft needs recovery' }),
    ).toHaveCount(0)
  }
})
test('keeps in-memory edits after storage and clipboard denial', async ({
  page,
}) => {
  await page.addInitScript(() => {
    Storage.prototype.setItem = () => {
      throw new Error('Storage denied')
    }
    Object.defineProperty(navigator, 'clipboard', {
      value: {
        writeText: async () => {
          throw new Error('Clipboard denied')
        },
      },
    })
  })
  await page.goto(url)
  await ready(page)
  await page.getByLabel('Corner radius', { exact: true }).fill('1.2')
  await ready(page)
  await expect(
    page.getByRole('alert').filter({ hasText: 'could not be saved' }),
  ).toBeVisible()
  await page.getByRole('button', { name: 'Copy export' }).click()
  await expect(page.getByRole('status')).toContainText('Clipboard unavailable')
  expect(JSON.parse(await download(page)).design.radiusRem).toBe(1.2)
})
test('blocks stale exports during invalid edits and delayed compilation', async ({
  page,
}) => {
  await page.addInitScript(() => {
    const Native = window.Worker
    const state = window as typeof window & { __denyPresetWorker?: boolean }
    state.__denyPresetWorker = true
    window.Worker = class extends Native {
      constructor(script: string | URL, options?: WorkerOptions) {
        if (
          state.__denyPresetWorker &&
          String(script).includes('preset-compiler')
        )
          throw new Error('Worker constructor blocked')
        super(script, options)
      }
    }
  })
  await page.goto(url)
  await expect(
    page.getByRole('button', { name: 'Retry compilation', exact: true }),
  ).toBeVisible()
  await expect(
    page.getByRole('button', { name: 'Download preset JSON' }),
  ).toBeDisabled()
  await page.evaluate(() => {
    ;(
      window as typeof window & { __denyPresetWorker?: boolean }
    ).__denyPresetWorker = false
  })
  await page
    .getByRole('button', { name: 'Retry compilation', exact: true })
    .click()
  await ready(page)
  const old = await page.getByTestId('preset-hash').textContent()
  await page.getByLabel('Corner radius', { exact: true }).fill('-')
  await expect(
    page.getByRole('button', { name: 'Download preset JSON' }),
  ).toBeDisabled()
  await expect(page.locator('#preset-error')).toContainText('finite number')
  await page.getByLabel('Corner radius', { exact: true }).fill('1.1')
  await expect(
    page.getByRole('button', { name: 'Download preset JSON' }),
  ).toBeDisabled()
  await ready(page)
  await expect(page.getByTestId('preset-hash')).not.toHaveText(old!)
  expect(JSON.parse(await download(page)).design.radiusRem).toBe(1.1)
})
test('rejects tampered frame updates and reconnects without stale acknowledgements', async ({
  page,
}) => {
  await page.addInitScript(() => {
    if (window !== window.top) {
      const probe: FrameProbe = {
        hold: false,
        blocked: false,
        release: () => {},
        completed: 0,
        acks: [],
      }
      ;(window as typeof window & { __frameProbe: FrameProbe }).__frameProbe =
        probe
      const digest = crypto.subtle.digest.bind(crypto.subtle)
      crypto.subtle.digest = async (...args) => {
        if (probe.hold) {
          probe.hold = false
          probe.blocked = true
          await new Promise<void>((resolve) => {
            probe.release = resolve
          })
        }
        return digest(...args)
      }
      const descriptor = Object.getOwnPropertyDescriptor(
        MessagePort.prototype,
        'onmessage',
      )!
      Object.defineProperty(MessagePort.prototype, 'onmessage', {
        ...descriptor,
        set(listener) {
          descriptor.set!.call(
            this,
            listener &&
              async function (this: MessagePort, event: MessageEvent) {
                try {
                  await listener.call(this, event)
                } finally {
                  if (event.data?.type === 'preset-render') probe.completed++
                }
              },
          )
        },
      })
      const send = MessagePort.prototype.postMessage
      MessagePort.prototype.postMessage = function (
        this: MessagePort,
        data,
        ...rest
      ) {
        if (data?.type === 'preset-render-ack')
          probe.acks.push({
            ...data,
            domHash: document.documentElement.dataset.presetHash,
            domRequest: document.documentElement.dataset.presetRequest,
            css:
              document.querySelector('style[data-preset-styles]')
                ?.textContent ?? null,
            gallery: Boolean(
              document.querySelector('[data-testid="preset-gallery"]'),
            ),
          })
        return Reflect.apply(send, this, [data, ...rest])
      } as MessagePort['postMessage']
      return
    }
    const Native = window.MessageChannel
    window.MessageChannel = class extends Native {
      constructor() {
        super()
        const send = this.port1.postMessage.bind(this.port1)
        this.port1.postMessage = ((data: unknown) => {
          const probe = window as typeof window & {
            __presetPort?: MessagePort
            __presetRender?: unknown
          }
          probe.__presetPort = this.port1
          probe.__presetRender = structuredClone(data)
          send(data)
        }) as MessagePort['postMessage']
      }
    }
  })
  await page.goto(url)
  await ready(page)
  const original = await page.evaluate(
    () =>
      (
        window as typeof window & {
          __presetRender: PresetRender
        }
      ).__presetRender,
  )
  await page.getByLabel('Corner radius', { exact: true }).fill('1.1')
  await expect(page.getByTestId('preset-hash')).not.toHaveText(
    original.result.preset.hash,
  )
  await ready(page)
  const current = await page.evaluate(
    () =>
      (
        window as typeof window & {
          __presetRender: PresetRender
        }
      ).__presetRender,
  )
  const hash = await page.getByTestId('preset-hash').textContent()
  await page.evaluate(() => {
    const probe = window as typeof window & {
      __presetPort: MessagePort
      __presetRender: {
        requestId: number
        result: { artifacts: Array<{ content: string }> }
      }
    }
    const message = structuredClone(probe.__presetRender)
    message.requestId += 100
    message.result.artifacts[0].content += 'tampered'
    probe.__presetPort.postMessage(message)
  })
  await expect(frame(page).locator('html')).toHaveAttribute(
    'data-preset-hash',
    hash!,
  )
  await expect
    .poll(() =>
      frame(page)
        .locator('html')
        .evaluate(() =>
          (
            window as typeof window & { __frameProbe: FrameProbe }
          ).__frameProbe.acks.some((a) => a.status === 'rejected'),
        ),
    )
    .toBe(true)

  const inspect = () =>
    frame(page)
      .locator('html')
      .evaluate(() => {
        const probe = (window as typeof window & { __frameProbe: FrameProbe })
          .__frameProbe
        return {
          completed: probe.completed,
          blocked: probe.blocked,
          acks: probe.acks,
        }
      })
  const hold = () =>
    frame(page)
      .locator('html')
      .evaluate(() => {
        const probe = (window as typeof window & { __frameProbe: FrameProbe })
          .__frameProbe
        probe.hold = true
        probe.blocked = false
      })
  const release = () =>
    frame(page)
      .locator('html')
      .evaluate(() =>
        (
          window as typeof window & { __frameProbe: FrameProbe }
        ).__frameProbe.release(),
      )
  const send = (message: PresetRender) =>
    page.evaluate(
      (message) =>
        (
          window as typeof window & { __presetPort: MessagePort }
        ).__presetPort.postMessage(message),
      message,
    )
  const oldId = current.requestId + 200
  await hold()
  await send({ ...original, requestId: oldId })
  await expect.poll(async () => (await inspect()).blocked).toBe(true)
  await send({ ...current, requestId: oldId + 1 })
  await expect
    .poll(async () =>
      (await inspect()).acks.some(
        (a) => a.requestId === oldId + 1 && a.status === 'applied',
      ),
    )
    .toBe(true)
  await release()
  await expect
    .poll(async () =>
      (await inspect()).acks.some(
        (a) => a.requestId === oldId && a.status === 'rejected',
      ),
    )
    .toBe(true)
  expect(
    (await inspect()).acks.some(
      (a) => a.requestId === oldId && a.status === 'applied',
    ),
  ).toBe(false)

  // Replace the port while an older render is still compiling in this document.
  await hold()
  const before = (await inspect()).completed
  await send({ ...original, requestId: oldId + 2 })
  await expect.poll(async () => (await inspect()).blocked).toBe(true)
  await frame(page)
    .locator('html')
    .evaluate(() =>
      window.parent.postMessage(
        {
          type: 'ombelle-preset-preview-ready',
          version: 1,
        },
        '*',
      ),
    )
  await expect.poll(async () => (await inspect()).completed).toBe(before + 1)
  await release()
  await expect.poll(async () => (await inspect()).completed).toBe(before + 2)
  expect((await inspect()).acks.some((a) => a.requestId === oldId + 2)).toBe(
    false,
  )
  await expect(
    frame(page).locator('style[data-preset-styles]'),
  ).toHaveJSProperty('textContent', presetRuntimeStyles(current.result))
  for (const ack of (await inspect()).acks.filter(
    (a) => a.status === 'applied',
  )) {
    expect(ack.domHash).toBe(ack.presetHash)
    expect(ack.domRequest).toBe(String(ack.requestId))
    expect(ack.gallery).toBe(true)
    const result =
      ack.presetHash === original.result.preset.hash
        ? original.result
        : current.result
    expect(ack.css).toBe(presetRuntimeStyles(result))
  }
  await page
    .locator('iframe[title="Global preset gallery"]')
    .evaluate((frame) => {
      ;(frame as HTMLIFrameElement).src = (frame as HTMLIFrameElement).src
    })
  await ready(page)
  await expect(frame(page).locator('html')).toHaveAttribute(
    'data-preset-hash',
    hash!,
  )
})
test('supports keyboard editing and 320 pixel reflow', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 800 })
  await page.goto(url)
  await ready(page)
  await page.getByLabel('Preset name', { exact: true }).focus()
  await page.keyboard.press('ControlOrMeta+A')
  await page.keyboard.type('Keyboard theme')
  await expect(page.getByLabel('Preset name', { exact: true })).toHaveValue(
    'Keyboard theme',
  )
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true)
  const results = await new AxeBuilder({ page }).analyze()
  expect(results.violations).toEqual([])
  await page.getByLabel('Preview width', { exact: true }).selectOption('narrow')
  await frame(page).getByTestId('preset-button').focus()
  await page.keyboard.press('Tab')
  expect(
    await frame(page)
      .getByTestId('preset-gallery')
      .evaluate(() => document.activeElement?.tagName),
  ).toBe('BUTTON')
})
test('exports the current preset while preview is unavailable', async ({
  page,
}) => {
  await page.route('http://127.0.0.1:4173/**', (route) => route.abort())
  await page.goto(url)
  await expect(
    page.getByRole('button', { name: 'Download preset JSON' }),
  ).toBeEnabled({ timeout: 30000 })
  await page.getByLabel('Corner radius', { exact: true }).fill('1.3')
  await expect(page.getByTestId('preset-preview-status')).toHaveText(
    'Preview failed',
    { timeout: 15000 },
  )
  await expect(
    page.getByRole('alert').filter({ hasText: 'Preview unavailable' }),
  ).toContainText('pnpm generate:preview')
  expect(JSON.parse(await download(page)).design.radiusRem).toBe(1.3)
})
