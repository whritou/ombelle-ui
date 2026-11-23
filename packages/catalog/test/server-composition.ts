import { spawnSync } from 'node:child_process'
import { createRequire } from 'node:module'
import path from 'node:path'
import { Readable } from 'node:stream'
import { fileURLToPath } from 'node:url'
import * as React from 'react'
import { renderToString } from 'react-dom/server'

/**
 * A node of a page written as a React Server Component: a string, a host element, or an export
 * of a catalog client module (`module` is a key of the modules passed to `renderServerPage`).
 */
export type ServerNode = string | { module?: string; type: string; props?: Record<string, unknown>; children?: ServerNode[] }

/** Shorthand for a ServerNode. */
export const el = (module: string | undefined, type: string, props?: Record<string, unknown> | null, ...children: ServerNode[]): ServerNode =>
  ({ module, type, props: props ?? undefined, children })

/** Renders `tree` as a page composed in a client component, for comparison. */
export function renderClientPage(tree: ServerNode, modules: Record<string, Record<string, unknown>>): string {
  const build = (node: ServerNode, key?: number): React.ReactNode => {
    if (typeof node === 'string') return node
    const type = (node.module ? modules[node.module]![node.type] : node.type) as React.ElementType
    return React.createElement(type, { key, ...node.props }, ...(node.children ?? []).map((child, index) => build(child, index)))
  }
  return renderToString(React.createElement(React.Fragment, null, build(tree)))
}

const here = path.dirname(fileURLToPath(import.meta.url))
const www = createRequire(path.resolve(here, '../../../apps/www/package.json'))

/**
 * Renders `tree` the way a Next.js App Router page authored without 'use client' is rendered:
 * the tree goes through the React Server Components (Flight) server in a `react-server`
 * process, where each catalog export is a client reference, then the Flight client decodes it
 * and react-dom renders the client components to HTML. The parts therefore reach their parent
 * as client references, not as the component functions.
 */
export async function renderServerPage(tree: ServerNode, modules: Record<string, Record<string, unknown>>): Promise<string> {
  const result = spawnSync(process.execPath, ['--conditions=react-server', path.join(here, 'fixtures/rsc-server.cjs')], {
    input: JSON.stringify({ tree }),
    encoding: 'utf8',
    maxBuffer: 16 * 1024 * 1024,
  })
  if (result.status !== 0) throw new Error('Flight server failed:\n' + result.stderr)
  const client = www('next/dist/compiled/react-server-dom-webpack/client.node') as {
    createFromNodeStream(stream: Readable, manifest: unknown): PromiseLike<React.ReactNode>
  }
  const globals = globalThis as Record<string, unknown>
  // Next.js's build of the Flight client names the bundler hooks __next_*.
  globals.__webpack_require__ = globals.__next_require__ = (id: string) => {
    const exports = modules[id]
    if (!exports) throw new Error('Unknown client module ' + id)
    return exports
  }
  globals.__webpack_chunk_load__ = globals.__next_chunk_load__ = () => Promise.resolve()
  const moduleMap = Object.fromEntries(Object.keys(modules).map(id => [id, { '*': { id, chunks: [], name: '*' } }]))
  const root = await client.createFromNodeStream(Readable.from([result.stdout]), {
    moduleMap,
    serverModuleMap: null,
    moduleLoading: null,
  })
  return renderToString(React.createElement(React.Fragment, null, root))
}
