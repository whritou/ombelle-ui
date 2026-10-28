import { validateSnapshotSource, type SnapshotSource } from '@ombelle/contracts'

/** Display-only invocation for the private repository CLI. */
export function snapshotInstallCommand(
  source: SnapshotSource,
  scope: 'new' | 'theme' | 'button',
): string {
  const { origin, reference, presetHash } = validateSnapshotSource(source)
  // URL permits punctuation in hostnames which shells interpret. Limit the
  // displayed authority to literal DNS/IP characters and quote it as one value
  // in POSIX shells and PowerShell (including IPv6's brackets).
  if (!/^https?:\/\/(?:[a-z0-9.-]+|\[[a-f0-9:]+\])(?::[0-9]+)?$/.test(origin))
    throw new Error(
      'Snapshot origin cannot be represented safely in a command.',
    )
  const operation = {
    new: `init --preset ${reference}`,
    theme: `theme add ${reference}`,
    button: `add button --preset ${reference}`,
  }[scope]
  if (!operation) throw new Error('Unknown installation scope.')
  return `pnpm exec node packages/cli/dist/main.js ${operation} --snapshot-origin '${origin}' --preset-hash ${presetHash} --cwd APP --dry-run --json`
}
