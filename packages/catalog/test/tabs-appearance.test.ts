import { createElement as h } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { expect, it } from 'vitest'
import * as Radix from '../src/templates/tabs.js'
import * as Base from '../src/templates/base/tabs.js'
import { getCatalog } from '../src/index.js'
import { rulesIn } from '../../compiler/test/new-component-artifacts.js'

it.each([['radix', Radix], ['base', Base]] as const)('%s TabsList exposes contained and underline appearances with tab semantics', (_, parts) => {
  for (const appearance of ['contained', 'underline'] as const) {
    const html = renderToStaticMarkup(h(parts.Tabs, { defaultValue: 'one', orientation: 'vertical' },
      h(parts.TabsList, { appearance, 'aria-label': 'Sections' },
        h(parts.TabsTrigger, { value: 'one' }, 'One'), h(parts.TabsTrigger, { value: 'two', disabled: true }, 'Two')),
      h(parts.TabsContent, { value: 'one' }, 'First panel')))
    expect(html).toContain(`data-appearance="${appearance}"`)
    expect(html).toContain('role="tablist"')
    expect(html).toContain('aria-selected="true"')
    expect(html).toContain('aria-orientation="vertical"')
  }
})

it('keeps glass underline text on an opaque bounded surface and defeats the material list paint', () => {
  const css = getCatalog('0.1.0').templates.tabs.styles!['liquid-glass']!
  const selector = "[data-slot='tabs-list'][data-appearance='underline'][data-orientation]"
  expect(rulesIn(css, selector).background).toBe('var(--muted)')
  expect(rulesIn(css, selector)['border-radius']).toBe('0')
  expect(rulesIn(css, selector)['backdrop-filter']).toBe('none')
})
