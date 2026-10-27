import { parsers } from 'prettier/plugins/typescript'

/** Remove only reviewed side-effect CSS imports for an isolated preview. */
export async function stripStylesheetImports(content: string, allowed: readonly string[]): Promise<string> {
  const ast = await parsers.typescript.parse(content, { filepath: 'artifact.tsx' } as Parameters<typeof parsers.typescript.parse>[1])
  const removals: Array<{ start: number; end: number }> = []
  for (const node of ast.body) {
    if (node.type !== 'ImportDeclaration' || !node.source?.value.endsWith('.css')) continue
    if (!allowed.includes(node.source.value) || node.specifiers.length !== 0) throw new Error('Unknown gallery stylesheet: ' + node.source.value)
    removals.push({ start: node.range[0], end: node.range[1] })
  }
  for (const { start, end } of removals.reverse()) content = content.slice(0, start) + content.slice(end)
  return content
}

/** Rewrite module imports without changing user-authored string literals. */
export async function rewriteModuleSpecifiers(
  content: string,
  resolve: (specifier: string) => string,
): Promise<string> {
  const ast = await parsers.typescript.parse(content, {
    filepath: 'artifact.tsx',
  } as Parameters<typeof parsers.typescript.parse>[1])
  const replacements: { start: number; end: number; value: string }[] = []
  for (const node of ast.body) {
    if (node.type !== 'ImportDeclaration' || !node.source) continue
    const source = node.source
    const next = resolve(source.value)
    if (next !== source.value)
      replacements.push({
        start: source.range[0],
        end: source.range[1],
        value: JSON.stringify(next),
      })
  }
  for (const replacement of replacements.sort((a, b) => b.start - a.start))
    content =
      content.slice(0, replacement.start) +
      replacement.value +
      content.slice(replacement.end)
  return content
}

export function recipeImportAlias(
  specifier: string,
  utils: string,
  ui: string,
): string {
  if (specifier === '@/lib/utils') return utils
  if (
    specifier === '@/components/ui' ||
    specifier.startsWith('@/components/ui/')
  )
    return ui + specifier.slice('@/components/ui'.length)
  return specifier
}
