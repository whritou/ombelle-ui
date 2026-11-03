/**
 * Shared publication quotas for both store adapters and both publication kinds.
 * Codes are generated automatically when a visitor opens "Get code", so the
 * budgets allow normal iterative editing; capacity limits still bound storage.
 */
export const publicationQuotas = {
  /** POST attempts per client per fixed minute, including retries. */
  attemptsPerMinute: 30,
  /** New publications per client per UTC day; idempotent replay is free. */
  clientPerDay: 200,
  /** New publications across all clients per UTC day. */
  globalPerDay: 5_000,
} as const
