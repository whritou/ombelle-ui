import postcss, { type AtRule } from 'postcss'

/**
 * Points a Fontsource stylesheet's `url(./files/…)` sources at `publicBase`, where the generator copies them,
 * so the page knows each file's URL at build time and can preload it. Returns the files to copy.
 */
export function rehostFontCss(css: string, publicBase: string): { css: string; files: string[] } {
  const files = new Set<string>()
  const root = postcss.parse(css)
  root.walkDecls('src', (decl) => {
    decl.value = decl.value.replace(/url\((['"]?)\.\/files\/([^'")]+)\1\)/g, (_, quote: string, file: string) => {
      files.add(file)
      return `url(${quote}${publicBase}/${file}${quote})`
    })
  })
  return { css: root.toString(), files: [...files].sort() }
}

const firstFamily = (stack: string) => stack.split(',')[0]!.trim().replace(/^(['"])(.*)\1$/, '$2')

/** The URL of the upright Latin face of the font a `font-family` stack starts with, if `css` declares it. */
export function latinFaceUrl(css: string, stack: string): string | undefined {
  const family = firstFamily(stack)
  let url: string | undefined
  postcss.parse(css).walkAtRules('font-face', (face: AtRule) => {
    const value = (prop: string) => {
      let found = ''
      face.walkDecls(prop, (decl) => {
        found = decl.value
      })
      return found
    }
    if (url || firstFamily(value('font-family')) !== family || value('font-style') !== 'normal') return
    // Fontsource's `latin` subset is the one whose range starts at U+0000.
    if (!/^U\+0000-00FF\b/i.test(value('unicode-range'))) return
    url = /url\((['"]?)([^'")]+)\1\)/.exec(value('src'))?.[2]
  })
  return url
}

/** The preview slots (`pv-…`) named by rules that set a font through `variable` (`--font-heading`, say). */
export function slotsUsingFont(css: string, variable: string): Set<string> {
  const slots = new Set<string>()
  const reads = new RegExp(String.raw`var\(\s*${variable}(?![\w-])`)
  postcss.parse(css).walkRules((rule) => {
    let uses = false
    rule.walkDecls((decl) => {
      if (reads.test(decl.value)) uses = true
    })
    if (uses) for (const match of rule.selector.matchAll(/data-slot=["']pv-([\w-]+)["']/g)) slots.add(match[1]!)
  })
  return slots
}
