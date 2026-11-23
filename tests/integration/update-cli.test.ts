// The 1.0 upgrade route (PUB-01, INS-05): a project installed by an earlier 0.x CLI holds managed files
// whose catalog bytes changed since. `update` (and `add` of the same component) refreshes the unedited
// ones, keeps edits the catalog did not touch, and conflicts only when both changed, until --overwrite.
import { afterEach, expect, it } from 'vitest'
import fs from 'node:fs/promises'
import path from 'node:path'
import { createHash } from 'node:crypto'
import { getCatalog } from '@ombelle/catalog'
import type { ProjectLock } from '@ombelle/contracts'
import { createProject } from '../helpers/projects.js'
import { runBuiltCli, jsonRecord } from '../helpers/cli-runtime.js'
import { snapshotTree } from '../helpers/tree.js'

const roots: string[] = []
const sha = (content: string) => createHash('sha256').update(content).digest('hex')
const preset = (name: string) => path.resolve('packages/catalog/src/presets', name + '.json')
afterEach(async () => {
  for (const root of roots.splice(0)) await fs.rm(root, { recursive: true, force: true })
})

async function project(ids: readonly ('meter' | 'input-otp' | 'button' | 'badge')[]) {
  const root = await createProject('vite')
  roots.push(root)
  const read = (file: string) => fs.readFile(path.join(root, file), 'utf8')
  const write = (file: string, content: string) => fs.writeFile(path.join(root, file), content)
  const command = (args: string[]) => runBuiltCli('node', [...args, '--cwd', root, '--json'], root)
  // Keeps the run offline: the declared dependencies are already in package.json.
  const pkg = JSON.parse(await read('package.json'))
  for (const id of ids)
    for (const dependency of getCatalog('0.1.0').templates[id].dependencies) pkg.dependencies[dependency.name] = dependency.version
  await write('package.json', JSON.stringify(pkg))
  expect((await command(['init', '--preset', preset('flat'), '--yes'])).code).toBe(0)
  const added = await command(['add', ...ids, '--yes'])
  expect(added.code, added.output).toBe(0)
  /** Rewrites a managed file as an earlier catalog installed it: other bytes, recorded in the lock. */
  const installedEarlier = async (file: string, old: string) => {
    await write(file, old)
    const lock: ProjectLock = JSON.parse(await read('ui-library.lock.json'))
    lock.artifacts[file] = { ...lock.artifacts[file]!, sha256: sha(old) }
    await write('ui-library.lock.json', JSON.stringify(lock))
  }
  return { root, read, write, command, installedEarlier }
}
const notices = (data: unknown) => (jsonRecord(data).notices as { code: string; message: string }[])

it('updates a 0.9.x install of Meter and Input OTP whose catalog source changed (INS-05)', async () => {
  const p = await project(['meter', 'input-otp'])
  const meter = 'src/components/ui/meter.tsx', otp = 'src/components/ui/input-otp.css'
  const current = { meter: await p.read(meter), otp: await p.read(otp) }
  // As 0.9.0 installed them: different bytes, never edited since (their hashes match the lock).
  await p.installedEarlier(meter, current.meter.replace('data-slot', 'data-old-slot') + '\n// 0.9.0\n')
  await p.installedEarlier(otp, current.otp + '\n/* 0.9.0 */\n')

  const info = await p.command(['info'])
  expect(info.code, info.output).toBe(0)
  expect(jsonRecord(info.data)).toMatchObject({ outputVersion: 1, command: 'info', initialized: true })
  const states = Object.fromEntries((jsonRecord(info.data).files as { path: string; state: string }[]).map((f) => [f.path, f.state]))
  expect(states[meter]).toBe('update-available')
  expect(states[otp]).toBe('update-available')

  const diff = await p.command(['diff', 'meter'])
  expect(diff.code, diff.output).toBe(0)
  const diffs = jsonRecord(diff.data).files as { path: string; state: string; diff: string }[]
  expect(diffs.map((f) => f.path)).toEqual([meter])
  expect(diffs[0]!.diff).toContain('-// 0.9.0')

  const before = await snapshotTree(p.root)
  // add of the installed component plans exactly what update plans for it.
  const add = await p.command(['add', 'meter', 'input-otp', '--dry-run'])
  expect(add.code, add.output).toBe(0)
  const dry = await p.command(['update', '--dry-run'])
  expect(dry.code, dry.output).toBe(0)
  expect(jsonRecord(dry.data)).toMatchObject({ outputVersion: 1, command: 'update', status: 'planned' })
  for (const plan of [add, dry]) {
    const changes = jsonRecord(plan.data).changes as { path: string; action: string }[]
    expect(changes.find((c) => c.path === meter)?.action).toBe('update')
    expect(changes.find((c) => c.path === otp)?.action).toBe('update')
    expect(notices(plan.data)).toEqual(expect.arrayContaining([
      { code: 'FILE_REFRESHED', message: 'refresh ' + meter + ' (unedited since install; the catalog source changed)' },
      { code: 'FILE_REFRESHED', message: 'refresh ' + otp + ' (unedited since install; the catalog source changed)' },
    ]))
  }
  expect(await snapshotTree(p.root)).toEqual(before)

  const applied = await p.command(['update', '--yes'])
  expect(applied.code, applied.output).toBe(0)
  expect(await p.read(meter)).toBe(current.meter)
  expect(await p.read(otp)).toBe(current.otp)
  const lock: ProjectLock = JSON.parse(await p.read('ui-library.lock.json'))
  expect(lock.artifacts[meter]!.sha256).toBe(sha(current.meter))
  const again = await p.command(['update', '--dry-run'])
  expect((jsonRecord(again.data).changes as { action: string }[]).every((c) => c.action === 'noop')).toBe(true)
}, 180000)

