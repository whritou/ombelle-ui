// Finds declarations in generated recipe sources that shadow the scope the recipe wrapper relies on.
// Table Head's `scope = 'col'` prop once shadowed the factory's `scope` parameter and unscoped its slot.
import { parse } from '@babel/parser'

type Node = { type: string; loc?: { start: { line: number } }; [key: string]: unknown }
export type ShadowedName = { name: string; line: number; reason: 'factory' | 'wrapper' }

const wrapperNames = new Set(['scope', 'instance', 'instanceId'])
const isNode = (value: unknown): value is Node => typeof value === 'object' && value !== null && typeof (value as Node).type === 'string'

function patternNames(pattern: unknown): Node[] {
  if (!isNode(pattern)) return []
  switch (pattern.type) {
    case 'Identifier': return [pattern]
    case 'ObjectPattern': return (pattern.properties as Node[]).flatMap(property =>
      patternNames(property.type === 'RestElement' ? property.argument : property.value))
    case 'ArrayPattern': return (pattern.elements as unknown[]).flatMap(patternNames)
    case 'AssignmentPattern': return patternNames(pattern.left)
    case 'RestElement': return patternNames(pattern.argument)
    case 'TSParameterProperty': return patternNames(pattern.parameter)
    default: return []
  }
}

/** Identifiers a node declares in its own scope or its parent's. */
function declared(node: Node): Node[] {
  if (node.type === 'VariableDeclarator') return patternNames(node.id)
  if (node.type === 'CatchClause') return patternNames(node.param)
  const own = /Function|ClassDeclaration/.test(node.type) && isNode(node.id) ? [node.id] : []
  return [...own, ...(Array.isArray(node.params) ? node.params.flatMap(patternNames) : [])]
}

function walk(node: unknown, visit: (node: Node) => void): void {
  if (Array.isArray(node)) return node.forEach(child => walk(child, visit))
  if (!isNode(node)) return
  visit(node)
  for (const [key, value] of Object.entries(node)) if (key !== 'loc' && typeof value === 'object') walk(value, visit)
}

export function findShadowedNames(source: string): ShadowedName[] {
  const program = parse(source, { sourceType: 'module', plugins: ['typescript', 'jsx'] }).program as unknown as Node
  const findings: ShadowedName[] = []
  const report = (identifier: Node, reason: ShadowedName['reason']) =>
    findings.push({ name: identifier.name as string, line: identifier.loc!.start.line, reason })
  const topLevel = new Set<string>()
  let factory: Node | undefined
  for (const statement of program.body as Node[]) {
    const declaration = statement.type === 'ExportNamedDeclaration' && isNode(statement.declaration) ? statement.declaration : statement
    if (declaration.type === 'FunctionDeclaration' && (declaration.id as Node | null)?.name === 'createScopedPrimitives') factory = declaration
    if (declaration.type === 'VariableDeclaration') (declaration.declarations as Node[]).forEach(item => declared(item).forEach(id => topLevel.add(id.name as string)))
    else if (isNode(declaration.id)) topLevel.add(declaration.id.name as string)
  }
  if (factory) {
    const body = (factory.body as Node).body as Node[]
    const own = new Set<Node>((factory.params as Node[]).flatMap(patternNames))
    for (const statement of body)
      if (statement.type === 'VariableDeclaration' && statement.kind === 'const')
        (statement.declarations as Node[]).forEach(item => declared(item).forEach(id => own.add(id)))
    const names = new Set([...own].map(id => id.name as string))
    walk(body, node => declared(node).forEach(id => { if (!own.has(id) && names.has(id.name as string)) report(id, 'factory') }))
  }
  // Outside the factory, a nested redeclaration of a module-level wrapper name hides it from the wrapper code.
  const outside = (program.body as Node[]).filter(statement => {
    const declaration = statement.type === 'ExportNamedDeclaration' ? statement.declaration : statement
    return declaration !== factory
  })
  for (const statement of outside) {
    const declaration = statement.type === 'ExportNamedDeclaration' && isNode(statement.declaration) ? statement.declaration : statement
    const nested = declaration.type === 'VariableDeclaration' ? (declaration.declarations as Node[]).map(item => item.init) : [declaration.params, declaration.body]
    walk(nested, node => declared(node).forEach(id => {
      const name = id.name as string
      if (wrapperNames.has(name) && topLevel.has(name)) report(id, 'wrapper')
    }))
  }
  return findings.sort((a, b) => a.line - b.line || a.name.localeCompare(b.name))
}
