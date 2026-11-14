import { expect, it } from 'vitest'
import { fontRegistry } from '@ombelle/catalog'
import { auditFontStyles, fontLoaders, presetFontIds } from '../../apps/preview/src/preset-fonts.js'

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
