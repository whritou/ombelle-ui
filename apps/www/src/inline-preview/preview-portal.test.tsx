// @vitest-environment jsdom
import * as React from 'react'
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import * as DialogPrimitive from '@radix-ui/react-dialog'
import { afterEach, expect, it } from 'vitest'
import { PreviewPortal, PreviewPortalContainer } from './preview-portal'

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const mounted: Array<() => void> = []
afterEach(() => {
  while (mounted.length) mounted.pop()!()
  document.body.innerHTML = ''
})

async function render(ui: React.ReactElement) {
  const host = document.createElement('div')
  document.body.append(host)
  const root = createRoot(host)
  mounted.push(() => act(() => root.unmount()))
  await act(async () => root.render(ui))
}

const dialog = (container?: HTMLElement | null) => (
  <DialogPrimitive.Root open>
    <PreviewPortal portal={DialogPrimitive.Portal} container={container}>
      <DialogPrimitive.Content data-slot="pv-dialog-content" aria-describedby={undefined}>
        <DialogPrimitive.Title>t</DialogPrimitive.Title>
      </DialogPrimitive.Content>
    </PreviewPortal>
  </DialogPrimitive.Root>
)

it('renders portal content inside the stage container', async () => {
  const stage = document.createElement('div')
  document.body.append(stage)
  await render(<PreviewPortalContainer.Provider value={stage}>{dialog()}</PreviewPortalContainer.Provider>)
  expect(stage.querySelector('[data-slot="pv-dialog-content"]')).not.toBeNull()
})

it('treats a null container as the stage', async () => {
  const stage = document.createElement('div')
  document.body.append(stage)
  await render(<PreviewPortalContainer.Provider value={stage}>{dialog(null)}</PreviewPortalContainer.Provider>)
  expect(stage.querySelector('[data-slot="pv-dialog-content"]')).not.toBeNull()
})

it('lets an explicit non-null container win', async () => {
  const stage = document.createElement('div')
  const other = document.createElement('div')
  document.body.append(stage, other)
  await render(<PreviewPortalContainer.Provider value={stage}>{dialog(other)}</PreviewPortalContainer.Provider>)
  expect(other.querySelector('[data-slot="pv-dialog-content"]')).not.toBeNull()
  expect(stage.querySelector('[data-slot="pv-dialog-content"]')).toBeNull()
})

it('falls back to the body without a stage', async () => {
  await render(dialog())
  expect(document.body.querySelector('[data-slot="pv-dialog-content"]')).not.toBeNull()
})
