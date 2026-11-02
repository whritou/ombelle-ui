import { createHmac } from 'node:crypto'
import { isIP } from 'node:net'
import type { SnapshotConfig } from './config'
import { SnapshotServiceError } from './errors'

// A single IPv6 subscriber usually holds a whole /64 and can rotate interface
// addresses freely, so per-client limits key on the network prefix. Input is
// the URL-normalized form: lowercase hex groups with at most one "::".
function ipv6Prefix64(address: string): string {
  const [head, tail] = address.split('::')
  const left = head ? head.split(':') : []
  const right = tail ? tail.split(':') : []
  const groups = tail === undefined ? left : [...left, ...Array(8 - left.length - right.length).fill('0'), ...right]
  return groups.slice(0, 4).join(':') + '::/64'
}

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
      } else identity = ipv6Prefix64(identity)
    }
  }
  return createHmac('sha256', config.rateSecret).update(identity).digest('hex')
}
