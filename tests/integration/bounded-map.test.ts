import { expect, it } from 'vitest'
import { boundedMap } from '../../scripts/bounded-map.js'
function deferred() {
  let resolve!: () => void
  const promise = new Promise<void>((done) => {
    resolve = done
  })
  return { promise, resolve }
}
it('bounds active work and returns results in input order', async () => {
  const gates = [deferred(), deferred(), deferred()]
  const started: number[] = []
  let active = 0,
    peak = 0
  const work = boundedMap([0, 1, 2], 2, async (value) => {
    started.push(value)
    peak = Math.max(peak, ++active)
    await gates[value].promise
    active--
    return String(value)
  })
  await Promise.resolve()
  expect(started).toEqual([0, 1])
  gates[1].resolve()
  await new Promise((resolve) => setImmediate(resolve))
  expect(started).toEqual([0, 1, 2])
  gates[2].resolve()
  gates[0].resolve()
  expect(await work).toEqual(['0', '1', '2'])
  expect(peak).toBe(2)
})
it('stops new work on failure, drains running work and publishes ordered outcomes once', async () => {
  const gate = deferred(),
    started: number[] = [],
    published: unknown[] = []
  let finished = false,
    returned = false
  const work = boundedMap(
    [0, 1, 2, 3],
    2,
    async (value) => {
      started.push(value)
      if (value === 0) throw new Error('broken consumer')
      await gate.promise
      finished = true
      return 'completed'
    },
    async (outcomes) => {
      expect(finished).toBe(true)
      published.push(outcomes.map((row) => row?.status))
    },
  ).catch((error) => {
    returned = true
    return error
  })
  await new Promise((resolve) => setImmediate(resolve))
  expect(started).toEqual([0, 1])
  expect(returned).toBe(false)
  gate.resolve()
  expect((await work).message).toBe('broken consumer')
  expect(published).toEqual([['rejected', 'fulfilled', undefined, undefined]])
})
it.each([0, -1, 1.5, Infinity])(
  'rejects invalid limit %s before work starts',
  async (limit) => {
    let started = false
    await expect(
      boundedMap([1], limit, async () => {
        started = true
      }),
    ).rejects.toThrow(/positive.*integer/)
    expect(started).toBe(false)
  },
)
it('supports serial scheduling and empty inputs', async () => {
  expect(await boundedMap([3, 4], 1, async (value) => value * 2)).toEqual([
    6, 8,
  ])
  expect(await boundedMap([], 2, async () => 1)).toEqual([])
})
