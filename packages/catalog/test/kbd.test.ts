import { describe, expect, it } from 'vitest'
import { createElement as h } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { Kbd, KbdGroup } from '../src/templates/kbd.js'
import { expectComponentContract } from './new-component-contract.js'

describe('Kbd', () => {
  it('provides Kbd and KbdGroup without client code or extra dependencies', () => {
    expectComponentContract('kbd', { client: false, parts: ['Kbd', 'KbdGroup'], slots: ['kbd', 'kbd-group'],
      dependencies: [{ name: 'react', version: '19.3.1' }, { name: 'clsx', version: '2.1.1' }, { name: 'tailwind-merge', version: '3.7.0' }],
      selectors: ["[data-slot='kbd']", "[data-slot='kbd-group']"], glass: 'experimental' })
  })

  it('renders native kbd keys in a group', () => {
    const html = renderToStaticMarkup(h(KbdGroup, null, h(Kbd, null, 'Ctrl'), h(Kbd, null, 'K')))
    expect(html).toMatch(/^<span[^>]*data-slot="kbd-group"/)
    expect(html).toMatch(/<kbd[^>]*data-slot="kbd"[^>]*>Ctrl<\/kbd>/)
  })
})
