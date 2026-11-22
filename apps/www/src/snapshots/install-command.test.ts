import { describe, expect, it } from 'vitest'
import type { SnapshotSource } from '@ombelle/contracts'
import { officialSnapshotOrigin } from '@ombelle/contracts'
// The source the site's generated Code Block is compiled from.
import { commandRunners } from '../../../../packages/catalog/src/templates/code-block'
import { getCatalogPresets } from '@ombelle/catalog/presets'
import { codeInstallCommand, compareVersions, installNotice, installRules, installableRecipeInstallNotice, offeredStyleFamilies, packageManagers, presetInstallNotice, publishedInstaller, siteFamilyOrder, snapshotInstallCommand, type InstallRule } from './install-command'
import example from '../../../../examples/recipe.example.json'
import type { Recipe } from '@ombelle/contracts'

const source: SnapshotSource = {
  origin: 'https://presets.example.test',
  reference: 'ps_' + 'a'.repeat(32) + '@1',
  presetHash: 'b'.repeat(64),
}
it('all scopes use one immutable source and honest private repository invocation', () => {
  for (const scope of ['new', 'theme', 'button'] as const) {
    const command = snapshotInstallCommand(source, scope)
    expect(command).toContain('pnpm exec node packages/cli/dist/main.js ')
    expect(command).toContain(source.reference)
    expect(command).toContain('--snapshot-origin ' + "'" + source.origin + "'")
    expect(command).toContain('--preset-hash ' + source.presetHash)
    // Plain commands: run from the app folder, the CLI asks before writing.
    expect(command).not.toMatch(/--cwd|--dry-run|--json|--yes/)
    expect(command).not.toMatch(/npx|pnpm dlx|@ombelle\/cli/)
  }
  expect(snapshotInstallCommand(source, 'new')).toContain(
    'init --preset ' + source.reference,
  )
  expect(snapshotInstallCommand(source, 'theme')).toContain(
    'theme add ' + source.reference,
  )
  expect(snapshotInstallCommand(source, 'button')).toContain(
    'add button --preset ' + source.reference,
  )
})
it.each([
  'https://presets.example.test:8443',
  'https://[2001:db8::1]:8443',
  'http://[::1]:3000',
  'http://localhost:3000',
  'http://127.0.0.1:3000',
])('quotes supported origin %s as one literal shell argument', (origin) => {
  expect(snapshotInstallCommand({ ...source, origin }, 'new')).toContain(
    `--snapshot-origin '${origin}'`,
  )
})
it.each([
  'https://a;whoami.test',
  "https://a'b.test",
  'https://a$(whoami).test',
  'https://a`whoami`.test',
  'https://a&whoami.test',
  'https://safe.test/path',
  'https://safe.test?x=y',
  'http://example.test',
  'https://safe.test\nwhoami',
])('rejects unsafe origin %s', (origin) => {
  expect(() => snapshotInstallCommand({ ...source, origin }, 'new')).toThrow()
})
it('validates immutable reference and hash before displaying a command', () => {
  expect(() =>
    snapshotInstallCommand(
      { ...source, reference: source.reference + ';whoami' },
      'new',
    ),
  ).toThrow()
  expect(() =>
    snapshotInstallCommand({ ...source, presetHash: 'x;whoami' }, 'new'),
  ).toThrow()
})
it('code pages show the verified public npx release with bare official codes', () => {
  expect(publishedInstaller).toEqual({ packageName: '@ombelle-ui/cli', version: expect.stringMatching(/^\d+\.\d+\.\d+$/) })
  const official = { ...source, origin: officialSnapshotOrigin }
  expect(snapshotInstallCommand(official, 'new', publishedInstaller)).toBe(
    `npx @ombelle-ui/cli@${publishedInstaller.version} init --preset ${source.reference}`,
  )
})

