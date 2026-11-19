import { readFileSync } from 'node:fs'
import postcss from 'postcss'
import { describe, expect, it } from 'vitest'

const focusCss = readFileSync(new URL('../../../../fixtures/shared/preset-focus.css', import.meta.url), 'utf8')

// The focus layout rules that lived in preset-preview.css as html[data-focus…] rules.
const ruleCount = 6

describe('shared focus layout css', () => {
  it('focus rules name no html element', () => {
    const selectors: string[] = []
    postcss.parse(focusCss).walkRules((rule) => {
      selectors.push(...rule.selectors)
    })
    expect(selectors.length).toBeGreaterThan(0)
    for (const selector of selectors) expect(selector).not.toMatch(/\b(html|body)\b|:root/)
    expect(postcss.parse(focusCss).nodes.filter((node) => node.type === 'rule')).toHaveLength(ruleCount)
  })
})
