/** Workers own independent inputs; only the drained parent publishes evidence. */
export async function boundedMap<T, R>(
  items: readonly T[],
  limit: number,
  work: (item: T, index: number) => Promise<R>,
  publish?: (
    outcomes: (PromiseSettledResult<R> | undefined)[],
  ) => Promise<void>,
): Promise<R[]> {
  if (!Number.isSafeInteger(limit) || limit < 1)
    throw Error('Worker limit must be a positive safe integer')
  const outcomes: (PromiseSettledResult<R> | undefined)[] = Array.from({
    length: items.length,
  })
  let next = 0,
    failed = false,
    failure: unknown
  async function worker() {
    while (!failed && next < items.length) {
      const index = next++
      try {
        outcomes[index] = {
          status: 'fulfilled',
          value: await work(items[index], index),
        }
      } catch (reason) {
        outcomes[index] = { status: 'rejected', reason }
        if (!failed) {
          failed = true
          failure = reason
        }
      }
    }
  }
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, worker),
  )
  await publish?.(outcomes)
  if (failed) throw failure
  return outcomes.map((row) => (row as PromiseFulfilledResult<R>).value)
}
