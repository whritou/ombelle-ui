import { compareVersions } from '../../snapshots/install-command'

/** The published CLI the agent pages describe; `publishedInstaller` by default. */
export type Installer = { packageName: string; version: string }

/** Blocks need CLI 1.1.0 (docs/05-cli-specification.md, "Blocks"). */
export const blocksMinimumCli = '1.1.0'

/** Whether `installer` can add an item that needs `minimumCli` (no minimum: always). */
export function installableFor(installer: Installer, minimumCli?: string): boolean {
  return !minimumCli || compareVersions(installer.version, minimumCli) >= 0
}
