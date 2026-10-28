import { expect, it } from 'vitest'
import { getCatalog } from '@ombelle/catalog'
import { compile, normalizePublishedPreset } from '@ombelle/compiler'
import {
  supportedComponentIds,
  type CompileResult,
  type PresetSnapshot,
} from '@ombelle/contracts'
import {
  createSnapshotPreviewSession,
  selectSnapshotPreview,
  type SnapshotPreviewState,
} from './preview-session'

async function fixture(id: string, family: 'flat' | 'minimalist' = 'flat') {
  const resolved = await normalizePublishedPreset(
    getCatalog('0.1.0').presets[family],
  )
  const snapshot: PresetSnapshot = {
    snapshotVersion: '1.0',
    id: 'ps_' + id.repeat(32),
    revision: 1,
    preset: resolved.data,
    presetHash: resolved.hash,
    catalogRelease: '0.1.0',
    compilerVersion: '0.1.0',
    createdAt: '2026-10-27T12:34:56.000Z',
    validationStatus: 'draft',
  }
  const result = await compile({
    preset: snapshot.preset,
    componentIds: supportedComponentIds,
    catalogRelease: '0.1.0',
    compilerVersion: '0.1.0',
  })
  return { snapshot, result }
}
function deferred<T>() {
  let resolve!: (value: T) => void, reject!: (reason: Error) => void
  const promise = new Promise<T>((yes, no) => {
    resolve = yes
    reject = no
  })
  return { promise, resolve, reject }
}
it('retires A gallery and delayed ACK through B pending and compilation rejection', async () => {
  const a = await fixture('a'),
    b = await fixture('b', 'minimalist')
  let current = a.snapshot,
    visible: SnapshotPreviewState | null = null
  const notify = (value: SnapshotPreviewState) => {
    visible = value
  }
  const first = createSnapshotPreviewSession(a.snapshot, {
    notify,
    isCurrent: () => current === a.snapshot,
    compile: async () => a.result,
  })
  await first.start()
  const aFrame = selectSnapshotPreview(current, visible).frame!
  expect(aFrame.result.preset.hash).toBe(a.snapshot.presetHash)
  aFrame.onStatus('ready')
  expect(selectSnapshotPreview(current, visible).status).toBe('ready')

  current = b.snapshot
  // React's next render must exclude A even before the old effect cleanup.
  expect(selectSnapshotPreview(current, visible).frame).toBeNull()
  aFrame.onStatus('ready')
  expect(selectSnapshotPreview(current, visible).status).toBe('compiling')
  first.dispose()
  const pending = deferred<CompileResult>()
  const second = createSnapshotPreviewSession(b.snapshot, {
    notify,
    isCurrent: () => current === b.snapshot,
    compile: () => pending.promise,
  })
  const compilation = second.start()
  expect(selectSnapshotPreview(current, visible).frame).toBeNull()
  aFrame.onStatus('ready')
  expect(selectSnapshotPreview(current, visible).status).toBe('compiling')
  pending.reject(new Error('Compilation failed'))
  await compilation
  expect(selectSnapshotPreview(current, visible).status).toBe('failed')
  expect(selectSnapshotPreview(current, visible).frame).toBeNull()
  aFrame.onStatus('ready')
  aFrame.onStatus('failed')
  expect(selectSnapshotPreview(current, visible).status).toBe('failed')
  expect(selectSnapshotPreview(current, visible).frame).toBeNull()
  second.dispose()
})
it('binds a replacement frame to B and ignores A completion and ACK after disposal', async () => {
  const a = await fixture('a'),
    b = await fixture('b') // Same payload hash, distinct immutable IDs.
  const pending = deferred<CompileResult>()
  let visible: SnapshotPreviewState | null = null
  const first = createSnapshotPreviewSession(a.snapshot, {
    notify: (state) => {
      visible = state
    },
    compile: () => pending.promise,
  })
  const compilation = first.start()
  first.dispose()
  const second = createSnapshotPreviewSession(b.snapshot, {
    notify: (state) => {
      visible = state
    },
    compile: async () => b.result,
  })
  await second.start()
  const bFrame = selectSnapshotPreview(b.snapshot, visible).frame!
  pending.resolve(a.result)
  await compilation
  expect(selectSnapshotPreview(b.snapshot, visible).frame?.key).toBe(bFrame.key)
  expect(selectSnapshotPreview(a.snapshot, visible).frame).toBeNull()
  bFrame.onStatus('ready')
  expect(selectSnapshotPreview(b.snapshot, visible).status).toBe('ready')
  second.dispose()
})
it('rejects a compiled result for a different preset hash without exposing a frame', async () => {
  const a = await fixture('a'),
    b = await fixture('b', 'minimalist')
  const session = createSnapshotPreviewSession(b.snapshot, {
    compile: async () => a.result,
  })
  await session.start()
  expect(selectSnapshotPreview(b.snapshot, session.state).frame).toBeNull()
  expect(selectSnapshotPreview(b.snapshot, session.state).status).toBe('failed')
  session.dispose()
})
