import { afterEach, expect, it, vi } from 'vitest'
import fs from 'node:fs/promises'
import path from 'node:path'
import { compile } from '@ombelle/compiler'
import {
  createShadcnProject,
  shadcnFixtures,
  type ShadcnFixture,
} from '../helpers/shadcn-project.js'
import { runBuiltCli, jsonRecord } from '../helpers/cli-runtime.js'
import { snapshotTree } from '../helpers/tree.js'
import { inspectProject } from '../../packages/cli/src/project/inspect.js'
import { planAdd } from '../../packages/cli/src/plan/components.js'
import { applyPlan } from '../../packages/cli/src/apply/transaction.js'

const roots: string[] = []
afterEach(async () => {
  for (const root of roots.splice(0))
    await fs.rm(root, { recursive: true, force: true })
})
const preset = path.resolve('packages/catalog/src/presets/minimalist.json')
type Change = { path: string; action: string }

// Top-level blocks of a shadcn stylesheet hold declarations only, no nesting.
function blocks(css: string, selector: ':root' | '.dark' | '@theme inline') {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return [...css.matchAll(new RegExp('^' + escaped + '\\s*\\{([^}]*)\\}', 'gm'))]
    .map((m) => m[1]!)
}
function properties(block: string) {
  return [...block.matchAll(/^\s*(--[\w-]+)\s*:\s*([^;]+);/gm)].map(
    ([, name, value]) => ({ name: name!, value: value!.trim() }),
  )
}
function value(block: string, name: string) {
  return properties(block).find((p) => p.name === name)?.value
}
// Everything outside the three token blocks belongs to the app.
function unrelated(css: string) {
  return css
    .replace(/^(?::root|\.dark|@theme inline)\s*\{[^}]*\}/gm, '')
    .replace(/^@import "[^"]*ui-style\.css";\n/m, '')
    .replace(/\n{2,}/g, '\n')
    .trim()
}

