import { build } from 'esbuild'
import { existsSync, mkdirSync } from 'node:fs'
for (const name of ['contracts', 'catalog', 'compiler', 'cli']) {
  const entry = name === 'cli' ? 'main' : 'index'
  const path = 'packages/' + name + '/src/' + entry + '.ts'
  if (!existsSync(path)) continue
  mkdirSync('packages/' + name + '/dist', { recursive: true })
  await build({
    entryPoints: [path],
    outfile: 'packages/' + name + '/dist/' + entry + '.js',
    bundle: true,
    platform: name === 'cli' ? 'node' : 'neutral',
    format: 'esm',
    packages: 'external',
    tsconfigRaw: { compilerOptions: { jsx: 'automatic' } },
    sourcemap: true,
    target: 'es2023',
  })
}
