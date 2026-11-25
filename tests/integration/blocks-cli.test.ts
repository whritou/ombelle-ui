// `add <block>` (blocks spec, CLI): a block installs with the components it needs, in one plan, as managed
// files beside the `ui` folder. Its only difference from `add <component>`: a component Ombelle installed
// and the user edited is kept when only a block needs it. `update`, `doctor` and `diff` treat block files
// like other managed files.
import { afterEach, expect, it } from 'vitest'
import fs from 'node:fs/promises'
import path from 'node:path'
import { createHash } from 'node:crypto'
import { blockManifest, getCatalog } from '@ombelle/catalog'
import type { ProjectLock } from '@ombelle/contracts'
import { createProject } from '../helpers/projects.js'
import { runBuiltCli, jsonRecord } from '../helpers/cli-runtime.js'
import { snapshotTree } from '../helpers/tree.js'
import { runCli } from '../../packages/cli/src/main.js'

const roots: string[] = []
const sha = (content: string) => createHash('sha256').update(content).digest('hex')
const preset = path.resolve('packages/catalog/src/presets/flat.json')
const ui = (id: string) => 'src/components/ui/' + id + '.tsx'
const block = 'src/components/blocks/login-01.tsx', blockCss = 'src/components/blocks/login-01.css'
afterEach(async () => {
  for (const root of roots.splice(0)) await fs.rm(root, { recursive: true, force: true })
})

type Change = { path: string; action: string }
type Warning = { code: string; path?: string; message: string; resolutions?: string[] }
const changes = (data: unknown) => jsonRecord(data).changes as Change[]
const warnings = (data: unknown) => jsonRecord(data).warnings as Warning[]
const notices = (data: unknown) => jsonRecord(data).notices as { code: string; message: string }[]

async function project() {
  const root = await createProject('vite')
  roots.push(root)
  const read = (file: string) => fs.readFile(path.join(root, file), 'utf8')
  const write = async (file: string, content: string) => {
    await fs.mkdir(path.dirname(path.join(root, file)), { recursive: true })
    await fs.writeFile(path.join(root, file), content)
  }
  const command = (args: string[]) => runBuiltCli('node', [...args, '--cwd', root, '--json'], root)
  // Keeps the runs offline: every dependency a block's components declare is already in package.json.
  const pkg = JSON.parse(await read('package.json'))
  const ids = new Set(Object.values(blockManifest).flatMap((meta) => meta.components))
  for (const id of ids)
    for (const dependency of getCatalog('0.1.0').templates[id].dependencies) pkg.dependencies[dependency.name] = dependency.version
  await write('package.json', JSON.stringify(pkg))
  const init = await command(['init', '--preset', preset, '--yes'])
  expect(init.code, init.output).toBe(0)
  /** Rewrites a managed file as an earlier catalog installed it: other bytes, recorded in the lock. */
  const installedEarlier = async (file: string, old: string) => {
    await write(file, old)
    const lock: ProjectLock = JSON.parse(await read('ui-library.lock.json'))
    lock.artifacts[file] = { ...lock.artifacts[file]!, sha256: sha(old) }
    await write('ui-library.lock.json', JSON.stringify(lock))
  }
  return { root, read, write, command, installedEarlier }
}

it('installs a block and its components once, then plans only noops (fresh add, idempotent, dry run)', async () => {
  const p = await project()
  const before = await snapshotTree(p.root)
  const dry = await p.command(['add', 'login-01', '--dry-run'])
  expect(dry.code, dry.output).toBe(0)
  expect(jsonRecord(dry.data).status).toBe('planned')
  expect(await snapshotTree(p.root)).toEqual(before)

  const added = await p.command(['add', 'login-01', '--yes'])
  expect(added.code, added.output).toBe(0)
  expect(changes(added.data)).toEqual(expect.arrayContaining([block, blockCss].map((file) =>
    expect.objectContaining({ path: file, action: 'create', kind: 'block' }))))
  for (const file of [block, blockCss]) await expect(p.read(file)).resolves.toBeTruthy()
  expect(blockManifest['login-01'].components).toHaveLength(9)
  for (const id of blockManifest['login-01'].components) await expect(p.read(ui(id))).resolves.toBeTruthy()
  const lockText = await p.read('ui-library.lock.json')
  const lock = JSON.parse(lockText)
  expect(lock.lockVersion).toBe(1)
  expect(lock).not.toHaveProperty('blocks')
  expect(lock.artifacts[block]).toEqual({ logicalPath: 'blocks/login-01.tsx', kind: 'block', sha256: sha(await p.read(block)) })
  expect(lock.artifacts[blockCss]).toEqual({ logicalPath: 'blocks/login-01.css', kind: 'block', sha256: sha(await p.read(blockCss)) })

  const again = await p.command(['add', 'login-01', '--yes'])
  expect(again.code, again.output).toBe(0)
  expect(changes(again.data).every((c) => c.action === 'noop'), JSON.stringify(changes(again.data).filter((c) => c.action !== 'noop'))).toBe(true)
  expect(await p.read('ui-library.lock.json')).toBe(lockText)
}, 180000)

