import { createRef } from 'react'
import { expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { EditorTopBar } from './top-bar'
import { OverflowMenu, menuFocusTarget, menuPosition } from './overflow-menu'

const noop = () => {}
const history = { disabled: false, onClick: noop, buttonRef: createRef<HTMLButtonElement>() }

it('EditorTopBar renders the name field, status and one primary action', () => {
  const html = renderToStaticMarkup(
    <EditorTopBar
      crumbs={['Presets', 'Mine']}
      nameField={{ id: 'name', label: 'Preset name', value: 'Mine', maxLength: 40, onChange: noop }}
      revision="Rev 3"
      status="Saved"
      undo={history}
      redo={{ ...history, disabled: true }}
      menu={{ label: 'More actions', items: [{ id: 'a', label: 'Reset', onSelect: noop }] }}
      primary={<button type="button">Get code</button>}
    />,
  )
  expect(html.startsWith('<header')).toBe(true)
  expect(html).toContain('for="name"')
  expect(html).toContain('maxLength="40"')
  expect(html).toMatch(/<[^>]*role="status"[^>]*>Saved</)
  expect(html).toContain('aria-label="More actions"')
  expect(html).toContain('Get code')
  expect(html).toContain('Rev 3')
})

it('EditorTopBar groups Undo and Redo as a History button group, keeping their disabled state', () => {
  const html = renderToStaticMarkup(
    <EditorTopBar crumbs={['A']} nameField={{ id: 'n', label: 'Name', value: 'x', maxLength: 9, onChange: noop }}
      revision="r1" status="" undo={history} redo={{ ...history, disabled: true }}
      menu={{ label: 'More', items: [] }} primary={null} />,
  )
  const group = /<div role="group" aria-label="History"[^>]*data-slot="button-group"[^>]*>(.*?)<\/div>/.exec(html)
  expect(group).not.toBeNull()
  const buttons = group![1]!.match(/<button[^>]*>/g)!
  expect(buttons).toHaveLength(2)
  expect(buttons[0]).toContain('aria-label="Undo"')
  expect(buttons[0]).not.toContain('disabled')
  expect(buttons[1]).toContain('aria-label="Redo"')
  expect(buttons[1]).toContain('disabled=""')
})

it('OverflowMenu puts destructive items last after a separator', () => {
  const html = renderToStaticMarkup(
    <OverflowMenu
      id="m"
      label="More"
      items={[
        { id: 'del', label: 'Delete', onSelect: noop, destructive: true },
        { id: 'dup', label: 'Duplicate', onSelect: noop },
        { id: 'off', label: 'Off', onSelect: noop, disabled: true },
      ]}
    />,
  )
  expect(html).toContain('aria-label="More"')
  expect(html).toContain('popoverTarget="m"')
  expect(html).toContain('role="menu"')
  expect(html).toContain('aria-haspopup="menu"')
  expect(html.match(/role="menuitem"/g)).toHaveLength(3)
  expect(html).toContain('role="separator"')
  expect(html.indexOf('Duplicate')).toBeLessThan(html.indexOf('role="separator"'))
  expect(html.indexOf('role="separator"')).toBeLessThan(html.indexOf('Delete'))
  expect(html).toContain('disabled=""')
})

it('EditorTopBar can render the name field read-only', () => {
  const props = {
    crumbs: ['A'], revision: 'r1', status: '', undo: history, redo: history,
    menu: { label: 'More', items: [] }, primary: null,
  }
  const field = (readOnly?: boolean) => renderToStaticMarkup(
    <EditorTopBar {...props} nameField={{ id: 'n', label: 'Recipe ID', value: 'x', maxLength: 9, readOnly, onChange: noop }} />,
  )
  expect(field(true)).toContain('readOnly=""')
  expect(field()).not.toContain('readOnly')
})

it('menuFocusTarget follows the menu keyboard pattern over enabled items', () => {
  const disabled = [false, true, false, false]
  expect(menuFocusTarget('ArrowDown', 0, disabled)).toBe(2)
  expect(menuFocusTarget('ArrowDown', 3, disabled)).toBe(0)
  expect(menuFocusTarget('ArrowUp', 2, disabled)).toBe(0)
  expect(menuFocusTarget('ArrowUp', 0, disabled)).toBe(3)
  expect(menuFocusTarget('ArrowDown', -1, disabled)).toBe(0)
  expect(menuFocusTarget('ArrowUp', -1, disabled)).toBe(3)
  expect(menuFocusTarget('Home', 3, disabled)).toBe(0)
  expect(menuFocusTarget('End', 0, disabled)).toBe(3)
  expect(menuFocusTarget('Tab', 0, disabled)).toBeNull()
  expect(menuFocusTarget('ArrowDown', -1, [true, true])).toBeNull()
})

it('menuPosition opens the menu under its trigger, right edges aligned, inside the viewport', () => {
  expect(menuPosition({ bottom: 40.4, right: 1200 }, 1440)).toEqual({ top: 44, right: 240 })
  expect(menuPosition({ bottom: 40, right: 1440 }, 1440)).toEqual({ top: 44, right: 4 })
})
