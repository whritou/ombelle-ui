import { expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { ComponentSwitcher, filterComponents } from './component-switcher'

const list = [
  { id: 'accordion', label: 'Accordion', href: '/editor/component/accordion' },
  { id: 'button', label: 'Button', href: '/editor/component/button' },
  { id: 'button-group', label: 'Button Group', href: '/editor/component/button-group' },
] as never

it('filters by a case-insensitive part of the label and keeps the order', () => {
  expect(filterComponents('BUT', list).map(component => component.label)).toEqual(['Button', 'Button Group'])
  expect(filterComponents('acc', list).map(component => component.label)).toEqual(['Accordion'])
})

it('returns the whole list for an empty or blank query', () => {
  expect(filterComponents('', list)).toHaveLength(3)
  expect(filterComponents('   ', list)).toHaveLength(3)
})

it('names the switcher after the component it edits', () => {
  const html = renderToStaticMarkup(<ComponentSwitcher current="button" />)
  expect(html).toContain('aria-label="Component: Button. Choose a component"')
  expect(html).toContain('aria-haspopup="dialog"')
  expect(html).toContain('>Button<')
})
