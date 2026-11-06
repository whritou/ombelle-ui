import type { ComponentTemplate } from '@ombelle/catalog'

/** Transform reviewed template sources, with scope carried through portal closures. */
export function scopeRecipeTemplate(template: ComponentTemplate, utilsImport: string): string {
  const imports: string[] = []
  const exports: string[] = []
  const slots = new Set(template.slots)
  const body = template.content
    .replace(/^['"]use client['"];?\s*/m, '')
    .replace(/^import .*$/gm, line => {
      if (!/import ['"].+\.css['"]/.test(line)) imports.push(line.replace('./utils.js', utilsImport))
      return ''
    })
    .replace(/^export (?=(?:function|const) (\w+))/gm, (_, name: string) => {
      exports.push(name)
      return ''
    })
    .replace(/^export (?=(?:type|interface) )/gm, '')
    .replace(/data-slot=(["'])([a-z][a-z0-9-]*)\1/g, (attribute, _, slot: string) =>
      slots.has(slot) ? `data-slot="recipe-${slot}" data-ombelle-recipe={scope}` : attribute)
  return `'use client'\n${imports.join('\n')}\nexport function createScopedPrimitives(scope: string) {\n${body}\nreturn { ${exports.join(', ')} }\n}\n`
}
