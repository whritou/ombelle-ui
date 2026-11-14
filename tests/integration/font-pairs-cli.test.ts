import { afterEach, expect, it } from 'vitest'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import type { FileChange } from '@ombelle/contracts'
import { createProject } from '../helpers/projects.js'
import { runBuiltCli, jsonRecord } from '../helpers/cli-runtime.js'

const roots: string[] = []
afterEach(async () => {
  for (const root of roots.splice(0))
    await fs.rm(root, { recursive: true, force: true })
})

const ombellePath = path.resolve('packages/catalog/src/presets/ombelle.json')
const flatPath = path.resolve('packages/catalog/src/presets/flat.json')
const fontPackages = {
  '@fontsource-variable/fraunces': '5.3.0',
  '@fontsource-variable/figtree': '5.3.0',
  '@fontsource-variable/inter': '5.3.0',
  '@fontsource-variable/jetbrains-mono': '5.3.0',
}

async function writePreset(dir: string, name: string, design: Record<string, string>, revision = 1) {
  const preset = JSON.parse(await fs.readFile(ombellePath, 'utf8'))
  preset.schemaVersion = '1.1'
  preset.revision = revision
  preset.design = { ...preset.design, ...design }
  const file = path.join(dir, name)
  await fs.writeFile(file, JSON.stringify(preset))
  return file
}

async function setup(seedFonts: boolean) {
  const root = await createProject('vite')
  roots.push(root)
  const presets = await fs.mkdtemp(path.join(os.tmpdir(), 'ombelle-font-presets-'))
  roots.push(presets)
  const trio = await writePreset(presets, 'trio.json', {
    fontFamilyId: 'inter',
    headingFontFamilyId: 'fraunces',
    monoFontFamilyId: 'jetbrains-mono',
  })
  const pair = await writePreset(
    presets,
    'pair.json',
    { fontFamilyId: 'figtree', headingFontFamilyId: 'fraunces' },
    2,
  )
  if (seedFonts) {
    const file = path.join(root, 'package.json')
    const pkg = JSON.parse(await fs.readFile(file, 'utf8'))
    Object.assign(pkg.dependencies, fontPackages)
    await fs.writeFile(file, JSON.stringify(pkg))
  }
  const command = (args: string[]) => runBuiltCli('node', [...args, '--cwd', root, '--json'], root)
  return { root, trio, pair, command }
}

const styleChange = (plan: Record<string, unknown>) =>
  (plan.changes as FileChange[]).find((change) => change.kind === 'style')!

it('plans pinned font dependencies for a font preset without writing anything', async () => {
  const { root, trio, command } = await setup(false)
  const before = await fs.readFile(path.join(root, 'package.json'), 'utf8')
  const dry = await command(['init', '--preset', trio, '--dry-run'])
  expect(dry.code, dry.output).toBe(0)
  const plan = jsonRecord(dry.data)
  expect(plan.dependencyPlan).toEqual([
    { name: '@fontsource-variable/fraunces', version: '5.3.0' },
    { name: '@fontsource-variable/inter', version: '5.3.0' },
    { name: '@fontsource-variable/jetbrains-mono', version: '5.3.0' },
  ])
  expect(styleChange(plan).afterContent.startsWith("@import '@fontsource-variable/fraunces';")).toBe(true)
  expect(await fs.readFile(path.join(root, 'package.json'), 'utf8')).toBe(before)
})

it('writes the font imports first in the installed style file and the font tokens in the global css', async () => {
  const { root, trio, command } = await setup(true)
  const applied = await command(['init', '--preset', trio, '--yes'])
  expect(applied.code, applied.output).toBe(0)
  const plan = jsonRecord(applied.data)
  expect(plan.status).toBe('success')
  expect(plan.dependencyPlan).toEqual([])
  const style = await fs.readFile(path.join(root, styleChange(plan).path), 'utf8')
  expect(style.startsWith("@import '@fontsource-variable/fraunces';")).toBe(true)
  for (const name of ['fraunces', 'inter', 'jetbrains-mono'])
    expect(style).toContain(`@import '@fontsource-variable/${name}';`)
  const css = await fs.readFile(path.join(root, 'src/index.css'), 'utf8')
  expect(css).toContain('--font-heading')
  expect(css).toContain('--font-mono')
})

it('plans no font dependency when the preset is applied again unchanged', async () => {
  const { trio, command } = await setup(true)
  expect((await command(['init', '--preset', trio, '--yes'])).code).toBe(0)
  const again = await command(['theme', 'add', trio, '--dry-run'])
  expect(again.code, again.output).toBe(0)
  const plan = jsonRecord(again.data)
  expect(plan.dependencyPlan).toEqual([])
  expect((plan.changes as FileChange[]).every((change) => change.action === 'noop')).toBe(true)
})

it('rewrites the imports for new fonts and leaves the old font package installed', async () => {
  const { root, trio, pair, command } = await setup(true)
  expect((await command(['init', '--preset', trio, '--yes'])).code).toBe(0)
  const switched = await command(['theme', 'add', pair, '--yes'])
  expect(switched.code, switched.output).toBe(0)
  const plan = jsonRecord(switched.data)
  const style = await fs.readFile(path.join(root, styleChange(plan).path), 'utf8')
  expect(style).toContain("@import '@fontsource-variable/figtree';")
  expect(style).toContain("@import '@fontsource-variable/fraunces';")
  expect(style).not.toContain('@fontsource-variable/inter')
  expect(style).not.toContain('@fontsource-variable/jetbrains-mono')
  const pkg = JSON.parse(await fs.readFile(path.join(root, 'package.json'), 'utf8'))
  expect(pkg.dependencies['@fontsource-variable/inter']).toBe('5.3.0')
})

it('plans no Fontsource dependency and imports nothing for a preset without fonts', async () => {
  const { flat, command } = await (async () => {
    const setupResult = await setup(false)
    return { flat: flatPath, command: setupResult.command }
  })()
  const dry = await command(['init', '--preset', flat, '--dry-run'])
  expect(dry.code, dry.output).toBe(0)
  const plan = jsonRecord(dry.data)
  expect(plan.dependencyPlan).toEqual([])
  expect(styleChange(plan).afterContent).not.toContain('@fontsource')
})
