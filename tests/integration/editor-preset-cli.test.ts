import { afterEach, expect, it } from 'vitest'
import fs from 'node:fs/promises'
import path from 'node:path'
import { createRequire } from 'node:module'
import {
  compile,
  canonicalize,
  sha256,
  rewriteModuleSpecifiers,
} from '@ombelle/compiler'
import { getCatalog } from '@ombelle/catalog'
import { supportedStyleFamilies } from '@ombelle/contracts'
import {
  createPresetDraft,
  setPresetEdit,
} from '../../apps/www/src/preset-editor/model.js'
import { handlePresetCompileMessage } from '../../apps/www/src/preset-editor/compile-protocol.js'
import { serializePresetExport } from '../../apps/www/src/preset-editor/export.js'
import { createProject } from '../helpers/projects.js'
import { runBuiltCli, jsonRecord } from '../helpers/cli-runtime.js'
import { snapshotTree } from '../helpers/tree.js'

const roots: string[] = []
afterEach(async () => {
  for (const root of roots.splice(0))
    await fs.rm(root, { recursive: true, force: true })
})
async function exported(family: (typeof supportedStyleFamilies)[number]) {
  let draft = createPresetDraft(family)
  for (const [key, value] of Object.entries({
    '/modes/light/background': '#f4f5f6',
    '/modes/light/foreground': '#112233',
    '/modes/dark/background': '#101820',
    '/modes/dark/foreground': '#fafafa',
    '/design/fontFamilyId': 'system-serif',
    '/design/density': 'compact',
    '/design/radiusRem': '1.25',
    '/design/borderWidthPx': '3',
    '/design/shadowOffsetXPx': '-4',
    '/design/shadowOffsetYPx': '8',
    '/design/motion': 'reduced',
  }))
    draft = setPresetEdit(
      draft,
      key as Parameters<typeof setPresetEdit>[1],
      value,
    )
  const response = await handlePresetCompileMessage({
    type: 'compile-preset',
    requestId: 1,
    draft,
  })
  if (response.type !== 'preset-compiled')
    throw new Error(response.diagnostic.message)
  const text = serializePresetExport(
    {
      status: 'compiled',
      result: response.result,
      draftKey: canonicalize(draft),
      stale: false,
      diagnostic: null,
    },
    draft,
  )
  return { text, result: response.result }
}
async function project(kind: 'vite' | 'next') {
  const root = await createProject(kind)
  roots.push(root)
  const file = path.join(root, 'package.json'),
    pkg = JSON.parse(await fs.readFile(file, 'utf8'))
  for (const template of Object.values(getCatalog('0.1.0').templates))
    for (const dep of template.dependencies)
      pkg.dependencies[dep.name] = dep.version
  await fs.writeFile(file, JSON.stringify(pkg))
  return root
}
for (const family of supportedStyleFamilies)
  for (const kind of ['vite', 'next'] as const) {
    it(`persists ${family} editor export across fresh ${kind} CLI additions`, async () => {
      const root = await project(kind),
        { text, result } = await exported(family)
      await fs.writeFile(path.join(root, 'project-preset.json'), text)
      const before = await snapshotTree(root)
      const dry = await runBuiltCli(
        'node',
        ['init', '--preset', './project-preset.json', '--dry-run', '--json'],
        root,
      )
      expect(dry.code, dry.output).toBe(0)
      expect(await snapshotTree(root)).toEqual(before)
      const init = await runBuiltCli(
        'node',
        ['init', '--preset', './project-preset.json', '--yes', '--json'],
        root,
      )
      expect(init.code, init.output).toBe(0)
      for (const id of ['button', 'input'] as const) {
        const installed = await runBuiltCli(
          'node',
          ['add', id, '--yes', '--json'],
          root,
        )
        expect(installed.code, installed.output).toBe(0)
        expect(jsonRecord(installed.data).presetHash).toBe(result.preset.hash)
        const compiled = await compile({
          preset: result.preset.data,
          componentIds: [id],
          catalogRelease: '0.1.0',
          compilerVersion: '0.1.0',
        })
        const artifact = compiled.artifacts.find((a) => a.kind === 'component')!
        const content = await rewriteModuleSpecifiers(
          artifact.content,
          (s) => s,
        )
        expect(
          await fs.readFile(
            path.join(root, 'src/components/ui/' + id + '.tsx'),
            'utf8',
          ),
        ).toBe(content)
        const lock = JSON.parse(
          await fs.readFile(path.join(root, 'ui-library.lock.json'), 'utf8'),
        )
        expect(lock.artifacts['src/components/ui/' + id + '.tsx'].sha256).toBe(
          await sha256(content),
        )
      }
      expect(
        JSON.parse(
          await fs.readFile(path.join(root, 'ui-preset.json'), 'utf8'),
        ),
      ).toEqual(result.preset.data)
    })
  }
