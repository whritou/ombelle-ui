import { expect, test } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import fs from 'node:fs/promises'
import path from 'node:path'
import { DatabaseSync } from 'node:sqlite'
import { supportedComponentIds, supportedStyleFamilies, type PresetSnapshot } from '@ombelle/contracts'
import { withEditorPresetConsumer } from '../helpers/editor-preset-consumer.js'
import { canonicalize, frame, publishEditorPreset, resetSnapshotBrowserQuota, sha256 } from '../helpers/snapshot-browser.js'
import { assertPresetGalleryButtonPixels, snapshotPresetDom } from '../helpers/preset-gallery-parity.js'

test.beforeAll(async ({ browser }, info) => {
  await fs.writeFile('.artifacts/snapshot-browser-version.json', JSON.stringify({ engine: browser.browserType().name(), version: browser.version(), channel: info.project.use.channel ?? 'bundled' }, null, 2))
})
test.beforeEach(async () => resetSnapshotBrowserQuota())

for (const family of supportedStyleFamilies)
  for (const mode of ['light', 'dark'] as const)
    for (const framework of ['vite', 'next'] as const)
      test(`matches published ${family} ${mode} snapshot in installed ${framework}`, async ({ page, context }) => {
        test.setTimeout(360000)
        const { snapshot, source } = await publishEditorPreset(page, family)
        await page.goto(`http://127.0.0.1:3000/presets/${snapshot.id}/1`)
        await expect(page.getByRole('heading', { name: snapshot.preset.name })).toBeVisible()
        await expect(page.getByRole('status').first()).toHaveText('Snapshot gallery ready.')
        await expect(frame(page).locator('html')).toHaveAttribute('data-preset-hash', snapshot.presetHash)
        await page.getByLabel('Color mode', { exact: true }).selectOption(mode)
        await withEditorPresetConsumer({ kind: 'snapshot', source, family, framework }, async ({ root, url, result }) => {
          expect(result.preset.hash).toBe(snapshot.presetHash)
          expect(await fs.readFile(path.join(root, 'ui-preset.json'), 'utf8')).toBe(canonicalize(snapshot.preset) + '\n')
          const consumer = await context.newPage()
          try {
            const width = await frame(page).locator('html').evaluate(() => window.innerWidth)
            await consumer.setViewportSize({ width, height: 760 })
            await consumer.goto(url)
            await consumer.locator('html').evaluate((element, selected) => element.classList.toggle('dark', selected === 'dark'), mode)
            await consumer.evaluate(() => document.fonts.ready)
            const gallery = consumer.getByTestId('preset-gallery')
            await expect(gallery).toBeVisible()
            expect(await snapshotPresetDom(frame(page).getByTestId('preset-gallery'))).toEqual(await snapshotPresetDom(gallery))
            for (const artifact of result.artifacts.filter((a) => a.kind === 'component' || a.kind === 'utility')) {
              const content = await fs.readFile(path.join(root, 'src', artifact.logicalPath), 'utf8')
              expect(await sha256(content)).toBe(await sha256(artifact.content))
            }
            await assertPresetGalleryButtonPixels({
              page,
              iframe: page.locator('iframe[title="Global preset gallery"]'),
              previewButton: frame(page).getByTestId('preset-button'),
              installedButton: consumer.getByTestId('preset-button'),
              label: 'snapshot',
            })
            await frame(page).getByRole('button', { name: 'Open dialog', exact: true }).click()
            await consumer.getByRole('button', { name: 'Open dialog', exact: true }).click()
            expect(await snapshotPresetDom(frame(page).getByRole('dialog'))).toEqual(await snapshotPresetDom(consumer.getByRole('dialog')))
            expect(await page.getByRole('dialog').count()).toBe(0)
          } finally { await consumer.close() }
        })
      })

test('installs a scoped published Button into a differently themed host', async ({ page }) => {
  test.setTimeout(360000)
  const { source } = await publishEditorPreset(page, 'minimalist')
  await withEditorPresetConsumer({ kind: 'snapshot', source, family: 'flat', framework: 'vite', scope: 'button' }, async ({ root, url }) => {
    const lock = JSON.parse(await fs.readFile(path.join(root, 'ui-library.lock.json'), 'utf8'))
    expect(Object.values(lock.componentPresetSources).some((entry: any) => entry.presetHash === source.presetHash)).toBe(true)
    const host = await page.context().newPage()
    try {
      await host.goto(url)
      const globalButton = host.getByTestId('global-host-button')
      const scopedButton = host.getByTestId('published-scope-button')
      await expect(globalButton).toHaveAccessibleName('Host action')
      await expect(scopedButton).toHaveAccessibleName('Published action')
      const globalStyles = await globalButton.evaluate((el) => ({ radius: getComputedStyle(el).borderRadius, background: getComputedStyle(el).backgroundColor }))
      const scopedStyles = await scopedButton.evaluate((el) => ({ radius: getComputedStyle(el).borderRadius, background: getComputedStyle(el).backgroundColor }))
      expect(scopedStyles).not.toEqual(globalStyles)
      await scopedButton.focus()
      await expect(scopedButton).toBeFocused()
    } finally { await host.close() }
  })
})

