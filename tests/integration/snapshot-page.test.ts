import { afterEach, expect, it, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { readFile, mkdtemp, rm, stat } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { randomUUID } from 'node:crypto'
import { canonicalize } from '@ombelle/compiler'
import { parseSnapshotReference } from '@ombelle/contracts'
import Page, {
  dynamic,
  runtime,
} from '../../apps/www/src/app/presets/[id]/[revision]/page'
import {
  initializeSnapshotStore,
  openSnapshotStore,
} from '../../apps/www/src/snapshots/server/sqlite-store'
import { createRequestSnapshotService } from '../../apps/www/src/snapshots/server/service'

const roots: string[] = []
afterEach(async () => {
  vi.unstubAllEnvs()
  for (const root of roots.splice(0))
    await rm(root, { recursive: true, force: true })
})
async function fixture() {
  const root = await mkdtemp(join(tmpdir(), 'ombelle-snapshot-page-'))
  roots.push(root)
  const dbPath = join(root, 'snapshots.sqlite')
  initializeSnapshotStore(dbPath)
  vi.stubEnv('OMBELLE_SNAPSHOT_DB_PATH', dbPath)
  vi.stubEnv('OMBELLE_PUBLIC_ORIGIN', 'http://127.0.0.1:3000')
  vi.stubEnv('OMBELLE_SNAPSHOT_RATE_SECRET', 'page-secret'.repeat(4))
  vi.stubEnv('OMBELLE_SNAPSHOT_CLIENT_IP_HEADER', undefined)
  const preset = JSON.parse(
    await readFile('examples/preset.example.json', 'utf8'),
  )
  preset.name = '<b>Shared & draft</b>'
  const { snapshot } = await createRequestSnapshotService().publish(
    new Request('http://127.0.0.1:3000/api/v1/presets', {
      method: 'POST',
      headers: {
        Origin: 'http://127.0.0.1:3000',
        'Content-Type': 'application/json',
        'Idempotency-Key': randomUUID(),
      },
      body: JSON.stringify({ preset }),
    }),
  )
  const render = async (id = snapshot.id) =>
    renderToStaticMarkup(
      await Page({ params: Promise.resolve({ id, revision: '1' }) }),
    )
  return { dbPath, snapshot, render }
}
it('renders escaped read-only draft metadata, canonical JSON and precise scope instructions', async () => {
  const { snapshot, render } = await fixture()
  const html = await render()
  expect(dynamic).toBe('force-dynamic')
  expect(runtime).toBe('nodejs')
  expect(html).toContain('&lt;b&gt;Shared &amp; draft&lt;/b&gt;')
  expect(html).not.toContain('<b>Shared')
  expect(html).toContain('Draft — automated token contrast only')
  expect(html).toContain(snapshot.presetHash)
  expect(html).toContain(`${snapshot.id}@1`)
  expect(html).toContain('pnpm build:packages')
  expect(html).toContain('Node 24.19.0')
  expect(html).toContain('pnpm 11.25.0')
  expect(html).toContain('Existing shadcn theme')
  expect(html).toContain('component source')
  expect(html).toContain('Global preset gallery')
  expect(html).toContain('readOnly=""')
  const escaped = canonicalize(snapshot.preset)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#x27;')
  expect(html).toContain(escaped + '\n</textarea>')
  expect(html).toContain('no automatic expiry')
  expect(html).toContain(
    'cached copies and installed source cannot be recalled',
  )
  expect(html).not.toMatch(
    /Import into editor|Overwrite draft|localStorage|requestHost/,
  )
})
it('rechecks withdrawal on the next read and never renders the withdrawn payload or gallery', async () => {
  const { snapshot, dbPath, render } = await fixture()
  expect(await render()).toContain(snapshot.presetHash)
  const store = openSnapshotStore(dbPath)
  try {
    store.withdraw(
      parseSnapshotReference(`${snapshot.id}@1`),
      'operator-request',
      Date.now(),
    )
  } finally {
    store.close()
  }
  const html = await render()
  expect(html).toContain('Snapshot withdrawn')
  expect(html).not.toContain(snapshot.presetHash)
  expect(html).not.toContain('Shared &amp; draft')
  expect(html).not.toContain('<iframe')
  expect(html).not.toContain('textarea')
})
it('renders missing and unavailable states without creating a database or disclosing errors', async () => {
  const { render, dbPath } = await fixture()
  expect(await render('ps_' + 'f'.repeat(32))).toContain('Snapshot not found')
  const missing = join(dbPath, '..', 'missing.sqlite')
  vi.stubEnv('OMBELLE_SNAPSHOT_DB_PATH', missing)
  const html = await render()
  expect(html).toContain('Snapshot unavailable')
  expect(html).not.toContain(missing)
  await expect(stat(missing)).rejects.toThrow()
  vi.stubEnv('OMBELLE_PUBLIC_ORIGIN', undefined)
  expect(await render()).toContain('Snapshot unavailable')
})
it('fails closed if configured origin cannot be safely displayed in a shell command', async () => {
  const { render } = await fixture()
  vi.stubEnv('OMBELLE_PUBLIC_ORIGIN', 'https://a;whoami.test')
  vi.stubEnv('OMBELLE_SNAPSHOT_CLIENT_IP_HEADER', 'x-real-ip')
  expect(await render()).toContain('Snapshot unavailable')
})
