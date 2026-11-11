/**
 * The preview's reduced-transparency simulation. A page cannot force the
 * prefers-reduced-transparency media feature, so the preview copies the rules it
 * guards under an attribute on html, and the editors' toggle sets that attribute.
 * This is the pure part: a rule tree in, the mirror stylesheet out.
 */
export type MirrorRule =
  /** A nested style rule's selector is relative to its parent ('&' or a descendant); its rules are nested ones. */
  | { kind: 'style'; selector: string; body: string; rules?: MirrorRule[] }
  | { kind: 'media' | 'supports' | 'layer'; condition: string; rules: MirrorRule[] }

const attribute = '[data-reduced-transparency]'
const reduce = /^\(\s*prefers-reduced-transparency\s*:\s*reduce\s*\)$/i
const notReduce = /^(?:not\s*\(\s*prefers-reduced-transparency\s*:\s*reduce\s*\)|\(\s*prefers-reduced-transparency\s*:\s*no-preference\s*\))$/i

type State = 'on' | 'off'

/** Splits on commas, or on "and", outside parentheses: selector lists and media queries. */
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

/** A nested selector resolved against its parent, as CSS nesting does with :is(). */
function resolve(selector: string, parent: string | undefined): string {
  if (!parent) return selector
  return splitTopLevel(selector, ',').map((part) => part === '&' ? parent
    : part.includes('&') ? part.replaceAll('&', `:is(${parent})`) : `:is(${parent}) ${part}`).join(', ')
}

/**
 * Puts a selector under the attribute without changing its specificity: :where() adds none,
 * so the copy wins and loses against other rules where the media rule did.
 */
function prefix(selectorList: string, state: State): string {
  const condition = state === 'on' ? attribute : `:not(${attribute})`
  return splitTopLevel(selectorList, ',').map((selector) => {
    if (/^:root(?![\w-])/.test(selector)) return `:root:where(${condition})` + selector.slice(5)
    if (/^html(?![\w-])/.test(selector)) return `html:where(${condition})` + selector.slice(4)
    return `:where(html${condition}) ${selector}`
  }).join(', ')
}

function emit(rules: MirrorRule[], state: State | undefined, parent?: string): string {
  const out: string[] = []
  for (const rule of rules) {
    if (rule.kind === 'style') {
      const selector = resolve(rule.selector, parent)
      if (state && rule.body.trim()) out.push(`${prefix(selector, state)} { ${rule.body.trim()} }`)
      if (rule.rules?.length) {
        const inner = emit(rule.rules, state, selector)
        if (inner) out.push(inner)
      }
      continue
    }
    if (rule.kind === 'media') {
      const { state: found, rest } = readMedia(rule.condition)
      const inner = emit(rule.rules, found ?? state, parent)
      if (inner) out.push(found && !rest ? inner : `@media ${found ? rest : rule.condition} { ${inner} }`)
      continue
    }
    const inner = emit(rule.rules, state, parent)
    if (inner) out.push(`@${rule.kind} ${rule.condition} { ${inner} }`)
  }
  return out.join('\n')
}

/** The mirror stylesheet for a rule tree, empty when nothing is guarded by the media feature. */
export function mirrorReducedTransparency(rules: MirrorRule[]): string {
  return emit(rules, undefined)
}

/** Whether a media condition turns a rule on under the preference, off, or neither. */
export function reducedTransparencyState(condition: string): 'on' | 'off' | undefined {
  return readMedia(condition).state
}

/** A selector list put under the attribute ('on') or its absence ('off'), specificity unchanged. */
export function prefixReducedTransparency(selectorList: string, state: 'on' | 'off'): string {
  return prefix(selectorList, state)
}
