import { afterEach, expect, it } from 'vitest'
import fs from 'node:fs/promises'
import path from 'node:path'
import { runBuiltCli, jsonRecord } from '../helpers/cli-runtime.js'
import { snapshotTree } from '../helpers/tree.js'
import { createShadcnProject } from '../helpers/shadcn-project.js'
const roots: string[] = []
afterEach(async () => {
  for (const root of roots.splice(0))
    await fs.rm(root, { recursive: true, force: true })
})
const preset = path.resolve('packages/catalog/src/presets/flat.json')
const button = 'components/ui/button.tsx'
type Change = { path: string; action: string }
// The Next fixture pins React exactly and needs no package.json edit.
async function themed() {
  const root = await createShadcnProject('next')
  roots.push(root)
  const theme = await runBuiltCli('node', ['theme', 'add', preset, '--yes', '--json'], root)
  expect(theme.code, theme.output).toBe(0)
  return root
}
const add = (root: string, ...args: string[]) =>
  runBuiltCli('node', ['add', 'button', ...args, '--json'], root)

it('stops on shadcn button.tsx and names both resolutions', async () => {
  const root = await themed()
  const before = await snapshotTree(root)
  const result = await add(root, '--yes')
  expect(result.code, result.output).toBe(4)
  expect(result.output).toContain('--overwrite ' + button)
  expect(result.output).toContain('--beside ' + button)
  expect(await snapshotTree(root)).toEqual(before)
}, 180000)

it('overwrites with --overwrite', async () => {
  const root = await themed()
  const original = await fs.readFile(path.join(root, button), 'utf8')
  const result = await add(root, '--overwrite', button, '--yes', '--package-manager', 'pnpm', '--dry-run')
  expect(result.code, result.output).toBe(0)
  const plan = jsonRecord(result.data)
  expect((plan.changes as Change[]).find((c) => c.path === button)!.action).toBe('update')
  expect(await fs.readFile(path.join(root, button), 'utf8')).toBe(original)
}, 180000)

it('installs beside with a differently cased path and shows it in a dry run', async () => {
  const root = await themed()
  // The runner's shell strips backslashes; resolution-key tests cover them.
  const given = 'Components/UI/Button.tsx'
  const result = await add(root, '--beside', given, '--dry-run')
  expect(result.code, result.output).toBe(0)
  const plan = jsonRecord(result.data)
  expect((plan.changes as Change[]).find((c) => c.path === 'components/ui/ombelle/button.tsx')!.action).toBe('create')
  expect((plan.changes as Change[]).some((c) => c.path === button)).toBe(false)
}, 180000)

it('rejects resolutions that do not match an unowned file', async () => {
  const root = await themed()
  const missing = await add(root, '--overwrite', 'components/ui/missing.tsx', '--dry-run')
  expect(missing.code, missing.output).not.toBe(0)
  expect(missing.output).toContain('INVALID_DATA')
  const both = await add(root, '--overwrite', button, '--beside', button, '--dry-run')
  expect(both.output).toContain('INVALID_DATA')
}, 180000)

it('rejects resolution flags outside add', async () => {
  const root = await themed()
  const result = await runBuiltCli('node', ['theme', 'add', preset, '--overwrite', button, '--json'], root)
  expect(result.output).toContain('INVALID_DATA')
}, 180000)
