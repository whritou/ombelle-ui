import { expect, it } from 'vitest'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { styleFamilies, supportedComponentIds } from '@ombelle/contracts'
import { SupportMatrix } from './support-matrix'

it('renders every component and family with explicit support labels and scoped headings', () => {
  const html = renderToStaticMarkup(createElement(SupportMatrix))
  expect(html.match(/scope="row"/g)).toHaveLength(supportedComponentIds.length)
  expect(html.match(/scope="col"/g)).toHaveLength(styleFamilies.length + 1)
  for (const id of supportedComponentIds) expect(html).toContain(`href="/components/${id}"`)
  expect(html.match(/>Experimental<\/td>/g)).toHaveLength(supportedComponentIds.length)
  expect(html).toContain('Unavailable combinations cannot be installed.')
})
