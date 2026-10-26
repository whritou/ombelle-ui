import { build } from 'esbuild'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('../', import.meta.url))

await build({
  entryPoints: [fileURLToPath(new URL('../apps/www/src/editor/compile.worker.ts', import.meta.url))],
  outfile: fileURLToPath(new URL('../apps/www/public/editor-compiler.worker.js', import.meta.url)),
  absWorkingDir: root,
  bundle: true,
  platform: 'browser',
  format: 'esm',
  target: 'es2023',
  minify: true,
})
