import { rewriteModuleSpecifiers, stripStylesheetImports } from '@ombelle/compiler'
import { previewSlotPrefix } from './scope-css'

export type PreviewTemplateImports = { utils: string; portal: string }

const prefixSlot = (value: string) => (value.startsWith(previewSlotPrefix) ? value : previewSlotPrefix + value)
// `data-slot="x"` as a JSX attribute, and the same text inside `[data-slot="x"]` selector strings.
const slotAttribute = /data-slot=(["'])([^"'\\]*)\1/g
// `'data-slot': 'x'` object literal entries; a `'data-slot': string` type is left alone.
const slotProperty = /(["'])data-slot\1(\s*:\s*)(["'])([^"'\\]*)\3/g
// `<X.Portal ...>` (also self-closing) and `</X.Portal>`.
const portalOpen = /<([A-Za-z_$][\w$]*(?:\.[\w$]+)*\.Portal)(?=[\s/>])/g
const portalClose = /<\/[A-Za-z_$][\w$]*(?:\.[\w$]+)*\.Portal>/g

/** Rewrite one compiled catalog component so the site can render it inline beside other families. */
export async function scopePreviewTemplate(source: string, imports: PreviewTemplateImports): Promise<string> {
  const stylesheets = [...source.matchAll(/^import\s+['"](\.\/[^'"]+\.css)['"]/gm)].map((match) => match[1])
  let out = await stripStylesheetImports(source, stylesheets)
  out = await rewriteModuleSpecifiers(out, (specifier) => {
    if (specifier === '@/lib/utils') return imports.utils
    if (specifier.startsWith('@/components/ui/')) return './' + specifier.slice('@/components/ui/'.length)
    return specifier
  })
  out = out
    .replace(slotAttribute, (_, quote: string, value: string) => `data-slot=${quote}${prefixSlot(value)}${quote}`)
    .replace(
      slotProperty,
      (_, q1: string, colon: string, q2: string, value: string) => `${q1}data-slot${q1}${colon}${q2}${prefixSlot(value)}${q2}`,
    )
  if (out.search(portalOpen) !== -1) {
    out = out.replace(portalOpen, '<PreviewPortal portal={$1}').replace(portalClose, '</PreviewPortal>')
    const importLine = `import { PreviewPortal } from ${JSON.stringify(imports.portal)}\n`
    out = /^import /m.test(out) ? out.replace(/^import /m, importLine + 'import ') : importLine + out
  }
  return out
}
