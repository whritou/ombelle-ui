// @vitest-environment jsdom
import { expect, it } from 'vitest'
import { historyShortcut } from './command-groups'

const press = (target: Element, keys: { key?: string; ctrlKey?: boolean; metaKey?: boolean; shiftKey?: boolean; altKey?: boolean; defaultPrevented?: boolean } = {}) =>
  historyShortcut({ key: 'z', ctrlKey: false, metaKey: false, shiftKey: false, altKey: false, defaultPrevented: false, target, ...keys })

it('maps Ctrl+Z and Command+Z to undo, with Shift to redo', () => {
  document.body.innerHTML = '<button id="b">x</button><input id="range" type="range">'
  const button = document.getElementById('b')!
  expect(press(button, { ctrlKey: true })).toBe('undo')
  expect(press(button, { metaKey: true })).toBe('undo')
  expect(press(button, { key: 'Z', ctrlKey: true, shiftKey: true })).toBe('redo')
  expect(press(button, { key: 'Z', metaKey: true, shiftKey: true })).toBe('redo')
  // Sliders have no undo of their own.
  expect(press(document.getElementById('range')!, { ctrlKey: true })).toBe('undo')
})

it('leaves other keys, text fields, dialogs and menus alone', () => {
  document.body.innerHTML = '<button id="b">x</button><input id="t"><textarea id="a"></textarea>'
    + '<div role="dialog"><button id="d">x</button></div><div role="menu"><div id="m" role="menuitem">x</div></div>'
  const button = document.getElementById('b')!
  expect(press(button)).toBeNull()
  expect(press(button, { ctrlKey: true, altKey: true })).toBeNull()
  expect(press(button, { key: 'y', ctrlKey: true })).toBeNull()
  expect(press(button, { ctrlKey: true, defaultPrevented: true })).toBeNull()
  for (const id of ['t', 'a', 'd', 'm']) expect(press(document.getElementById(id)!, { ctrlKey: true })).toBeNull()
})
