import { spawnSync } from 'node:child_process'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { supportedComponentIds } from '../packages/contracts/src/component-ids.ts'

/**
 * The components a pull request's specimen audit measures (TST-01): every component whose template or
 * styles the change touches, plus a fixed sample that covers the shared surfaces (family stylesheets,
 * the compiler, the preview and the audit itself) on every run. The complete audit runs in Foundation.
 *
 * Usage: tsx scripts/pr-audit-components.ts <base-commit>; prints a comma-separated list.
 */
export const representativeComponents = ['button', 'input', 'select', 'dialog', 'tabs', 'card'] as const

export function changedComponents(files: string[]): string[] {
  const ids = new Set<string>()
  for (const file of files) {
    const match = /^packages\/catalog\/src\/(?:templates\/(?:base\/)?([a-z0-9-]+)\.tsx|styles\/([a-z0-9-]+)\/[^/]+\.css)$/.exec(file.replaceAll('\\', '/'))
    const id = match?.[1] ?? match?.[2]
    if (id && (supportedComponentIds as readonly string[]).includes(id)) ids.add(id)
  }
  return [...ids].sort()
}

// A change to many components keeps the job near ten minutes; Foundation measures the rest.
export const auditLimit = 20
export function auditComponents(files: string[]): { components: string[]; deferred: string[] } {
  const all = [...new Set([...representativeComponents, ...changedComponents(files)])]
  return { components: all.slice(0, auditLimit), deferred: all.slice(auditLimit) }
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const base = process.argv[2]
  let files: string[] = []
  // No usable base (a new branch, a shallow history): the sample alone.
  if (base && !/^0+$/.test(base)) {
    const diff = spawnSync('git', ['diff', '--name-only', base, 'HEAD'], { encoding: 'utf8', windowsHide: true })
    if (diff.status === 0) files = diff.stdout.split('\n').filter(Boolean)
    else console.error('No diff against ' + base + '; auditing the representative sample only')
  }
  const { components, deferred } = auditComponents(files)
  if (deferred.length) console.error('Left to the Foundation run: ' + deferred.join(','))
  console.log(components.join(','))
}
