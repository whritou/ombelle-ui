import { expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { styleFamilies } from '@ombelle/contracts'
import { FamilyChip } from './family-chip'
import { offeredStyleFamilies, ombelleMinimumCli, publishedInstaller } from '../../snapshots/install-command'

const noop = () => {}

it('shows the current family on a chip that opens the family picker', () => {
  const html = renderToStaticMarkup(<FamilyChip value="minimalist" onChange={noop} />)
  expect(html).toContain('aria-label="Style family: Minimalist"')
  expect(html).toContain('popoverTarget="button-family-picker"')
  expect(html).toContain('role="group" aria-label="Style family"')
})

it('offers every family and marks liquid glass experimental', () => {
  const html = renderToStaticMarkup(<FamilyChip value="liquid-glass" onChange={noop} families={styleFamilies} />)
  for (const name of ['Flat', 'Minimalist', 'Neo-brutalism', 'Ombelle', 'Liquid glass']) expect(html).toContain(name)
  expect(html.match(/aria-pressed="true"/g)).toHaveLength(1)
  expect(html).toContain('Experimental')
})

it('offers ombelle only once the published installer supports it, keeping a selected ombelle visible', () => {
  const families = (html: string) => [...html.matchAll(/class="be-family" data-family="([^"]+)"/g)].map((match) => match[1])
  const render = (value: 'flat' | 'ombelle', version: string) =>
    families(renderToStaticMarkup(<FamilyChip value={value} onChange={noop} families={offeredStyleFamilies(value, { version })} />))
  expect(render('flat', '0.3.0')).toEqual(['flat', 'minimalist', 'neo-brutalism', 'liquid-glass'])
  expect(render('flat', ombelleMinimumCli)).toEqual(['flat', 'minimalist', 'neo-brutalism', 'ombelle', 'liquid-glass'])
  expect(render('ombelle', '0.3.0')).toEqual(['flat', 'minimalist', 'neo-brutalism', 'ombelle', 'liquid-glass'])
  expect(families(renderToStaticMarkup(<FamilyChip value="flat" onChange={noop} />))).toEqual([
    ...offeredStyleFamilies('flat', publishedInstaller),
  ])
})
