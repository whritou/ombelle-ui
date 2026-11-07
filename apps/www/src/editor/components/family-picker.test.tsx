import { expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { styleFamilies } from '@ombelle/contracts'
import { FamilyPicker } from './family-picker'
import { offeredStyleFamilies, ombelleMinimumCli, publishedInstaller } from '../../snapshots/install-command'

const noop = () => {}

it('shows the families as a labelled group with the current one pressed', () => {
  const html = renderToStaticMarkup(<FamilyPicker value="minimalist" onChange={noop} />)
  expect(html).toContain('role="group" aria-label="Style family"')
  expect(html).toMatch(/data-family="minimalist" aria-pressed="true"/)
  expect(html.match(/aria-pressed="true"/g)).toHaveLength(1)
})

it('offers every family and marks liquid glass experimental', () => {
  const html = renderToStaticMarkup(<FamilyPicker value="liquid-glass" onChange={noop} families={styleFamilies} />)
  for (const name of ['Flat', 'Minimalist', 'Neo-brutalism', 'Ombelle', 'Liquid glass']) expect(html).toContain(name)
  expect(html.match(/aria-pressed="true"/g)).toHaveLength(1)
  expect(html).toContain('Experimental')
})

it('offers ombelle only once the published installer supports it, keeping a selected ombelle visible', () => {
  const families = (html: string) => [...html.matchAll(/class="be-family" data-family="([^"]+)"/g)].map((match) => match[1])
  const render = (value: 'flat' | 'ombelle', version: string) =>
    families(renderToStaticMarkup(<FamilyPicker value={value} onChange={noop} families={offeredStyleFamilies(value, { version })} />))
  expect(render('flat', '0.3.0')).toEqual(['minimalist', 'neo-brutalism', 'flat', 'liquid-glass'])
  expect(render('flat', ombelleMinimumCli)).toEqual(['ombelle', 'minimalist', 'neo-brutalism', 'flat', 'liquid-glass'])
  expect(render('ombelle', '0.3.0')).toEqual(['ombelle', 'minimalist', 'neo-brutalism', 'flat', 'liquid-glass'])
  expect(families(renderToStaticMarkup(<FamilyPicker value="flat" onChange={noop} />))).toEqual([
    ...offeredStyleFamilies('flat', publishedInstaller),
  ])
})
