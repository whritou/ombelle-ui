import type { ComponentTemplate } from '@ombelle/catalog'

export function recipeTemplateSlots(template: ComponentTemplate): string[] {
  return [...new Set([...template.slots,
    ...Array.from(template.content.matchAll(/data-slot=(["'])([a-z][a-z0-9-]*)\1/g), match => match[2]),
  ])]
}

/**
 * Transform reviewed template sources, with scope carried through portal closures.
 * The closure names avoid template props such as Table Head's `scope`, which would shadow them.
 */
export function scopeRecipeTemplate(template: ComponentTemplate, utilsImport: string): string {
  const imports: string[] = []
  const exports: string[] = []
  const slots = new Set(recipeTemplateSlots(template))
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
    .replace(/^export type \{[^}]*\};?$/gm, '')
    .replace(/^export \{([^}]*)\};?$/gm, (_, names: string) => {
      exports.push(...names.split(',').map(name => name.trim()).filter(Boolean))
      return ''
    })
    .replace(/^export (?=(?:type|interface) )/gm, '')
    .replace(/data-slot=(["'])([a-z][a-z0-9-]*)\1/g, (attribute, _, slot: string) =>
      slots.has(slot) ? `data-slot="recipe-${slot}" data-ombelle-recipe={recipeScope} data-ombelle-recipe-instance={recipeInstance}` : attribute)
  return `'use client'\n${imports.join('\n')}\nexport function createScopedPrimitives(recipeScope: string, recipeInstance?: string) {\n${body}\nreturn { ${exports.join(', ')} }\n}\n`
}

/** Keep the reviewed glass algorithm while moving its effects off the document root. */
export function scopeRecipeGlassFilter(source: string): string {
  return source
    .replace('glassSurfaceFor(target: EventTarget | null)', 'glassSurfaceFor(target: EventTarget | null, selector = haloSelector)')
    .replace('closest.call(target, haloSelector)', 'closest.call(target, selector)')
    .replace('const readMaterial = () => {\n  const style = getComputedStyle(document.documentElement)',
      'const readMaterial = (element: Element) => {\n  const style = getComputedStyle(element)')
    .replace('export function LiquidGlassFilter() {', `export function LiquidGlassFilter({ scope, instance }: { scope: string; instance: string }) {
  const surfaceRef = React.useRef<SVGSVGElement>(null)
  const instanceSelector = '[data-ombelle-recipe-instance="' + instance + '"]'
  const pointerSelector = haloSelector.split(', ').map(selector =>
    selector.replace('data-slot="', 'data-slot="recipe-') + instanceSelector
  ).join(', ')
  const filterId = 'ombelle-recipe-' + instance`)
    .replace('const tokens = getComputedStyle(document.documentElement)', 'const tokens = getComputedStyle(surfaceRef.current!)')
    .replace('glassSurfaceFor(last.target)', 'glassSurfaceFor(last.target, pointerSelector)')
    .replace('const next = readMaterial()', 'const next = readMaterial(surfaceRef.current!)')
    .replace('const root = document.documentElement\n    setChromium(true)', 'setChromium(true)')
    .replace("observer.observe(root, { attributes: true, attributeFilter: ['class', 'style', 'data-theme'] })",
      "for (let element: Element | null = surfaceRef.current; element; element = element.parentElement)\n      observer.observe(element, { attributes: true, attributeFilter: ['class', 'style', 'data-theme'] })")
    .replace("      root.style.removeProperty('--glass-refraction')\n", '')
    .replace(/  \/\/ A rim map[\s\S]*?  return \(\n    <svg/, `  return (
    <>
    {chromium && refracts(material) && <style>{'[data-ombelle-recipe]' + instanceSelector + '{--glass-refraction:url(#' + filterId + ')}'}</style>}
    <svg ref={surfaceRef} data-ombelle-recipe={scope}`)
    .replace('id="ombelle-liquid-glass"', 'id={filterId}')
    .replace('    </svg>\n  )', '    </svg>\n    </>\n  )')
}
