import fs from 'node:fs'
import { describe, expect, it } from 'vitest'

// Regression tests for the findings of the Organic specimen audit (organic/radix and organic/base, light and dark).
const styles = 'packages/catalog/src/styles/'
const read = (file: string) => fs.readFileSync(file, 'utf8').replace(/\r\n?/g, '\n')
const css = (id: string) => read(styles + id + '/organic.css')
const rules = (source: string) =>
  [...source.replace(/\/\*[\s\S]*?\*\//g, '').matchAll(/([^{}@]+)\{([^{}]*)\}/g)].map(match => ({ selector: match[1]!.trim(), body: match[2]! }))

describe('organic audit fixes', () => {
  it('keeps the toast shadow inside the 8px padding of its viewport', () => {
    const toast = rules(css('toast')).filter(rule => rule.selector === "[data-slot='toast']")
    const shadow = toast.map(rule => /box-shadow:\s*([^;]+)/.exec(rule.body)?.[1]).filter(value => value && value !== 'none').at(-1)!
    // 0 4px 8px -4px: offset y + blur + spread is the farthest the shadow reaches (a negative spread pulls it in).
    const [, y, blur, spread] = /^(?:-?\d+(?:px)?)\s+(-?\d+)px\s+(\d+)px\s+(-?\d+)px/.exec(shadow)!.map(Number)
    expect((y ?? 0) + (blur ?? 0) + (spread ?? 0)).toBeLessThanOrEqual(8)
    expect(shadow).not.toContain('var(--o-e3)')
  })

  it.each(['select', 'dropdown-menu', 'context-menu', 'command', 'combobox'])(
    '%s rings its highlighted row so focus is visible at 3:1',
    id => {
      const highlighted = rules(css(id)).filter(rule => /\[data-highlighted\]|\[data-selected='true'\]/.test(rule.selector) && /background:\s*var\(--secondary\)/.test(rule.body))
      expect(highlighted.length, id).toBeGreaterThan(0)
      for (const rule of highlighted) expect(rule.body, rule.selector).toMatch(/outline:\s*2px solid var\(--ring\)/)
    },
  )

  it.each(['card', 'alert-dialog'])('%s draws its blob inside its own box', id => {
    for (const rule of rules(css(id)).filter(rule => /::before/.test(rule.selector) && /content:/.test(rule.body)))
      expect(rule.body, rule.selector).not.toMatch(/inset-(?:block|inline)-(?:start|end):\s*-/)
  })

  it('draws the dialog blob inside the dialog box', () => {
    const base = read(styles + 'organic.css')
    for (const rule of rules(base).filter(rule => /dialog-content'?"?\]::before/.test(rule.selector) && /content:/.test(rule.body)))
      expect(rule.body, rule.selector).not.toMatch(/inset-(?:block|inline)-(?:start|end):\s*-/)
  })

  it('gives the slider thumb room for its hidden input', () => {
    const thumb = rules(css('slider')).filter(rule => rule.selector === "[data-slot='slider-thumb']").at(-1)!
    const border = Number(/border:\s*(\d+)px/.exec(thumb.body)![1])
    const size = Number(/inline-size:\s*(\d+)px/.exec(thumb.body)![1])
    expect(size - 2 * border).toBeGreaterThanOrEqual(16)
  })
})

// Findings of the whole-branch review: cascade bugs the specimen audit cannot see.
const layer = (source: string) => source.split('/* organic layer */')[1] ?? ''
const forced = (id: string) => layer(css(id)).split('@media (forced-colors: active)').slice(1).join('')
const exact = (source: string, selector: string) =>
  rules(source).filter(rule => rule.selector.replace(/"/g, "'") === selector.replace(/"/g, "'"))

describe('organic review fixes', () => {
  it('keeps the alert dialog fixed and scrollable', () => {
    for (const rule of exact(layer(css('alert-dialog')), "[data-slot='alert-dialog-content']")) {
      expect(rule.body).not.toMatch(/position:\s*relative/)
      expect(rule.body).not.toMatch(/overflow:\s*hidden/)
    }
  })

  it('keeps the dialog padding clear of the close button', () => {
    for (const rule of exact(read(styles + 'organic.css'), "[data-slot='dialog-content']"))
      expect(rule.body).not.toMatch(/(?:^|;)\s*padding:\s*1\.75rem/)
  })

  it('keeps a boundary on outlined and subtle cards in forced colors', () => {
    const block = forced('card')
    expect(block).toMatch(/\[data-appearance='outlined'\][^{}]*\{[^}]*border:\s*2px solid CanvasText/)
    expect(block).toMatch(/\[data-appearance='subtle'\][^{}]*\{[^}]*border:\s*2px solid CanvasText/)
  })

  it('keeps the whole linked card clickable by not positioning its header', () => {
    const source = layer(css('card'))
    for (const rule of rules(source).filter(rule => /card-header'\](?: > \*)?$/.test(rule.selector.trim())))
      expect(rule.body, rule.selector).not.toMatch(/position:\s*relative/)
    expect(exact(source, "[data-slot='card']")[0]!.body).toMatch(/isolation:\s*isolate/)
    expect(exact(source, "[data-slot='card-header']::before")[0]!.body).toMatch(/z-index:\s*-1/)
  })

  it('lets a wide table scroll sideways inside its container', () => {
    const container = exact(layer(css('table')), "[data-slot='table-container']")
    expect(container.some(rule => /overflow-x:\s*auto/.test(rule.body))).toBe(true)
    for (const rule of container) expect(rule.body).not.toMatch(/overflow:\s*hidden/)
  })

  it.each([
    ['meter', 'meter-cell', 'Highlight'],
    ['carousel', 'carousel-dot', 'Highlight'],
    ['calendar', 'data-range-middle', 'HighlightText'],
  ])('%s restates its selected state with system colours in forced colors', (id, marker, colour) => {
    const block = forced(id)
    expect(block).toContain(marker)
    expect(block).toContain(colour)
  })

  it.each([
    ['', '[data-slot="input"]'],
    ['textarea', "[data-slot='textarea']"],
    ['native-select', "[data-slot='native-select']"],
    ['select', "[data-slot='select-trigger']"],
    ['number-input', "[data-slot='number-input']"],
    ['input-group', "[data-slot='input-group']"],
    ['password-field', "[data-slot='password-field-control']"],
    ['combobox', "[data-slot='combobox-field']"],
    ['tag-input', "[data-slot='tag-input']"],
    ['input-otp', "[data-slot='input-otp-slot']"],
  ])('draws the boundary of %s with the input colour, not the 42% line', (id, selector) => {
    const source = id ? css(id) : read(styles + 'organic.css')
    for (const rule of exact(source, selector)) expect(rule.body, rule.selector).not.toContain('--o-line')
  })

  it.each([['toggle', "[data-variant='outline']"], ['chip', "[data-slot='chip']"], ['item', "[data-variant='outline']"]])(
    '%s draws its outline ring with the input colour',
    (id, marker) => {
      const ring = rules(layer(css(id))).filter(rule => rule.selector.includes(marker) && /box-shadow:\s*inset 0 0 0 2px/.test(rule.body))
      expect(ring.length, id).toBeGreaterThan(0)
      for (const rule of ring) expect(rule.body, rule.selector).toContain('var(--input)')
    },
  )
})
