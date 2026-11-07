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
 * Moves shared rules that target a listed slot to its prefixed slot. Once a
 * component is installed beside an app-owned file, the unprefixed slot belongs
 * to the app (for example shadcn's own Button), so no Ombelle rule may match it.
 */
export function prefixSharedRules(
  css: string,
  slots: readonly string[],
  prefix = besideSlotPrefix,
): string {
  if (!slots.length) return css
  const root = postcss.parse(css)
  root.walkRules((rule) => {
    rule.selector = prefixSlots(rule.selector, 'css', slots, prefix)
  })
  return root.toString()
}
