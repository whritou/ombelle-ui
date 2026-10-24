import fs from 'node:fs/promises'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

const coreFiles = [
  'foundation-report.json', 'unit-results.json', 'integration-results.json',
  'browser-results.json', 'npm-version.json', 'yarn-versions.json', 'yarn-matrix.json',
  'bun-version.json', 'bun-matrix.json', 'browser-version.json', 'install-provenance.json',
  'consumer-pending.json', 'consumer-matrix.json', 'minimalist-measurements.json',
  'recipe-measurements.json', 'recipe-consumers.json',
  'component-preset-measurements.json', 'component-preset-consumers.json',
  'component-preset-browser-version.json',
]

async function copyStable(source, destination) {
  const stat = await fs.lstat(source).catch((error) => {
    if (error.code === 'ENOENT') return undefined
    throw error
  })
  if (!stat || stat.isSymbolicLink()) return false
  if (stat.isDirectory()) {
    await fs.mkdir(destination, { recursive: true })
    for (const entry of (await fs.readdir(source)).sort()) {
      if (entry.startsWith('.playwright-artifacts-')) continue
      await copyStable(path.join(source, entry), path.join(destination, entry))
    }
  } else if (stat.isFile()) {
    await fs.mkdir(path.dirname(destination), { recursive: true })
    await fs.copyFile(source, destination)
  } else return false
  return true
}

// Invoke only after the stage runner has awaited browser/process teardown. Upload
// these snapshots, never Playwright's live temporary attachment directories.
export async function stageFoundationEvidence(root = process.cwd()) {
  const artifacts = path.join(root, '.artifacts')
  const output = path.join(artifacts, 'upload')
  await fs.rm(output, { recursive: true, force: true })
  await fs.mkdir(path.join(output, 'core'), { recursive: true })
  const manifest = { stagedAt: new Date().toISOString(), foundationStatus: 'unavailable', copied: [], missing: [] }
  const names = await fs.readdir(artifacts)
  const files = [...new Set([...coreFiles, ...names.filter((name) => /^audit-.*\.json$/.test(name))])].sort()
  for (const file of files) {
    const source = path.join(artifacts, file)
    const relative = '.artifacts/' + file
    if (await copyStable(source, path.join(output, 'core', file))) manifest.copied.push(relative)
    else manifest.missing.push(relative)
  }
  for (const [source, destination] of [
    ['.artifacts/logs', 'core/logs'],
    ['playwright-report', 'browser/playwright-report'],
    ['test-results', 'browser/test-results'],
  ]) {
    if (await copyStable(path.join(root, source), path.join(output, destination))) manifest.copied.push(source)
    else manifest.missing.push(source)
  }
  if (manifest.copied.includes('.artifacts/foundation-report.json')) {
    const report = JSON.parse(await fs.readFile(path.join(output, 'core/foundation-report.json'), 'utf8'))
    manifest.foundationStatus = report.status ?? 'unavailable'
  }
  await fs.writeFile(path.join(output, 'core/staging-manifest.json'), JSON.stringify(manifest, null, 2) + '\n')
  return manifest
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const manifest = await stageFoundationEvidence()
  console.log(`Staged foundation evidence (${manifest.foundationStatus}); ${manifest.missing.length} optional paths absent`)
}
