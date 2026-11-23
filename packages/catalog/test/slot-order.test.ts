import { describe, expect, it } from 'vitest'
import { readdirSync, readFileSync } from 'node:fs'
import { parse } from '@babel/parser'

// CAT-02: family CSS selects on data-slot. A Radix asChild trigger passes its own data-slot
// through Slot, so a part that writes data-slot before {...props} takes the trigger's slot and
// loses its styles (a Switch under a TooltipTrigger, an Input under a PopoverAnchor).
const dir = new URL('../src/templates/', import.meta.url)
const files = [
  ...readdirSync(dir).filter(name => name.endsWith('.tsx')),
  ...readdirSync(new URL('base/', dir)).filter(name => name.endsWith('.tsx')).map(name => 'base/' + name),
]

type Node = { type?: string; [key: string]: unknown }
function slotsBeforeSpread(source: string): number[] {
  const lines: number[] = []
  const visit = (node: unknown) => {
    if (!node || typeof node !== 'object') return
    const item = node as Node
    if (item.type === 'JSXOpeningElement') {
      const attributes = item.attributes as Node[]
      const lastSpread = attributes.findLastIndex(attribute => attribute.type === 'JSXSpreadAttribute')
      attributes.forEach((attribute, index) => {
        if (index < lastSpread && attribute.type === 'JSXAttribute' && (attribute.name as Node).name === 'data-slot')
          lines.push((attribute.loc as { start: { line: number } }).start.line)
      })
    }
    for (const [key, value] of Object.entries(item)) {
      if (key === 'loc') continue
      if (Array.isArray(value)) value.forEach(visit)
      else visit(value)
    }
  }
  visit(parse(source, { sourceType: 'module', plugins: ['typescript', 'jsx'] }).program)
  return lines
}

describe('data-slot order', () => {
  it.each(files)('%s sets data-slot after every props spread', (file) => {
    expect(slotsBeforeSpread(readFileSync(new URL(file, dir), 'utf8'))).toEqual([])
  })
})