test('requires explicit publication confirmation and makes no background requests', async ({ page }) => {
  const requests: string[] = []
  page.on('request', (request) => { if (request.url().includes('/api/v1/presets')) requests.push(request.url()) })
  await page.goto('http://127.0.0.1:3000/editor/preset')
  await expect(page.getByTestId('preset-hash')).not.toHaveText('Pending')
  expect(requests).toEqual([])
  await page.getByRole('button', { name: 'Publish preset…', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Publish public snapshot', exact: true })).toBeDisabled()
  expect(requests).toEqual([])
  await page.getByRole('button', { name: 'Cancel publication', exact: true }).click()
  expect(requests).toEqual([])
})

test('retries after the server commits and the response is lost', async ({ page }) => {
  let interrupted = false
  await page.route('**/api/v1/presets', async (route) => {
    if (!interrupted && route.request().method() === 'POST') {
      interrupted = true
      await route.fetch()
      await route.abort()
    } else await route.continue()
  })
  await page.goto('http://127.0.0.1:3000/editor/preset')
  await page.getByRole('button', { name: 'Publish preset…', exact: true }).click()
  await page.getByLabel('I understand this preset will be public and retained as described above.').check()
  await page.getByRole('button', { name: 'Publish public snapshot', exact: true }).click()
  await expect(page.getByRole('region', { name: 'Export your preset' }).getByRole('alert')).toBeVisible()
  await page.getByLabel('I understand this preset will be public and retained as described above.').check()
  await page.getByRole('button', { name: 'Retry publication', exact: true }).click()
  await expect(page.getByText('The current preset matches the last published hash.')).toBeVisible()
})

test('recovers a pending publication after refresh without submitting it', async ({ page }) => {
  let interrupted = false
  await page.route('**/api/v1/presets', async (route) => {
    if (!interrupted && route.request().method() === 'POST') { interrupted = true; await route.fetch(); await route.abort() }
    else await route.continue()
  })
  await page.goto('http://127.0.0.1:3000/editor/preset')
  await page.getByRole('button', { name: 'Publish preset…', exact: true }).click()
  await page.getByLabel('I understand this preset will be public and retained as described above.').check()
  await page.getByRole('button', { name: 'Publish public snapshot', exact: true }).click()
  await expect(page.getByRole('region', { name: 'Export your preset' }).getByRole('alert')).toBeVisible()
  await page.reload()
  await expect(page.getByRole('region', { name: 'Export your preset' }).getByRole('alert')).toContainText('recovered')
  expect(interrupted).toBe(true)
})

test('ignores a stale publication response after editing and reset', async ({ page }) => {
  let release!: () => void
  let held!: Promise<void>
  held = new Promise<void>((resolve) => { release = resolve })
  await page.route('**/api/v1/presets', async (route) => {
    const response = await route.fetch()
    await held
    await route.fulfill({ response })
  })
  await page.goto('http://127.0.0.1:3000/editor/preset')
  await page.getByRole('button', { name: 'Publish preset…', exact: true }).click()
  await page.getByLabel('I understand this preset will be public and retained as described above.').check()
  await page.getByRole('button', { name: 'Publish public snapshot', exact: true }).click()
  await page.getByLabel('Corner radius', { exact: true }).fill('1.5')
  await page.getByRole('button', { name: 'Reset corner radius', exact: true }).click()
  await expect(page.getByText('Current edits are unpublished.')).toBeVisible()
  release()
  await expect(page.getByText('Current edits are unpublished.')).toBeVisible()
  await expect(page.getByRole('link', { name: /ps_[a-f0-9]{32}@1/ })).toHaveCount(0)
})

test('keeps local exports available when publication service is unavailable', async ({ page }) => {
  await page.route('**/api/v1/presets', (route) => route.abort())
  await page.goto('http://127.0.0.1:3000/editor/preset')
  await expect(page.getByRole('button', { name: 'Download preset JSON', exact: true })).toBeEnabled()
  await page.getByRole('button', { name: 'Publish preset…', exact: true }).click()
  await page.getByLabel('I understand this preset will be public and retained as described above.').check()
  await page.getByRole('button', { name: 'Publish public snapshot', exact: true }).click()
  await expect(page.getByRole('region', { name: 'Export your preset' }).getByRole('alert')).toBeVisible()
  const pending = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Download preset JSON', exact: true }).click()
  expect(JSON.parse(await fs.readFile(await (await pending).path()!, 'utf8')).schemaVersion).toBe('1.0')
})

test('handles clipboard and storage denial while preserving draft exports', async ({ page }) => {
  await page.goto('http://127.0.0.1:3000/editor/preset')
  await page.evaluate(() => { Object.defineProperty(navigator, 'clipboard', { value: { writeText: async () => { throw new Error('denied') } } }) })
  await page.getByRole('button', { name: 'Copy export', exact: true }).click()
  await expect(page.getByRole('status').filter({ hasText: 'Clipboard unavailable' })).toBeVisible()
  await page.evaluate(() => { const set = Storage.prototype.setItem; Storage.prototype.setItem = function (...args) { if (args[0].includes('ombelle:preset-editor')) throw new DOMException('denied', 'SecurityError'); return set.apply(this, args) } })
  await page.getByLabel('Preset name', { exact: true }).fill('Still exportable')
  const pending = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Download preset JSON', exact: true }).click()
  expect(JSON.parse(await fs.readFile(await (await pending).path()!, 'utf8')).name).toBe('Still exportable')
})

test('shows share text and hash, downloads exact JSON, and preserves a safe draft', async ({ page }) => {
  const { snapshot } = await publishEditorPreset(page)
  await page.getByLabel('Preset name', { exact: true }).fill('Unpublished safe draft')
  await expect(page.getByTestId('preset-hash')).not.toHaveText(snapshot.presetHash)
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('ombelle:preset-editor:draft:v1')!).identity.name)).toBe('Unpublished safe draft')
  const draft = JSON.parse(await page.evaluate(() => localStorage.getItem('ombelle:preset-editor:draft:v1')!))
  await page.goto(`http://127.0.0.1:3000/presets/${snapshot.id}/1`)
  await expect(page.getByText(snapshot.presetHash, { exact: true })).toBeVisible()
  await expect(page.getByText(/Draft — automated token contrast only/)).toBeVisible()
  const pending = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Download preset JSON', exact: true }).click()
  const downloadedPreset = JSON.parse(await fs.readFile(await (await pending).path()!, 'utf8'))
  expect(downloadedPreset).toEqual(snapshot.preset)
  expect(JSON.parse(await page.evaluate(() => localStorage.getItem('ombelle:preset-editor:draft:v1')!))).toEqual(draft)
})

