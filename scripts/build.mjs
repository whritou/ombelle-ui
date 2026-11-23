import { build } from 'esbuild'
import { existsSync, mkdirSync } from 'node:fs'
import { writeFileAtomicSync } from './write-atomic.ts'
// Light entries next to each package's index: browser pages import them instead of the whole package.
const extraEntries = { catalog: ['presets', 'expansion-examples'], compiler: ['light'] }
for (const name of ['contracts', 'catalog', 'compiler', 'cli']) {
  for (const entry of [name === 'cli' ? 'main' : 'index', ...(extraEntries[name] ?? [])]) {
    const path = 'packages/' + name + '/src/' + entry + '.ts'
    if (!existsSync(path)) continue
    mkdirSync('packages/' + name + '/dist', { recursive: true })
    const { outputFiles } = await build({
      entryPoints: [path],
      outfile: 'packages/' + name + '/dist/' + entry + '.js',
      bundle: true,
      platform: name === 'cli' ? 'node' : 'neutral',
      format: 'esm',
      packages: 'external',
      tsconfigRaw: { compilerOptions: { jsx: 'automatic' } },
      sourcemap: true,
      target: 'es2023',
      write: false,
    })
    for (const file of outputFiles) writeFileAtomicSync(file.path, file.contents)
  }
}
