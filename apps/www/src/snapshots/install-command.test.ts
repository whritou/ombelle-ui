import { describe, expect, it } from 'vitest'
import type { SnapshotSource } from '@ombelle/contracts'
import { officialSnapshotOrigin } from '@ombelle/contracts'
import { codeInstallCommand, compareVersions, offeredStyleFamilies, ombelleMinimumCli, packageManagers, publishedInstaller, snapshotInstallCommand } from './install-command'

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
    expect(command).toContain('--cwd APP --dry-run --json')
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
    `npx @ombelle-ui/cli@${publishedInstaller.version} init --preset ${source.reference} --cwd APP --dry-run --json`,
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
})

it('compares x.y.z versions numerically', () => {
  expect(compareVersions('0.3.0', '0.4.0')).toBeLessThan(0)
  expect(compareVersions('0.10.0', '0.4.0')).toBeGreaterThan(0)
  expect(compareVersions('0.4.0', '0.4.0')).toBe(0)
  expect(compareVersions('1.0.0', '0.99.99')).toBeGreaterThan(0)
  expect(() => compareVersions('0.4', '0.4.0')).toThrow()
})

it('offers ombelle only from the minimum published installer', () => {
  expect(ombelleMinimumCli).toBe('0.4.0')
  expect(offeredStyleFamilies(undefined, { version: '0.3.1' })).not.toContain('ombelle')
  expect(offeredStyleFamilies(undefined, { version: '0.4.0' })).toContain('ombelle')
  expect(offeredStyleFamilies(undefined, { version: '0.5.2' })).toContain('ombelle')
  // A restored ombelle draft keeps its own family visible.
  expect(offeredStyleFamilies('ombelle', { version: '0.3.0' })).toContain('ombelle')
  expect(offeredStyleFamilies()).toEqual(offeredStyleFamilies(undefined, publishedInstaller))
  expect(offeredStyleFamilies(undefined, { version: '0.3.0' })).toEqual(['flat', 'minimalist', 'neo-brutalism', 'liquid-glass'])
})
