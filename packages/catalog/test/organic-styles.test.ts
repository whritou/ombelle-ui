import fs from 'node:fs'
import { describe, expect, it } from 'vitest'
import { supportedComponentIds, type ComponentId } from '@ombelle/contracts'
import { lintCatalogStyles, previewSlots, templateSlots } from '../../../scripts/catalog-style-lint.ts'
import { componentSlots } from '../src/component-slots.js'

// Organic is not registered until every file exists, so the catalog build does not read these files yet.
// This test is what lints and covers them until then (and keeps guarding them afterwards).
const styles = 'packages/catalog/src/styles/'
const templates = 'packages/catalog/src/templates/'
// Button, Input and Dialog are styled in the family base file, as in every other family.
const inBase = ['button', 'input', 'dialog'] as const
const componentIds = supportedComponentIds.filter(id => !(inBase as readonly string[]).includes(id))
const read = (file: string) => fs.readFileSync(file, 'utf8').replace(/\r\n?/g, '\n')
const sourcesOf = (id: ComponentId) => [templates + id + '.tsx', templates + 'base/' + id + '.tsx'].filter(file => fs.existsSync(file)).map(read)
const slotsOf = (id: ComponentId) => templateSlots(id, sourcesOf(id), componentSlots[id])
const baseCss = () => (fs.existsSync(styles + 'organic.css') ? read(styles + 'organic.css') : '')
const valuesIn = (id: ComponentId) =>
  [...new Set(sourcesOf(id).flatMap(source => Array.from(source.matchAll(/'([a-z][a-z0-9-]*)'/g), match => match[1])))]

describe('organic styles', () => {
  it('has a family base file with reduced motion and the three base components', () => {
    const css = baseCss()
    expect(css).toContain('prefers-reduced-motion')
    for (const id of inBase) expect(css).toContain(`[data-slot="${id === 'dialog' ? 'dialog-content' : id}"]`)
  })

  it.each(componentIds)('%s has a non-empty organic.css naming only its own slots', id => {
    const file = styles + id + '/organic.css'
    expect(fs.existsSync(file), file + ' is missing').toBe(true)
    const css = read(file)
    expect(css.trim().length).toBeGreaterThan(0)
    expect(
      lintCatalogStyles({
        componentStyles: { [id]: { organic: css } },
        familyStyles: {},
        slots: { [id]: slotsOf(id) },
        previewSlots,
      }),
    ).toEqual([])
  })

  it.each(componentIds)('%s styles every variant, size and appearance its template declares', id => {
    const css = fs.existsSync(styles + id + '/organic.css') ? read(styles + id + '/organic.css') : ''
    const declared = sourcesOf(id).flatMap(source =>
      Array.from(source.matchAll(/data-(variant|size|appearance)=\{?['"]?([a-z][a-z0-9-]*)/g), match => [match[1], match[2]] as const),
    )
    const named = new Set(valuesIn(id))
    const missing = declared.filter(([attribute, value]) => named.has(value) && !css.includes(value) && attribute !== 'size').map(([, value]) => value)
    expect(new Set(missing)).toEqual(new Set())
  })

  it('base file lints cleanly against every catalog slot', () => {
    const slots = Object.fromEntries(supportedComponentIds.map(id => [id, slotsOf(id)]))
    expect(lintCatalogStyles({ componentStyles: {}, familyStyles: { organic: baseCss() }, slots, previewSlots })).toEqual([])
  })
})