it('keeps an edited component only a block needs, and conflicts when the command names it', async () => {
  const p = await project()
  const button = ui('button')
  expect((await p.command(['add', 'button', '--yes'])).code).toBe(0)
  const edited = (await p.read(button)) + '\n// my change\n'
  await p.write(button, edited)
  const record = JSON.parse(await p.read('ui-library.lock.json')).artifacts[button]

  // Named on the command line, the edited button conflicts as add button would.
  const before = await snapshotTree(p.root)
  const named = await p.command(['add', 'button', 'login-01', '--yes'])
  expect(named.code, named.output).toBe(4)
  expect(warnings(named.data)).toEqual([expect.objectContaining({ code: 'FILE_CONFLICT', path: button, resolutions: ['overwrite'] })])
  expect(await snapshotTree(p.root)).toEqual(before)

  const added = await p.command(['add', 'login-01', '--yes'])
  expect(added.code, added.output).toBe(0)
  expect(await p.read(button)).toBe(edited)
  expect(changes(added.data).find((c) => c.path === button)?.action).toBe('noop')
  expect(notices(added.data)).toContainEqual({
    code: 'BLOCK_COMPONENT_EDITED',
    message: button + ' was edited after install; login-01 uses it as is',
  })
  const lock = JSON.parse(await p.read('ui-library.lock.json'))
  expect(lock.artifacts[button]).toEqual(record)
  await expect(p.read(block)).resolves.toBeTruthy()
}, 180000)

it('stops at a foreign component file until --beside or --overwrite names it', async () => {
  const p = await project()
  const button = ui('button')
  const foreign = 'export function Button() { return <button /> }\n'
  await p.write(button, foreign)
  const before = await snapshotTree(p.root)
  const blocked = await p.command(['add', 'login-01', '--yes'])
  expect(blocked.code, blocked.output).toBe(4)
  expect(warnings(blocked.data)).toEqual([expect.objectContaining({ code: 'FILE_CONFLICT', path: button, resolutions: ['overwrite', 'beside'] })])
  expect(await snapshotTree(p.root)).toEqual(before)

  const beside = await p.command(['add', 'login-01', '--beside', button, '--yes'])
  expect(beside.code, beside.output).toBe(0)
  expect(await p.read(button)).toBe(foreign)
  await expect(p.read('src/components/ui/ombelle/button.tsx')).resolves.toBeTruthy()
  const source = await p.read(block)
  expect(source).toContain("from '@/components/ui/ombelle/button'")
  expect(source).not.toContain("from '@/components/ui/button'")
  expect(source).toContain("from '@/components/ui/card'")
}, 180000)

it('treats block files as managed files: refresh when unedited, conflict when edited, --overwrite replaces', async () => {
  const p = await project()
  expect((await p.command(['add', 'login-01', '--yes'])).code).toBe(0)
  const current = await p.read(block)

  // Edited after install: add conflicts, offering --overwrite.
  await p.write(block, current + '\n// my change\n')
  const before = await snapshotTree(p.root)
  const edited = await p.command(['add', 'login-01', '--yes'])
  expect(edited.code, edited.output).toBe(4)
  expect(warnings(edited.data)).toEqual([expect.objectContaining({ code: 'FILE_CONFLICT', path: block, resolutions: ['overwrite'] })])
  expect(warnings(edited.data)[0]!.message).toContain('--overwrite ' + block)
  expect(await snapshotTree(p.root)).toEqual(before)

  // Installed by an earlier catalog and never edited: refreshed.
  await p.installedEarlier(block, current + '\n// earlier catalog\n')
  const refreshed = await p.command(['add', 'login-01', '--dry-run'])
  expect(refreshed.code, refreshed.output).toBe(0)
  expect(changes(refreshed.data).find((c) => c.path === block)?.action).toBe('update')
  expect(notices(refreshed.data)).toContainEqual(expect.objectContaining({ code: 'FILE_REFRESHED' }))

  // Installed by an earlier catalog and edited since: a conflict until --overwrite.
  await p.write(block, current + '\n// earlier catalog\n// my change\n')
  const stale = await p.command(['add', 'login-01', '--yes'])
  expect(stale.code, stale.output).toBe(4)
  expect(warnings(stale.data)).toEqual([expect.objectContaining({ code: 'FILE_CONFLICT', path: block, resolutions: ['overwrite'] })])
  const replaced = await p.command(['add', 'login-01', '--overwrite', block, '--yes'])
  expect(replaced.code, replaced.output).toBe(0)
  expect(await p.read(block)).toBe(current)
  expect(JSON.parse(await p.read('ui-library.lock.json')).artifacts[block].sha256).toBe(sha(current))
}, 180000)

