/**
 * The preview's reduced-transparency simulation. A page cannot force the
 * prefers-reduced-transparency media feature, so the preview copies the rules it
 * guards under an attribute on html, and the editors' toggle sets that attribute.
 * This is the pure part: a rule tree in, the mirror stylesheet out.
 */
export type MirrorRule =
  | { kind: 'style'; selector: string; body: string }
  | { kind: 'media' | 'supports' | 'layer'; condition: string; rules: MirrorRule[] }

const attribute = '[data-reduced-transparency]'
const reduce = /^\(\s*prefers-reduced-transparency\s*:\s*reduce\s*\)$/i
const notReduce = /^(?:not\s*\(\s*prefers-reduced-transparency\s*:\s*reduce\s*\)|\(\s*prefers-reduced-transparency\s*:\s*no-preference\s*\))$/i

type State = 'on' | 'off'

/** Splits on commas outside parentheses: selector lists and media query lists. */
function splitTopLevel(text: string, separator: ',' | 'and'): string[] {
  const parts: string[] = []
  let depth = 0, start = 0
  for (let i = 0; i < text.length; i++) {
    const c = text[i]
    if (c === '(') depth++
    else if (c === ')') depth--
    else if (depth === 0) {
      if (separator === ',' && c === ',') { parts.push(text.slice(start, i)); start = i + 1 }
      else if (separator === 'and' && /\s/.test(c!) && /^\s+and\s+/i.test(text.slice(i))) {
        parts.push(text.slice(start, i))
        i += /^\s+and\s+/i.exec(text.slice(i))![0].length - 1
        start = i + 1
      }
    }
  }
  parts.push(text.slice(start))
  return parts.map((part) => part.trim()).filter(Boolean)
}

/**
 * What a media condition means for the mirror: whether it turns the copy on (reduce)
 * or keeps it only while the attribute is absent (not reduce), and what remains of it.
 */
function readMedia(condition: string): { state?: State; rest: string } {
  for (const query of splitTopLevel(condition, ',')) {
    const terms = splitTopLevel(query, 'and')
    const at = terms.findIndex((term) => reduce.test(term) || notReduce.test(term))
    if (at === -1) continue
    const state: State = reduce.test(terms[at]!) ? 'on' : 'off'
    return { state, rest: terms.filter((_, i) => i !== at).join(' and ') }
  }
  return { rest: condition }
}

function prefix(selectorList: string, state: State): string {
  const root = state === 'on' ? `html${attribute}` : `html:not(${attribute})`
  return splitTopLevel(selectorList, ',').map((selector) => {
    if (/^:root\b/.test(selector)) return root + selector.slice(5)
    if (/^html(?![\w-])/.test(selector)) return root + selector.slice(4)
    return `${root} ${selector}`
  }).join(', ')
}

function emit(rules: MirrorRule[], state: State | undefined): string {
  const out: string[] = []
  for (const rule of rules) {
    if (rule.kind === 'style') {
      if (state) out.push(`${prefix(rule.selector, state)} { ${rule.body.trim()} }`)
      continue
    }
    if (rule.kind === 'media') {
      const { state: found, rest } = readMedia(rule.condition)
      const inner = emit(rule.rules, found ?? state)
      if (inner) out.push(found && !rest ? inner : `@media ${found ? rest : rule.condition} { ${inner} }`)
      continue
    }
    const inner = emit(rule.rules, state)
    if (inner) out.push(`@${rule.kind} ${rule.condition} { ${inner} }`)
  }
  return out.join('\n')
}

/** The mirror stylesheet for a rule tree, empty when nothing is guarded by the media feature. */
export function mirrorReducedTransparency(rules: MirrorRule[]): string {
  return emit(rules, undefined)
}
