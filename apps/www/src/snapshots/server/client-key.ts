import { createHmac } from 'node:crypto'
import { isIP } from 'node:net'
import type { SnapshotConfig } from './config'
import { SnapshotServiceError } from './errors'

// A single IPv6 subscriber usually holds a whole /64 and can rotate interface
// addresses freely, so per-client limits key on the /64, and the network budget
// on the /48 a subscriber is usually delegated (RL-01). Input is the
// URL-normalized form: lowercase hex groups with at most one "::".
function ipv6Prefix(address: string, groups: 3 | 4): string {
  const [head, tail] = address.split('::')
  const left = head ? head.split(':') : []
  const right = tail ? tail.split(':') : []
  const all = tail === undefined ? left : [...left, ...Array(8 - left.length - right.length).fill('0'), ...right]
  return all.slice(0, groups).join(':') + '::/' + groups * 16
}

/** The client (IPv4 address or IPv6 /64) and network (IPv4 address or IPv6 /48) the request comes from. */
function clientIdentity(headers: Headers, config: SnapshotConfig): { client: string; network: string } {
  if (config.clientIdentity.mode !== 'trusted-header')
    return { client: 'ombelle-snapshot-development', network: 'ombelle-snapshot-development' }
  const raw = headers.get(config.clientIdentity.header)
  // Reject chains, ports, zone identifiers and missing values. Only the
  // operator's single ingress header participates; forwarding chains do not.
  if (!raw || raw.includes('%') || isIP(raw) === 0)
    throw new SnapshotServiceError({ status: 503, code: 'SNAPSHOT_SERVICE_UNAVAILABLE' })
  if (isIP(raw) === 4) return { client: raw, network: raw }
  const address = new URL(`http://[${raw}]/`).hostname.slice(1, -1)
  const mapped = /^::ffff:([a-f0-9]{1,4}):([a-f0-9]{1,4})$/.exec(address)
  if (mapped) {
    const high = parseInt(mapped[1], 16)
    const low = parseInt(mapped[2], 16)
    const v4 = `${high >>> 8}.${high & 255}.${low >>> 8}.${low & 255}`
    return { client: v4, network: v4 }
  }
  return { client: ipv6Prefix(address, 4), network: ipv6Prefix(address, 3) }
}

const keyed = (config: SnapshotConfig, identity: string) =>
  createHmac('sha256', config.rateSecret).update(identity).digest('hex')

export function clientRateKey(headers: Headers, config: SnapshotConfig): string {
  return keyed(config, clientIdentity(headers, config).client)
}
/** HMAC keys for the per-client and per-network budgets. IPv4 clients are their own network. */
export function clientRateKeys(headers: Headers, config: SnapshotConfig): { clientKey: string; networkKey: string } {
  const identity = clientIdentity(headers, config)
  return { clientKey: keyed(config, identity.client), networkKey: keyed(config, identity.network) }
}