it('installs components and blocks together, and refuses unknown ids and --beside on block files', async () => {
  const p = await project()
  const unknown = await p.command(['add', 'login-1', '--yes'])
  expect(unknown.code, unknown.output).toBe(2)
  expect(jsonRecord(jsonRecord(unknown.data).error).code).toBe('UNKNOWN_COMPONENT')

  const before = await snapshotTree(p.root)
  const besideBlock = await p.command(['add', 'login-01', '--beside', block, '--yes'])
  expect(besideBlock.code, besideBlock.output).toBe(2)
  expect(jsonRecord(jsonRecord(besideBlock.data).error)).toMatchObject({
    code: 'INVALID_DATA',
    message: '--beside applies to component files, not block files',
  })
  expect(await snapshotTree(p.root)).toEqual(before)

  const mixed = await p.command(['add', 'badge', 'pricing-01', '--yes'])
  expect(mixed.code, mixed.output).toBe(0)
  for (const file of [ui('badge'), ui('toggle-group'), 'src/components/blocks/pricing-01.tsx', 'src/components/blocks/pricing-01.css'])
    await expect(p.read(file)).resolves.toBeTruthy()
}, 180000)

it('update refreshes an unedited block file the catalog changed, and update with no operands plans block files', async () => {
  const p = await project()
  expect((await p.command(['add', 'login-01', '--yes'])).code).toBe(0)
  const current = await p.read(block)
  await p.installedEarlier(block, current + '\n// earlier catalog\n')

  const all = await p.command(['update', '--dry-run'])
  expect(all.code, all.output).toBe(0)
  expect(changes(all.data).find((c) => c.path === block)?.action).toBe('update')
  expect(changes(all.data).find((c) => c.path === blockCss)?.action).toBe('noop')

  const refreshed = await p.command(['update', 'login-01', '--yes'])
  expect(refreshed.code, refreshed.output).toBe(0)
  expect(notices(refreshed.data)).toContainEqual({ code: 'FILE_REFRESHED', message: 'refresh ' + block + ' (unedited since install; the catalog source changed)' })
  expect(await p.read(block)).toBe(current)
  expect(JSON.parse(await p.read('ui-library.lock.json')).artifacts[block].sha256).toBe(sha(current))

  const notInstalled = await p.command(['update', 'pricing-01', '--yes'])
  expect(notInstalled.code, notInstalled.output).toBe(2)
  expect(jsonRecord(jsonRecord(notInstalled.data).error)).toMatchObject({ code: 'INVALID_DATA', message: 'Not installed: pricing-01' })
}, 180000)

