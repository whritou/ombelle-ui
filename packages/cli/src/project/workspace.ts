import fs from 'node:fs/promises'
import path from 'node:path'
import { FoundationError } from '@ombelle/contracts'

// pnpm 10+ also keeps settings (allowBuilds, overrides) in pnpm-workspace.yaml,
// and shadcn init writes `packages: []` into single apps. Anything else that
// could declare a member, including YAML we do not recognise, stays a workspace.
function declaresNoPackages(text: string): boolean {
  const lines = text.split(/\r?\n/)
  const keys = lines
    .map((line, index) => ({ line, index }))
    .filter(({ line }) => /^\s*packages\s*:/.test(line))
  if (!keys.length) return true
  if (keys.length > 1 || !/^packages\s*:/.test(keys[0]!.line)) return false
  const value = keys[0]!.line.replace(/^packages\s*:/, '').replace(/\s+#.*$/, '').trim()
  if (value === '[]') return true
  if (value !== '') return false
  const next = lines
    .slice(keys[0]!.index + 1)
    .find((line) => line.trim() !== '' && !/^\s*#/.test(line))
  return next === undefined || /^[A-Za-z_]/.test(next)
}

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
      const workspace = await fs.readFile(path.join(directory, 'pnpm-workspace.yaml'), 'utf8')
      if (directory !== root || !declaresNoPackages(workspace)) throw unsupported()
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code !== 'ENOENT') throw e
    }
    if (directory === path.dirname(directory)) break
  }
}
