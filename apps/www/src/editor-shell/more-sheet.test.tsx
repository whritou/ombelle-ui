import { expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { MoreActionsList } from './more-sheet'

const noop = () => {}

function render() {
  return renderToStaticMarkup(
    <MoreActionsList
      redo={{ disabled: true, onClick: noop }}
      onCommands={noop}
      items={[
        { id: 'reset', label: 'Reset all tokens…', destructive: true, onSelect: noop },
        { id: 'json', label: 'Download JSON', onSelect: noop },
      ]}
      links={[{ label: 'Preset editor guide', href: '/docs/preset-editor' }]}
      onDone={noop}
    />,
  )
}

it('lists Redo, Commands, the actions, the links, then destructive actions after a separator', () => {
  const html = render()
  const order = ['Redo', 'Commands', 'Download JSON', 'Preset editor guide', 'Reset all tokens…'].map(text => html.indexOf(text))
  expect(order.every(index => index >= 0)).toBe(true)
  expect([...order].sort((a, b) => a - b)).toEqual(order)
  expect(html.indexOf('role="separator"')).toBeGreaterThan(html.indexOf('Preset editor guide'))
  expect(html.indexOf('role="separator"')).toBeLessThan(html.indexOf('Reset all tokens…'))
})

it('marks destructive actions and keeps disabled ones disabled', () => {
  const html = render()
  expect(html).toMatch(/<button[^>]*data-destructive=""[^>]*>[^]*?Reset all tokens…/)
  expect(html).toMatch(/<button[^>]*disabled=""[^>]*>[^]*?Redo/)
  expect(html).toContain('href="/docs/preset-editor"')
})

it('leaves Commands out when the editor has none', () => {
  const html = renderToStaticMarkup(<MoreActionsList redo={{ disabled: false, onClick: noop }} items={[]} onDone={noop} />)
  expect(html).not.toContain('Commands')
})
