import fs from 'node:fs/promises'
import { DatabaseSync } from 'node:sqlite'
import { expect, type Page } from '@playwright/test'
import { canonicalize, sha256 } from '@ombelle/compiler'
import type { PresetSnapshot, SnapshotSource, StyleFamily } from '@ombelle/contracts'
import { createPresetDraft, setPresetEdit, setPresetIdentity } from '../../apps/www/src/preset-editor/model.js'

const editorUrl = 'http://127.0.0.1:3000/editor/preset'
const frame = (page: Page) => page.locator('iframe[title="Global preset gallery"]').contentFrame()

export async function resetSnapshotBrowserQuota(): Promise<void> {
  const marker = JSON.parse(await fs.readFile('.artifacts/snapshot-browser.json', 'utf8')) as { dbPath: string }
  const db = new DatabaseSync(marker.dbPath)
  try { db.exec('DELETE FROM rate_buckets') } finally { db.close() }
}

export async function publishEditorPreset(page: Page, family: StyleFamily = 'flat'): Promise<{ snapshot: PresetSnapshot; source: SnapshotSource; idempotencyKey: string }> {
  let draft = createPresetDraft(family)
  draft = setPresetIdentity(draft, 'name', `Browser ${family} snapshot`)
  draft = setPresetEdit(draft, '/modes/light/background', '#f4f5f6')
  draft = setPresetEdit(draft, '/modes/dark/background', '#111827')
  await page.addInitScript((value) => {
    if (sessionStorage.getItem('ombelle:test:snapshot-editor-seeded')) return
    localStorage.setItem('ombelle:preset-editor:draft:v1', JSON.stringify(value))
    sessionStorage.setItem('ombelle:test:snapshot-editor-seeded', '1')
  }, draft)
  await page.goto(editorUrl)
  await expect(page.getByTestId('preset-hash')).not.toHaveText('Pending', { timeout: 30000 })
  await page.getByRole('button', { name: 'Publish preset…', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Publish public snapshot', exact: true })).toBeDisabled()
  await page.getByLabel('I understand this preset will be public and retained as described above.').check()
  const response = page.waitForResponse((r) => r.url().endsWith('/api/v1/presets') && r.request().method() === 'POST')
  await page.getByRole('button', { name: 'Publish public snapshot', exact: true }).click()
  const published = await response
  expect(published.status()).toBe(201)
  const snapshotLink = page.getByRole('link', { name: /ps_[a-f0-9]{32}@1/ }).first()
  const href = await snapshotLink.getAttribute('href')
  const match = href && /^\/presets\/(ps_[a-f0-9]{32})\/1$/.exec(href)
  expect(match).not.toBeNull()
  const lookup = await page.request.get(`http://127.0.0.1:3000/api/v1/presets/${match![1]}/1`)
  expect(lookup.status()).toBe(200)
  const snapshot = await lookup.json() as PresetSnapshot
  const idempotencyKey = published.request().headers()['idempotency-key']
  await expect(snapshotLink).toHaveText(`${snapshot.id}@1`)
  return { snapshot, source: { origin: 'http://127.0.0.1:3000', reference: `${snapshot.id}@1`, presetHash: snapshot.presetHash }, idempotencyKey }
}

export { canonicalize, sha256, frame }