it('update <block> conflicts on an edited block file until --overwrite, and keeps an edited component only the block needs', async () => {
  const p = await project()
  expect((await p.command(['add', 'login-01', '--yes'])).code).toBe(0)
  const current = await p.read(block)
  const button = ui('button')
  const editedButton = (await p.read(button)) + '\n// my change\n'
  await p.write(button, editedButton)

  // Only the block needs the button: update login-01 keeps the edit, with a notice.
  const kept = await p.command(['update', 'login-01', '--yes'])
  expect(kept.code, kept.output).toBe(0)
  expect(changes(kept.data).find((c) => c.path === button)?.action).toBe('noop')
  expect(notices(kept.data)).toContainEqual({ code: 'BLOCK_COMPONENT_EDITED', message: button + ' was edited after install; login-01 uses it as is' })
  expect(await p.read(button)).toBe(editedButton)

  // Named on the command line, the edited button conflicts as update button would.
  const named = await p.command(['update', 'button', 'login-01', '--yes'])
  expect(named.code, named.output).toBe(4)
  expect(warnings(named.data)).toEqual([expect.objectContaining({ code: 'FILE_CONFLICT', path: button, resolutions: ['overwrite'] })])

  // The block file edited after install conflicts, as every managed file does.
  await p.write(block, current + '\n// my change\n')
  const before = await snapshotTree(p.root)
  const edited = await p.command(['update', 'login-01', '--yes'])
  expect(edited.code, edited.output).toBe(4)
  expect(warnings(edited.data)).toEqual([expect.objectContaining({ code: 'FILE_CONFLICT', path: block, resolutions: ['overwrite'] })])
  expect(warnings(edited.data)[0]!.message).toContain('--overwrite ' + block)
  expect(await snapshotTree(p.root)).toEqual(before)

  // Installed by an earlier catalog and edited since: still a conflict, until --overwrite replaces it.
  await p.installedEarlier(block, current + '\n// earlier catalog\n')
  await p.write(block, current + '\n// earlier catalog\n// my change\n')
  const stale = await p.command(['update', 'login-01', '--yes'])
  expect(stale.code, stale.output).toBe(4)
  expect(warnings(stale.data)).toEqual([expect.objectContaining({ code: 'FILE_CONFLICT', path: block, resolutions: ['overwrite'] })])
  const replaced = await p.command(['update', 'login-01', '--overwrite', block, '--yes'])
  expect(replaced.code, replaced.output).toBe(0)
  expect(await p.read(block)).toBe(current)
  expect(await p.read(button)).toBe(editedButton)
}, 180000)

it('doctor warns about a missing block component, update <block> recreates it, and diff lists block files', async () => {
  const p = await project()
  expect((await p.command(['add', 'login-01', '--yes'])).code).toBe(0)
  const card = ui('card')
  const cardSource = await p.read(card)
  const lock: ProjectLock = JSON.parse(await p.read('ui-library.lock.json'))
  for (const file of Object.keys(lock.artifacts))
    if (/^src\/components\/ui\/card\.(tsx|css)$/.test(file)) {
      delete lock.artifacts[file]
      await fs.rm(path.join(p.root, file))
    }
  await p.write('ui-library.lock.json', JSON.stringify(lock))

  const doctor = await p.command(['doctor'])
  expect(doctor.code, doctor.output).toBe(0)
  expect(jsonRecord(doctor.data).status).toBe('success')
  expect(jsonRecord(doctor.data).checks).toContainEqual({
    id: 'blocks',
    status: 'warn',
    code: 'BLOCK_COMPONENT_MISSING',
    message: 'login-01 needs card; run ombelle add login-01',
    nextAction: 'Run ombelle add login-01 or ombelle update login-01.',
  })
  let text = ''
  expect(await runCli(['doctor', '--cwd', p.root], { stdout: (t) => { text += t }, stderr: () => {} })).toBe(0)
  expect(text).toContain('warn blocks: login-01 needs card; run ombelle add login-01\n  Next: Run ombelle add login-01 or ombelle update login-01.')

  const recreated = await p.command(['update', 'login-01', '--yes'])
  expect(recreated.code, recreated.output).toBe(0)
  expect(changes(recreated.data).find((c) => c.path === card)?.action).toBe('create')
  expect(await p.read(card)).toBe(cardSource)
  expect(JSON.parse(await p.read('ui-library.lock.json')).artifacts[card]).toMatchObject({ logicalPath: 'components/ui/card.tsx', sha256: sha(cardSource) })
  const healthy = await p.command(['doctor'])
  expect(jsonRecord(healthy.data).checks).toContainEqual(expect.objectContaining({ id: 'blocks', status: 'pass' }))

  await p.write(block, (await p.read(block)) + '\n// my change\n')
  for (const args of [['diff'], ['diff', 'login-01']]) {
    const diff = await p.command(args)
    expect(diff.code, diff.output).toBe(0)
    const files = jsonRecord(diff.data).files as { path: string; owner: string; state: string; diff: string }[]
    expect(files.map((f) => f.path), args.join(' ')).toEqual([block])
    expect(files[0]).toMatchObject({ owner: 'login-01', state: 'edited' })
    expect(files[0]!.diff).toContain('-// my change')
  }
  const info = await p.command(['info'])
  const states = Object.fromEntries((jsonRecord(info.data).files as { path: string; owner: string; state: string }[]).map((f) => [f.path, f.owner + ' ' + f.state]))
  expect(states).toMatchObject({ [block]: 'login-01 edited', [blockCss]: 'login-01 current' })
}, 180000)
