import { createRef } from 'react'
import { expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { EditorTopBar } from './top-bar'

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

it('EditorTopBar puts History, Commands and the menu in one Editor actions toolbar, with the primary action outside', () => {
  const html = renderToStaticMarkup(
    <EditorTopBar crumbs={['A']} nameField={{ id: 'n', label: 'Name', value: 'x', maxLength: 9, onChange: noop }}
      revision="r1" status="" undo={history} redo={history}
      menu={{ label: 'More actions', items: [{ id: 'del', label: 'Delete', onSelect: noop, destructive: true }, { id: 'dup', label: 'Duplicate', onSelect: noop }] }}
      commands={[]} primary={<button type="button">Get code</button>} />,
  )
  // The server renders the desktop, whose actions are a menubar after the toolbar; the phone's More actions
  // button (hidden from 768px) may sit between them and the primary action.
  const toolbar = /<div[^>]*role="toolbar"[^>]*>([^]*?)<\/div>(?:<div[^>]*role="menubar"[^>]*>[^]*?<\/div>)?(?:<button[^>]*aria-haspopup="dialog"[^>]*>[^]*?<\/button>)?<button type="button">Get code/.exec(html)
  expect(toolbar).not.toBeNull()
  expect(toolbar![0]).toMatch(/aria-label="Editor actions"/)
  expect(toolbar![1]).toContain('aria-label="History"')
  expect(toolbar![1]).toContain('aria-label="Undo"')
  expect(toolbar![1]).toContain('aria-keyshortcuts="Control+K Meta+K"')
  expect(toolbar![1]).not.toContain('Get code')
  expect(html).not.toContain('role="menu"')
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

it('EditorTopBar marks an editable name with a pencil and leaves a read-only one plain', () => {
  const props = {
    crumbs: ['A'], revision: 'r1', status: '', undo: history, redo: history,
    menu: { label: 'More', items: [] }, primary: null,
  }
  const field = (readOnly?: boolean) => renderToStaticMarkup(
    <EditorTopBar {...props} nameField={{ id: 'n', label: 'Preset name', value: 'x', maxLength: 9, readOnly, onChange: noop }} />,
  )
  expect(field()).toContain('lucide-pencil')
  expect(field(true)).not.toContain('lucide-pencil')
  // The icon is decoration: the field keeps its own label.
  expect(field()).toMatch(/<svg[^>]*lucide-pencil[^>]*aria-hidden="true"/)
})


it('EditorTopBar shows its trail as a collapsing catalog Breadcrumb with the current page marked', () => {
  const html = renderToStaticMarkup(
    <EditorTopBar crumbs={[{ label: 'Components', href: '/editor/component' }, 'Button']}
      nameField={{ id: 'n', label: 'Name', value: 'x', maxLength: 9, onChange: noop }}
      revision="r1" status="" undo={history} redo={history} menu={{ label: 'More', items: [] }} primary={null} />,
  )
  expect(html).toMatch(/<nav[^>]*aria-label="Breadcrumb"[^>]*data-slot="breadcrumb"[^>]*data-collapse="auto"/)
  expect(html).toMatch(/<a[^>]*href="\/editor\/component"[^>]*data-slot="breadcrumb-link"|<a[^>]*data-slot="breadcrumb-link"[^>]*href="\/editor\/component"/)
  expect(html).toMatch(/<span[^>]*aria-current="page"[^>]*data-slot="breadcrumb-page"[^>]*>Button<\/span>/)
})

it('EditorTopBar on the desktop offers File, Edit and View menus: actions split by kind, preview controls as radio groups', () => {
  const html = renderToStaticMarkup(
    <EditorTopBar crumbs={['A']} nameField={{ id: 'n', label: 'Name', value: 'x', maxLength: 9, onChange: noop }}
      revision="r1" status="" undo={history} redo={history}
      menu={{ label: 'More actions', items: [{ id: 'download-json', label: 'Download recipe JSON', onSelect: noop }, { id: 'reset-recipe', label: 'Reset recipe', onSelect: noop }] }}
      view={[{ label: 'Preview mode', value: 'light', options: [{ value: 'light', label: 'Light' }, { value: 'dark', label: 'Dark' }], onChange: noop }]}
      primary={null} />,
  )
  const bar = /<div[^>]*role="menubar"[^>]*>([^]*?)<\/div>/.exec(html)
  expect(bar?.[0]).toContain('aria-label="Editor menus"')
  expect(bar?.[1].match(/role="menuitem"/g)).toHaveLength(3)
  for (const name of ['File', 'Edit', 'View']) expect(bar?.[1]).toContain(`>${name}</button>`)
  // The overflow menu renders too, for widths below 1200px: CSS shows one or the other, so nothing swaps after hydration.
  expect(html).toContain('data-slot="toolbar-overflow-trigger"')
})

it('editMenuItem sends resets to Edit and downloads to File', async () => {
  const { editMenuItem } = await import('./top-bar')
  expect(editMenuItem({ id: 'reset-recipe', label: 'Reset recipe', onSelect: noop })).toBe(true)
  expect(editMenuItem({ id: 'download-json', label: 'Download', onSelect: noop })).toBe(false)
})
