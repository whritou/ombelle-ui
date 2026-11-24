/**
 * What the editors tell a visitor when publication fails (RL-08): how long to wait, whether the limit is
 * theirs or everyone's, and that a full service is paused rather than briefly unavailable.
 */
export type PublicationFailure = { message: string; withdrawn: boolean }

export function formatWait(seconds: number): string {
  if (seconds < 60) {
    const whole = Math.max(1, Math.ceil(seconds))
    return whole === 1 ? '1 second' : `${whole} seconds`
  }
  if (seconds < 3600) {
    const minutes = Math.ceil(seconds / 60)
    return minutes === 1 ? '1 minute' : `${minutes} minutes`
  }
  const hours = Math.ceil(seconds / 3600)
  return hours === 1 ? '1 hour' : `${hours} hours`
}

async function errorBody(response: Response): Promise<{ code?: string; issues?: { path?: string }[] }> {
  try {
    const text = await response.text()
    if (text.length > 16_384) return {}
    const value = JSON.parse(text) as unknown
    return value && typeof value === 'object' ? value as { code?: string; issues?: { path?: string }[] } : {}
  } catch {
    return {}
  }
}

export async function publicationFailure(response: Response): Promise<PublicationFailure> {
  if (response.status === 410)
    return { withdrawn: true, message: 'This publication was withdrawn. Cancel to start a new publication.' }
  const body = await errorBody(response)
  if (response.status === 429) {
    const seconds = Number(response.headers.get('Retry-After'))
    const wait = Number.isFinite(seconds) && seconds >= 0 ? ` Try again in ${formatWait(seconds)}.` : ' Wait before retrying.'
    const global = body.issues?.some(issue => issue.path === '/rateLimit/global-day')
    return {
      withdrawn: false,
      message: (global
        ? 'The service has reached its publication limit for everyone today.'
        : 'Publication limit reached for your connection.') + wait + ' Your local exports still work.',
    }
  }
  if (response.status === 503 && body.code === 'SNAPSHOT_CAPACITY_REACHED')
    return { withdrawn: false, message: 'Publishing is paused because the service is full. Use the JSON export instead.' }
  return {
    withdrawn: false,
    message: 'Publication is unavailable. Your local exports still work; retry this attempt within 24 hours.',
  }
}
