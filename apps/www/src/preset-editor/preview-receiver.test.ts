import { expect, it } from 'vitest'
import type { CompileResult, Preset } from '@ombelle/contracts'
import { createPresetReceiver, type ReceivedPreset } from './preview-receiver'
import type { PresetAck, PresetRender, PresetTokens } from './preview-protocol'

const view = { mode: 'light', viewport: 'wide' } as const
const preset = { styleFamily: 'flat', design: { radius: 'md' } } as unknown as Preset
const hash = (n: number) => String(n).repeat(64).slice(0, 64)
const tokens = (requestId: number) => ({ type: 'preset-tokens', requestId, preset, view })
const render = (requestId: number) => ({
  type: 'preset-render',
  requestId,
  view,
  result: { preset: { hash: hash(7), data: preset }, artifacts: [{ kind: 'style', content: '.r{}' }] },
})
function deferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((r) => (resolve = r))
  return { promise, resolve }
}
function setup(overrides: { sources?: Promise<boolean>; tokens?: (i: unknown, p: number) => Promise<any> } = {}) {
  const applied: ReceivedPreset[] = []
  const acks: PresetAck[] = []
  let current = true
  const receiver = createPresetReceiver({
    port: 'port',
    verifyRender: async (input, previous) => {
      const m = input as PresetRender
      return m.requestId > previous ? m : null
    },
    verifyTokens:
      overrides.tokens ??
      (async (input, previous) => {
        const m = input as PresetTokens
        return m.requestId > previous ? { message: m, css: `.t${m.requestId}{}`, presetHash: hash(m.requestId) } : null
      }),
    sourcesValid: overrides.sources ?? Promise.resolve(true),
    isCurrentPort: () => current,
    apply: (s) => applied.push(s),
    post: (a) => acks.push(a),
  })
  return { receiver, applied, acks, detach: () => (current = false) }
}

it('applies a tokens message with the derived css and acks the resolved hash', async () => {
  const { receiver, applied, acks } = setup()
  await receiver.receive(tokens(1))
  expect(applied).toHaveLength(1)
  expect(applied[0]).toMatchObject({ requestId: 1, css: '.t1{}', hash: hash(1), family: 'flat', view })
  expect(acks).toEqual([{ type: 'preset-render-ack', requestId: 1, presetHash: hash(1), status: 'applied' }])
})

it('does not let a late-resolving older tokens message overwrite a newer one', async () => {
  const first = deferred<any>()
  const { receiver, applied, acks } = setup({
    tokens: (input) =>
      (input as PresetTokens).requestId === 1
        ? first.promise
        : Promise.resolve({ message: input, css: '.t2{}', presetHash: hash(2) }),
  })
  const one = receiver.receive(tokens(1))
  await receiver.receive(tokens(2))
  first.resolve({ message: tokens(1), css: '.t1{}', presetHash: hash(1) })
  await one
  expect(applied.map((s) => s.css)).toEqual(['.t2{}'])
  expect(acks.filter((a) => a.status === 'applied').map((a) => a.requestId)).toEqual([2])
  expect(acks).toContainEqual({ type: 'preset-render-ack', requestId: 1, presetHash: hash(1), status: 'rejected' })
})

it('shares one request id between preset-tokens and preset-render', async () => {
  const { receiver, applied, acks } = setup()
  await receiver.receive(tokens(4))
  await receiver.receive(render(3))
  expect(applied).toHaveLength(1)
  expect(receiver.lastRequestId()).toBe(4)
  expect(acks[1]).toMatchObject({ requestId: 3, status: 'rejected', presetHash: hash(7) })
  await receiver.receive(render(5))
  expect(applied[1]).toMatchObject({ requestId: 5, css: '.r{}', hash: hash(7) })
})

it('acks a rejected tokens message (glass) without applying', async () => {
  const { receiver, applied, acks } = setup({ tokens: async () => null })
  await receiver.receive(tokens(1))
  expect(applied).toHaveLength(0)
  expect(acks).toEqual([
    { type: 'preset-render-ack', requestId: 1, presetHash: '0'.repeat(64), status: 'rejected' },
  ])
  expect(receiver.lastRequestId()).toBe(0)
})

it('blocks both message kinds when gallery sources fail verification', async () => {
  const { receiver, applied, acks } = setup({ sources: Promise.resolve(false) })
  await receiver.receive(tokens(1))
  await receiver.receive(render(2))
  expect(applied).toHaveLength(0)
  expect(acks.map((a) => a.status)).toEqual(['rejected', 'rejected'])
})

it('ignores messages once the port is detached', async () => {
  const { receiver, applied, acks, detach } = setup()
  const pending = receiver.receive(tokens(1))
  detach()
  await pending
  expect(applied).toHaveLength(0)
  expect(acks).toHaveLength(0)
})
