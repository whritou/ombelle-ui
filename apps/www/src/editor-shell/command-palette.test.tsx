import { expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { createRef } from 'react'
import { isCommandShortcut, paletteGroups } from './command-groups'
import { EditorTopBar } from './top-bar'

const noop = () => {}

it('builds the palette from the editor groups, the menu actions and the component pages', () => {
  const families = { heading: 'Families', commands: [{ id: 'family-flat', label: 'Flat', run: noop }] }
  const groups = paletteGroups([families], [
    { id: 'download', label: 'Download recipe JSON', onSelect: noop },
    { id: 'off', label: 'Unavailable', onSelect: noop, disabled: true },
  ], [{ id: 'button', label: 'Button', href: '/editor/component/button' }, { id: 'dialog', label: 'Dialog', href: '/editor/component/dialog' }], '/editor/component/button')
  expect(groups.map(group => group.heading)).toEqual(['Families', 'Actions', 'Components'])
  expect(groups[1]!.commands.map(command => command.label)).toEqual(['Download recipe JSON'])
  // The page already open is not offered.
  expect(groups[2]!.commands.map(command => command.label)).toEqual(['Dialog'])
})

it('opens on Ctrl+K and on Command+K, and on nothing else', () => {
  expect(isCommandShortcut({ key: 'k', ctrlKey: true, metaKey: false, altKey: false, shiftKey: false })).toBe(true)
  expect(isCommandShortcut({ key: 'K', ctrlKey: false, metaKey: true, altKey: false, shiftKey: false })).toBe(true)
  expect(isCommandShortcut({ key: 'k', ctrlKey: false, metaKey: false, altKey: false, shiftKey: false })).toBe(false)
  expect(isCommandShortcut({ key: 'k', ctrlKey: true, metaKey: false, altKey: true, shiftKey: false })).toBe(false)
  expect(isCommandShortcut({ key: 'j', ctrlKey: true, metaKey: false, altKey: false, shiftKey: false })).toBe(false)
})

it('shows a Commands button with its shortcut when the editor has commands', () => {
  const history = { disabled: false, onClick: noop, buttonRef: createRef<HTMLButtonElement>() }
  const html = renderToStaticMarkup(
    <EditorTopBar crumbs={['Components', 'Button']} nameField={{ id: 'name', label: 'Recipe ID', value: 'x', maxLength: 40, onChange: noop }}
      revision="r1" status="Saved" undo={history} redo={history} menu={{ label: 'More actions', items: [] }}
      primary={<button type="button">Get code</button>} commands={[]} />,
  )
  expect(html).toMatch(/<button[^>]*aria-keyshortcuts="Control\+K Meta\+K"[^>]*>/)
  expect(html).toContain('Commands')
  expect(html).toMatch(/<kbd[^>]*>Ctrl<\/kbd>/)
})
