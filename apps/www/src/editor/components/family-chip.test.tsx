import { expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { FamilyChip } from './family-chip'

const noop = () => {}

it('shows the current family on a chip that opens the family picker', () => {
  const html = renderToStaticMarkup(<FamilyChip value="minimalist" onChange={noop} />)
  expect(html).toContain('aria-label="Style family: Minimalist"')
  expect(html).toContain('popoverTarget="button-family-picker"')
  expect(html).toContain('role="group" aria-label="Style family"')
})

it('offers every family and marks liquid glass experimental', () => {
  const html = renderToStaticMarkup(<FamilyChip value="liquid-glass" onChange={noop} />)
  for (const name of ['Flat', 'Minimalist', 'Neo-brutalism', 'Liquid glass']) expect(html).toContain(name)
  expect(html.match(/aria-pressed="true"/g)).toHaveLength(1)
  expect(html).toContain('Experimental')
})
