// First-load JavaScript of the editor, docs and component routes, from a finished `next build` of apps/www.
// Next.js 16 no longer prints First Load JS, so this sums the gzipped size of every
// script a route's prerendered HTML loads. Usage: node scripts/measure-www-first-load.mjs
import fs from 'node:fs'
import path from 'node:path'
import zlib from 'node:zlib'
import { fileURLToPath } from 'node:url'

const next = fileURLToPath(new URL('../apps/www/.next/', import.meta.url))
const routes = [
  'editor/preset',
  'editor/component',
  'editor/component/button',
  'docs',
  'docs/getting-started',
  'components',
  'components/accordion',
]

const kb = (bytes) => (bytes / 1024).toFixed(1)
for (const route of routes) {
  const html = fs.readFileSync(path.join(next, 'server/app', route + '.html'), 'utf8')
  const scripts = [...new Set([...html.matchAll(/\/_next\/(static\/[^"'\s>]+?\.js)/g)].map((match) => match[1]))]
  let raw = 0
  let gzip = 0
  for (const script of scripts) {
    const content = fs.readFileSync(path.join(next, script))
    raw += content.length
    gzip += zlib.gzipSync(content, { level: 9 }).length
  }
  console.log(`/${route}\t${scripts.length} scripts\t${kb(raw)} kB raw\t${kb(gzip)} kB gzip`)
}
