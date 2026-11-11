// Fails the catalog build on style rules the recipe scoper would silently drop or that name no real slot.
import postcss from 'postcss'
import selectorParser from 'postcss-selector-parser'

const slotAttribute = /data-slot=(["'])([a-z][a-z0-9-]*)\1/g

/** A template's slots: its declared list (or its id) plus every literal data-slot, as the recipe compiler reads them. */
export function templateSlots(id: string, sources: readonly string[], declared?: readonly string[]): string[] {
  return [...new Set([...(declared ?? [id]), ...sources.flatMap(source => Array.from(source.matchAll(slotAttribute), match => match[2]))])]
}

/** Slots the preview app renders for the glass lab sheet (apps/preview/src/glass-control-halo.tsx). */
export const previewSlots: readonly string[] = ['glass-field-halo']

type Selector = { text: string; slots: string[]; anySlot: boolean; attributes: string[] }

function selectors(css: string): Selector[] {
  const found: Selector[] = []
  postcss.parse(css).walkRules(rule => {
    if (rule.parent?.type === 'atrule' && (rule.parent as postcss.AtRule).name.endsWith('keyframes')) return
    selectorParser(list => list.each(selector => {
      const slots: string[] = []
      const attributes: string[] = []
      let anySlot = false
      selector.walkAttributes(attribute => {
        attributes.push(attribute.attribute)
        if (attribute.attribute !== 'data-slot') return
        if (attribute.value) slots.push(attribute.value)
        else if (!attribute.operator) anySlot = true
      })
      found.push({ text: selector.toString().trim(), slots, anySlot, attributes })
    })).processSync(rule.selector)
  })
  return found
}

export function lintCatalogStyles(input: {
  componentStyles: Record<string, Record<string, string>>
  familyStyles: Record<string, string>
  slots: Record<string, readonly string[]>
  previewSlots?: readonly string[]
}): string[] {
  const messages: string[] = []
  const known = new Set([...Object.values(input.slots).flat(), ...(input.previewSlots ?? [])])
  for (const [component, families] of Object.entries(input.componentStyles)) {
    const own = new Set(input.slots[component] ?? [component])
    for (const [family, css] of Object.entries(families))
      for (const selector of selectors(css)) {
        const where = `${component}/${family}.css: "${selector.text}"`
        const unknown = selector.slots.find(slot => !own.has(slot))
        if (unknown) messages.push(`${where} names unknown slot "${unknown}"`)
        else if (!selector.slots.length && !selector.anySlot && !selector.attributes.some(name => name.startsWith(`data-${component}-`)))
          messages.push(`${where} names no ${component} slot or marker`)
      }
  }
  for (const [family, css] of Object.entries(input.familyStyles))
    for (const selector of selectors(css))
      if (!selector.anySlot && !selector.slots.some(slot => known.has(slot))) messages.push(`${family}.css: "${selector.text}" names no catalog slot`)
  return messages.sort()
}
