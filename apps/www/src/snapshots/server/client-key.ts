import { createHmac } from 'node:crypto'
import { isIP } from 'node:net'
import type { SnapshotConfig } from './config'
import { SnapshotServiceError } from './errors'

export function clientRateKey(headers: Headers, config: SnapshotConfig): string {
  let identity = 'ombelle-snapshot-development'
  if (config.clientIdentity.mode === 'trusted-header') {
    const raw = headers.get(config.clientIdentity.header)
    // Reject chains, ports, zone identifiers and missing values. Only the
    // operator's single ingress header participates; forwarding chains do not.
    if (!raw || raw.includes('%') || isIP(raw) === 0)
      throw new SnapshotServiceError({ status: 503, code: 'SNAPSHOT_SERVICE_UNAVAILABLE' })
    identity = raw
    if (isIP(raw) === 6) {
      identity = new URL(`http://[${raw}]/`).hostname.slice(1, -1)
      const mapped = /^::ffff:([a-f0-9]{1,4}):([a-f0-9]{1,4})$/.exec(identity)
      if (mapped) {
        const high = parseInt(mapped[1], 16)
        const low = parseInt(mapped[2], 16)
        identity = `${high >>> 8}.${high & 255}.${low >>> 8}.${low & 255}`
      }
    }
  }
  return createHmac('sha256', config.rateSecret).update(identity).digest('hex')
}
