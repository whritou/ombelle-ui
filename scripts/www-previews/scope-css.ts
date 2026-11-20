import postcss, { type AtRule, type Rule } from 'postcss'
import selectorParser from 'postcss-selector-parser'
import { supportedStyleFamilies, type ThemeData } from '@ombelle/contracts'

export type BuiltInFamily = (typeof supportedStyleFamilies)[number]
export const previewSlotPrefix = 'pv-'

const scopedAtRules = new Set(['media', 'supports', 'container', 'layer'])
const isKeyframes = (name: string) => /^(-\w+-)?keyframes$/i.test(name)
const stageSelector = (family: BuiltInFamily) => `[data-preview-family="${family}"]`
const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

const isStageRootNode = (node: selectorParser.Node) =>
  (node.type === 'tag' && ['html', 'body'].includes(node.value.toLowerCase())) ||
  (node.type === 'pseudo' && node.value.toLowerCase() === ':root')

function namesFocusAttribute(node: selectorParser.Node): boolean {
  if (node.type === 'attribute') return node.attribute.trim() === 'data-focus'
  if (node.type !== 'pseudo' || node.value.toLowerCase() !== ':is') return false
  let found = false
  node.walkAttributes((attribute) => {
    if (attribute.attribute.trim() === 'data-focus') found = true
  })
  return found
}

function scopeSelectors(selectors: selectorParser.Root, family: BuiltInFamily) {
  const stageNode = selectorParser().astSync(stageSelector(family)).first.first
  const stage = () => stageNode.clone()
  selectors.each((selector) => {
    selector.walkAttributes((attribute) => {
      if (attribute.attribute.trim() === 'data-slot' && attribute.value !== undefined)
        attribute.setValue(previewSlotPrefix + attribute.value)
    })
    // The first compound selector decides how the stage attaches.
    const firstCombinator = selector.nodes.findIndex((node) => node.type === 'combinator')
    const head = firstCombinator === -1 ? [...selector.nodes] : selector.nodes.slice(0, firstCombinator)
    const rootNodes = head.filter(isStageRootNode)
    if (rootNodes.length) {
      for (const node of rootNodes) node.remove()
      selector.prepend(stage())
    } else if (head.some(namesFocusAttribute)) {
      // data-focus lives on the stage itself, so the family attribute joins that compound.
      selector.prepend(stage())
    } else {
      selector.prepend(selectorParser.combinator({ value: ' ' }))
      selector.prepend(stage())
    }
  })
}

export function scopePreviewCss(css: string, family: BuiltInFamily): string {
  const root = postcss.parse(css)
  const keyframeNames = new Map<string, string>()
  root.walkAtRules((atRule: AtRule) => {
    if (isKeyframes(atRule.name)) {
      const name = atRule.params.trim()
      keyframeNames.set(name, `${name}-${family}`)
    } else if (!scopedAtRules.has(atRule.name.toLowerCase())) {
      throw new Error(`Unsupported at-rule in preview CSS: @${atRule.name}`)
    }
  })
  root.walkAtRules((atRule: AtRule) => {
    if (isKeyframes(atRule.name)) atRule.params = keyframeNames.get(atRule.params.trim())!
  })
  root.walkRules((rule: Rule) => {
    if (rule.parent?.type === 'atrule' && isKeyframes((rule.parent as AtRule).name)) return
    rule.selector = selectorParser((selectors) => {
      scopeSelectors(selectors, family)
      // html, body both map to the stage; keep one copy of each resulting selector.
      const seen = new Set<string>()
      selectors.each((selector) => {
        const key = selector.toString().trim()
        if (seen.has(key)) selector.remove()
        else seen.add(key)
      })
    }).processSync(rule.selector)
  })
  if (keyframeNames.size) {
    root.walkDecls(/^(-\w+-)?animation(-name)?$/i, (decl) => {
      for (const [name, renamed] of keyframeNames)
        decl.value = decl.value.replace(new RegExp(`(?<![\\w-])${escapeRegExp(name)}(?![\\w-])`, 'g'), renamed)
    })
  }
  return root.toString()
}

const tokenBlock = (selector: string, values: Record<string, string>, scheme: 'light' | 'dark') =>
  `${selector}{${Object.entries(values)
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([key, value]) => `${key}:${value};`)
    .join('')}color-scheme:${scheme}}`

/**
 * The gallery's focus layout sizes the specimen against the iframe's viewport (`min-height: 100vh`,
 * `calc(100vw - 48px)`). Inline, the stage is that viewport: it is a size container
 * (`stageContainerCss`), so viewport units become container units.
 */
export function relativeToStage(css: string): string {
  const root = postcss.parse(css)
  root.walkDecls((decl) => {
    decl.value = decl.value.replace(/(\d*\.?\d+)v([wh])(?![\w-])/g, '$1cq$2')
  })
  return root.toString()
}

/** Makes the stage the container its specimen's `cqw` and `cqh` units measure; its size never depends on its content. */
export const stageContainerCss = (family: BuiltInFamily) => `${stageSelector(family)}{container-type:size}`

export function previewTokensCss(family: BuiltInFamily, theme: ThemeData): string {
  const stage = stageSelector(family)
  return [
    tokenBlock(stage, theme.light, 'light'),
    tokenBlock(`${stage}[data-preview-mode="dark"],.dark ${stage}[data-preview-mode="auto"]`, theme.dark, 'dark'),
  ].join('\n')
}
