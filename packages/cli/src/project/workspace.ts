import fs from 'node:fs/promises'
import path from 'node:path'
import { FoundationError } from '@ombelle/contracts'

export async function assertStandaloneProject(root: string): Promise<void> {
  const unsupported = () => new FoundationError(
    'UNSUPPORTED_PROJECT',
    'Workspace-wide installation is not supported; target an independently owned application',
    root,
  )
  for (let directory = root; ; directory = path.dirname(directory)) {
    try {
      const pkg = JSON.parse(await fs.readFile(path.join(directory, 'package.json'), 'utf8'))
      if (pkg?.workspaces) throw unsupported()
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code !== 'ENOENT') throw e
    }
    try {
      await fs.access(path.join(directory, 'pnpm-workspace.yaml'))
      throw unsupported()
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code !== 'ENOENT') throw e
    }
    if (directory === path.dirname(directory)) break
  }
}
