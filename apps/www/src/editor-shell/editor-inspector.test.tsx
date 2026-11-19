import { expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { EditorInspector } from './editor-inspector'

const noop = () => {}
const controls = <section aria-labelledby="inspector-colors"><div><h2 id="inspector-colors">Colors</h2></div><input aria-label="Primary" /></section>

it('unfolded, shows the controls and keeps the rail hidden, with a fold button', () => {
  const html = renderToStaticMarkup(<EditorInspector label="Button inspector" collapsed={false} onCollapsedChange={noop}>{controls}</EditorInspector>)
  expect(html).toContain('aria-label="Primary"')
  expect(html.match(/<ul[^>]*data-slot="sidebar-menu"[^>]*>/)?.[0]).toContain('hidden=""')
  expect(html).toContain('aria-label="Fold button inspector"')
  expect(html).toMatch(/data-slot="sidebar"[^>]*data-side="left"|data-side="left"[^>]*data-slot="sidebar"/)
})

it('folded, keeps the controls mounted but hidden, so nothing typed is lost', () => {
  const html = renderToStaticMarkup(<EditorInspector label="Button inspector" collapsed onCollapsedChange={noop}>{controls}</EditorInspector>)
  expect(html).toContain('aria-label="Primary"')
  expect(html).toMatch(/<div[^>]*hidden=""[^>]*>[^]*aria-label="Primary"/)
  expect(html).toContain('aria-label="Unfold button inspector"')
  expect(html).toContain('data-state="collapsed"')
})
