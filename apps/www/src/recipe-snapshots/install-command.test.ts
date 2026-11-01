import { expect, it } from 'vitest'
import { recipeSnapshotInstallCommand } from './install-command'
import { snapshotInstallCommand } from '../snapshots/install-command'
const source = { origin: 'https://ombelle-ui.vercel.app', reference: 'rc_' + 'a'.repeat(32) + '@1', recipeHash: 'b'.repeat(64) }
it('shows code-only private official commands until an actual release is supplied', () => {
  expect(recipeSnapshotInstallCommand(source)).toBe(`pnpm exec node packages/cli/dist/main.js add --recipe ${source.reference} --cwd APP --dry-run --json`)
  expect(recipeSnapshotInstallCommand(source, { packageName: '@ombelle-ui/cli', version: '0.2.0' })).toBe(`npx @ombelle-ui/cli@0.2.0 add --recipe ${source.reference} --cwd APP --dry-run --json`)
})
it('rejects the old unowned public namespace', () => {
  expect(() => recipeSnapshotInstallCommand(source, { packageName: '@ombelle/cli', version: '0.2.0' })).toThrow('Unsupported published installer release.')
})
it('retains origin and content pins for alternate services', () => {
  expect(recipeSnapshotInstallCommand({ ...source, origin: 'http://127.0.0.1:3000' })).toContain(`--snapshot-origin 'http://127.0.0.1:3000' --recipe-hash ${source.recipeHash}`)
})
it('uses official preset codes for every supported installation scope', () => {
  for (const scope of ['new', 'theme', 'button'] as const) {
    const command = snapshotInstallCommand({ origin: source.origin, reference: 'ps_' + 'a'.repeat(32) + '@1', presetHash: source.recipeHash }, scope)
    expect(command).not.toContain('--snapshot-origin'); expect(command).not.toContain('--preset-hash')
    expect(command).toContain('ps_' + 'a'.repeat(32) + '@1')
  }
})
