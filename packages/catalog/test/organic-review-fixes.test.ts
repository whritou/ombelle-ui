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
