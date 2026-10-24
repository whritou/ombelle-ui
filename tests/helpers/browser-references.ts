type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue }
interface ReferenceConditions {
  family: string
  mode: string
  viewport: { width: number; height: number }
  reducedMotion: string
  forcedColors: string
  colorScheme: string
}

export function browserReferenceKey(conditions: ReferenceConditions): string {
  return JSON.stringify([
    conditions.family, conditions.mode,
    conditions.viewport.width, conditions.viewport.height,
    conditions.reducedMotion, conditions.forcedColors, conditions.colorScheme,
  ])
}

/** Instantiate at module scope in the owning worker. Store immutable JSON only,
 * never pages, contexts, locators or Buffers; give each caller its own data copy. */
export function createBrowserReferenceCache<T extends JsonValue>() {
  const references = new Map<string, Promise<string>>()
  return async (key: string, capture: () => Promise<T>): Promise<T> => {
    let pending = references.get(key)
    if (!pending) {
      pending = Promise.resolve().then(capture).then((value) => JSON.stringify(value))
      references.set(key, pending)
      const captured = pending
      void pending.catch(() => {
        if (references.get(key) === captured) references.delete(key)
      })
    }
    return JSON.parse(await pending) as T
  }
}
