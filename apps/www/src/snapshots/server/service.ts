import { FoundationError, type PresetSnapshot, type SnapshotReference } from '@ombelle/contracts'
import { normalizePublishedPreset, verifyPresetSnapshot } from '@ombelle/compiler'
import { assertPublishOrigin, readSnapshotConfig, type SnapshotConfig } from './config'
import { readPublishBody } from './body'
import { clientRateKey } from './client-key'
import { SnapshotServiceError } from './errors'
import { openSnapshotStore } from './sqlite-store'
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
      const clientKey = clientRateKey(request.headers, config)
      // The minute budget includes retries and validation failures. Body/media/
      // origin checks run first; normalization never runs after quota exhaustion.
      const now = Date.now()
      store.consumeAttempt(clientKey, now)
      const idempotencyKey = request.headers.get('Idempotency-Key')
      if (!idempotencyKey || !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(idempotencyKey))
        throw new SnapshotServiceError({ status: 400, code: 'INVALID_IDEMPOTENCY_KEY' })
      if (!body || typeof body !== 'object' || Array.isArray(body) || Object.keys(body).length !== 1 || !Object.hasOwn(body, 'preset'))
        throw invalidData()
      const input: unknown = (body as { preset: unknown }).preset
      if (input && typeof input === 'object' && !Array.isArray(input)) {
        const fields = input as Record<string, unknown>
        const releases = { schemaVersion: '1.0', catalogRelease: '0.1.0', compilerVersion: '0.1.0' }
        if (Object.entries(releases).some(([key, value]) => typeof fields[key] === 'string' && fields[key] !== value) ||
            (typeof fields.styleFamily === 'string' && !['flat', 'minimalist', 'neo-brutalism'].includes(fields.styleFamily)))
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
      const result = store.publish({ preset, idempotencyKey: idempotencyKey.toLowerCase(), clientKey, now })
      return { snapshot: await verified(result.snapshot), replayed: result.replayed }
    },
    async read(ref) { return verified(store.lookup(ref)) },
  }
}

// Each method owns its request connection. Constructing/importing this port is
// inert, and initialization failures remain inside the HTTP error boundary.
export function createRequestSnapshotService(): SnapshotService {
  async function use<T>(operation: (service: SnapshotService) => Promise<T>): Promise<T> {
    const config = readSnapshotConfig(process.env)
    const store = openSnapshotStore(config.dbPath)
    try { return await operation(createSnapshotService(config, store)) }
    finally { store.close() }
  }
  return { publish: (request) => use((service) => service.publish(request)), read: (ref) => use((service) => service.read(ref)) }
}
