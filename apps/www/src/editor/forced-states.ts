/** Preview states the Button editor can force without a pointer or keyboard. */
export type ForcedState = 'hover' | 'focus' | 'active'

const pseudoFor: Record<ForcedState, string> = {
  hover: ':hover',
  focus: ':focus-visible',
  active: ':active',
}

/** Splits a selector list on its top-level commas, leaving `:not(a, b)` intact. */
function splitSelectorList(list: string): string[] {
  const parts: string[] = []
  let depth = 0
  let start = 0
  for (let index = 0; index < list.length; index++) {
    const char = list[index]
    if (char === '(' || char === '[') depth++
    else if (char === ')' || char === ']') depth--
    else if (char === ',' && depth === 0) {
      parts.push(list.slice(start, index).trim())
      start = index + 1
    }
  }
  parts.push(list.slice(start).trim())
  return parts.filter(Boolean)
}

/**
 * The selector list that applies a rule written for real hover, keyboard focus or
 * press to an element marked `data-forced-state`, so the editor shows the family's
 * own state styles. Returns null when no selector in the list uses those states.
 * An attribute selector has the same specificity as the pseudo-class it replaces.
 */
export function forcedStateSelector(selectorText: string): string | null {
  const forced: string[] = []
  for (const selector of splitSelectorList(selectorText)) {
    for (const state of Object.keys(pseudoFor) as ForcedState[]) {
      const pseudo = pseudoFor[state]
      // `:active` must not match inside another name; the three pseudo-classes
      // never prefix one another, so a plain split is exact.
      if (!selector.includes(pseudo)) continue
      forced.push(selector.split(pseudo).join(`[data-forced-state="${state}"]`))
    }
  }
  return forced.length ? forced.join(', ') : null
}
