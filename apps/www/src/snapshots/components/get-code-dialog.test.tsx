// @vitest-environment jsdom
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, expect, it } from 'vitest'
import { GetCodeDialog, type CodeStatus } from './get-code-dialog'

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
// The catalog Dialog measures its body; jsdom has no layout.
globalThis.ResizeObserver ??= class { observe() {} unobserve() {} disconnect() {} } as unknown as typeof ResizeObserver

let root: Root | undefined
afterEach(() => {
  act(() => root?.unmount())
  root = undefined
  document.body.innerHTML = ''
})

const scopes = [{ id: 'new', label: 'New project', description: 'Run it.' }]

async function render(code: CodeStatus) {
  const ui = (status: CodeStatus) => (
    <GetCodeDialog open onClose={() => {}} subject="preset" code={status} scopes={scopes}
      commandFor={(_scope, manager) => `${manager} dlx @ombelle-ui/cli init --preset ps_x@1`} onRetry={() => {}} />
  )
  if (!root) {
    const host = document.createElement('div')
    document.body.append(host)
    root = createRoot(host)
  }
  await act(async () => root!.render(ui(code)))
}

const dialog = () => document.querySelector('[role="dialog"]')!
const status = () => dialog().querySelector('[role="status"]')!

it('announces the generated code inside the dialog, not behind it', async () => {
  await render({ status: 'publishing' })
  expect(status()).not.toBeNull()
  expect(status().textContent).toBe('')
  await render({ status: 'ready', reference: 'ps_x@1', href: '/presets/ps_x/1' })
  expect(status().textContent).toBe('Your preset code is ready.')
})

it('announces copy results inside the dialog', async () => {
  const writes: string[] = []
  Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: async (text: string) => { writes.push(text) } } })
  await render({ status: 'ready', reference: 'ps_x@1', href: '/presets/ps_x/1' })
  const button = [...dialog().querySelectorAll('button')].find(item => item.textContent === 'Copy command')!
  await act(async () => button.click())
  expect(writes).toHaveLength(1)
  expect(status().textContent).toBe('Install command copied.')

  Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: async () => { throw new Error('denied') } } })
  const again = [...dialog().querySelectorAll('button')].find(item => item.textContent === 'Copied')!
  await act(async () => again.click())
  expect(status().textContent).toBe('Clipboard unavailable. Select the command and copy it.')
})
