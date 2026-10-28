import { isAbsolute } from 'node:path'
import { normalizeSnapshotOrigin } from '@ombelle/contracts'
import { SnapshotServiceError } from './errors'

export type SnapshotConfig = {
  dbPath: string
  publicOrigin: string
  rateSecret: string
  clientIdentity: { mode: 'development' } | { mode: 'trusted-header'; header: string }
}

export function readSnapshotConfig(env: Record<string, string | undefined>): SnapshotConfig {
  try {
    const dbPath = env.OMBELLE_SNAPSHOT_DB_PATH
    const origin = env.OMBELLE_PUBLIC_ORIGIN
    const rateSecret = env.OMBELLE_SNAPSHOT_RATE_SECRET
    if (
      !dbPath || !isAbsolute(dbPath) || dbPath.includes('\0') ||
      !origin || !rateSecret || Buffer.byteLength(rateSecret, 'utf8') < 32
    )
      throw new Error('Invalid snapshot configuration')
    const publicOrigin = normalizeSnapshotOrigin(origin)
    const header = env.OMBELLE_SNAPSHOT_CLIENT_IP_HEADER
    let clientIdentity: SnapshotConfig['clientIdentity']
    if (header !== undefined) {
      if (!/^[!#$%&'*+.^_`|~0-9A-Za-z-]+$/.test(header))
        throw new Error('Invalid header name')
      clientIdentity = { mode: 'trusted-header', header: header.toLowerCase() }
    } else {
      if (!['localhost', '127.0.0.1', '[::1]'].includes(
        new URL(publicOrigin).hostname,
      ))
        throw new Error('Public publication requires trusted ingress')
      clientIdentity = { mode: 'development' }
    }
    // Parsing configuration never touches disk; initialization is explicit.
    return { dbPath, publicOrigin, rateSecret, clientIdentity }
  } catch {
    throw new SnapshotServiceError({ status: 503, code: 'SNAPSHOT_SERVICE_UNAVAILABLE' })
  }
}

export function assertPublishOrigin(
  headers: Headers,
  config: SnapshotConfig,
): void {
  const fetchSite = headers.get('Sec-Fetch-Site')?.toLowerCase()
  if (
    headers.get('Origin') !== config.publicOrigin ||
    (fetchSite !== undefined && !['same-origin', 'same-site', 'none'].includes(fetchSite))
  )
    throw new SnapshotServiceError({ status: 403, code: 'ORIGIN_NOT_ALLOWED' })
}
