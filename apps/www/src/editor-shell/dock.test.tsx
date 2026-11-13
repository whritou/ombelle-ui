import { expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { EditorDock } from './dock'

const noop = () => {}

function render(badge?: number) {
  return renderToStaticMarkup(
    <EditorDock label="Preset editor panes" value="preview" onChange={noop} tabs={[
      { value: 'customize', label: 'Customize', icon: <svg /> },
      { value: 'preview', label: 'Preview', icon: <svg /> },
      { value: 'checks', label: 'Checks', icon: <svg />, badge },
    ]} />,
  )
}

it('names the dock and lists the panes in order with the current one on', () => {
  const html = render()
  expect(html).toMatch(/^<nav[^>]*aria-label="Preset editor panes"/)
  const order = ['Customize', 'Preview', 'Checks'].map(label => html.indexOf(`>${label}<`))
  expect(order.every(index => index > 0)).toBe(true)
  expect([...order].sort((a, b) => a - b)).toEqual(order)
  expect(html).toMatch(/<button[^>]*data-state="on"[^>]*>[^]*?Preview</)
})

it('shows a warning count and puts it in the pane name', () => {
  const html = render(1)
  expect(html).toContain('aria-label="Checks, 1 warning"')
  expect(html).toMatch(/<span[^>]*aria-hidden="true"[^>]*>1<\/span>/)
  expect(render(2)).toContain('aria-label="Checks, 2 warnings"')
  expect(render(0)).not.toContain('warning')
})
