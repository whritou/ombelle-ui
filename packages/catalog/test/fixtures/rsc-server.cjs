// Renders a tree to a React Server Components (Flight) payload, as a Next.js App Router page
// authored without 'use client' would. Run with `node --conditions=react-server`.
// Each catalog template is a client module, so the page sees each of its exports as a client
// reference, exactly as a bundler gives a Server Component that imports a 'use client' file.
// stdin: JSON { tree } where a node is a string, or
// { module?: string, type: string, props?: object, children?: node[] }.
'use strict'
const path = require('node:path')
const { createRequire } = require('node:module')

const www = createRequire(path.resolve(__dirname, '../../../../apps/www/package.json'))
const React = www('react')
const server = www('next/dist/compiled/react-server-dom-webpack/server.node')

let input = ''
process.stdin.setEncoding('utf8')
process.stdin.on('data', chunk => { input += chunk })
process.stdin.on('end', () => {
  const { tree } = JSON.parse(input)
  const proxies = new Map()
  const manifest = {}
  const proxy = (module) => {
    if (!proxies.has(module)) {
      proxies.set(module, server.createClientModuleProxy(module))
      manifest[module] = { id: module, chunks: [], name: '*' }
    }
    return proxies.get(module)
  }
  const build = (node, key) => {
    if (typeof node === 'string') return node
    const type = node.module ? proxy(node.module)[node.type] : node.type
    const children = (node.children ?? []).map((child, index) => build(child, index))
    return React.createElement(type, { key, ...node.props }, ...children)
  }
  const element = build(tree)
  const { pipe } = server.renderToPipeableStream(element, manifest, {
    onError(error) { process.stderr.write(String(error && error.stack || error) + '\n'); process.exitCode = 1 },
  })
  pipe(process.stdout)
})
