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

/**
 * Every module specifier a source references: static and side-effect imports,
 * `export ... from`, dynamic `import()`, `import("x")` types and `require()`.
 * A dynamic import or require with a non-literal argument is rejected.
 */
export async function collectModuleSpecifiers(content: string): Promise<string[]> {
  const ast = await parsers.typescript.parse(content, {
    filepath: 'artifact.tsx',
  } as Parameters<typeof parsers.typescript.parse>[1])
  const found: string[] = []
  const literal = (node: any) => {
    const value = node?.type === 'Literal' || node?.type === 'StringLiteral' ? node.value : undefined
    if (typeof value !== 'string') throw new Error('Non-literal module specifier')
    found.push(value)
  }
  const walk = (node: any): void => {
    if (!node || typeof node !== 'object') return
    if (Array.isArray(node)) return node.forEach(walk)
    switch (node.type) {
      case 'ImportDeclaration':
      case 'ExportAllDeclaration':
      case 'ExportNamedDeclaration':
        if (node.source) literal(node.source)
        break
      case 'ImportExpression':
        literal(node.source)
        break
      case 'TSImportType':
        literal(node.argument?.literal ?? node.argument ?? node.parameter)
        break
      case 'TSExternalModuleReference':
        literal(node.expression)
        break
      case 'CallExpression':
        if (node.callee?.type === 'Import' || (node.callee?.type === 'Identifier' && node.callee.name === 'require'))
          literal(node.arguments?.[0])
        break
    }
    for (const [key, child] of Object.entries(node))
      if (key !== 'parent' && key !== 'loc' && key !== 'range') walk(child)
  }
  walk(ast)
  return found
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
