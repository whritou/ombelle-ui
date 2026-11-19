// @vitest-environment jsdom
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { defaultGlassPresetId } from '@ombelle/catalog'
import { ComponentPlayground } from './playground'

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const compiler = vi.hoisted(() => ({ calls: 0, throwing: false }))

// next/dynamic renders nothing under vitest, so specimens are plain synchronous components.
vi.mock('../../generated/previews', async () => {
  const React = await import('react')
  const Typed = () => {
    if (compiler.throwing) throw new Error('specimen failed')
    return React.createElement('input', { 'data-testid': 'typed' })
  }
  return { inlineSpecimens: new Proxy({}, { get: () => Typed }), specimenOnly: {} }
})
vi.mock('../../generated/previews/specimens/shared', async () => {
  const React = await import('react')
  return {
    GalleryGate: React.createContext({ unavailable: [], familyLabel: '' }),
    Unavailable: () => null,
  }
})
vi.mock('../../preset-editor/use-preset-compiler', () => ({
  usePresetCompiler: () => {
    compiler.calls++
    return { result: null, stale: false, draftKey: null, diagnostic: null }
  },
}))
vi.mock('../../preset-editor/components/preset-preview-frame', () => ({
  PresetPreviewFrame: ({ title }: { title: string }) => <iframe title={title} />,
}))

const unmounts: Array<() => void> = []
beforeEach(() => {
  compiler.calls = 0
  compiler.throwing = false
  document.documentElement.classList.remove('dark')
  window.history.replaceState(null, '', '/')
})
afterEach(() => {
  while (unmounts.length) unmounts.pop()!()
  document.body.innerHTML = ''
})

async function render(id: 'button' | 'sidebar' = 'button') {
  const host = document.createElement('div')
  document.body.append(host)
  const root = createRoot(host)
  unmounts.push(() => act(() => root.unmount()))
  await act(async () => root.render(<ComponentPlayground id={id} name="Button" source="" styles={{}} />))
  return host
}
const click = (host: HTMLElement, group: string, label: string) =>
  act(async () => {
    const button = [...host.querySelectorAll(`[aria-label="${group}"] button`)].find(b => b.textContent === label)!
    ;(button as HTMLButtonElement).click()
  })
const stage = (host: HTMLElement) => host.querySelector<HTMLElement>('[data-preview-family]')

it('starts inline in Ombelle auto without the worker', async () => {
  const host = await render()
  expect(stage(host)!.dataset).toMatchObject({ previewFamily: 'ombelle', previewMode: 'auto' })
  expect(host.querySelector('iframe')).toBeNull()
  expect(compiler.calls).toBe(0)
  expect(host.querySelector('[role="status"]')!.textContent).toBe('Ombelle · light')
})

it('switches family in a transition without remounting the stage', async () => {
  const host = await render()
  const before = stage(host)
  const input = host.querySelector<HTMLInputElement>('[data-testid="typed"]')!
  input.value = 'kept'
  await click(host, 'Style family', 'Papier')
  expect(stage(host)).toBe(before)
  expect(stage(host)!.dataset.previewFamily).toBe('papier')
  expect(host.querySelector<HTMLInputElement>('[data-testid="typed"]')!.value).toBe('kept')
  expect(host.querySelector('[role="status"]')!.textContent).toBe('Papier · light')
})

it('lets an explicit mode override the site', async () => {
  const host = await render()
  await click(host, 'Preview mode', 'Dark')
  expect(stage(host)!.dataset.previewMode).toBe('dark')
  expect(host.querySelector('[role="status"]')!.textContent).toBe('Ombelle · dark')
})

it('shows the resolved site mode while auto', async () => {
  document.documentElement.classList.add('dark')
  const host = await render()
  expect(stage(host)!.dataset.previewMode).toBe('auto')
  expect(host.querySelector('[role="status"]')!.textContent).toBe('Ombelle · dark')
})

it('keeps the iframe path for a glass query', async () => {
  window.history.replaceState(null, '', `/?glass=${defaultGlassPresetId}`)
  const host = await render()
  expect(host.querySelector('iframe')).not.toBeNull()
  expect(stage(host)).toBeNull()
  expect(compiler.calls).toBeGreaterThan(0)
})

it('falls back to the iframe when the inline preview throws', async () => {
  compiler.throwing = true
  const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
  const host = await render()
  spy.mockRestore()
  expect(host.querySelector('iframe[title="Button preview"]')).not.toBeNull()
  expect(stage(host)).toBeNull()
  expect(compiler.calls).toBeGreaterThan(0)
})
