import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createRequire, builtinModules } from 'node:module'
import { spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { build } from 'esbuild'

const repo = fileURLToPath(new URL('../', import.meta.url))
const require = createRequire(import.meta.url)
function run(executable, args, cwd = repo) {
  const result = spawnSync(executable, args, { cwd, windowsHide: true, encoding: 'utf8', maxBuffer: 8 * 1024 * 1024 })
  if (result.error) throw result.error
  if (result.status !== 0) throw new Error('Release build command failed: ' + result.stdout + result.stderr)
  return result.stdout
}
for (const script of ['sync-schema.mjs', 'sync-catalog.mjs', 'build.mjs'])
  run(process.execPath, ['scripts/' + script])
const { publicCliPackageName } = await import('../packages/contracts/dist/index.js')
const releaseRoot = path.resolve(repo, '.artifacts/cli-release')
const staging = path.resolve(releaseRoot, 'package')
if (path.dirname(staging) !== releaseRoot || path.basename(staging) !== 'package') throw new Error('Invalid owned release staging directory')
const prior = await fs.lstat(staging).catch(error => { if (error.code !== 'ENOENT') throw error; return null })
if (prior && (!prior.isDirectory() || prior.isSymbolicLink())) throw new Error('Refusing substituted release staging directory')
await fs.rm(staging, { recursive: true, force: true })
await fs.mkdir(path.join(staging, 'dist'), { recursive: true })
const result = await build({
  absWorkingDir: repo, entryPoints: ['packages/cli/src/main.ts'],
  outfile: path.join(staging, 'dist/main.js'), bundle: true, platform: 'node',
  format: 'esm', target: 'node24', minify: true, sourcemap: false,
  legalComments: 'none', metafile: true,
  banner: { js: "import {createRequire as __createRequire} from 'node:module';const require=__createRequire(import.meta.url);" },
})
const builtins = new Set(builtinModules.flatMap(name => [name, 'node:' + name]))
for (const output of Object.values(result.metafile.outputs))
  for (const item of output.imports)
    if (item.external && !builtins.has(item.path)) throw new Error('Unbundled release dependency: ' + item.path)

const packages = new Map()
async function collectPackage(file) {
  let current = path.dirname(await fs.realpath(file))
  while (current !== path.dirname(current)) {
    const manifestFile = path.join(current, 'package.json')
    try {
      const manifest = JSON.parse(await fs.readFile(manifestFile, 'utf8'))
      if (manifest.name && manifest.version) {
        if (!manifest.name.startsWith('@ombelle/')) packages.set(manifest.name + '@' + manifest.version, { directory: current, manifest })
        return
      }
    } catch (error) { if (error.code !== 'ENOENT') throw error }
    current = path.dirname(current)
  }
  throw new Error('No package metadata for bundled dependency')
}
for (const file of Object.keys(result.metafile.inputs))
  if (file.replaceAll('\\', '/').includes('node_modules/')) await collectPackage(path.resolve(repo, file))
// Catalogs distribute reviewed source templates as strings. Include their
// referenced libraries' notices as well as executable bundled dependencies.
const catalog = JSON.parse(await fs.readFile(path.join(repo, 'packages/catalog/package.json'), 'utf8'))
const catalogRequire = createRequire(path.join(repo, 'packages/catalog/package.json'))
for (const name of Object.keys(catalog.dependencies).filter(name => !name.startsWith('@ombelle/')))
  await collectPackage(catalogRequire.resolve(name))
const notices = []
for (const [identity, { directory, manifest }] of [...packages].sort(([a], [b]) => a.localeCompare(b))) {
  const files = (await fs.readdir(directory, { withFileTypes: true }))
    .filter(entry => entry.isFile() && /license|notice|copying/i.test(entry.name)).map(entry => entry.name).sort()
  if (!files.length) throw new Error('Missing license text for ' + identity)
  const texts = await Promise.all(files.map(async name => `--- ${name} ---\n${await fs.readFile(path.join(directory, name), 'utf8')}`))
  notices.push(`=== ${identity} (${typeof manifest.license === 'string' ? manifest.license : 'see license text'}) ===\n${texts.join('\n')}\n`)
}
await fs.copyFile(path.join(repo, 'LICENSE'), path.join(staging, 'LICENSE'))
await fs.writeFile(path.join(staging, 'THIRD_PARTY_NOTICES.txt'), notices.join('\n'))
const workspaceManifest = JSON.parse(await fs.readFile(path.join(repo, 'packages/cli/package.json'), 'utf8'))
const manifest = {
  name: publicCliPackageName, version: workspaceManifest.version,
  description: 'Guarded source installer for Ombelle presets and Button recipes',
  type: 'module', license: 'MIT', bin: { ombelle: './dist/main.js' },
  engines: { node: '>=24.19.0 <25' },
  files: ['dist', 'LICENSE', 'THIRD_PARTY_NOTICES.txt', 'README.md'],
  publishConfig: { access: 'public' },
}
await fs.writeFile(path.join(staging, 'package.json'), JSON.stringify(manifest, null, 2) + '\n')
await fs.writeFile(path.join(staging, 'README.md'), '# Ombelle CLI\n\nInstall reviewed React source using local JSON or immutable publication codes. Review with --dry-run before applying with --yes. Recipes preserve saved project defaults. Node 24.19.0 or newer Node 24 is required.\n\nBare codes use https://ombelle-ui.vercel.app. Alternate origins require explicit content hashes. Offline pins cannot detect later withdrawals. See --help for supported inputs.\n')
await fs.chmod(path.join(staging, 'dist/main.js'), 0o755)

const npmCandidates = [
  process.env.OMBELLE_RELEASE_NPM_ENTRY,
  ...(path.basename(process.env.npm_execpath ?? '') === 'npm-cli.js' ? [process.env.npm_execpath] : []),
  // Windows installs npm beside node.exe; POSIX prefixes put it in lib/ next to bin/.
  ...(process.env.PATH ?? process.env.Path ?? '').split(path.delimiter).filter(Boolean).flatMap(directory => [path.join(directory, 'npm-cli.js'), path.join(directory, 'node_modules/npm/bin/npm-cli.js'), path.join(directory, '../lib/node_modules/npm/bin/npm-cli.js')]),
].filter(Boolean)
let npm
for (const file of npmCandidates) {
  try { if ((await fs.stat(file)).isFile()) { npm = file; break } } catch (error) { if (!['ENOENT', 'ENOTDIR'].includes(error.code)) throw error }
}
if (!npm || run(process.execPath, [npm, '--version']).trim() !== '11.19.0')
  throw new Error('Release packing requires npm 11.19.0; put its bin on PATH or set OMBELLE_RELEASE_NPM_ENTRY to its npm-cli.js')
const packed = JSON.parse(run(process.execPath, [npm, 'pack', '--ignore-scripts', '--json', '--pack-destination', releaseRoot], staging))[0]
const tarball = path.join(releaseRoot, packed.filename)
const integrity = 'sha512-' + createHash('sha512').update(await fs.readFile(tarball)).digest('base64')
if (integrity !== packed.integrity) throw new Error('Packed artifact integrity mismatch')
const release = {
  packageName: manifest.name, version: manifest.version, status: 'unpublished-candidate',
  sourceCommit: run('git', ['rev-parse', 'HEAD']).trim(), tarball, integrity,
  workingTreeDirty: run('git', ['status', '--porcelain']).trim().length > 0,
  files: packed.files.map(file => file.path), bundledPackages: [...packages.keys()].sort(),
}
await fs.writeFile(path.join(releaseRoot, 'release.json'), JSON.stringify(release, null, 2) + '\n')
console.log(JSON.stringify({ packageName: release.packageName, version: release.version, status: release.status, integrity, files: release.files.length }))