test('withdraws replay and respects conditional reads', async ({ page }) => {
  const { snapshot, source, idempotencyKey } = await publishEditorPreset(page)
  const marker = JSON.parse(await fs.readFile('.artifacts/snapshot-browser.json', 'utf8')) as { dbPath: string }
  const db = new DatabaseSync(marker.dbPath)
  try { db.prepare('INSERT INTO withdrawals(snapshot_id, reason, withdrawn_at) VALUES (?, ?, ?)').run(snapshot.id, 'operator-request', Date.now()) } finally { db.close() }
  const response = await page.request.get(`http://127.0.0.1:3000/api/v1/presets/${snapshot.id}/1`, { headers: { 'If-None-Match': '*' } })
  expect(response.status()).toBe(410)
  expect(await response.text()).not.toContain(snapshot.presetHash)
  const replay = await page.request.post('http://127.0.0.1:3000/api/v1/presets', { headers: { Origin: source.origin, 'Content-Type': 'application/json', 'Idempotency-Key': idempotencyKey }, data: { preset: snapshot.preset } })
  expect(replay.status()).toBe(410)
})

test('supports keyboard use, 320 pixel reflow, and axe checks', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 800 })
  await page.goto('http://127.0.0.1:3000/editor/preset')
  await expect(page.getByTestId('preset-hash')).not.toHaveText('Pending')
  await page.getByLabel('Preset name', { exact: true }).focus()
  await page.keyboard.press('ControlOrMeta+A')
  await page.keyboard.type('Keyboard snapshot')
  await expect(page.getByLabel('Preset name', { exact: true })).toHaveValue('Keyboard snapshot')
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([])
  await page.getByLabel('Preview width', { exact: true }).selectOption('narrow')
  await frame(page).getByTestId('preset-button').focus()
  await expect(frame(page).getByTestId('preset-button')).toBeFocused()
})
