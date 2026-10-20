import postcss from 'postcss'
import type { CompileResult } from '@ombelle/contracts'
import { getCatalog, getTemplate } from '@ombelle/catalog'
function cssObject(css: string): Record<string, any> {
  const result: Record<string, any> = {}
  function visit(nodes: readonly any[], out: Record<string, any>) {
    for (const node of nodes) {
      if (node.type === 'decl') out[node.prop] = node.value
      else if (node.type === 'rule' || node.type === 'atrule') {
        const key =
          node.type === 'rule'
            ? node.selector
            : '@' + node.name + (node.params ? ' ' + node.params : '')
        out[key] ??= {}
        if (node.nodes) visit(node.nodes, out[key])
      }
    }
  }
  visit(postcss.parse(css).nodes, result)
  return result
}
export function buildRegistry(result: CompileResult): {
  index: any
  items: Record<string, any>
} {
  const items: Record<string, any> = {}
  const catalog = getCatalog(result.provenance.catalogRelease)
  const vars = Object.fromEntries(
    Object.entries(result.theme).map(([mode, values]) => [
      mode,
      Object.fromEntries(
        Object.entries(values).map(([k, v]) => [k.replace(/^--/, ''), v]),
      ),
    ]),
  )
  const style = result.artifacts.find(
    (a) => a.logicalPath === 'styles/ui-style.css',
  )!
  for (const artifact of result.artifacts.filter(
    (a) => a.kind === 'component',
  )) {
    const id = artifact.logicalPath.split('/').at(-1)!.replace('.tsx', '') as
      'button' | 'dialog' | 'input'
    const utility = result.artifacts.find((a) => a.kind === 'utility')!
    items[id] = {
      $schema: 'https://ui.shadcn.com/schema/registry-item.json',
      name: id,
      type: 'registry:ui',
      dependencies: getTemplate(catalog, id)
        .dependencies.filter((d) => d.name !== 'react')
        .map((d) => d.name + '@' + d.version),
      files: [
        {
          path: artifact.logicalPath,
          type: 'registry:ui',
          content: artifact.content,
        },
        {
          path: utility.logicalPath,
          type: 'registry:lib',
          content: utility.content,
        },
      ],
      cssVars: vars,
      css: cssObject(style.content),
    }
  }
  items.theme = {
    $schema: 'https://ui.shadcn.com/schema/registry-item.json',
    name: 'theme',
    type: 'registry:theme',
    cssVars: vars,
  }
  return {
    index: {
      $schema: 'https://ui.shadcn.com/schema/registry.json',
      name: 'ombelle',
      homepage: 'http://localhost',
      items: Object.values(items),
    },
    items,
  }
}
