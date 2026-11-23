// Size budget of the site's JavaScript, from a finished `next build` of apps/www and the hosted preview build.
// For each route it sums the compressed size of every script the page loads at first paint (prerendered
// HTML, or the client reference manifest for routes rendered per request), and checks the editor workers,
// the preview frame bundle and the largest single chunk. Limits live in scripts/www-budget.json.
// Usage: node scripts/check-www-budget.mjs [--json]   (exit code 1 when a limit is exceeded)
// Sizes are brotli quality 11, which is what Vercel serves to browsers that accept it.
import fs from 'node:fs'
import path from 'node:path'
import zlib from 'node:zlib'
import { fileURLToPath } from 'node:url'

const repo = fileURLToPath(new URL('../', import.meta.url))
const next = path.join(repo, 'apps/www/.next')
const publicDir = path.join(repo, 'apps/www/public')
const budget = JSON.parse(fs.readFileSync(path.join(repo, 'scripts/www-budget.json'), 'utf8'))

const cache = new Map()
function compressed(file) {
  let size = cache.get(file)
  if (size === undefined) {
    const content = fs.readFileSync(file)
    size = zlib.brotliCompressSync(content, { params: { [zlib.constants.BROTLI_PARAM_QUALITY]: 11 } }).length
    cache.set(file, size)
  }
  return size
}
const kb = (bytes) => Math.round(bytes / 102.4) / 10

/** The scripts a prerendered route's HTML loads. */
function htmlScripts(route) {
  const file = path.join(next, 'server/app', (route === '/' ? 'index' : route.slice(1)) + '.html')
  const html = fs.readFileSync(file, 'utf8')
  return [...new Set([...html.matchAll(/\/_next\/(static\/[^"'\s>]+?\.js)/g)].map((match) => match[1]))]
}

/** The scripts a dynamic route loads: its page entry in the client reference manifest, plus the root main files. */
function manifestScripts(route) {
  const dir = path.join(next, 'server/app', route.slice(1))
  const manifestFile = path.join(dir, 'page_client-reference-manifest.js')
  const source = fs.readFileSync(manifestFile, 'utf8')
  const sandbox = { globalThis: {} }
  new Function('globalThis', source)(sandbox.globalThis)
  const manifests = sandbox.globalThis.__RSC_MANIFEST
  const manifest = Object.values(manifests)[0]
  const files = new Set()
  for (const [entry, list] of Object.entries(manifest.entryJSFiles ?? {}))
    if (/\/app\/(layout|.*\/layout|.*\/page)$/.test(entry)) for (const file of list) files.add(file.replace(/^\/?_next\//, ''))
  const build = JSON.parse(fs.readFileSync(path.join(next, 'build-manifest.json'), 'utf8'))
  for (const file of build.rootMainFiles ?? []) files.add(file)
  for (const file of build.polyfillFiles ?? []) if (!/polyfill/.test(file)) files.add(file)
  return [...files].filter((file) => file.endsWith('.js'))
}

const failures = []
const rows = []
function check(name, actual, limit) {
  rows.push({ name, kb: kb(actual), limitKb: limit })
  if (kb(actual) > limit) failures.push(`${name}: ${kb(actual)} kB > ${limit} kB`)
}

for (const [route, limit] of Object.entries(budget.routes)) {
  const scripts = route.includes('[') ? manifestScripts(route) : htmlScripts(route)
  const total = scripts.reduce((sum, script) => sum + compressed(path.join(next, script)), 0)
  check(`route ${route} (${scripts.length} scripts)`, total, limit)
}

let largest = { file: '', size: 0 }
for (const file of fs.readdirSync(path.join(next, 'static/chunks'), { recursive: true })) {
  if (!String(file).endsWith('.js')) continue
  const size = compressed(path.join(next, 'static/chunks', String(file)))
  if (size > largest.size) largest = { file: String(file), size }
}
check(`largest chunk (${largest.file})`, largest.size, budget.largestChunk)

for (const [worker, limit] of Object.entries(budget.workers)) {
  const dir = path.join(publicDir, path.dirname(worker))
  const files = fs.readdirSync(dir).filter((name) => name === path.basename(worker) || name.startsWith(path.basename(worker, '.js') + '-'))
  const total = files.reduce((sum, name) => sum + compressed(path.join(dir, name)), 0)
  check(`worker ${worker}`, total, limit)
}

const assets = path.join(publicDir, 'ombelle-preview/assets')
for (const kind of ['editor', 'preset']) {
  const html = fs.readFileSync(path.join(publicDir, `ombelle-preview/${kind}-preview/index.html`), 'utf8')
  const entry = [...html.matchAll(/<script\b[^>]*src="\/ombelle-preview\/assets\/([^"]+\.js)"/g)].map((match) => match[1])
  const preloads = [...html.matchAll(/<link\b[^>]*rel="modulepreload"[^>]*href="\/ombelle-preview\/assets\/([^"]+\.js)"/g)].map((match) => match[1])
  const total = [...new Set([...entry, ...preloads])].reduce((sum, name) => sum + compressed(path.join(assets, name)), 0)
  check(`preview frame ${kind} (first load)`, total, budget.previewFrame)
}

if (process.argv.includes('--json')) console.log(JSON.stringify(rows, null, 2))
else for (const row of rows) console.log(`${row.kb <= row.limitKb ? 'ok  ' : 'OVER'} ${String(row.kb).padStart(7)} kB / ${String(row.limitKb).padStart(5)} kB  ${row.name}`)
if (failures.length) {
  console.error(`\nSite budget exceeded (scripts/www-budget.json):\n${failures.join('\n')}`)
  process.exitCode = 1
}
