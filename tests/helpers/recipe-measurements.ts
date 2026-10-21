import type { Locator } from '@playwright/test'
export async function recipeStyles(
  button: Locator,
): Promise<Record<string, string>> {
  return button.evaluate((el) => {
    const s = getComputedStyle(el)
    return {
      color: s.color,
      background: s.backgroundColor,
      border: s.border,
      borderRadius: s.borderRadius,
      minHeight: s.minHeight,
      fontFamily: s.fontFamily,
      fontSize: s.fontSize,
      lineHeight: s.lineHeight,
      boxShadow: s.boxShadow,
      padding: s.padding,
    }
  })
}
export async function recipeDom(element: Locator): Promise<unknown> {
  return element.evaluate((root) => {
    function visit(n: Node): unknown {
      if (n.nodeType === 3) return n.textContent
      if (!(n instanceof Element)) return null
      return {
        tag: n.tagName.toLowerCase(),
        attributes: Object.fromEntries(
          Array.from(n.attributes)
            .sort((a, b) => a.name.localeCompare(b.name))
            .map((a) => [a.name, a.value]),
        ),
        children: Array.from(n.childNodes)
          .filter((n) => [1, 3].includes(n.nodeType))
          .map(visit),
      }
    }
    return visit(root)
  })
}
