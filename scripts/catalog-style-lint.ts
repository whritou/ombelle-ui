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

// Properties whose values paint something; a colour literal in any of them bypasses the preset's tokens.
const paintProperty = /^(color|background(-color|-image)?|fill|stroke|outline(-color)?|caret-color|accent-color|text-decoration(-color)?|box-shadow|text-shadow|border(-(top|right|bottom|left|block|inline)(-(start|end))?)?(-color)?)$/
const colourFunction = /\b(rgba?|hsla?|hwb|lab|lch|oklab|oklch|color)\(/i
// The common CSS named colours. currentColor, transparent and inherit stay allowed.
const namedColours = new Set(('aliceblue antiquewhite aqua aquamarine azure beige bisque black blue brown chocolate coral crimson cyan fuchsia gold gray grey green hotpink indigo ivory khaki lavender lime magenta maroon navy olive orange orchid pink plum purple red salmon silver tan teal tomato turquoise violet white yellow').split(' '))

function colourLiteral(value: string): string | undefined {
  const bare = value.replace(/var\((?:[^()]|\([^()]*\))*\)/g, ' ')
  const hex = bare.match(/#[0-9a-f]{3,8}\b/i)
  if (hex) return hex[0]
  const fn = bare.match(colourFunction)
  if (fn) return fn[0] + '…)'
  return bare.toLowerCase().split(/[^a-z]+/).find(word => namedColours.has(word))
}

/**
 * Lints a block stylesheet: every rule (keyframes aside) must name the block root (`[data-block="<id>"]`)
 * or one of its parts (`[data-block-part]`), and paint properties must take `var(--…)` tokens, not colour
 * literals (hex, rgb/hsl/oklch… functions, named colours). Returns messages; empty means clean.
 */
export function lintBlockStyles(id: string, css: string): string[] {
  const messages: string[] = []
  for (const selector of selectors(css)) {
    const where = `${id}.css: "${selector.text}"`
    const roots: string[] = []
    selectorParser(list => list.each(item => item.walkAttributes(attribute => {
      if (attribute.attribute === 'data-block' && attribute.value) roots.push(attribute.value)
    }))).processSync(selector.text)
    const foreign = roots.find(root => root !== id)
    if (foreign) messages.push(`${where} names the ${foreign} block root, not ${id}`)
    else if (!selector.attributes.some(name => name === 'data-block' || name === 'data-block-part'))
      messages.push(`${where} names no ${id} block root or part`)
    else if (selector.attributes.includes('data-slot'))
      messages.push(`${where} names a component slot; block styles name only the block root or its parts`)
  }
  postcss.parse(css).walkDecls(decl => {
    if (decl.parent?.parent?.type === 'atrule' && (decl.parent.parent as postcss.AtRule).name.endsWith('keyframes')) return
    if (!paintProperty.test(decl.prop)) return
    const literal = colourLiteral(decl.value)
    if (literal) messages.push(`${id}.css: "${decl.prop}: ${decl.value}" uses the colour literal "${literal}"; use a var(--…) token`)
  })
  return messages.sort()
}
