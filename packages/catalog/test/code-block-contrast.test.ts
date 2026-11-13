import fs from 'node:fs'
import postcss from 'postcss'
import { describe, expect, it } from 'vitest'
import { contrastRatio, parseColor } from '../src/templates/color-picker.js'

const families = ['flat', 'minimalist', 'neo-brutalism', 'ombelle', 'liquid-glass'] as const
const tokens = ['comment', 'string', 'keyword', 'attr', 'property', 'punct'] as const

/** The custom properties declared on the bare root rule, outside any at-rule. */
function rootProperties(family: string): Record<string, string> {
  const css = fs.readFileSync(new URL(`../src/styles/code-block/${family}.css`, import.meta.url), 'utf8')
  const found: Record<string, string> = {}
  postcss.parse(css).walkRules((rule) => {
    if (rule.parent?.type !== 'root' || rule.selector !== "[data-slot='code-block']") return
    rule.walkDecls(/^--code-block-/, (decl) => {
      found[decl.prop] = decl.value
    })
  })
  return found
}

const rgb = (value: string | undefined, name: string) => {
  expect(value, name).toMatch(/^oklch\(/)
  const parsed = parseColor(value!)
  expect(parsed, `${name} ${value}`).not.toBeNull()
  return parsed!.rgb
}

describe.each(families)('%s Code Block colours', (family) => {
  it('paints the shared dark surface', () => {
    const props = rootProperties(family)
    expect(props['--code-block-background']).toBe('oklch(0.2 0.012 275)')
    expect(props['--code-block-foreground']).toBe('oklch(0.93 0.005 275)')
  })

  it('keeps every token at 4.5:1 and line numbers at 3:1 on the surface', () => {
    const props = rootProperties(family)
    const surface = rgb(props['--code-block-background'], 'background')
    expect(contrastRatio(rgb(props['--code-block-foreground'], 'foreground'), surface)).toBeGreaterThanOrEqual(4.5)
    for (const token of tokens) {
      const name = `--code-block-${token}`
      expect(contrastRatio(rgb(props[name], name), surface), `${family} ${token}`).toBeGreaterThanOrEqual(4.5)
    }
    expect(contrastRatio(rgb(props['--code-block-line-number'], 'line number'), surface)).toBeGreaterThanOrEqual(3)
  })
})
