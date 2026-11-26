import fs from 'node:fs'
import path from 'node:path'
import { expect, it } from 'vitest'

// The block frame on /blocks pages must load only what the block needs. Importing @ombelle/compiler (with the
// catalog) or the @ombelle/contracts index once made every block page download about 5.6 MB of JavaScript first.
const repo = path.resolve(import.meta.dirname, '../../../../..')
const entry = path.join(repo, 'apps/preview/src/block-preview.tsx')

/** The bare specifiers reachable from a file through static imports and re-exports; dynamic import() is not followed. */
function staticImports(file: string, seen = new Set<string>(), bare = new Set<string>()): Set<string> {
  if (seen.has(file)) return bare
  seen.add(file)
  const source = fs.readFileSync(file, 'utf8')
  for (const match of source.matchAll(/^\s*(?:import|export)\s+(?!type\b)(?:[^'"]*?\sfrom\s+)?['"]([^'"]+)['"]/gm)) {
    const specifier = match[1]!
    if (!specifier.startsWith('.')) {
      bare.add(specifier)
      continue
    }
    const base = path.resolve(path.dirname(file), specifier.replace(/\.js$/, ''))
    const resolved = ['.ts', '.tsx', '/index.ts', '/index.tsx', ''].map((suffix) => base + suffix)
      .find((candidate) => fs.existsSync(candidate) && fs.statSync(candidate).isFile())
    if (resolved) {
      if (/\.(?:ts|tsx)$/.test(resolved)) staticImports(resolved, seen, bare)
    } else if (!base.includes(`${path.sep}generated${path.sep}`)) {
      // Generated previews exist only after generate:preview; every other import must resolve.
      throw new Error(`Unresolved import ${specifier} in ${file}`)
    }
  }
  return bare
}

it('keeps the compiler and the contracts index out of the block frame', () => {
  const bare = [...staticImports(entry)]
  expect(bare.filter((specifier) => specifier.startsWith('@ombelle/'))).toEqual([])
})
