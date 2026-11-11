import { mirrorReducedTransparency, prefixReducedTransparency, reducedTransparencyState, type MirrorRule } from '../../www/src/site/reduced-transparency'

/** Every copy and every gated rule names the attribute, so neither is mirrored again. */
export const mirrorMarker = 'data-reduced-transparency]'
const feature = /prefers-reduced-transparency/i

function toMirrorRules(list: CSSRuleList): MirrorRule[] {
  const out: MirrorRule[] = []
  for (const rule of Array.from(list)) {
    const mirrored = toMirrorRule(rule)
    if (mirrored) out.push(mirrored)
  }
  return out
}

function toMirrorRule(rule: CSSRule): MirrorRule | null {
  // CSS nesting: a style rule keeps its nested rules, and bare declarations inside a
  // nested group rule apply to the parent selector ('&').
  if (rule instanceof CSSStyleRule) return { kind: 'style', selector: rule.selectorText, body: rule.style.cssText,
    ...(rule.cssRules.length ? { rules: toMirrorRules(rule.cssRules) } : {}) }
  if (rule.constructor.name === 'CSSNestedDeclarations')
    return { kind: 'style', selector: '&', body: (rule as CSSRule & { style: CSSStyleDeclaration }).style.cssText }
  if (rule instanceof CSSMediaRule) return { kind: 'media', condition: rule.conditionText, rules: toMirrorRules(rule.cssRules) }
  if (rule instanceof CSSSupportsRule) return { kind: 'supports', condition: rule.conditionText, rules: toMirrorRules(rule.cssRules) }
  if (typeof CSSLayerBlockRule !== 'undefined' && rule instanceof CSSLayerBlockRule)
    return { kind: 'layer', condition: rule.name, rules: toMirrorRules(rule.cssRules) }
  return null
}

type RuleOwner = { cssRules: CSSRuleList; insertRule(rule: string, index: number): number }

/**
 * A rule under "not reduce" cannot be switched off by adding rules, so its selectors are
 * gated in place: it still follows the real preference, and also the attribute. Nested
 * rules inherit the gate through their parent selector.
 */
function gateInPlace(owner: { cssRules: CSSRuleList }) {
  for (const rule of Array.from(owner.cssRules)) {
    if (rule instanceof CSSStyleRule) rule.selectorText = prefixReducedTransparency(rule.selectorText, 'off')
    else if ('cssRules' in rule) gateInPlace(rule as CSSGroupingRule)
  }
}

/**
 * Inserts each rule's copy right after it, in the same list: a media rule beats or loses
 * to the equally specific rules around it by source order, and its copy keeps that order.
 * A style rule with the media feature nested inside it gets its copy after the whole rule.
 */
function mirrorList(owner: RuleOwner) {
  for (let i = 0; i < owner.cssRules.length; i++) {
    const rule = owner.cssRules[i]!
    if (!feature.test(rule.cssText) || rule.cssText.includes(mirrorMarker)) continue
    const guarded = rule instanceof CSSMediaRule && feature.test(rule.conditionText)
    if (guarded && reducedTransparencyState((rule as CSSMediaRule).conditionText) === 'off') {
      gateInPlace(rule as CSSMediaRule)
      continue
    }
    if (!guarded && (rule instanceof CSSSupportsRule || rule instanceof CSSMediaRule
      || (typeof CSSLayerBlockRule !== 'undefined' && rule instanceof CSSLayerBlockRule))) {
      mirrorList(rule as unknown as RuleOwner)
      continue
    }
    const mirrored = toMirrorRule(rule)
    const css = mirrored ? mirrorReducedTransparency([mirrored]) : ''
    if (!css) {
      // A form the mirror does not read (an "or" query, a nested "not reduce"): say so in
      // development rather than let the toggle silently show the transparent look.
      if (import.meta.env.DEV) console.warn('Preview transparency: this rule is not mirrored', rule.cssText.slice(0, 200))
      continue
    }
    try {
      owner.insertRule(`@media all { ${css} }`, i + 1)
      i++
    } catch {
      // A copy the browser cannot parse is skipped; the rest of the sheet still mirrors.
    }
  }
}

/**
 * Copies every prefers-reduced-transparency rule of the preview's stylesheets under
 * html[data-reduced-transparency], next to its original. It mirrors each new sheet once:
 * when the editor injects or replaces a style element, and when a linked sheet loads.
 * Returns the cleanup.
 */
export function startReducedTransparencyMirror(doc: Document): () => void {
  const done = new WeakSet<CSSStyleSheet>()
  let queued = false
  const rebuild = () => {
    queued = false
    for (const sheet of Array.from(doc.styleSheets)) {
      if (done.has(sheet)) continue
      try {
        void sheet.cssRules
      } catch {
        continue
      }
      done.add(sheet)
      mirrorList(sheet)
    }
  }
  const schedule = () => {
    if (queued) return
    queued = true
    queueMicrotask(rebuild)
  }
  const observer = new MutationObserver(schedule)
  for (const root of [doc.head, doc.body]) observer.observe(root, { childList: true, subtree: true, characterData: true })
  doc.addEventListener('load', schedule, true)
  schedule()
  return () => {
    observer.disconnect()
    doc.removeEventListener('load', schedule, true)
  }
}
