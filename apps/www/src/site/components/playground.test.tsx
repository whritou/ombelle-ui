// @vitest-environment jsdom
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { defaultGlassPresetId } from '@ombelle/catalog'
import { ComponentPlayground } from './playground'

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const compiler = vi.hoisted(() => ({ calls: 0, throwing: false, loading: null as string | null }))
// A family whose styles never finish loading: its specimen suspends, like a stylesheet the transition waits on.
const neverLoads = new Promise<never>(() => {})

// next/dynamic renders nothing under vitest, so specimens are plain synchronous components.
vi.mock('../../generated/previews', async () => {
  const React = await import('react')
  const { GalleryGate } = await import('../../generated/previews/specimens/shared')
  const Typed = () => {
    if (compiler.throwing) throw new Error('specimen failed')
    if (React.useContext(GalleryGate).familyLabel === compiler.loading) React.use(neverLoads)
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
// Font loading resolves at once unless a test holds a family's fonts back.
const fonts = vi.hoisted(() => ({ held: new Map<string, () => void>() }))
const requested = vi.hoisted(() => ({ sheets: [] as string[], fonts: [] as string[] }))
vi.mock('react-dom', async (importOriginal) => ({
  ...(await importOriginal<typeof import('react-dom')>()),
  preload: (href: string) => { requested.sheets.push(href) },
}))
vi.mock('../../inline-preview/family-fonts', () => ({
  loadFamilyFonts: (family: string) =>
    (requested.fonts.push(family), fonts.held.has(family) ? new Promise<void>((resolve) => fonts.held.set(family, resolve)) : Promise.resolve()),
}))
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
  compiler.loading = null
  fonts.held.clear()
  requested.sheets.length = 0
  requested.fonts.length = 0
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

it('marks the clicked family pressed at once', async () => {
  compiler.loading = 'Papier'
  const host = await render()
  await click(host, 'Style family', 'Papier')
  const pressed = [...host.querySelectorAll('[aria-label="Style family"] button[aria-pressed="true"]')].map(b => b.textContent)
  expect(pressed).toEqual(['Papier'])
  // The stage and the status keep the previous family until the new one is ready.
  expect(stage(host)!.dataset.previewFamily).toBe('ombelle')
  expect(host.querySelector('[role="status"]')!.textContent).toBe('Ombelle · light')
})

it("waits for the family's fonts before switching the stage", async () => {
  fonts.held.set('papier', () => {})
  const host = await render()
  await click(host, 'Style family', 'Papier')
  expect(host.querySelector('[aria-label="Style family"] button[aria-pressed="true"]')!.textContent).toBe('Papier')
  expect(stage(host)!.dataset.previewFamily).toBe('ombelle')
  await act(async () => fonts.held.get('papier')!())
  expect(stage(host)!.dataset.previewFamily).toBe('papier')
})

it("keeps the last pick when an earlier family's fonts arrive later", async () => {
  fonts.held.set('papier', () => {})
  const host = await render()
  await click(host, 'Style family', 'Papier')
  await click(host, 'Style family', 'Organic')
  expect(stage(host)!.dataset.previewFamily).toBe('organic')
  await act(async () => fonts.held.get('papier')!())
  expect(stage(host)!.dataset.previewFamily).toBe('organic')
  expect(host.querySelector('[role="status"]')!.textContent).toBe('Organic · light')
})

it('lets an explicit mode override the site', async () => {
  const host = await render()
  await act(async () => { host.querySelector<HTMLButtonElement>('[aria-label="Dark preview"]')!.click() })
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

it('gives the status line a fixed width, so a longer family name does not move it', async () => {
  const host = await render()
  expect(host.querySelector('[role="status"]')!.className).toMatch(/(^| )w-\d+( |$)/)
})

it('preloads a family when its button is hovered or focused', async () => {
  const host = await render()
  const button = (label: string) =>
    [...host.querySelectorAll('[aria-label="Style family"] button')].find(b => b.textContent?.startsWith(label))!
  const sheets = (family: string) => requested.sheets.filter(href => href.includes(`/${family}/`))
  await act(async () => { button('Papier').dispatchEvent(new MouseEvent('pointerover', { bubbles: true })) })
  expect(sheets('papier')).toEqual(['/previews/papier/base.css', '/previews/papier/button.css'])
  expect(requested.fonts.filter(f => f === 'papier')).toHaveLength(1)
  await act(async () => { (button('Papier') as HTMLElement).focus() })
  expect(sheets('papier')).toHaveLength(2)
  expect(requested.fonts.filter(f => f === 'papier')).toHaveLength(1)
  await act(async () => { (button('Liquid Glass') as HTMLElement).focus() })
  await act(async () => { button('Liquid Glass').dispatchEvent(new MouseEvent('pointerover', { bubbles: true })) })
  expect(sheets('liquid-glass')).toEqual([])
  expect(requested.fonts).not.toContain('liquid-glass')
})