it.each(['vite', 'next'] as const)(
  'merges a theme into a genuine shadcn init %s project without Ombelle init',
  async (kind: ShadcnFixture) => {
    const root = await createShadcnProject(kind)
    roots.push(root)
    const { css, source } = shadcnFixtures[kind]
    const original = await fs.readFile(path.join(root, css), 'utf8')
    for (const selector of [':root', '.dark', '@theme inline'] as const)
      expect(blocks(original, selector)).toHaveLength(1)

    if (kind === 'vite') {
      // The Vite template declares react ^19.3.1; the documented foundation
      // baseline rejects ranges before any write.
      const pristine = await snapshotTree(root)
      const rejected = await runBuiltCli(
        'node',
        ['theme', 'add', preset, '--dry-run', '--json'],
        root,
      )
      expect(rejected.code, rejected.output).toBe(3)
      expect(jsonRecord(jsonRecord(rejected.data).error).message).toMatch(
        /exact react and react-dom 19\.3\.1/,
      )
      expect(await snapshotTree(root)).toEqual(pristine)
      const file = path.join(root, 'package.json')
      const pkg = JSON.parse(await fs.readFile(file, 'utf8'))
      pkg.dependencies.react = pkg.dependencies['react-dom'] = '19.3.1'
      await fs.writeFile(file, JSON.stringify(pkg, null, 2) + '\n')
    }

    const before = await snapshotTree(root)
    const dry = await runBuiltCli(
      'node',
      ['theme', 'add', preset, '--dry-run', '--json'],
      root,
    )
    expect(dry.code, dry.output).toBe(0)
    expect(await snapshotTree(root)).toEqual(before)

    const theme = await runBuiltCli(
      'node',
      ['theme', 'add', preset, '--yes', '--json'],
      root,
    )
    expect(theme.code, theme.output).toBe(0)
    const themed = jsonRecord(theme.data)
    expect(themed.packageManager).toBe('pnpm')
    expect(themed.dependencyPlan).toEqual([])

    // Only the stylesheet changes; components.json, manifests, the lockfile,
    // pnpm settings and every source file stay byte-identical.
    const after = await snapshotTree(root)
    const styleFile = path.posix.join(source, 'styles/ui-style.css')
    for (const [file, hash] of Object.entries(before))
      if (file !== css) expect(after[file], file).toBe(hash)
    expect(
      Object.keys(after).filter((file) => !(file in before)).sort(),
    ).toEqual(
      [
        styleFile,
        'ui-library.config.json',
        'ui-library.lock.json',
        'ui-preset.json',
      ].sort(),
    )

    const merged = await fs.readFile(path.join(root, css), 'utf8')
    const generated = await fs.readFile(path.join(root, styleFile), 'utf8')
    for (const selector of [':root', '.dark', '@theme inline'] as const) {
      expect(blocks(merged, selector), selector).toHaveLength(1)
      expect(blocks(generated, selector), selector).toHaveLength(0)
      const names = properties(blocks(merged, selector)[0]!).map((p) => p.name)
      expect(new Set(names).size, selector).toBe(names.length)
      // shadcn tokens Ombelle does not own (sidebar, chart, radius scale) stay.
      for (const kept of properties(blocks(original, selector)[0]!))
        expect(names, selector).toContain(kept.name)
    }
    expect(unrelated(merged)).toBe(unrelated(original))
    const modes = JSON.parse(await fs.readFile(preset, 'utf8')).modes
    const light = blocks(merged, ':root')[0]!,
      dark = blocks(merged, '.dark')[0]!
    expect(value(light, '--background')).toBe(modes.light.background.toLowerCase())
    expect(value(dark, '--background')).toBe(modes.dark.background.toLowerCase())
    expect(value(light, '--sidebar')).toBe(
      value(blocks(original, ':root')[0]!, '--sidebar'),
    )

    const repeated = await runBuiltCli(
      'node',
      ['theme', 'add', preset, '--yes', '--json'],
      root,
    )
    expect(repeated.code, repeated.output).toBe(0)
    expect(
      (jsonRecord(repeated.data).changes as Change[]).every(
        (c) => c.action === 'noop',
      ),
    ).toBe(true)
    expect(await snapshotTree(root)).toEqual(after)

    // shadcn's own button.tsx and lib/utils.ts are app-owned source. A later
    // add plans the saved preset but must not overwrite the existing utility.
    const utils = path.posix.join(source, 'lib/utils.ts')
    const planned = await runBuiltCli(
      'node',
      ['add', 'input', '--dry-run', '--json'],
      root,
    )
    expect(planned.code, planned.output).toBe(4)
    const addPlan = jsonRecord(planned.data)
    expect(addPlan.presetHash).toBe(themed.presetHash)
    expect(
      (addPlan.changes as Change[])
        .filter((c) => c.action === 'conflict')
        .map((c) => c.path),
    ).toEqual([utils])
    expect(await snapshotTree(root)).toEqual(after)

    // After the documented manual reconciliation (removing the unowned
    // utility), the add applies with the saved preset. Dependencies are
    // stubbed so the test stays offline.
    await fs.rm(path.join(root, utils))
    const context = await inspectProject(root)
    expect(context.preset?.id).toBe('builtin-minimalist')
    const result = await compile({
      preset: context.preset!,
      componentIds: ['input'],
      catalogRelease: context.preset!.catalogRelease,
      compilerVersion: context.preset!.compilerVersion,
    })
    const plan = await planAdd(context, result)
    expect(plan.preset.hash).toBe(themed.presetHash)
    const dependencies = vi.fn(async () => {})
    await applyPlan(plan, { dependencies })
    expect(dependencies).toHaveBeenCalledOnce()
    expect(
      (dependencies.mock.calls[0] as unknown[])[1] as { name: string }[],
    ).toEqual(plan.dependencyPlan)
    const lock = JSON.parse(
      await fs.readFile(path.join(root, 'ui-library.lock.json'), 'utf8'),
    )
    expect(lock.presetHash).toBe(themed.presetHash)
    const input = path.posix.join(source, 'components/ui/input.tsx')
    expect(lock.artifacts[input]).toBeDefined()
    const final = await snapshotTree(root)
    for (const file of [
      'components.json',
      'package.json',
      'pnpm-lock.yaml',
      'pnpm-workspace.yaml',
      css,
      path.posix.join(source, 'components/ui/button.tsx'),
      path.posix.join(source, 'components/theme-provider.tsx'),
    ])
      expect(final[file], file).toBe(after[file])
  },
  180000,
)
