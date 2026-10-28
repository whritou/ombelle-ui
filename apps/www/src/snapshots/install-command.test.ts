import { expect, it } from 'vitest'
import type { SnapshotSource } from '@ombelle/contracts'
import { snapshotInstallCommand } from './install-command'

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