it('reports edited managed files as conflicts until --overwrite names them', async () => {
  const p = await project(['badge'])
  const badge = 'src/components/ui/badge.tsx', css = 'src/components/ui/badge.css'
  const catalogBadge = await p.read(badge), catalogCss = await p.read(css)
  // Edited after install; the catalog still produces what was installed.
  await fs.appendFile(path.join(p.root, badge), '\n// my change\n')
  // Edited after install, and the catalog changed since: the lock holds 0.9.0 bytes, the file other edits.
  await p.installedEarlier(css, catalogCss + '\n/* 0.9.0 */\n')
  await p.write(css, catalogCss + '\n/* 0.9.0 */\n/* my rule */\n')
  const before = await snapshotTree(p.root)

  const blocked = await p.command(['update', '--yes'])
  expect(blocked.code, blocked.output).toBe(4)
  const conflict = (file: string) => ({
    code: 'FILE_CONFLICT',
    path: file,
    message: file + ' was edited after install; keep your version, or rerun with --overwrite ' + file + ' to replace it with the catalog source (diff shows the changes)',
    resolutions: ['overwrite'],
  })
  expect(jsonRecord(blocked.data).warnings).toEqual([conflict(css), conflict(badge)])
  expect(await snapshotTree(p.root)).toEqual(before)
  const info = await p.command(['info'])
  const states = Object.fromEntries((jsonRecord(info.data).files as { path: string; state: string }[]).map((f) => [f.path, f.state]))
  expect(states).toMatchObject({ [badge]: 'edited', [css]: 'edited-update-available' })
  const doctor = await p.command(['doctor'])
  expect(doctor.code, doctor.output).toBe(0)
  expect(jsonRecord(doctor.data).checks).toEqual(expect.arrayContaining([
    expect.objectContaining({ id: 'file', status: 'warn', path: css }),
    expect.objectContaining({ id: 'file', status: 'warn', path: badge }),
  ]))

  // Naming one edited file leaves the other one's conflict in place, and writes nothing.
  const partial = await p.command(['update', '--overwrite', css, '--yes'])
  expect(partial.code, partial.output).toBe(4)
  expect(jsonRecord(partial.data).warnings).toEqual([conflict(badge)])
  const replaced = await p.command(['update', '--overwrite', css, '--overwrite', badge, '--yes'])
  expect(replaced.code, replaced.output).toBe(0)
  expect(await p.read(css)).toBe(catalogCss)
  expect(await p.read(badge)).toBe(catalogBadge)
  // --overwrite on an unedited managed file names nothing to resolve.
  const unneeded = await p.command(['update', '--overwrite', css, '--dry-run'])
  expect(unneeded.code, unneeded.output).toBe(2)
}, 180000)

it('refuses update of a component that is not installed and update before init', async () => {
  const p = await project(['badge'])
  const missing = await p.command(['update', 'meter', '--dry-run'])
  expect(missing.code, missing.output).toBe(2)
  expect(jsonRecord(jsonRecord(missing.data).error)).toMatchObject({ code: 'INVALID_DATA', message: 'Not installed: meter' })
  const fresh = await createProject('vite')
  roots.push(fresh)
  const uninitialized = await runBuiltCli('node', ['update', '--dry-run', '--cwd', fresh, '--json'], fresh)
  expect(uninitialized.code, uninitialized.output).toBe(3)
}, 120000)

it('preset apply restyles installed components with a new family; theme add and --only theme do not', async () => {
  const p = await project(['badge'])
  const css = 'src/components/ui/badge.css'
  const flatCss = await p.read(css)
  const before = await snapshotTree(p.root)
  // theme add refuses a family switch that would strand installed component styles.
  const themed = await p.command(['theme', 'add', preset('minimalist'), '--dry-run'])
  expect(themed.code, themed.output).toBe(2)
  const only = await p.command(['preset', 'apply', preset('minimalist'), '--only', 'theme', '--dry-run'])
  expect(only.code, only.output).toBe(2)
  expect(jsonRecord(jsonRecord(only.data).error).code).toBe(jsonRecord(jsonRecord(themed.data).error).code)

  const applied = await p.command(['preset', 'apply', preset('minimalist'), '--yes'])
  expect(applied.code, applied.output).toBe(0)
  expect(jsonRecord(applied.data)).toMatchObject({ outputVersion: 1, command: 'preset apply', status: 'success' })
  expect(await p.read(css)).not.toBe(flatCss)
  expect(JSON.parse(await p.read('ui-preset.json')).styleFamily).toBe('minimalist')
  const status = await p.command(['info'])
  expect(jsonRecord(status.data).summary).toMatchObject({ 'update-available': 0, edited: 0 })
  const show = await p.command(['preset', 'show'])
  expect(jsonRecord(show.data)).toMatchObject({ command: 'preset show', matchesLock: true, preset: { styleFamily: 'minimalist' } })
  expect(await snapshotTree(p.root)).not.toEqual(before)
}, 180000)
