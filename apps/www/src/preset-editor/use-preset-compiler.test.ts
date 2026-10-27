import { afterEach, expect, it, vi } from 'vitest'
import { createPresetDraft, setPresetEdit } from './model'
import { createPresetCompiler } from './use-preset-compiler'
import { handlePresetCompileMessage } from './compile-protocol'

afterEach(() => vi.useRealTimers())
it('rejects malformed diagnostic links and result metadata for the current request', async () => {
  vi.useFakeTimers()
  const send = vi.fn(),
    controller = createPresetCompiler(send, vi.fn())
  controller.update(createPresetDraft('flat'))
  vi.advanceTimersByTime(150)
  const request = send.mock.calls[0][0]
  for (const metadata of [{ path: 4 }, { nextAction: {} }]) {
    controller.receive({
      type: 'preset-invalid',
      requestId: request.requestId,
      diagnostic: { code: 'INVALID_DATA', message: 'bad input', ...metadata },
    })
    expect(controller.state.status).toBe('compiling')
  }
  const response = await handlePresetCompileMessage(request)
  if (response.type !== 'preset-compiled') throw new Error('compile failed')
  const malformed = structuredClone(response)
  Object.assign(malformed.result.artifacts[0], { kind: 'unknown' })
  controller.receive(malformed)
  expect(controller.state.status).toBe('compiling')
  controller.receive(response)
  expect(controller.state.status).toBe('compiled')
  controller.dispose()
})
it('debounces by 150ms and rejects old responses even before the next dispatch', async () => {
  vi.useFakeTimers()
  const send = vi.fn(),
    notify = vi.fn()
  const controller = createPresetCompiler(send, notify)
  const first = createPresetDraft('flat')
  controller.update(first)
  vi.advanceTimersByTime(149)
  expect(send).not.toHaveBeenCalled()
  vi.advanceTimersByTime(1)
  const old = await handlePresetCompileMessage(send.mock.calls[0][0])
  controller.receive(old)
  expect(controller.state.status).toBe('compiled')
  controller.update(setPresetEdit(first, '/design/radiusRem', '-'))
  expect(controller.state.stale).toBe(true)
  controller.receive(old)
  expect(controller.state.status).toBe('compiling')
  vi.advanceTimersByTime(150)
  controller.receive(await handlePresetCompileMessage(send.mock.calls[1][0]))
  expect(controller.state.status).toBe('invalid')
  expect(controller.state.draftKey).toContain('"/design/radiusRem":"-"')
  controller.receive(old)
  expect(controller.state.status).toBe('invalid')
  controller.receive({ type: 'preset-compiled', requestId: 999, result: {} })
  expect(controller.state.status).toBe('invalid')
  controller.fail()
  expect(controller.state.diagnostic?.code).toBe('WORKER_FAILED')
  controller.update(first)
  vi.advanceTimersByTime(150)
  controller.receive(await handlePresetCompileMessage(send.mock.calls[2][0]))
  expect(controller.state.status).toBe('compiled')
  controller.dispose()
})
