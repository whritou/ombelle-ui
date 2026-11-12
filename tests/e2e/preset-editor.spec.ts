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
import { getCatalog } from '@ombelle/catalog'
import {
  createPresetDraft,
  setPresetEdit,
} from '../../apps/www/src/preset-editor/model.js'
import { openExport, segment, waitForCompiled } from '../helpers/preset-editor-ui.js'
import { expectVisibleFocus, arrowTo, tabTo } from '../helpers/keyboard-focus.js'
import { withEditorPresetConsumer } from '../helpers/editor-preset-consumer.js'
import { expectColorParity } from '../helpers/color-compare.js'
import { assertPresetGalleryButtonPixels, snapshotPresetDom } from '../helpers/preset-gallery-parity.js'
import { sceneComponents } from '../../apps/www/src/preset-editor/preview-scenes.js'
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

const url = 'http://127.0.0.1:3000/editor/preset?page=gallery'
const frame = (page: Page) =>
  page.locator('iframe[title="Global preset gallery"]').contentFrame()
async function ready(page: Page) {
  // The hash readout lives in the Export tab, which is closed by default. Get
  // code is disabled until the current draft has compiled, so it carries the
  // same "not Pending" guarantee without opening the drawer.
  await waitForCompiled(page)
  await expect(page.getByTestId('preset-preview-status')).toHaveText(
    'Preview ready',
    { timeout: 30000 },
  )
}
const familyButton = (page: Page, name: string) =>
  segment(page, 'Style family', name)
