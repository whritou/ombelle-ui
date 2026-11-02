import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawnSync } from 'node:child_process'
import { build } from 'vite'

const repo = fileURLToPath(new URL('../', import.meta.url))
function run(args) {
  const result = spawnSync(process.execPath, args, { cwd: repo, windowsHide: true, stdio: 'inherit' })
  if (result.error) throw result.error
  if (result.status !== 0) throw new Error('Hosted preview prerequisite failed: ' + args.join(' '))
}
run(['--import', 'tsx', 'scripts/generate-preview.ts'])
run(['scripts/build-editor-worker.mjs'])
const artifacts = path.resolve(repo, '.artifacts')
await fs.mkdir(artifacts, { recursive: true })
const staging = await fs.mkdtemp(path.join(artifacts, 'hosted-preview-'))
const publicRoot = path.resolve(repo, 'apps/www/public')
const destination = path.resolve(publicRoot, 'ombelle-preview')
// Every recursive removal is confined to the fixed public subtree or this
// invocation's mkdtemp directory. Never empty the parent public directory.
if (path.dirname(destination) !== publicRoot || path.basename(destination) !== 'ombelle-preview' ||
  path.dirname(staging) !== artifacts || !path.basename(staging).startsWith('hosted-preview-'))
  throw new Error('Invalid owned preview build paths')
try {
  await build({
    root: path.join(repo, 'apps/preview'),
    configFile: path.join(repo, 'apps/preview/vite.config.ts'),
    base: '/ombelle-preview/',
    build: { outDir: staging, emptyOutDir: true },
  })
  const html = await fs.readFile(path.join(staging, 'index.html'))
  for (const kind of ['editor', 'preset']) {
    const directory = path.join(staging, `${kind}-preview`)
    await fs.mkdir(directory)
    await fs.writeFile(path.join(directory, 'index.html'), html)
  }
  const previous = await fs.lstat(destination).catch(error => {
    if (error.code !== 'ENOENT') throw error
    return undefined
  })
  if (previous && (!previous.isDirectory() || previous.isSymbolicLink()))
    throw new Error('Refusing a substituted hosted preview directory')
  await fs.rm(destination, { recursive: true, force: true })
  await fs.cp(staging, destination, { recursive: true, errorOnExist: true, force: false })
} finally {
  await fs.rm(staging, { recursive: true, force: true })
}
