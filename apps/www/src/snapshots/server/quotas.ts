import { SnapshotServiceError } from './errors'

/**
 * Shared publication quotas for both store adapters and both publication kinds.
 * Codes are generated automatically when a visitor opens "Get code", so the
 * budgets allow normal iterative editing; capacity limits still bound storage.
 */
export const publicationQuotas = {
  /** POST attempts per client per fixed minute, including retries. */
  attemptsPerMinute: 30,
  /** New publications per client (an IPv4 address or an IPv6 /64) per UTC day; idempotent replay is free. */
  clientPerDay: 200,
  /**
   * New publications per network per UTC day. An IPv6 network is the /48 a subscriber is usually delegated,
   * so one subscriber cannot multiply the client budget by rotating /64s. An IPv4 network is the address.
   */
  networkPerDay: 1_000,
  /** New publications across all clients per UTC day. */
  globalPerDay: 5_000,
  /** The last part of the global day that only light networks may spend, so heavy users cannot lock everyone out. */
  reservedPerDay: 1_000,
  /** A network is light while it has published fewer than this many times today. */
  lightNetworkPerDay: 50,
} as const

const dayMs = 86_400_000
/** Network budgets share the daily `client` rate buckets under a prefix that no HMAC key can take. */
export function networkBucketKey(networkKey: string): string {
  return 'network:' + networkKey
}
export type PublicationCounts = { client: number; network: number; global: number }
export type RateLimitScope = 'minute' | 'client-day' | 'network-day' | 'global-day'
const scopeMessages: Record<RateLimitScope, string> = {
  minute: 'Too many publication attempts from this address in the last minute.',
  'client-day': 'This address has reached its daily publication limit.',
  'network-day': 'This network has reached its daily publication limit.',
  'global-day': 'The service has reached its daily publication limit for everyone.',
}
export function rateLimited(scope: RateLimitScope, retryAfter: number): SnapshotServiceError {
  return new SnapshotServiceError({ status: 429, code: 'RATE_LIMITED', retryAfter,
    issues: [{ path: '/rateLimit/' + scope, message: scopeMessages[scope] }] })
}

/** The daily budget check both stores run, with the counts read inside their write transaction (RL-01). */
export function publicationBudgetError(counts: PublicationCounts, now: number): SnapshotServiceError | undefined {
  const retryAfter = Math.ceil(((Math.floor(now / dayMs) + 1) * dayMs - now) / 1000)
  const q = publicationQuotas
  if (counts.client >= q.clientPerDay) return rateLimited('client-day', retryAfter)
  if (counts.network >= q.networkPerDay) return rateLimited('network-day', retryAfter)
  if (counts.global >= q.globalPerDay ||
    (counts.global >= q.globalPerDay - q.reservedPerDay && counts.network >= q.lightNetworkPerDay))
    return rateLimited('global-day', retryAfter)
  return undefined
}
