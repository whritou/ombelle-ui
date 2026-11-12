import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const families = ['ombelle', 'flat', 'minimalist', 'neo-brutalism', 'liquid-glass'] as const
const targets = [
  ['command', ['command-list']],
  ['combobox', ['combobox-list']],
  ['select', ['select-viewport', 'select-content']],
  ['sheet', ['sheet-content']],
] as const

const css = (component: string, family: string) =>
  readFileSync(new URL(`../src/styles/${component}/${family}.css`, import.meta.url), 'utf8')

// The Scroll Area thumb colour for a family: the top-level (not forced-colors) thumb rule's background.
function thumbColour(family: string): string {
  const source = css('scroll-area', family)
  const match = source.match(/^\[data-slot='scroll-area-thumb'\] \{([^}]*)\}/m)
  const background = match?.[1].match(/background:\s*([^;]+);/)
  if (!background) throw new Error(`no scroll-area thumb background for ${family}`)
  return background[1].trim()
}

function scrollbarBlock(source: string): string {
  const match = source.match(/\/\* 0\.7\.5 scrollbars \*\/([\s\S]*?)\/\* end 0\.7\.5 scrollbars \*\//)
  if (!match) throw new Error('missing 0.7.5 scrollbars marker block')
  return match[1]
}

describe('family scrollbars on the shipped lists', () => {
  for (const family of families) {
    for (const [component, slots] of targets) {
      for (const slot of slots) {
        it(`${component}/${family} ${slot} mirrors the scroll-area thumb colour`, () => {
          const block = scrollbarBlock(css(component, family))
          const rule = block.match(new RegExp(String.raw`\[data-slot='${slot}'\] \{([^}]*)\}`))
          expect(rule, `${slot} rule`).not.toBeNull()
          expect(rule![1]).toMatch(/scrollbar-width:\s*thin;/)
          const colour = rule![1].match(/scrollbar-color:\s*(.+?)\s+transparent;/)
          expect(colour?.[1]).toBe(thumbColour(family))
        })
      }
    }
  }
})
