import fs from 'node:fs'
import { describe, expect, it } from 'vitest'
import { lintCatalogStyles, templateSlots } from '../../../scripts/catalog-style-lint.ts'
import { componentSlots } from '../src/component-slots.js'
import { previewSlots } from '../../../scripts/catalog-style-lint.ts'
import { styleFamilies, styleSupport, supportedComponentIds } from '@ombelle/contracts'

const lint = (component: Record<string, string>, family: Record<string, string> = {}, slots: Record<string, string[]> = { accordion: ['accordion'] }) =>
  lintCatalogStyles({ componentStyles: { accordion: component }, familyStyles: family, slots })

describe('catalog style lint', () => {
  it('reports a component rule that names no slot or marker', () => {
    expect(lint({ ombelle: "[data-icon='plus']{display:none}" }))
      .toEqual(['accordion/ombelle.css: "[data-icon=\'plus\']" names no accordion slot or marker'])
  })

  it('reports a component rule naming an unknown slot', () => {
    expect(lint({ ombelle: '[data-slot="acordion"]{color:red}' }))
      .toEqual(['accordion/ombelle.css: "[data-slot="acordion"]" names unknown slot "acordion"'])
  })

  it('accepts own markers, own slots and keyframes', () => {
    expect(lint({ ombelle: '[data-accordion-icon="plus"]{display:none}[data-slot="accordion"] svg{color:red}@keyframes spin{from{opacity:0}to{opacity:1}}' })).toEqual([])
  })

  it('reports a family rule that names no catalog slot', () => {
    expect(lint({}, { flat: 'body{margin:0}[data-slot="accordion"]{color:red}' }))
      .toEqual(['flat.css: "body" names no catalog slot'])
  })

  it('accepts a bare data-slot rule and declared preview slots in family sheets', () => {
    expect(lintCatalogStyles({ componentStyles: {}, slots: {}, previewSlots: ['glass-field-halo'],
      familyStyles: { flat: '[data-slot]{box-sizing:border-box}', lab: '[data-slot="glass-field-halo"]{inset:0}' } })).toEqual([])
    expect(lintCatalogStyles({ componentStyles: {}, slots: {}, familyStyles: { lab: '[data-slot="glass-field-halo"]{inset:0}' } }))
      .toEqual(['lab.css: "[data-slot="glass-field-halo"]" names no catalog slot'])
  })

  it('reads literal data-slot attributes and declared slots', () => {
    expect(templateSlots('card', ['<div data-slot="card-header" /><p data-slot=\'card-title\' />'], ['card']))
      .toEqual(['card', 'card-header', 'card-title'])
    expect(templateSlots('label', ['<label data-slot="label" />'])).toEqual(['label'])
  })

  it('finds no violation in the reviewed catalog', () => {
    const base = 'packages/catalog/src/'
    const read = (file: string) => fs.readFileSync(base + file, 'utf8')
    const slots = Object.fromEntries(supportedComponentIds.map(id => [id, templateSlots(id,
      ['templates/' + id + '.tsx', 'templates/base/' + id + '.tsx'].filter(file => fs.existsSync(base + file)).map(read),
      componentSlots[id])]))
    const componentStyles = Object.fromEntries(supportedComponentIds.filter(id => fs.existsSync(base + 'styles/' + id))
      .map(id => [id, Object.fromEntries(styleFamilies.filter(family => styleSupport(id, family) !== 'unavailable')
        .map(family => [family, read('styles/' + id + '/' + family + '.css')]))]))
    const familyStyles = { ...Object.fromEntries(styleFamilies.map(family => [family, read('styles/' + family + '.css')])),
      'liquid-glass-lab': read('styles/liquid-glass-lab.css') }
    expect(lintCatalogStyles({ componentStyles, familyStyles, slots, previewSlots })).toEqual([])
  })
})