async function chooseMenuItem(page: Page, name: string) {
  await page.getByRole('button', { name: 'More actions', exact: true }).click()
  await page.getByRole('menuitem', { name, exact: true }).click()
}
async function download(page: Page) {
  await openExport(page)
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
      await segment(page, 'Preview mode', mode === 'dark' ? 'Dark' : 'Light').click()
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
      // Contrast results open from the review drawer's Checks tab.
      await page.getByRole('button', { name: /^Open checks/ }).click()
      const checks = page.getByRole('tabpanel')
      await expect(checks.getByText(/^\d \/ 8 pass$/)).toHaveCount(2)
      await checks.getByRole('button', { name: 'Show', exact: true }).click()
      expect(
        (await checks.locator('#preset-checks-passing li').count()) +
          (await checks.getByRole('list', { name: 'Warnings' }).locator('li').count()),
      ).toBe(16)
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
        await segment(page, 'Preview mode', mode === 'dark' ? 'Dark' : 'Light').click()
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
              expectColorParity(
                await snapshotPresetDom(frame(page).getByTestId('preset-gallery')),
                await snapshotPresetDom(specimen),
              )
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
              expectColorParity(
                await snapshotPresetDom(frame(page).getByRole('dialog')),
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

const scenes = [
  { option: 'Dashboard', heading: 'Overview', components: sceneComponents.dashboard },
  { option: 'Projects', heading: 'Projects', components: sceneComponents.projects },
  { option: 'Settings', heading: 'Settings', components: sceneComponents.settings },
  { option: 'Sign in', heading: 'Sign in to Acme', components: 'Card, Alert, Label, Input, Checkbox, Button, Separator' },
] as const
for (const family of supportedStyleFamilies)
  test(`opens on the dashboard and shows the dashboard, projects, settings and sign-in pages in ${family}`, async ({ page }) => {
    await page.addInitScript(
      (draft) =>
        localStorage.setItem('ombelle:preset-editor:draft:v1', JSON.stringify(draft)),
      createPresetDraft(family),
    )
    await page.goto('http://127.0.0.1:3000/editor/preset')
    await ready(page)
    await expect(segment(page, 'Preview page', 'Dashboard')).toHaveAttribute('aria-checked', 'true')
    await expect(
      page.getByRole('radiogroup', { name: 'Preview page' }).getByRole('radio', { name: 'Gallery' }),
    ).toHaveCount(0)
    for (const scene of scenes) {
      await segment(page, 'Preview page', scene.option).click()
      await ready(page)
      await expect(
        frame(page).getByRole('heading', { name: scene.heading, exact: true, level: 1 }),
      ).toBeVisible()
      await expect(page.getByText('Components in this page: ' + scene.components)).toBeVisible()
      if (scene.option === 'Settings') {
        const option = frame(page).locator('[data-slot="radio-group-option"]')
          .filter({ hasText: 'Real time' })
        await expect(option).toHaveAttribute('aria-disabled', 'true')
        await expect(option.getByRole('radio')).toBeDisabled()
        await expect(frame(page).locator('[data-slot="radio-group-option"]').first())
          .not.toHaveAttribute('aria-disabled', 'true')
      }
      const violations = (
        await new AxeBuilder({ page })
          .include('iframe[title="Global preset gallery"]')
          .analyze()
      ).violations
      expect(violations).toEqual([])
    }
    await page.goto(url)
    await ready(page)
    await expect(frame(page).getByTestId('preset-gallery')).toBeVisible()
  })

test('renders every sign-in component in liquid glass, with no placeholder', async ({ page }) => {
  await page.addInitScript(
    (draft) =>
      localStorage.setItem('ombelle:preset-editor:draft:v1', JSON.stringify(draft)),
    createPresetDraft('liquid-glass'),
  )
  await page.goto(url)
  await ready(page)
  await segment(page, 'Preview page', 'Sign in').click()
  await ready(page)
  await expect(frame(page).getByRole('heading', { name: 'Sign in to Acme', level: 1 })).toBeVisible()
  // Every component is experimental in glass, so the Separator renders instead of a placeholder.
  await expect(frame(page).getByText('Unavailable in liquid glass')).toHaveCount(0)
  await expect(frame(page).locator('[data-slot="separator"]').first()).toBeVisible()
  await expect(frame(page).getByRole('button', { name: 'Sign in', exact: true })).toBeVisible()
})

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
  await chooseMenuItem(page, 'Reset all tokens…')
  await page
    .getByRole('button', { name: 'Confirm change', exact: true })
    .click()
  // Reset returns to the fresh draft's Ombelle family border width.
  await expect(page.getByLabel('Border width', { exact: true })).toHaveValue(
    String(getCatalog('0.1.0').presets.ombelle.design.borderWidthPx),
  )
})
test('preserves explicit edits through confirmed and cancelled family changes', async ({
  page,
}) => {
  await page.goto(url)
  await ready(page)
  await page.getByLabel('Corner radius', { exact: true }).fill('0.6')
  await page.getByLabel('Corner radius', { exact: true }).fill('0.5')
  // Colour tokens are edited in a popover opened from their row; the full
  // list sits behind a toggle.
  await page.getByRole('button', { name: 'Show all 19 tokens' }).click()
  await page.getByRole('button', { name: /^Primary colors/ }).click()
  await page.getByLabel('Dark primary', { exact: true }).fill('invalid')
  await page.keyboard.press('Escape')
  await familyButton(page, 'Neo-brutalism').click()
  await page.getByRole('button', { name: 'Cancel', exact: true }).click()
  await expect(familyButton(page, 'Ombelle')).toHaveAttribute('aria-checked', 'true')
  await familyButton(page, 'Neo-brutalism').click()
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
  await expect(familyButton(page, 'Ombelle')).toHaveAttribute('aria-checked', 'true')
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
  await openExport(page)
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
  await openExport(page)
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
  // The top bar's Download JSON is disabled for the same stale draft.
  await page.getByRole('button', { name: 'More actions', exact: true }).click()
  await expect(page.getByRole('menuitem', { name: 'Download JSON', exact: true })).toBeDisabled()
  await page.keyboard.press('Escape')
  await expect(page.getByRole('menu', { name: 'More actions' })).toBeHidden()
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
  await openExport(page)
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
test('supports keyboard editing and 320 pixel reflow', async ({
  page,
  context,
}) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write'])
  await page.setViewportSize({ width: 320, height: 800 })
  await page.goto(url)
  await ready(page)
  const name = page.getByLabel('Preset name', { exact: true })
  const defaultName = await name.inputValue()
  await name.focus()
  await page.keyboard.press('ControlOrMeta+A')
  await page.keyboard.type('Keyboard theme')
  await expect(name).toHaveValue('Keyboard theme')

  const undo = page.getByRole('button', { name: 'Undo', exact: true })
  const redo = page.getByRole('button', { name: 'Redo', exact: true })
  for (const [from, to, value] of [
    [undo, redo, defaultName],
    [redo, undo, 'Keyboard theme'],
  ] as const) {
    await tabTo(page, from)
    for (let presses = 0; presses < 40 && (await from.isEnabled()); presses++) {
      await expect(from).toBeFocused()
      await page.keyboard.press('Enter')
    }
    await expect(name).toHaveValue(value)
    await expect(to).toBeFocused()
    await expectVisibleFocus(page)
  }

  const family = familyButton(page, 'Minimalist')
  const confirmDialog = page.getByRole('dialog', {
    name: 'Change style family?',
  })
  await arrowTo(page, family)
  await page.keyboard.press('Enter')
  await expect(confirmDialog).toBeVisible()
  await expect(
    confirmDialog.getByRole('button', { name: 'Cancel', exact: true }),
  ).toBeFocused()
  await expectVisibleFocus(page)
  await page.keyboard.press('Escape')
  await expect(confirmDialog).toBeHidden()
  await expect(familyButton(page, 'Ombelle')).toHaveAttribute('aria-checked', 'true')
  await expect(family).toBeFocused()
  await page.keyboard.press('Enter')
  await expect(confirmDialog).toBeVisible()
  await page.keyboard.press('Tab')
  await expect(
    confirmDialog.getByRole('button', { name: 'Confirm change', exact: true }),
  ).toBeFocused()
  await expectVisibleFocus(page)
  await page.keyboard.press('Enter')
  await expect(confirmDialog).toBeHidden()
  await expect(family).toHaveAttribute('aria-checked', 'true')
  await expect(family).toBeFocused()

  const lightPrimary = page.getByLabel('Light primary', { exact: true })
  const lightDefault = await lightPrimary.inputValue()
  await tabTo(page, page.getByRole('button', { name: 'Show all 19 tokens' }))
  await page.keyboard.press('Enter')
  await tabTo(page, page.getByRole('button', { name: /^Primary colors/ }), { backward: true })
  await page.keyboard.press('Enter')
  await expect(lightPrimary).toBeVisible()
  await tabTo(page, lightPrimary)
  await page.keyboard.press('ControlOrMeta+A')
  await page.keyboard.type('#1d4ed8')
  await expect(lightPrimary).toHaveValue('#1d4ed8')
  await tabTo(page, page.getByRole('button', { name: 'Reset light primary', exact: true }))
  await page.keyboard.press('Enter')
  await expect(lightPrimary).toHaveValue(lightDefault)
  await expect(lightPrimary).toBeFocused()
  await expectVisibleFocus(page)
  const darkPrimary = page.getByLabel('Dark primary', { exact: true })
  await tabTo(page, darkPrimary)
  await page.keyboard.press('ControlOrMeta+A')
  await page.keyboard.type('#22c55e')
  await expect(darkPrimary).toHaveValue('#22c55e')
  await ready(page)
  // Close the colour popover the way a keyboard user would.
  await page.keyboard.press('Escape')

  const exportRail = page.getByRole('button', { name: /^Open export/ })
  await tabTo(page, exportRail, { max: 300 })
  await page.keyboard.press('Enter')
  await expect(page.getByRole('tab', { name: 'Export' })).toBeFocused()
  const downloadButton = page.getByRole('button', {
    name: 'Download preset JSON',
    exact: true,
  })
  await expect(downloadButton).toBeEnabled()
  await tabTo(page, downloadButton, { max: 300 })
  const pending = page.waitForEvent('download')
  await page.keyboard.press('Enter')
  const item = await pending
  expect(item.suggestedFilename()).toBe('project-preset.json')
  expect(JSON.parse(await fs.readFile((await item.path())!, 'utf8'))).toMatchObject({
    name: 'Keyboard theme',
    modes: { dark: { primary: '#22c55e' } },
  })
  const output = page.getByLabel('Output', { exact: true })
  await tabTo(page, output)
  await page.keyboard.press('ArrowDown')
  await expect(output).toHaveValue('tokens')
  await expect(page.getByLabel('Export text')).toHaveValue(/--/)
  await tabTo(page, page.getByRole('button', { name: 'Copy export' }))
  await page.keyboard.press('Enter')
  await expect(page.getByRole('status')).toHaveText('Export copied.')
  await tabTo(page, page.getByLabel('Export text'))
  const dependencies = page.getByRole('button', { name: 'Dependencies', exact: true })
  await tabTo(page, dependencies)
  await page.keyboard.press('Enter')
  await expect(dependencies).toHaveAttribute('aria-expanded', 'true')
  const install = page.getByLabel('Installation path', { exact: true })
  await tabTo(page, install)
  await page.keyboard.press('ArrowDown')
  await expect(page.getByTestId('preset-install-command')).toContainText(
    'theme add ./project-preset.json',
  )

  const getCode = page.getByRole('button', { name: 'Get code', exact: true })
  await tabTo(page, getCode, { backward: true, max: 600 })
  const published = page.waitForResponse(
    (r) => r.url().endsWith('/api/v1/presets') && r.request().method() === 'POST',
  )
  await page.keyboard.press('Enter')
  expect((await published).status()).toBe(201)
  const dialog = page.getByRole('dialog', { name: 'Get code' })
  const command = dialog.getByTestId('get-code-command')
  await expect(command).toContainText(/init --preset ps_[a-f0-9]{32}@1/)
  await dialog.getByRole('tab', { name: 'New project' }).focus()
  await page.keyboard.press('ArrowRight')
  await expect(dialog.getByRole('tab', { name: 'Existing project' })).toBeFocused()
  await expect(command).toContainText(/theme add ps_[a-f0-9]{32}@1/)
  await expectVisibleFocus(page)
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([])
  await page.keyboard.press('Escape')
  await expect(dialog).toHaveCount(0)
  await expect(getCode).toBeFocused()
  await expectVisibleFocus(page)
  const layout = await page.evaluate(() => ({
    width: window.innerWidth,
    scrollWidth: document.documentElement.scrollWidth,
    overflowing: Array.from(document.querySelectorAll('body *'))
      .filter((node) => node.getBoundingClientRect().right > window.innerWidth + 1)
      .slice(0, 8)
      .map((node) => ({ tag: node.tagName, class: node.className, text: node.textContent?.slice(0, 60) })),
  }))
  expect(layout.scrollWidth, JSON.stringify(layout)).toBeLessThanOrEqual(layout.width)
  const results = await new AxeBuilder({ page }).analyze()
  expect(results.violations).toEqual([])
  await segment(page, 'Preview width', '320 px').click()
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
  await openExport(page)
  await expect(
    page.getByRole('button', { name: 'Download preset JSON' }),
  ).toBeEnabled({ timeout: 30000 })
  await page.getByLabel('Corner radius', { exact: true }).fill('1.3')
  await expect(page.getByTestId('preset-preview-status')).toHaveText(
    'Preview failed',
    { timeout: 15000 },
  )
  const alert = page.getByRole('alert').filter({ hasText: 'Preview unavailable' })
  await expect(alert).toContainText('You can still export a valid preset')
  await expect(alert.getByRole('button', { name: 'Retry preview' })).toBeVisible()
  expect(JSON.parse(await download(page)).design.radiusRem).toBe(1.3)
})
test('applies accent and base color schemes in one step and returns to the style default', async ({
  page,
}) => {
  await page.goto(url)
  await ready(page)
  const rose = page.getByRole('button', { name: 'Rose accent', exact: true })
  await rose.click()
  await expect(rose).toHaveAttribute('aria-pressed', 'true')
  await page.getByRole('button', { name: 'Stone base', exact: true }).click()
  await ready(page)
  const preset = JSON.parse(await download(page))
  expect(preset.modes.light.primary.toLowerCase()).toBe('#e11d48')
  expect(preset.modes.dark.background.toLowerCase()).toBe('#1c1917')
  await page.getByRole('button', { name: 'Style default base', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Stone base', exact: true })).toHaveAttribute('aria-pressed', 'false')
  await expect(rose).toHaveAttribute('aria-pressed', 'true')
  await page.getByRole('button', { name: 'Undo', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Stone base', exact: true })).toHaveAttribute('aria-pressed', 'true')
})
test('edits numeric design values with a slider and keeps the exact field in sync', async ({
  page,
}) => {
  await page.goto(url)
  await ready(page)
  const slider = page.getByLabel('Corner radius slider', { exact: true })
  await slider.focus()
  await page.keyboard.press('ArrowRight')
  await expect(page.getByLabel('Corner radius', { exact: true })).toHaveValue('0.55')
  await page.getByLabel('Corner radius', { exact: true }).fill('1.25')
  await expect(slider).toHaveAttribute('aria-valuenow', '1.25')
})
test('keeps focus on the number field after resetting a slider row', async ({ page }) => {
  await page.goto(url)
  await ready(page)
  const field = page.getByLabel('Corner radius', { exact: true })
  await field.fill('1')
  await page.getByRole('button', { name: 'Reset corner radius', exact: true }).click()
  await expect(field).toBeFocused()
})
test('keeps focus on a non-core token field after resetting it', async ({ page }) => {
  await page.goto(url)
  await ready(page)
  await page.getByRole('button', { name: 'Show all 19 tokens' }).click()
  await page.getByRole('button', { name: /^Card colors/ }).click()
  const light = page.getByLabel('Light card', { exact: true })
  await light.fill('#123456')
  await page.getByRole('button', { name: 'Show fewer tokens' }).click()
  await page.getByRole('button', { name: /^Card colors/ }).click()
  await page.getByRole('button', { name: 'Reset light card', exact: true }).click()
  await expect(light).toBeFocused()
})
test('names warnings on the closed drawer rail and edits the failing token from Checks', async ({ page }) => {
  const draft = setPresetEdit(
    createPresetDraft('flat'),
    '/modes/light/mutedForeground',
    '#d4d4d8',
  )
  await page.addInitScript(
    (draft) =>
      localStorage.setItem('ombelle:preset-editor:draft:v1', JSON.stringify(draft)),
    draft,
  )
  await page.goto(url)
  await ready(page)
  // The drawer starts closed; the rail still reports the warning.
  const rail = page.getByRole('button', { name: /^Open checks: \d+ warnings?$/ })
  await expect(rail).toBeVisible()
  await rail.click()
  const checks = page.getByRole('tabpanel')
  await expect(checks.getByText('Muted foreground on muted')).toBeVisible()
  await checks.getByRole('button', { name: 'Edit muted foreground token' }).click()
  await expect(page.locator('#preset-color-panel-mutedForeground')).toBeVisible()
  await expect(page.locator('#preset-modes-light-mutedForeground')).toBeFocused()
})
test('navigates the overflow menu by keyboard and returns focus after closing ID & revision', async ({ page }) => {
  await page.goto(url)
  await ready(page)
  const more = page.getByRole('button', { name: 'More actions', exact: true })
  const dialog = page.getByRole('dialog', { name: 'ID & revision' })
  const item = (name: string) => page.getByRole('menuitem', { name, exact: true })
  const menu = page.getByRole('menu', { name: 'More actions' })
  // Menu keyboard pattern: opening focuses the first item; arrows wrap; Home/End; Escape returns to the trigger.
  await more.focus()
  await page.keyboard.press('Enter')
  await expect(item('Download JSON')).toBeFocused()
  await page.keyboard.press('ArrowDown')
  await expect(item('ID & revision…')).toBeFocused()
  await page.keyboard.press('End')
  await expect(item('Reset all tokens…')).toBeFocused()
  await page.keyboard.press('ArrowDown')
  await expect(item('Download JSON')).toBeFocused()
  await page.keyboard.press('ArrowUp')
  await expect(item('Reset all tokens…')).toBeFocused()
  await page.keyboard.press('Home')
  await expect(item('Download JSON')).toBeFocused()
  await page.keyboard.press('Escape')
  await expect(menu).toBeHidden()
  await expect(more).toBeFocused()
  await page.keyboard.press('Enter')
  await item('ID & revision…').click()
  await expect(dialog).toBeVisible()
  await dialog.getByRole('button', { name: 'Done', exact: true }).click()
  await expect(dialog).toBeHidden()
  await expect(more).toBeFocused()
  await more.click()
  await page.getByRole('menuitem', { name: 'ID & revision…', exact: true }).click()
  await expect(dialog).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(dialog).toBeHidden()
  await expect(more).toBeFocused()
})
