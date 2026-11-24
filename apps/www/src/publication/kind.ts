/**
 * One publication client serves presets and recipes. A kind names what differs
 * between them: the endpoint, the payload and hash fields, the content
 * validator, the compiler adapters and the words shown to visitors. The retry,
 * idempotency, stale-draft and verification logic is shared.
 */
export type PublicationTypes = {
  /** Payload field, as posted and as stored: `preset` or `recipe`. */
  field: string
  /** Hash field on attempts and snapshots: `presetHash` or `recipeHash`. */
  hashField: string
  /** Validated publishable content. */
  data: object
  /** A verified public snapshot. */
  snapshot: { id: string; revision: number }
  /** A normalized draft as the editor holds it. */
  resolved: { data: unknown; hash: string }
}

export type PublicationKind<T extends PublicationTypes> = {
  /** Lowercase noun used in visitor messages: `preset` or `recipe`. */
  noun: string
  endpoint: string
  field: T['field']
  hashField: T['hashField']
  storageKey: string
  validate(input: unknown): T['data']
  /** The catalog release and compiler version the content is pinned to. */
  release(data: T['data']): { catalogRelease: string; compilerVersion: string }
  /** Kind-specific checks a restored attempt must also pass. */
  supported?(data: T['data']): boolean
  normalize(data: T['data']): Promise<{ data: unknown; hash: string }>
  verify(input: unknown): Promise<T['snapshot']>
}

/** The only catalog release and compiler version the site publishes. */
export const publicationRelease = '0.1.0'
/** UTF-8 budget for the published content itself. */
export const publicationContentMaxBytes = 65_536
/** UTF-8 budget for a stored attempt envelope or a service response. */
export const publicationMaxBytes = 128 * 1024
export const publicationMaxAge = 24 * 60 * 60 * 1000

export function supportedRelease(release: {
  catalogRelease: string
  compilerVersion: string
}): boolean {
  return (
    release.catalogRelease === publicationRelease &&
    release.compilerVersion === publicationRelease
  )
}

export const capitalized = (noun: string) =>
  noun.charAt(0).toUpperCase() + noun.slice(1)

/** Reads a kind's dynamic field from an attempt or snapshot. */
export const fieldOf = (value: object, field: string): unknown =>
  (value as Record<string, unknown>)[field]
