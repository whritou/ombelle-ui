import { describe, expect, it } from 'vitest'
import { fontRegistry } from '@ombelle/catalog'
import { auditFontStyles, fontLoaders, presetFontIds, recipeFontIds } from '../../apps/preview/src/preset-fonts.js'

it('has a loader for exactly the registry fonts', () => {
  expect(Object.keys(fontLoaders).sort()).toEqual(fontRegistry.map((font) => font.id).sort())
})

it('lists the registry fonts a design uses once and ignores system ids', () => {
  expect(
    presetFontIds({
      fontFamilyId: 'system-sans',
      headingFontFamilyId: 'geist',
      monoFontFamilyId: 'geist-mono',
    }),
  ).toEqual(['geist', 'geist-mono'])
  expect(presetFontIds({ fontFamilyId: 'geist', headingFontFamilyId: 'geist' })).toEqual(['geist'])
  expect(presetFontIds({})).toEqual([])
})

it('turns the audit font list into override styles and the fonts to load', () => {
  const audit = auditFontStyles('inter,fraunces,jetbrains-mono')
  expect(audit.ids).toEqual(['inter', 'fraunces', 'jetbrains-mono'])
  expect(audit.css).toContain("--font-family:'Inter Variable', system-ui, sans-serif !important")
  expect(audit.css).toContain('[data-ombelle-recipe]')
  expect(audit.css).toContain('[data-slot$="card-title"]:not([hidden]):not([hidden]){font-family:var(--font-heading)}')
  expect(audit.css).toContain('[data-slot$="kbd"]:not([hidden]):not([hidden]){font-family:var(--font-mono)}')
  expect(audit.css).not.toContain('checkbox-option-title')
})

it('treats empty audit list entries as unset', () => {
  const audit = auditFontStyles('geist,,')
  expect(audit.ids).toEqual(['geist'])
  expect(audit.css).not.toContain('--font-heading')
})

it('gives the audit the same title line height the compiler emits for a tall display font', () => {
  expect(auditFontStyles('nunito,young-serif,geist-mono').css).toContain(
    '[data-slot$="card-title"]:not([hidden]):not([hidden]){font-family:var(--font-heading);line-height:1.5}',
  )
  expect(auditFontStyles('inter,fraunces,').css).not.toContain('line-height')
})

describe('recipe fonts in the editor preview', () => {
  const button = { overrides: { fontFamilyId: 'instrument-sans' } }
  const recipe = { appearance: { fonts: { fontFamilyId: 'instrument-sans', headingFontFamilyId: 'fraunces', monoFontFamilyId: 'ibm-plex-mono' } } }
  it('loads the registry fonts a Button or catalog recipe names, once each', () => {
    expect(recipeFontIds({ type: 'render', state: { recipe: button } })).toEqual(['instrument-sans'])
    expect(recipeFontIds({ type: 'catalog-render', result: { recipe: { data: recipe } } })).toEqual(['instrument-sans', 'fraunces', 'ibm-plex-mono'])
    expect(recipeFontIds({ type: 'matrix-render', cells: [{ recipe: button }, { recipe: button }] })).toEqual(['instrument-sans'])
    expect(recipeFontIds({ type: 'catalog-matrix-render', cells: [{ result: { recipe: { data: recipe } } }] })).toHaveLength(3)
  })
  it('loads nothing for system fonts, unknown ids or no message', () => {
    expect(recipeFontIds(null)).toEqual([])
    expect(recipeFontIds({ type: 'render', state: { recipe: { overrides: { fontFamilyId: 'system-sans' } } } })).toEqual([])
  })
})