describe('Get code commands', () => {
  const official = { ...source, origin: officialSnapshotOrigin }
  it('runs the published installer through each package manager in the current folder', () => {
    const runners = { pnpm: 'pnpm dlx', npm: 'npx', yarn: 'yarn dlx', bun: 'bunx' } as const
    for (const manager of packageManagers) {
      const command = codeInstallCommand({ kind: 'preset', source: official }, 'new', manager)
      expect(command).toBe(`${runners[manager]} ${publishedInstaller.packageName}@${publishedInstaller.version} init --preset ${source.reference}`)
      expect(command).not.toMatch(/--cwd|--dry-run|--yes/)
    }
    expect(codeInstallCommand({ kind: 'preset', source: official }, 'theme', 'npm')).toContain('theme add ' + source.reference)
    expect(codeInstallCommand({ kind: 'preset', source: official }, 'button', 'npm')).toContain('add button --preset ' + source.reference)
  })
  it('pins non-official origins and keeps recipe scope separate', () => {
    expect(codeInstallCommand({ kind: 'preset', source }, 'new', 'npm')).toContain(`--snapshot-origin '${source.origin}' --preset-hash ${source.presetHash}`)
    const recipe = { origin: 'http://127.0.0.1:3000', reference: 'rc_' + 'c'.repeat(32) + '@1', recipeHash: 'd'.repeat(64) }
    expect(codeInstallCommand({ kind: 'recipe', source: recipe }, 'recipe', 'bun')).toBe(
      `bunx ${publishedInstaller.packageName}@${publishedInstaller.version} add --recipe ${recipe.reference} --snapshot-origin '${recipe.origin}' --recipe-hash ${recipe.recipeHash}`)
    expect(() => codeInstallCommand({ kind: 'recipe', source: recipe }, 'new', 'npm')).toThrow()
    expect(() => codeInstallCommand({ kind: 'preset', source }, 'recipe', 'npm')).toThrow()
  })
  it('gives the Code Block command the npm command without its runner, so each tab shows the same command', () => {
    const recipe = { origin: officialSnapshotOrigin, reference: 'rc_' + 'c'.repeat(32) + '@1', recipeHash: 'd'.repeat(64) }
    const codes = [
      [{ kind: 'preset', source: official }, 'new'],
      [{ kind: 'preset', source }, 'theme'],
      [{ kind: 'recipe', source: recipe }, 'recipe'],
    ] as const
    for (const [code, scope] of codes) {
      const args = codeInstallCommand(code, scope, 'npm').replace(/^npx /, '')
      for (const manager of packageManagers)
        expect(`${commandRunners[manager]} ${args}`).toBe(codeInstallCommand(code, scope, manager))
    }
  })
})

it('compares x.y.z versions numerically', () => {
  expect(compareVersions('0.3.0', '0.4.0')).toBeLessThan(0)
  expect(compareVersions('0.10.0', '0.4.0')).toBeGreaterThan(0)
  expect(compareVersions('0.4.0', '0.4.0')).toBe(0)
  expect(compareVersions('1.0.0', '0.99.99')).toBeGreaterThan(0)
  expect(() => compareVersions('0.4', '0.4.0')).toThrow()
})

describe('install rules', () => {
  const preset = getCatalogPresets('0.1.0').presets.flat
  const rule: InstallRule = {
    minimumCli: '0.10.0',
    applies: (subject) => subject.kind === 'preset' && subject.contrastWarning === true,
    notice: 'This preset requires CLI 0.10.0.',
  }

  it('holds only rules newer than the published installer', () => {
    for (const each of installRules) expect(compareVersions(publishedInstaller.version, each.minimumCli)).toBeLessThan(0)
  })

  it('shows a rule notice instead of a command until the installer reaches its minimum', () => {
    const subject = { kind: 'preset', preset, contrastWarning: true } as const
    expect(installNotice(subject, { version: '0.9.9' }, [rule])).toBe(rule.notice)
    expect(installNotice(subject, { version: '0.10.0' }, [rule])).toBeUndefined()
    expect(installNotice({ ...subject, contrastWarning: false }, { version: '0.9.9' }, [rule])).toBeUndefined()
  })

  it('offers every command the site can produce today', () => {
    expect(presetInstallNotice(preset, true)).toBeUndefined()
    expect(installableRecipeInstallNotice(example as Recipe)).toBeUndefined()
  })
})

it('offers every style family in site order', () => {
  expect(siteFamilyOrder).toEqual(['ombelle', 'papier', 'organic', 'retro-futurism', 'minimalist', 'neo-brutalism', 'flat', 'liquid-glass'])
  expect(offeredStyleFamilies()).toEqual(siteFamilyOrder)
  expect(offeredStyleFamilies('flat', { version: '0.3.0' })).toEqual(siteFamilyOrder)
})
