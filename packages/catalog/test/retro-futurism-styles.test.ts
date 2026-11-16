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
    for (let at = css.search(/@media\s*\(forced-colors:\s*active\)/); at >= 0; at = css.search(/@media\s*\(forced-colors:\s*active\)/)) {
      let depth = 0
      let end = css.indexOf('{', at)
      do {
        if (css[end] === '{') depth++
        else if (css[end] === '}') depth--
        end++
      } while (depth > 0 && end < css.length)
      css = css.slice(0, at) + css.slice(end)
    }
    let at = css.lastIndexOf(selector + '{')
    while (at > 0 && !['}', '\n'].includes(css[at - 1] ?? '')) at = css.lastIndexOf(selector + '{', at - 1)
    return at < 0 ? '' : css.slice(at, css.indexOf('}', at))
  }

  it('base declares every shared --rf property once', () => {
    const css = baseCss()
    for (const name of ['--rf-key', '--rf-r1', '--rf-r2', '--rf-r3', '--rf-r4', '--rf-pill', '--rf-e1', '--rf-e2', '--rf-e3', '--rf-pri2', '--rf-sec2', '--rf-dst2', '--rf-sun', '--rf-band', '--rf-stripes', '--rf-scan', '--rf-sun-mask', '--rf-rule'])
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

  // The button recipe compiler accepts only one slot per selector in the base, so card actions are handled in card/.
  it('base removes the key-shadow margin on the dialog close', () => {
    const css = baseCss()
    const tight = rule(css, '[data-slot="dialog-close"]')
    expect(tight).toContain('margin-block-end:0')
    expect(tight).toContain('box-shadow:none')
  })

  it('base draws the dialog stripes inside the dialog box', () => {
    const before = rule(baseCss(), '[data-slot="dialog-content"]::before')
    expect(before).toContain('var(--rf-stripes)')
    expect(before).not.toMatch(/inset[^;]*:-|inset[^;]*: -/)
  })

  const layerOf = (id: string) => {
    const file = styles + id + '/retro-futurism.css'
    return fs.existsSync(file) ? read(file).split('/* retro-futurism layer */')[1] ?? '' : ''
  }

  describe('actions board', () => {
    it('button group draws one outline and key shadow with pill ends and 2px seams', () => {
      const css = layerOf('button-group')
      const group = rule(css, "[data-slot='button-group']")
      expect(group).toContain('border:2px solid var(--border)')
      expect(group).toContain('border-radius:var(--rf-pill)')
      expect(group).toContain('box-shadow:var(--rf-e1)')
      expect(rule(css, "[data-slot='button-group'][data-orientation='vertical']")).toContain('border-radius:24px')
      expect(css).toMatch(/border-inline-start:2px solid var\(--border\)/)
      expect(css).toMatch(/:focus-visible\{[^}]*outline-offset:-\d+px/)
    })

    it('a pressed toggle gets an outline and no key shadow', () => {
      const on = rule(layerOf('toggle'), "[data-slot='toggle'][data-state='on']")
      expect(on).toContain('inset 0 0 0 2px var(--border)')
      expect(on).not.toContain('--rf-e1')
      expect(on).not.toContain('--rf-key')
    })

    it('segmented selection has no key shadow and toolbar-style selection sits on one', () => {
      const css = layerOf('toggle-group')
      expect(rule(css, "[data-slot='toggle-group-item'][data-variant='segmented'][data-state='on']")).not.toMatch(/--rf-e1|--rf-key/)
      expect(rule(css, "[data-slot='toggle-group-item'][data-variant='toolbar'][data-state='on']")).toContain('0 3px 0 var(--rf-key)')
      expect(rule(css, "[data-slot='toggle-group'][data-variant='segmented']")).toContain('border-radius:var(--rf-pill)')
    })

    it('badges are pills and destructive solid keeps an inner ring', () => {
      const css = layerOf('badge')
      expect(rule(css, "[data-slot='badge']")).toContain('border-radius:var(--rf-pill)')
      expect(css).toMatch(/\[data-variant='destructive'\][^{]*\{[^}]*inset 0 0 0 2px/)
    })

    it('kbd is a key cap with a 2px outline and a 3px base', () => {
      const kbd = rule(layerOf('kbd'), "[data-slot='kbd']")
      expect(kbd).toContain('inset 0 0 0 2px var(--border)')
      expect(kbd).toContain('0 3px 0 var(--rf-key)')
    })
  })

  describe('text fields board', () => {
    it('OTP slots are separate 12px cells', () => {
      expect(rule(layerOf('input-otp'), "[data-slot='input-otp-slot']")).toContain('border-radius:12px')
    })

    it('password strength bars are pills', () => {
      expect(rule(layerOf('password-field'), "[data-slot='password-field-strength-bar']")).toContain('border-radius:var(--rf-pill)')
    })

    it('an input-group button has no key shadow and no block-end margin', () => {
      const button = rule(layerOf('input-group'), "[data-slot='input-group-button']")
      expect(button).toContain('box-shadow:none')
      expect(button).toContain('margin-block-end:0')
    })
  })

  describe('choice controls board', () => {
    it('checkbox boxes are 6px squares with invalid and checked-card rules', () => {
      const css = layerOf('checkbox')
      expect(rule(css, "[data-slot='checkbox']")).toContain('border-radius:6px')
      expect(css).toContain("[data-slot='checkbox'][aria-invalid='true']")
      expect(css).toMatch(/\[data-appearance='card'\]:has\(> \[data-state='checked'\]\)/)
    })

    it('switch track is a pill and the checked thumb is a sun', () => {
      const css = layerOf('switch')
      expect(rule(css, "[data-slot='switch']")).toContain('border-radius:var(--rf-pill)')
      expect(rule(css, "[data-slot='switch-thumb'][data-state='checked']")).toContain('var(--rf-sun)')
    })

    it('slider fill is striped and the thumb is an outlined sun disc', () => {
      const css = layerOf('slider')
      expect(rule(css, "[data-slot='slider-range']")).toContain('repeating-linear-gradient')
      const thumb = rule(css, "[data-slot='slider-thumb']")
      expect(thumb).toContain('background:var(--rf-sun)')
      expect(thumb).toContain('border:2px solid var(--border)')
      expect(thumb).toContain('border-radius:50%')
    })

    it('calendar selection is a disc, range ends round and the middle square', () => {
      const css = layerOf('calendar')
      expect(rule(css, "[data-slot='calendar-day-button']")).toContain('border-radius:50%')
      expect(rule(css, "[data-slot='calendar-day'][data-range-start]")).toContain('var(--rf-pill)')
      expect(rule(css, "[data-slot='calendar-day'][data-range-middle]")).not.toContain('radius')
    })
  })
})
