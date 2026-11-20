import postcss, { type AtRule, type Rule } from 'postcss'
import selectorParser from 'postcss-selector-parser'

/**
 * Appended to the subject of every site component rule. Inline previews keep the catalog's own markers
 * (`data-button-group-button`, `data-menubar-dot`…), which the site's compiled components also use; this
 * keeps the site's rules off anything inside a stage. `:where()` adds no specificity, so the site's own
 * cascade is unchanged.
 */
export const previewExclusion = ':not(:where([data-preview-family] *))'

const legacyPseudoElements = new Set([':before', ':after', ':first-line', ':first-letter'])
const isPseudoElement = (node: selectorParser.Node) =>
  node.type === 'pseudo' && (node.value.startsWith('::') || legacyPseudoElements.has(node.value.toLowerCase()))

export function excludePreviewSubtrees(css: string): string {
  const exclusion = selectorParser().astSync(previewExclusion).first.first
  const root = postcss.parse(css)
  root.walkRules((rule: Rule) => {
    if (rule.parent?.type === 'atrule' && /keyframes$/i.test((rule.parent as AtRule).name)) return
    rule.selector = selectorParser((selectors) => {
      selectors.each((selector) => {
        // The subject is the last compound; a pseudo-element must stay last, so the exclusion goes before it.
        let index = selector.nodes.length
        while (index > 0 && isPseudoElement(selector.nodes[index - 1]!)) index--
        if (index === selector.nodes.length) selector.append(exclusion.clone())
        else selector.insertBefore(selector.nodes[index]!, exclusion.clone())
      })
    }).processSync(rule.selector)
  })
  return root.toString()
}
