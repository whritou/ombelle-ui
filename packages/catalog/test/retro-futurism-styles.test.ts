import fs from 'node:fs'
import { describe, expect, it } from 'vitest'
import { supportedComponentIds, type ComponentId } from '@ombelle/contracts'
import { lintCatalogStyles, previewSlots, templateSlots } from '../../../scripts/catalog-style-lint.ts'
import { componentSlots } from '../src/component-slots.js'

// Retro futurism is not registered until every file exists, so the catalog build does not read these files yet.
// This test is what lints and covers them until then (and keeps guarding them afterwards).
const styles = 'packages/catalog/src/styles/'
const templates = 'packages/catalog/src/templates/'
// Button, Input and Dialog are styled in the family base file, as in every other family.
const inBase = ['button', 'input', 'dialog'] as const
const componentIds = supportedComponentIds.filter(id => !(inBase as readonly string[]).includes(id))
const read = (file: string) => fs.readFileSync(file, 'utf8').replace(/\r\n?/g, '\n')
const sourcesOf = (id: ComponentId) => [templates + id + '.tsx', templates + 'base/' + id + '.tsx'].filter(file => fs.existsSync(file)).map(read)
const slotsOf = (id: ComponentId) => templateSlots(id, sourcesOf(id), componentSlots[id])
const baseCss = () => (fs.existsSync(styles + 'retro-futurism.css') ? read(styles + 'retro-futurism.css') : '')
const valuesIn = (id: ComponentId) =>
  [...new Set(sourcesOf(id).flatMap(source => Array.from(source.matchAll(/'([a-z][a-z0-9-]*)'/g), match => match[1])))]

describe('retro-futurism styles', () => {
  it('has a family base file with reduced motion and the three base components', () => {
    const css = baseCss()
    expect(css).toContain('prefers-reduced-motion')
    for (const id of inBase) expect(css).toContain(`[data-slot="${id === 'dialog' ? 'dialog-content' : id}"]`)
  })

  it.each(componentIds)('%s has a non-empty retro-futurism.css naming only its own slots', id => {
    const file = styles + id + '/retro-futurism.css'
    expect(fs.existsSync(file), file + ' is missing').toBe(true)
    const css = read(file)
    expect(css.trim().length).toBeGreaterThan(0)
    expect(
      lintCatalogStyles({
        componentStyles: { [id]: { 'retro-futurism': css } },
        familyStyles: {},
        slots: { [id]: slotsOf(id) },
        previewSlots,
      }),
    ).toEqual([])
  })

  it.each(componentIds)('%s styles every variant, size and appearance its template declares', id => {
    const css = fs.existsSync(styles + id + '/retro-futurism.css') ? read(styles + id + '/retro-futurism.css') : ''
    const declared = sourcesOf(id).flatMap(source =>
      Array.from(source.matchAll(/data-(variant|size|appearance)=\{?['"]?([a-z][a-z0-9-]*)/g), match => [match[1], match[2]] as const),
    )
    const named = new Set(valuesIn(id))
    const missing = declared.filter(([attribute, value]) => named.has(value) && !css.includes(value) && attribute !== 'size').map(([, value]) => value)
    expect(new Set(missing)).toEqual(new Set())
  })

  it('base file lints cleanly against every catalog slot', () => {
    const slots = Object.fromEntries(supportedComponentIds.map(id => [id, slotsOf(id)]))
    expect(lintCatalogStyles({ componentStyles: {}, familyStyles: { 'retro-futurism': baseCss() }, slots, previewSlots })).toEqual([])
  })

  // Retro futurism's secondary is a saturated teal fill, so --secondary may only paint a filled control.
  const allFiles = [styles + 'retro-futurism.css', ...componentIds.map(id => styles + id + '/retro-futurism.css')]
  const blocks = (css: string) => css.replace(/\/\*[\s\S]*?\*\//g, '').split('}').map(block => block.split('{').pop() ?? '')
  it.each(allFiles)('%s uses --secondary only as a filled control', file => {
    const css = fs.existsSync(file) ? read(file) : ''
    expect(css.length, file + ' is missing').toBeGreaterThan(0)
    const surfaces = blocks(css).filter(block => /background(-color)?\s*:[^;]*var\(--secondary\)/.test(block) && !block.includes('var(--secondary-foreground)'))
    expect(surfaces).toEqual([])
  })

  // The last matching rule outside forced colors is the one that applies.
  const rule = (css: string, selector: string) => {
    css = css.replace(/@media\s*\(forced-colors:\s*active\)\s*\{[\s\S]*?\n\}/g, '')
    const at = css.lastIndexOf(selector + '{')
    return at < 0 ? '' : css.slice(at, css.indexOf('}', at))
  }

  it('base declares every shared --rf property once', () => {
    const css = baseCss()
    for (const name of ['--rf-key', '--rf-r1', '--rf-r2', '--rf-r3', '--rf-r4', '--rf-pill', '--rf-e1', '--rf-e2', '--rf-e3', '--rf-pri2', '--rf-sec2', '--rf-dst2', '--rf-sun', '--rf-band', '--rf-stripes', '--rf-scan', '--rf-sun-mask'])
      expect(css.split(name + ':').length - 1, name).toBe(1)
  })

  it('base draws the button as a two-tone pill on a 4px key shadow', () => {
    const button = rule(baseCss(), '[data-slot="button"]')
    expect(button).toContain('border-radius:var(--rf-pill)')
    expect(button).toContain('box-shadow:var(--rf-e1)')
    expect(button).toContain('margin-block-end:4px')
    expect(button).toContain('var(--rf-scan)')
    expect(rule(baseCss(), '[data-slot="button"]:not(:disabled):active')).toContain('translateY(4px)')
  })

  it('base removes the key-shadow margin inside card actions and on the dialog close', () => {
    const css = baseCss()
    const tight = rule(css, '[data-slot="card-action"] [data-slot="button"],[data-slot="dialog-close"]')
    expect(tight).toContain('margin-block-end:0')
    expect(tight).toContain('box-shadow:none')
  })

  it('base draws the dialog stripes inside the dialog box', () => {
    const before = rule(baseCss(), '[data-slot="dialog-content"]::before')
    expect(before).toContain('var(--rf-stripes)')
    expect(before).not.toMatch(/inset[^;]*:-|inset[^;]*: -/)
  })
})
