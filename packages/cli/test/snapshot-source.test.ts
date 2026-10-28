import fs from 'node:fs/promises'
import path from 'node:path'
import { createServer } from 'node:http'
import { afterEach, expect, it, vi } from 'vitest'
import { getCatalog } from '@ombelle/catalog'
import { normalizePublishedPreset } from '@ombelle/compiler'
import { createProject } from '../../../tests/helpers/projects.js'
import { snapshotTree } from '../../../tests/helpers/tree.js'
import { runCli } from '../src/main.js'
import { inspectProject } from '../src/project/inspect.js'

const prompt = vi.hoisted(() => ({ question: undefined as (() => Promise<string>) | undefined }))
vi.mock('node:readline/promises', async original => {
  const actual = await original<typeof import('node:readline/promises')>()
  return { ...actual, createInterface: (...args: Parameters<typeof actual.createInterface>) => prompt.question
    ? { question: prompt.question, close() {} } : actual.createInterface(...args) }
})

const roots: string[] = []
const catalog = getCatalog('0.1.0')
const local = path.resolve('examples/preset.example.json')
const reference = 'ps_0123456789abcdef0123456789abcdef@1'
const source = (presetHash: string) => ({ origin: 'https://example.com', reference, presetHash })
afterEach(async () => { for (const root of roots.splice(0)) await fs.rm(root, { recursive: true, force: true }) })
async function run(root: string, args: string[]) {
  let output = ''
  const code = await runCli([...args, '--cwd', root, '--json', '--yes'], { stdout: text => { output += text }, stderr: text => { output += text } })
  expect(code, output).toBe(0)
  return JSON.parse(output)
}
async function setup(scoped = false) {
  const root = await createProject('vite')
  roots.push(root)
  const pkg = JSON.parse(await fs.readFile(path.join(root, 'package.json'), 'utf8'))
  for (const template of Object.values(catalog.templates)) for (const dep of template.dependencies) pkg.dependencies[dep.name] = dep.version
  await fs.writeFile(path.join(root, 'package.json'), JSON.stringify(pkg))
  await run(root, ['init', '--preset', local])
  if (scoped) await run(root, ['add', 'button', '--preset', local])
  const lockFile = path.join(root, 'ui-library.lock.json')
  const lock = JSON.parse(await fs.readFile(lockFile, 'utf8'))
  lock.presetSource = source(lock.presetHash)
  if (scoped) {
    const key = Object.keys(lock.componentPresets)[0]!
    lock.componentPresetSources = { [key]: source(lock.componentPresets[key].preset.hash) }
  }
  await fs.writeFile(lockFile, JSON.stringify(lock))
  return { root, lockFile, lock }
}
it('ordinary additions retain validated global and scoped sources', async () => {
  const { root, lockFile, lock } = await setup(true)
  await run(root, ['add', 'card'])
  const after = JSON.parse(await fs.readFile(lockFile, 'utf8'))
  expect(after.presetSource).toEqual(lock.presetSource)
  expect(after.componentPresetSources).toEqual(lock.componentPresetSources)
})
it.each([['init', '--preset'], ['theme', 'add']])('explicit local global %s clears only global source', async (...command) => {
  const { root, lockFile, lock } = await setup(true)
  await run(root, [...command, local])
  const after = JSON.parse(await fs.readFile(lockFile, 'utf8'))
  expect(after).not.toHaveProperty('presetSource')
  expect(after.componentPresetSources).toEqual(lock.componentPresetSources)
})
it('matching local scoped selection preserves prior source and all bytes', async () => {
  const { root, lockFile } = await setup(true)
  // Normalize the hand-attached metadata through a recipe-independent writer.
  const { canonicalize } = await import('@ombelle/compiler')
  await fs.writeFile(lockFile, canonicalize(JSON.parse(await fs.readFile(lockFile, 'utf8'))) + '\n')
  const before = await snapshotTree(root)
  const result = await run(root, ['add', 'button', '--preset', local])
  expect(result.changes.every((change: { action: string }) => change.action === 'noop')).toBe(true)
  expect(await snapshotTree(root)).toEqual(before)
})
it.each([
  ['wrong global hash', (lock: any) => { lock.presetSource.presetHash = 'a'.repeat(64) }],
  ['missing global preset', (_lock: any, root: string) => fs.rm(path.join(root, 'ui-preset.json'))],
  ['invalid origin', (lock: any) => { lock.presetSource.origin = 'http://example.com' }],
  ['extra source field', (lock: any) => { lock.presetSource.extra = true }],
  ['wrong reference', (lock: any) => { lock.presetSource.reference = 'ps_bad@1' }],
  ['orphan scoped source', (lock: any) => { lock.componentPresetSources['orphan@1'] = lock.presetSource }],
  ['wrong scoped hash', (lock: any) => { Object.values<any>(lock.componentPresetSources)[0].presetHash = 'f'.repeat(64) }],
  ['invalid scoped map', (lock: any) => { lock.componentPresetSources = [] }],
] as const)('rejects %s during project inspection without mutation', async (_, mutate) => {
  const { root, lockFile, lock } = await setup(true)
  await mutate(lock, root)
  await fs.writeFile(lockFile, JSON.stringify(lock))
  const before = await snapshotTree(root)
  await expect(inspectProject(root)).rejects.toMatchObject({ code: 'UNSUPPORTED_PROJECT', message: expect.stringMatching(/snapshot source/i) })
  expect(await snapshotTree(root)).toEqual(before)
})
it.each(['cancel', 'stale'] as const)('leaves cache absent after interactive %s', async mode => {
  const { root } = await setup()
  const preset = await normalizePublishedPreset(catalog.presets.flat)
  const snapshot = { snapshotVersion: '1.0', id: reference.slice(0, -2), revision: 1, preset: preset.data, presetHash: preset.hash, catalogRelease: '0.1.0', compilerVersion: '0.1.0', createdAt: '2026-10-27T12:34:56.000Z', validationStatus: 'draft' }
  const server = createServer((_, response) => { response.setHeader('Content-Type', 'application/json'); response.end(JSON.stringify(snapshot)) })
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve))
  const descriptor = Object.getOwnPropertyDescriptor(process.stdin, 'isTTY')
  Object.defineProperty(process.stdin, 'isTTY', { value: true, configurable: true })
  vi.stubEnv('OMBELLE_SNAPSHOT_CACHE_DIR', path.join(root, 'cache'))
  let before = await snapshotTree(root)
  prompt.question = async () => {
    if (mode === 'cancel') return 'n'
    await fs.appendFile(path.join(root, 'tsconfig.json'), ' ')
    before = await snapshotTree(root)
    return 'yes'
  }
  try {
    let output = ''
    const code = await runCli(['theme', 'add', reference, '--snapshot-origin', `http://127.0.0.1:${(server.address() as { port: number }).port}`, '--preset-hash', preset.hash, '--cwd', root, '--json'], { stdout: text => { output += text }, stderr() {} })
    expect(code, output).toBe(mode === 'cancel' ? 0 : 4)
    expect(JSON.parse(output).status).toBe(mode === 'cancel' ? 'cancelled' : 'error')
    expect(await snapshotTree(root)).toEqual(before)
    await expect(fs.access(path.join(root, 'cache'))).rejects.toMatchObject({ code: 'ENOENT' })
  } finally {
    prompt.question = undefined
    if (descriptor) Object.defineProperty(process.stdin, 'isTTY', descriptor)
    else delete (process.stdin as { isTTY?: boolean }).isTTY
    vi.unstubAllEnvs()
    server.closeAllConnections()
    await new Promise<void>(resolve => server.close(() => resolve()))
  }
})
