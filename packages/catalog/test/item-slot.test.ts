// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest'
import { act, createElement as h } from 'react'
import { createRoot } from 'react-dom/client'
import { Item } from '../src/templates/item.js'

// CAT-09: Item asChild merged the other way round from Radix Slot (the Item's props won) and kept
// only one click handler. It now merges as Slot: the child's props win and both handlers run.
;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
afterEach(() => { document.body.innerHTML = '' })

it('runs both click handlers and lets the child link keep its own props', async () => {
  const item = vi.fn(), link = vi.fn()
  const container = document.createElement('div')
  document.body.append(container)
  await act(async () => {
    createRoot(container).render(h(Item, { asChild: true, onClick: item, title: 'item', className: 'outer' },
      h('a', { href: '#a', onClick: (event: MouseEvent) => { link(); event.preventDefault() }, title: 'link', className: 'inner' }, 'Open')))
  })
  const anchor = container.querySelector('a')!
  await act(async () => { anchor.click() })
  expect(link).toHaveBeenCalledTimes(1)
  expect(item).toHaveBeenCalledTimes(1)
  expect(anchor.title).toBe('link')
  expect(anchor.className).toBe('outer inner')
  expect(anchor.getAttribute('data-slot')).toBe('item')
})
