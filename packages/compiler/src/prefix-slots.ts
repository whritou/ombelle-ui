import postcss from 'postcss'
/** Slot prefix for components installed beside an app-owned file of the same name. */
export const besideSlotPrefix = 'ombelle-'
const tsxSlot = /data-slot=(["'])([a-z0-9-]+)\1/g
const cssSlot = /\[data-slot=(["'])([a-z0-9-]+)\1\]/g
/** Literal data-slot values a template emits, in source order. */
export function templateSlots(source: string): string[] {
  return [...new Set([...source.matchAll(tsxSlot)].map((m) => m[2]!))]
}
/** Rewrites listed slots in component source or CSS selectors. */
export function prefixSlots(
  source: string,
  kind: 'tsx' | 'css',
  slots: readonly string[],
  prefix = besideSlotPrefix,
): string {
  const listed = new Set(slots)
  return source.replace(kind === 'tsx' ? tsxSlot : cssSlot, (match, quote, slot) =>
    listed.has(slot)
      ? kind === 'tsx'
        ? 'data-slot=' + quote + prefix + slot + quote
        : '[data-slot=' + quote + prefix + slot + quote + ']'
      : match,
  )
}
/**
 * Keeps every rule and inserts a prefixed copy after each rule whose selector
 * targets a listed slot, so shared styles reach beside components too.
 */
export function duplicatePrefixedRules(
  css: string,
  slots: readonly string[],
  prefix = besideSlotPrefix,
): string {
  if (!slots.length) return css
  const root = postcss.parse(css)
  const rules: postcss.Rule[] = []
  root.walkRules((rule) => {
    if (prefixSlots(rule.selector, 'css', slots, prefix) !== rule.selector)
      rules.push(rule)
  })
  for (const rule of rules)
    rule.after(
      rule.clone({ selector: prefixSlots(rule.selector, 'css', slots, prefix) }),
    )
  return root.toString()
}