for (const kind of ['vite', 'next'] as const)
  it(`merges downloaded theme into existing ${kind} without replacing source or unrelated CSS`, async () => {
    const root = await project(kind),
      { text, result } = await exported('minimalist')
    const source =
      '/* locally owned Button */\nexport const Button = () => null\n'
    await fs.mkdir(path.join(root, 'src/components/ui'), { recursive: true })
    await fs.writeFile(path.join(root, 'src/components/ui/button.tsx'), source)
    await fs.writeFile(path.join(root, 'project-preset.json'), text)
    const before = await snapshotTree(root)
    const dry = await runBuiltCli(
      'node',
      ['theme', 'add', './project-preset.json', '--dry-run', '--json'],
      root,
    )
    expect(dry.code, dry.output).toBe(0)
    expect(await snapshotTree(root)).toEqual(before)
    const applied = await runBuiltCli(
      'node',
      ['theme', 'add', './project-preset.json', '--yes', '--json'],
      root,
    )
    expect(applied.code, applied.output).toBe(0)
    expect(
      await fs.readFile(
        path.join(root, 'src/components/ui/button.tsx'),
        'utf8',
      ),
    ).toBe(source)
    const after = await snapshotTree(root)
    for (const file of ['components.json', 'package.json', 'pnpm-lock.yaml'])
      expect(after[file]).toBe(before[file])
    const css = await fs.readFile(path.join(root, 'src/index.css'), 'utf8')
    expect(css).toContain('--unrelated: 42')
    const postcss = createRequire(
      new URL('../../packages/cli/package.json', import.meta.url),
    )('postcss')
    const parsedCss = postcss.parse(css)
    const lock = JSON.parse(
      await fs.readFile(path.join(root, 'ui-library.lock.json'), 'utf8'),
    )
    for (const [selector, values] of [
      [':root', result.theme.light],
      ['.dark', result.theme.dark],
      ['@theme inline', result.theme.theme],
    ] as const) {
      for (const [property, value] of Object.entries(values)) {
        expect(lock.managedDeclarations).toContainEqual(
          expect.objectContaining({ selector, property, value }),
        )
        const found: string[] = []
        parsedCss.walkDecls(
          property,
          (declaration: {
            value: string
            parent: { selector?: string; name?: string; params?: string }
          }) => {
            const parent = declaration.parent
            if (
              parent.selector === selector ||
              (selector === '@theme inline' &&
                parent.name === 'theme' &&
                parent.params === 'inline')
            )
              found.push(declaration.value)
          },
        )
        expect(found).toEqual([value])
      }
    }
    const repeat = await runBuiltCli(
      'node',
      ['theme', 'add', './project-preset.json', '--yes', '--json'],
      root,
    )
    expect(repeat.code, repeat.output).toBe(0)
    expect(await snapshotTree(root)).toEqual(after)
    await fs.appendFile(
      path.join(root, 'src/styles/ui-style.css'),
      '\n/* modified */\n',
    )
    const conflict = await runBuiltCli(
      'node',
      ['theme', 'add', './project-preset.json', '--yes', '--json'],
      root,
    )
    expect(conflict.code, conflict.output).toBe(4)
  })
