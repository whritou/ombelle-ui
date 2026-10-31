import fs from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { createProject } from './projects.js'
// Fully resolved locks keep npm from resolving the transitive tree live.
// Regenerate with `pnpm exec tsx scripts/generate-npm-test-locks.ts`.
export function npmFixtureLock(kind: 'vite' | 'next') {
  return fileURLToPath(
    new URL(
      '../../fixtures/npm/minimal-' + kind + '/package-lock.json',
      import.meta.url,
    ),
  )
}
export async function createNpmManifestProject(kind: 'vite' | 'next') {
  const root = await createProject(kind)
  await fs.rm(root + '/pnpm-lock.yaml')
  const pkg = JSON.parse(await fs.readFile(root + '/package.json', 'utf8'))
  pkg.packageManager = 'npm@11.19.0'
  pkg.scripts = {
    preinstall:
      "node -e \"require('fs').writeFileSync('lifecycle-ran','bad')\"",
  }
  await fs.writeFile(root + '/package.json', JSON.stringify(pkg))
  return { root, pkg }
}
const sorted = (deps: Record<string, string> = {}) =>
  Object.entries(deps).sort(([a], [b]) => a.localeCompare(b))
export async function createNpmProject(kind: 'vite' | 'next') {
  const { root, pkg } = await createNpmManifestProject(kind)
  const lock = await fs.readFile(npmFixtureLock(kind), 'utf8')
  const entry = JSON.parse(lock).packages?.['']
  if (
    entry?.name !== pkg.name ||
    entry?.version !== pkg.version ||
    JSON.stringify(sorted(entry?.dependencies)) !==
      JSON.stringify(sorted(pkg.dependencies))
  )
    throw new Error(
      'Stale npm fixture lock for ' +
        kind +
        '; run pnpm exec tsx scripts/generate-npm-test-locks.ts',
    )
  await fs.writeFile(root + '/package-lock.json', lock)
  return root
}
