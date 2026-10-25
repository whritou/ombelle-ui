import { expect, it } from 'vitest'
import { workerBudget } from '../../scripts/worker-budget.js'
import { browserReferenceKey, createBrowserReferenceCache } from '../helpers/browser-references.js'

it('defaults worker budgets and accepts explicit positive safe integers', () => {
  expect(workerBudget('OMBELLE_E2E_WORKERS', undefined, 2)).toBe(2)
  expect(workerBudget('OMBELLE_E2E_WORKERS', '1', 2)).toBe(1)
  expect(workerBudget('OTHER_WORKERS', '4', 3)).toBe(4)
})

it.each(['', '0', '-1', '1.5', 'NaN', 'Infinity', '2workers', ' 2', '2 ', '1e2', '9007199254740992'])(
  'rejects malformed worker budget %j before launching workers', (value) => {
    expect(() => workerBudget('OMBELLE_E2E_WORKERS', value, 2)).toThrow(/OMBELLE_E2E_WORKERS.*positive.*integer/)
  },
)

it('separates references by family, mode, viewport and media', () => {
  const conditions = {
    family: 'flat', mode: 'light', viewport: { width: 1100, height: 800 },
    reducedMotion: 'reduce', forcedColors: 'none', colorScheme: 'light',
  }
  const key = browserReferenceKey(conditions)
  expect(browserReferenceKey({ ...conditions })).toBe(key)
  for (const change of [
    { family: 'minimalist' }, { mode: 'dark' },
    { viewport: { width: 320, height: 800 } },
    { viewport: { width: 1100, height: 900 } },
    { reducedMotion: 'no-preference' }, { forcedColors: 'active' }, { colorScheme: 'dark' },
  ]) expect(browserReferenceKey({ ...conditions, ...change })).not.toBe(key)
})

it('captures each equivalent reference once and isolates returned measurements', async () => {
  const cache = createBrowserReferenceCache<{ styles: string[][]; image: string }>()
  const captured = { styles: [['blue']], image: 'cG5n' }
  let captures = 0
  const capture = async () => { captures++; return captured }
  const [first, second] = await Promise.all([cache('flat/light', capture), cache('flat/light', capture)])
  first.styles[0][0] = 'red'
  captured.styles[0][0] = 'green'
  expect(second).toEqual({ styles: [['blue']], image: 'cG5n' })
  expect(await cache('flat/light', capture)).toEqual({ styles: [['blue']], image: 'cG5n' })
  expect(captures).toBe(1)
  expect(await cache('flat/dark', async () => ({ styles: [['black']], image: 'dark' }))).toEqual({ styles: [['black']], image: 'dark' })
})

it('does not retain a failed capture or share data between worker-local caches', async () => {
  const cache = createBrowserReferenceCache<string[]>()
  await expect(cache('same', async () => { throw new Error('not ready') })).rejects.toThrow('not ready')
  expect(await cache('same', async () => ['ready'])).toEqual(['ready'])
  const otherWorker = createBrowserReferenceCache<string[]>()
  expect(await otherWorker('same', async () => ['independent'])).toEqual(['independent'])
})