// The 0.3.0 minimalist output is pinned under tests/fixtures/minimalist-0.3.0:
// the preset and the exact ui-style.css bytes that catalog release shipped.
// A current build cannot emit those bytes, so a project is installed through
// the CLI with the legacy preset and its style file and lock record are then
// set back to the shipped bytes.
async function legacyMinimalistProject(kind: 'vite' | 'next') {
  const root = await project(kind),
    legacy = path.resolve('tests/fixtures/minimalist-0.3.0')
  await fs.writeFile(
    path.join(root, 'project-preset.json'),
    await fs.readFile(path.join(legacy, 'preset.json')),
  )
  const init = await runBuiltCli(
    'node',
    ['init', '--preset', './project-preset.json', '--yes', '--json'],
    root,
  )
  expect(init.code, init.output).toBe(0)
  const added = await runBuiltCli(
    'node',
    ['add', 'input', '--yes', '--json'],
    root,
  )
  expect(added.code, added.output).toBe(0)
  const style = await fs.readFile(path.join(legacy, 'ui-style.css'), 'utf8')
  await fs.writeFile(path.join(root, 'src/styles/ui-style.css'), style)
  const lockFile = path.join(root, 'ui-library.lock.json'),
    lock = JSON.parse(await fs.readFile(lockFile, 'utf8'))
  lock.artifacts['src/styles/ui-style.css'].sha256 = await sha256(style)
  await fs.writeFile(lockFile, JSON.stringify(lock))
  await fs.writeFile(
    path.join(root, 'refreshed-preset.json'),
    JSON.stringify(getCatalog('0.1.0').presets.minimalist),
  )
  return root
}
for (const kind of ['vite', 'next'] as const) {
  it(`plans the refreshed minimalist theme as an update over ${kind} files installed from 0.3.0 output`, async () => {
    const root = await legacyMinimalistProject(kind),
      before = await snapshotTree(root)
    const dry = await runBuiltCli(
      'node',
      ['theme', 'add', './refreshed-preset.json', '--dry-run', '--json'],
      root,
    )
    expect(dry.code, dry.output).toBe(0)
    expect(await snapshotTree(root)).toEqual(before)
    const changes = (jsonRecord(dry.data).changes ?? []) as {
      path: string
      action: string
    }[]
    expect(changes.find((c) => c.path === 'src/styles/ui-style.css')?.action).toBe('update')
    const applied = await runBuiltCli(
      'node',
      ['theme', 'add', './refreshed-preset.json', '--yes', '--json'],
      root,
    )
    expect(applied.code, applied.output).toBe(0)
    const refreshed = await compile({
      preset: getCatalog('0.1.0').presets.minimalist,
      componentIds: ['input'],
      catalogRelease: '0.1.0',
      compilerVersion: '0.1.0',
    })
    expect(
      await fs.readFile(path.join(root, 'src/styles/ui-style.css'), 'utf8'),
    ).toBe(refreshed.artifacts.find((a) => a.logicalPath === 'styles/ui-style.css')!.content)
  })
  it(`keeps a hand-modified input.tsx untouched in ${kind} and still reports it as a conflict when re-added`, async () => {
    const root = await legacyMinimalistProject(kind),
      input = path.join(root, 'src/components/ui/input.tsx')
    await fs.appendFile(input, '\n// locally edited\n')
    const edited = await fs.readFile(input, 'utf8')
    // theme add plans only tokens and ui-style.css: local component source stays.
    const theme = await runBuiltCli(
      'node',
      ['theme', 'add', './refreshed-preset.json', '--yes', '--json'],
      root,
    )
    expect(theme.code, theme.output).toBe(0)
    expect(await fs.readFile(input, 'utf8')).toBe(edited)
    const before = await snapshotTree(root)
    const conflict = await runBuiltCli(
      'node',
      ['add', 'input', '--yes', '--json'],
      root,
    )
    expect(conflict.code, conflict.output).toBe(4)
    expect(await snapshotTree(root)).toEqual(before)
  })
}
