import { FoundationError, isStyleFamily, isSupportedContractRelease, type PresetSnapshot, type SnapshotReference } from '@ombelle/contracts'
import { normalizePublishedPreset, verifyPresetSnapshot } from '@ombelle/compiler'
import { assertPublishOrigin, readSnapshotConfig, type SnapshotConfig } from './config'
import { readPublishBody } from './body'
import { clientRateKeys } from './client-key'
import { SnapshotServiceError } from './errors'
import { openConfiguredSnapshotStore } from './store-factory'
import type { SnapshotStore } from './store'

export interface SnapshotService {
  publish(request: Request): Promise<{ snapshot: PresetSnapshot; replayed: boolean }>
  read(ref: SnapshotReference): Promise<PresetSnapshot>
}
function invalidData(): SnapshotServiceError {
  return new SnapshotServiceError({ status: 400, code: 'INVALID_DATA', issues: [{ path: '/preset', message: 'Provide a valid supported preset.' }] })
}

async function verified(snapshot: PresetSnapshot): Promise<PresetSnapshot> {
  try { return await verifyPresetSnapshot(snapshot) }
  catch { throw new SnapshotServiceError({ status: 503, code: 'SNAPSHOT_SERVICE_UNAVAILABLE' }) }
}

export function createSnapshotService(config: SnapshotConfig, store: SnapshotStore): SnapshotService {
  return {
    async publish(request) {
      assertPublishOrigin(request.headers, config)
      const body = await readPublishBody(request)
      const { clientKey, networkKey } = clientRateKeys(request.headers, config)
      // The minute budget includes retries and validation failures. Body/media/
      // origin checks run first; normalization never runs after quota exhaustion.
      const now = Date.now()
      await store.consumeAttempt(clientKey, now)
      const idempotencyKey = request.headers.get('Idempotency-Key')
      if (!idempotencyKey || !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(idempotencyKey))
        throw new SnapshotServiceError({ status: 400, code: 'INVALID_IDEMPOTENCY_KEY' })
      if (!body || typeof body !== 'object' || Array.isArray(body) || Object.keys(body).length !== 1 || !Object.hasOwn(body, 'preset'))
        throw invalidData()
      const input: unknown = (body as { preset: unknown }).preset
      if (input && typeof input === 'object' && !Array.isArray(input)) {
        const fields = input as Record<string, unknown>
        // 1.1 is a preset that uses font pairs; the preset validator checks that the version and the fields agree.
        const schemaVersions = ['1.0', '1.1']
        if (['catalogRelease', 'compilerVersion'].some(key => typeof fields[key] === 'string' && !isSupportedContractRelease(fields[key])) ||
            (typeof fields.schemaVersion === 'string' && !schemaVersions.includes(fields.schemaVersion)) ||
            (typeof fields.styleFamily === 'string' && !isStyleFamily(fields.styleFamily)))
          throw new SnapshotServiceError({ status: 422, code: 'UNSUPPORTED_RELEASE' })
      }
      let preset
      try { preset = await normalizePublishedPreset(input) }
      catch (error) {
        if (error instanceof FoundationError) {
          if (error.code === 'UNSUPPORTED_RELEASE')
            throw new SnapshotServiceError({ status: 422, code: 'UNSUPPORTED_RELEASE' })
          if (error.message === 'Preset exceeds the 65,536-byte UTF-8 limit')
            throw new SnapshotServiceError({ status: 413, code: 'PAYLOAD_TOO_LARGE' })
          throw invalidData()
        }
        throw error
      }
      const result = await store.publish({ preset, idempotencyKey: idempotencyKey.toLowerCase(), clientKey, networkKey, now })
      return { snapshot: await verified(result.snapshot), replayed: result.replayed }
    },
    async read(ref) { return verified(await store.lookup(ref)) },
  }
}

// Each method owns its request connection. Constructing/importing this port is
// inert, and initialization failures remain inside the HTTP error boundary.
export function createRequestSnapshotService(): SnapshotService {
  async function use<T>(operation: (service: SnapshotService) => Promise<T>): Promise<T> {
    const config = readSnapshotConfig(process.env)
    const store = await openConfiguredSnapshotStore(config)
    try { return await operation(createSnapshotService(config, store)) }
    finally { await store.close() }
  }
  return { publish: (request) => use((service) => service.publish(request)), read: (ref) => use((service) => service.read(ref)) }
}
