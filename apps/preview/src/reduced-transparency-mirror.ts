import { mirrorReducedTransparency, type MirrorRule } from '../../www/src/site/reduced-transparency'

const marker = 'data-reduced-transparency-mirror'

function toMirrorRules(list: CSSRuleList): MirrorRule[] {
  const out: MirrorRule[] = []
  for (const rule of Array.from(list)) {
    if (rule instanceof CSSStyleRule) out.push({ kind: 'style', selector: rule.selectorText, body: rule.style.cssText })
    else if (rule instanceof CSSMediaRule) out.push({ kind: 'media', condition: rule.conditionText, rules: toMirrorRules(rule.cssRules) })
    else if (rule instanceof CSSSupportsRule) out.push({ kind: 'supports', condition: rule.conditionText, rules: toMirrorRules(rule.cssRules) })
    else if (typeof CSSLayerBlockRule !== 'undefined' && rule instanceof CSSLayerBlockRule)
      out.push({ kind: 'layer', condition: rule.name, rules: toMirrorRules(rule.cssRules) })
  }
  return out
}

/**
 * Keeps one <style data-reduced-transparency-mirror> in the preview's head holding every
 * prefers-reduced-transparency rule copied under html[data-reduced-transparency]. It
 * rebuilds when the editor injects or replaces styles, and when a linked sheet loads.
 * Returns the cleanup.
 */
export function startReducedTransparencyMirror(doc: Document): () => void {
  let mirror: HTMLStyleElement | null = null
  let queued = false
  const rebuild = () => {
    queued = false
    const rules: MirrorRule[] = []
    for (const sheet of Array.from(doc.styleSheets)) {
      if (sheet.ownerNode === mirror) continue
      let list: CSSRuleList
      try { list = sheet.cssRules } catch { continue }
      rules.push(...toMirrorRules(list))
    }
    const css = mirrorReducedTransparency(rules)
    if (!mirror?.isConnected) {
      mirror = doc.createElement('style')
      mirror.setAttribute(marker, '')
      doc.head.append(mirror)
    }
    if (mirror.textContent !== css) mirror.textContent = css
  }
  const schedule = () => {
    if (queued) return
    queued = true
    queueMicrotask(rebuild)
  }
  // The mirror's own writes come back as mutations; skip them so it never loops.
  const own = (node: Node) => mirror !== null && (node === mirror || mirror.contains(node))
  const observer = new MutationObserver((records) => {
    if (records.some((record) => !own(record.target)
      && ![...record.addedNodes, ...record.removedNodes].every(own))) schedule()
  })
  for (const root of [doc.head, doc.body]) observer.observe(root, { childList: true, subtree: true, characterData: true })
  doc.addEventListener('load', schedule, true)
  schedule()
  return () => {
    observer.disconnect()
    doc.removeEventListener('load', schedule, true)
    mirror?.remove()
  }
}
