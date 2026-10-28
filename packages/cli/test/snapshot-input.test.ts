import fs from 'node:fs/promises'
import path from 'node:path'
import os from 'node:os'
import { createServer, type ServerResponse } from 'node:http'
import { createServer as createHttpsServer } from 'node:https'
import { afterEach, beforeAll, expect, it } from 'vitest'
import { getCatalog } from '@ombelle/catalog'
import { normalizePublishedPreset } from '@ombelle/compiler'
import type { PresetSnapshot } from '@ombelle/contracts'
import { resolvePresetInput } from '../src/snapshots/input.js'
import { writeSnapshotCache } from '../src/snapshots/cache.js'
import { runCli } from '../src/main.js'
import { formatPlan, planOutput } from '../src/format.js'
import { compile } from '@ombelle/compiler'
import type { InstallPlan } from '@ombelle/contracts'

const cleanup: (() => Promise<unknown>)[] = []
let snapshot: PresetSnapshot
const reference = 'ps_0123456789abcdef0123456789abcdef@1'
beforeAll(async () => {
  const preset = await normalizePublishedPreset(getCatalog('0.1.0').presets.flat)
  snapshot = { snapshotVersion: '1.0', id: reference.slice(0, -2), revision: 1, preset: preset.data, presetHash: preset.hash, catalogRelease: '0.1.0', compilerVersion: '0.1.0', createdAt: '2026-10-27T12:34:56.000Z', validationStatus: 'draft' }
})
afterEach(async () => { for (const close of cleanup.splice(0).reverse()) await close() })
async function setup(handler: (response: ServerResponse) => void = response => response.end(JSON.stringify(snapshot))) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'ombelle-input-'))
  cleanup.push(() => fs.rm(root, { recursive: true, force: true }))
  const requests: string[] = []
  const server = createServer((req, res) => { requests.push(req.url!); res.setHeader('Content-Type', 'application/json'); handler(res) })
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve))
  cleanup.push(async () => { server.closeAllConnections(); await new Promise<void>(resolve => server.close(() => resolve())) })
  const address = server.address() as { port: number }
  return { root, requests, options: { origin: `http://127.0.0.1:${address.port}`, expectedHash: snapshot.presetHash, cacheRoot: path.join(root, 'cache') } }
}
it('fetches the exact route once, verifies the normalized bytes, and creates no cache', async () => {
  const { requests, options, root } = await setup()
  const result = await resolvePresetInput(reference, options)
  expect(result).toEqual({ preset: snapshot.preset, snapshot, source: { origin: options.origin, reference, presetHash: snapshot.presetHash }, resolution: 'network', networkAccess: true })
  expect(requests).toEqual(['/api/v1/presets/ps_0123456789abcdef0123456789abcdef/1'])
  expect(await fs.readdir(root)).toEqual([])
})
it.each([
  ['redirect', (r: ServerResponse) => { r.writeHead(302, { Location: '/elsewhere' }); r.end() }],
  ['oversize chunked', (r: ServerResponse) => { r.write(' '.repeat(70_000)); r.end(' '.repeat(70_000)) }],
  ['wrong media type', (r: ServerResponse) => { r.setHeader('Content-Type', 'text/plain'); r.end(JSON.stringify(snapshot)) }],
  ['wrong charset', (r: ServerResponse) => { r.setHeader('Content-Type', 'application/json; charset=latin1'); r.end(JSON.stringify(snapshot)) }],
  ['invalid UTF-8', (r: ServerResponse) => r.end(Buffer.from([0xff]))],
  ['wrong JSON', (r: ServerResponse) => r.end('{')],
  ['extra envelope key', (r: ServerResponse) => r.end(JSON.stringify({ ...snapshot, extra: true }))],
  ['wrong reference', (r: ServerResponse) => r.end(JSON.stringify({ ...snapshot, id: 'ps_ffffffffffffffffffffffffffffffff' }))],
  ['wrong returned hash', (r: ServerResponse) => r.end(JSON.stringify({ ...snapshot, presetHash: 'f'.repeat(64) }))],
  ['tampered payload', (r: ServerResponse) => r.end(JSON.stringify({ ...snapshot, preset: { ...snapshot.preset, name: 'Changed content' } }))],
  ['unnormalized preset', (r: ServerResponse) => r.end(JSON.stringify({ ...snapshot, preset: getCatalog('0.1.0').presets.flat }))],
])('rejects %s as resolution failure without cache writes', async (_, handler) => {
  const { options, requests, root } = await setup(handler)
  await expect(resolvePresetInput(reference, options)).rejects.toMatchObject({ code: 'RESOLUTION_FAILURE' })
  expect(requests).toHaveLength(1)
  expect(await fs.readdir(root)).toEqual([])
})
it('enforces one ten-second deadline including a stalled body', async () => {
  // Spend six seconds waiting for headers, then stall the body. Resetting the
  // deadline when headers arrive would take sixteen seconds and fail this test.
  const { options } = await setup(r => { setTimeout(() => r.write('{'), 6_000) })
  const started = Date.now()
  await expect(resolvePresetInput(reference, options)).rejects.toMatchObject({ code: 'RESOLUTION_FAILURE', message: expect.stringMatching(/deadline/i) })
  expect(Date.now() - started).toBeLessThan(13_000)
}, 15_000)
it('classifies unsupported releases separately', async () => {
  const { options } = await setup(r => r.end(JSON.stringify({ ...snapshot, compilerVersion: '2.0.0', preset: { ...snapshot.preset, compilerVersion: '2.0.0' } })))
  await expect(resolvePresetInput(reference, options)).rejects.toMatchObject({ code: 'UNSUPPORTED_RELEASE' })
  let output = ''
  expect(await runCli(['init', '--preset', reference, '--snapshot-origin', options.origin, '--preset-hash', options.expectedHash, '--dry-run', '--json'], { stdout: text => { output += text }, stderr: text => { output += text } })).toBe(3)
  expect(JSON.parse(output).error.code).toBe('UNSUPPORTED_RELEASE')
})
it('rejects the wrong required hash even when the returned payload verifies itself', async () => {
  const { options } = await setup()
  await expect(resolvePresetInput(reference, { ...options, expectedHash: 'a'.repeat(64) })).rejects.toMatchObject({ code: 'RESOLUTION_FAILURE' })
})
it('keeps TLS certificate verification enabled even when the caller disables the global default', async () => {
  const { options } = await setup()
  const server = createHttpsServer({ key: await fs.readFile('tests/fixtures/snapshot-tls/key.pem'), cert: await fs.readFile('tests/fixtures/snapshot-tls/cert.pem') }, (_, response) => { response.setHeader('Content-Type', 'application/json'); response.end(JSON.stringify(snapshot)) })
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve))
  cleanup.push(async () => { server.closeAllConnections(); await new Promise<void>(resolve => server.close(() => resolve())) })
  const previous = process.env.NODE_TLS_REJECT_UNAUTHORIZED
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'
  try {
    await expect(resolvePresetInput(reference, { ...options, origin: `https://127.0.0.1:${(server.address() as { port: number }).port}` })).rejects.toMatchObject({ code: 'RESOLUTION_FAILURE', message: expect.stringMatching(/self-signed|certificate/i) })
  } finally {
    if (previous === undefined) delete process.env.NODE_TLS_REJECT_UNAUTHORIZED
    else process.env.NODE_TLS_REJECT_UNAUTHORIZED = previous
  }
})
it.each(['http://example.com', 'http://127.1', 'https://example.com/path', 'https://a:b@example.com', 'https://example.com?x=1', 'https://example.com/#x'])('rejects unsafe origin %s before fetching', async origin => {
  const { options, requests } = await setup()
  await expect(resolvePresetInput(reference, { ...options, origin })).rejects.toMatchObject({ code: 'INVALID_DATA' })
  expect(requests).toEqual([])
})
it.each([{ origin: undefined }, { expectedHash: undefined }, { expectedHash: 'F'.repeat(64) }])('requires both valid remote flags %#', async change => {
  const { options, requests } = await setup()
  await expect(resolvePresetInput(reference, { ...options, ...change })).rejects.toMatchObject({ code: 'INVALID_DATA' })
  expect(requests).toEqual([])
})
it.each(['ps_bad@1', 'ps_0123456789abcdef0123456789abcdef@2', 'https://example.com/preset'])('rejects malformed remote-looking input %s', async value => {
  const { options } = await setup()
  await expect(resolvePresetInput(value, { cacheRoot: options.cacheRoot })).rejects.toMatchObject({ code: 'INVALID_DATA' })
})
it('keeps path-prefixed code-like files local', async () => {
  const { root, options } = await setup()
  const file = path.join(root, reference)
  await fs.writeFile(file, JSON.stringify(snapshot.preset))
  expect(await resolvePresetInput(file, { cacheRoot: options.cacheRoot })).toEqual({ preset: snapshot.preset, resolution: 'local', networkAccess: false })
  await expect(resolvePresetInput(file, options)).rejects.toMatchObject({ code: 'INVALID_DATA' })
})
it('uses an explicit verified offline hit without requests and respects an authoritative online withdrawal', async () => {
  const { options, requests } = await setup(r => { r.statusCode = 410; r.end() })
  await writeSnapshotCache(options.cacheRoot, { origin: options.origin, reference, presetHash: options.expectedHash }, snapshot)
  const result = await resolvePresetInput(reference, { ...options, offline: true })
  expect(result.resolution).toBe('cache')
  expect(result.networkAccess).toBe(false)
  expect(requests).toEqual([])
  await expect(resolvePresetInput(reference, options)).rejects.toMatchObject({ code: 'RESOLUTION_FAILURE' })
  expect(requests).toHaveLength(1)
})
it('gives an actionable offline miss without requests or writes', async () => {
  const { options, requests, root } = await setup()
  await expect(resolvePresetInput(reference, { ...options, offline: true })).rejects.toMatchObject({ code: 'RESOLUTION_FAILURE', nextAction: expect.stringMatching(/online|without --offline/i) })
  expect(requests).toEqual([])
  expect(await fs.readdir(root)).toEqual([])
})
it('includes an actionable offline retry instruction in text resolution errors', async () => {
  const { options } = await setup()
  const previous = process.env.OMBELLE_SNAPSHOT_CACHE_DIR
  process.env.OMBELLE_SNAPSHOT_CACHE_DIR = options.cacheRoot
  try {
    let output = ''
    const code = await runCli(['init', '--preset', reference, '--snapshot-origin', options.origin, '--preset-hash', options.expectedHash, '--offline'], { stdout: text => { output += text }, stderr: text => { output += text } })
    expect(code, output).toBe(5)
    expect(output).toContain('without --offline')
  } finally {
    if (previous === undefined) delete process.env.OMBELLE_SNAPSHOT_CACHE_DIR
    else process.env.OMBELLE_SNAPSHOT_CACHE_DIR = previous
  }
})
it('keeps invalid cache configuration in resolution failures', async () => {
  const { options, requests } = await setup()
  await expect(resolvePresetInput(reference, { ...options, offline: true, cacheRoot: 'relative' })).rejects.toMatchObject({ code: 'RESOLUTION_FAILURE' })
  expect(requests).toEqual([])
})
it('validates snapshot flag syntax before reading unused cache configuration', async () => {
  const previous = process.env.OMBELLE_SNAPSHOT_CACHE_DIR
  process.env.OMBELLE_SNAPSHOT_CACHE_DIR = 'relative'
  try {
    for (const args of [['init', '--preset', 'local.json', '--offline'], ['init', '--preset', reference, '--offline']]) {
      let output = ''
      expect(await runCli([...args, '--json'], { stdout: text => { output += text }, stderr: text => { output += text } }), output).toBe(2)
      expect(JSON.parse(output).error.code).toBe('INVALID_DATA')
    }
  } finally {
    if (previous === undefined) delete process.env.OMBELLE_SNAPSHOT_CACHE_DIR
    else process.env.OMBELLE_SNAPSHOT_CACHE_DIR = previous
  }
})
it('refuses a corrupt offline envelope without attempting network repair', async () => {
  const { options, requests } = await setup()
  await writeSnapshotCache(options.cacheRoot, { origin: options.origin, reference, presetHash: options.expectedHash }, snapshot)
  const file = path.join(options.cacheRoot, (await fs.readdir(options.cacheRoot))[0])
  await fs.writeFile(file, '{')
  await expect(resolvePresetInput(reference, { ...options, offline: true })).rejects.toMatchObject({ code: 'RESOLUTION_FAILURE' })
  expect(requests).toEqual([])
  expect(await fs.readFile(file, 'utf8')).toBe('{')
})
it.each([
  ['init', '--preset', reference, '--snapshot-origin'],
  ['init', '--preset', reference, '--preset-hash'],
  ['init', '--preset', reference, '--offline', '--offline'],
].map(args => ({ args })))('rejects missing values and repeated remote flags %#', async ({ args }) => {
  let output = ''
  expect(await runCli([...args, '--json'], { stdout: text => { output += text }, stderr: text => { output += text } })).toBe(2)
  expect(JSON.parse(output).error.code).toBe('INVALID_DATA')
})
it('describes guarded snapshot inputs and offline withdrawal limitations in help', async () => {
  let output = ''
  expect(await runCli(['--help'], { stdout: text => { output += text }, stderr: text => { output += text } })).toBe(0)
  for (const fragment of ['init --preset <local.json>', 'add --recipe <local.json>', '--snapshot-origin', '--preset-hash', '--offline', 'withdrawals']) expect(output).toContain(fragment)
})
it('shows source and network/cache resolution without changing the compiler hash in either output format', async () => {
  const result = await compile({ preset: getCatalog('0.1.0').presets['neo-brutalism'], componentIds: [], catalogRelease: '0.1.0', compilerVersion: '0.1.0' })
  const plan: InstallPlan = { projectRoot: '/app', packageManager: 'pnpm', preconditions: {}, preset: result.preset, provenance: result.provenance, changes: [], managedDeclarations: [], dependencyPlan: [], diagnostics: [], networkAccess: true, presetResolution: { source: { origin: 'https://example.com', reference, presetHash: snapshot.presetHash }, via: 'network' } }
  const data = planOutput('add', 'planned', plan)
  expect(data.presetHash).toBe(result.preset.hash)
  expect(data.presetResolution?.source.presetHash).toBe(snapshot.presetHash)
  for (const via of ['network', 'cache'] as const) {
    plan.presetResolution!.via = via
    const text = formatPlan('add', 'planned', plan)
    for (const fragment of ['https://example.com', reference, snapshot.presetHash, via]) expect(text).toContain(fragment)
  }
})
it.each([
  ['add', 'button'], ['add', '--recipe', 'recipe.json'], ['init', '--preset', 'local.json'], ['theme', 'add', 'local.json'],
].map(args => ({ args })))('rejects remote flags on local, ordinary, and recipe command %# before inspecting a project', async ({ args }) => {
  for (const flags of [['--offline'], ['--snapshot-origin', 'https://example.com'], ['--preset-hash', 'a'.repeat(64)]]) {
    let output = ''
    const code = await runCli([...args, ...flags, '--cwd', '/missing-project', '--json'], { stdout: text => { output += text }, stderr: text => { output += text } })
    expect(code, output).toBe(2)
    expect(JSON.parse(output).error.message).toMatch(/snapshot|remote/i)
  }
})
