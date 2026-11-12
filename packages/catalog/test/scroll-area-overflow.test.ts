import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// No DOM environment is installed, so the hook runs against a minimal
// useState/useEffect harness and stubbed element measurements.
const store = vi.hoisted(() => ({
  value: false,
  effect: undefined as undefined | (() => void | (() => void)),
}))
vi.mock('react', async importOriginal => {
  const actual = await importOriginal<typeof import('react')>()
  const mocked = {
    ...actual,
    useState: (initial: unknown) => [store.value ?? initial, (v: boolean) => { store.value = v }],
    useEffect: (effect: () => void | (() => void)) => { store.effect = effect },
  }
  return { ...mocked, default: mocked }
})

import * as radix from '../src/templates/scroll-area.js'
import * as base from '../src/templates/base/scroll-area.js'

const editions = [['radix', radix], ['base', base]] as const

class FakeObserver {
  static instances: FakeObserver[] = []
  observed: unknown[] = []
  disconnected = false
  constructor(public callback: () => void) { FakeObserver.instances.push(this) }
  observe(target: unknown) { this.observed.push(target) }
  disconnect() { this.disconnected = true }
}

const makeViewport = () => ({ scrollHeight: 100, clientHeight: 100, scrollWidth: 50, clientWidth: 50, firstElementChild: { tag: 'content' } })

describe('useOverflowFocus', () => {
  beforeEach(() => { store.value = false; store.effect = undefined; FakeObserver.instances = [] })
  afterEach(() => vi.unstubAllGlobals())

  it.each(editions)('%s is false before measuring and follows overflow in both axes', (_, ui) => {
    vi.stubGlobal('ResizeObserver', FakeObserver)
    const element = makeViewport()
    const ref = { current: element as unknown as HTMLElement }
    expect(ui.useOverflowFocus(ref)).toBe(false)
    const cleanup = store.effect!()
    const observer = FakeObserver.instances[0]!
    expect(observer.observed).toEqual([element, element.firstElementChild])
    expect(store.value).toBe(false)

    element.scrollHeight = 300
    observer.callback()
    expect(store.value).toBe(true)

    element.scrollHeight = 100
    observer.callback()
    expect(store.value).toBe(false)

    element.scrollWidth = 200
    observer.callback()
    expect(store.value).toBe(true)

    ;(cleanup as () => void)()
    expect(observer.disconnected).toBe(true)
  })

  it.each(editions)('%s measures once and does not fail without ResizeObserver', (_, ui) => {
    vi.stubGlobal('ResizeObserver', undefined)
    const element = makeViewport()
    element.scrollHeight = 400
    ui.useOverflowFocus({ current: element as unknown as HTMLElement })
    expect(store.effect!()).toBeUndefined()
    expect(store.value).toBe(true)
  })

  it.each(editions)('%s does nothing without a viewport', (_, ui) => {
    ui.useOverflowFocus({ current: null })
    expect(store.effect!()).toBeUndefined()
    expect(store.value).toBe(false)
  })
})
