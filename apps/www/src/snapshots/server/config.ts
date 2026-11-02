import { isAbsolute } from 'node:path'
import { normalizeSnapshotOrigin } from '@ombelle/contracts'
import { SnapshotServiceError } from './errors'

export type SnapshotConfig = ({ backend?: 'sqlite'; dbPath: string } | { backend: 'postgres'; databaseUrl: string }) & {
  publicOrigin: string
  rateSecret: string
  clientIdentity: { mode: 'development' } | { mode: 'trusted-header'; header: string }
}

export function readSnapshotConfig(env: Record<string, string | undefined>): SnapshotConfig {
  try {
    const backend = env.OMBELLE_SNAPSHOT_BACKEND ?? 'sqlite'
    if (!['sqlite', 'postgres'].includes(backend) || (env.VERCEL === '1' && backend !== 'postgres'))
      throw new Error('Invalid snapshot backend')
    const dbPath = env.OMBELLE_SNAPSHOT_DB_PATH
    const preview = env.VERCEL === '1' && env.VERCEL_ENV === 'preview'
    if (preview && !/^[a-z0-9-]+\.vercel\.app$/.test(env.VERCEL_URL ?? ''))
      throw new Error('Invalid preview deployment origin')
    const origin = preview ? 'https://' + env.VERCEL_URL : env.OMBELLE_PUBLIC_ORIGIN
    const rateSecret = env.OMBELLE_SNAPSHOT_RATE_SECRET
    if (
      !origin || !rateSecret || Buffer.byteLength(rateSecret, 'utf8') < 32
    )
      throw new Error('Invalid snapshot configuration')
    const publicOrigin = normalizeSnapshotOrigin(origin)
    const header = env.VERCEL === '1' ? 'x-vercel-forwarded-for' : env.OMBELLE_SNAPSHOT_CLIENT_IP_HEADER
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
    const shared = { publicOrigin, rateSecret, clientIdentity }
    if (backend === 'postgres') {
      const databaseUrl = env.DATABASE_URL
      if (!databaseUrl || /[\s\0]/.test(databaseUrl)) throw new Error('Missing Postgres connection')
      const url = new URL(databaseUrl)
      if (!['postgres:', 'postgresql:'].includes(url.protocol) || !url.username || !url.password || !url.hostname || url.pathname.length < 2 || url.hash)
        throw new Error('Invalid Postgres connection')
      const productionHost = env.OMBELLE_SNAPSHOT_PRODUCTION_DB_HOST
      const hostIdentity = (host: string) => host.toLowerCase().replace('-pooler.', '.')
      // A URL, port or trailing dot could never equal the parsed hostname and
      // would silently disable the guard, so accept only a bare DNS name.
      if (preview && (!productionHost || !/^[a-z0-9](?:[a-z0-9.-]*[a-z0-9])?$/i.test(productionHost) ||
        hostIdentity(url.hostname) === hostIdentity(productionHost)))
        throw new Error('Preview storage is not isolated')
      return { ...shared, backend: 'postgres', databaseUrl }
    }
    if (!dbPath || !isAbsolute(dbPath) || dbPath.includes('\0')) throw new Error('Invalid SQLite path')
    return { dbPath, ...shared, ...(env.OMBELLE_SNAPSHOT_BACKEND ? { backend: 'sqlite' as const } : {}) }
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
