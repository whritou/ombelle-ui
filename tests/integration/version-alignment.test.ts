import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { spawn } from 'node:child_process'
import { afterAll, expect, it } from 'vitest'

const repo = process.cwd()
const script = path.join(repo, 'scripts/set-version.mjs')
const owned: string[] = []
afterAll(async () => {
  await Promise.all(owned.map(directory => fs.rm(directory, { recursive: true, force: true })))
})

const packageJsons = ['packages/contracts', 'packages/catalog', 'packages/compiler', 'packages/cli', 'apps/www', 'apps/preview'].map(
  directory => directory + '/package.json',
)

async function expand(pattern: string): Promise<string[]> {
  if (!pattern.includes('*')) return [pattern]
  const [head, tail] = pattern.split('*')
  const entries = await fs.readdir(path.join(repo, head), { withFileTypes: true })
  return entries.filter(entry => entry.isDirectory()).map(entry => head + entry.name + tail)
}

async function copyRepoSubset(patterns: string[]) {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'ombelle-version-'))
  owned.push(dir)
  for (const file of (await Promise.all(patterns.map(expand))).flat()) {
    await fs.mkdir(path.dirname(path.join(dir, file)), { recursive: true })
    await fs.copyFile(path.join(repo, file), path.join(dir, file))
  }
  return dir
}

function run(args: string[]) {
  return new Promise<{ code: number | null; stdout: string; stderr: string }>((resolve, reject) => {
    const child = spawn(process.execPath, [script, ...args], { cwd: repo, windowsHide: true })
    let stdout = '', stderr = ''
    child.stdout.on('data', value => { stdout += value })
    child.stderr.on('data', value => { stderr += value })
    child.on('error', reject)
    child.on('close', code => resolve({ code, stdout, stderr }))
  })
}

const read = (dir: string, file: string) => fs.readFile(path.join(dir, file), 'utf8')
const workspaceFiles = ['package.json', 'packages/*/package.json', 'apps/*/package.json', 'README.md', 'CHANGELOG.md', 'docs/cli-release.md', 'docs/04-presets-and-contracts.md']
const publishedFiles = [
  'apps/www/src/snapshots/install-command.ts',
  'README.md',
  'docs/foundation-local-usage.md',
  'docs/snapshot-service-operations.md',
  'docs/07-delivery-plan.md',
]

async function withUnreleased(dir: string) {
  const file = path.join(dir, 'CHANGELOG.md')
  const text = await fs.readFile(file, 'utf8')
  const eol = text.includes('\r\n') ? '\r\n' : '\n'
  await fs.writeFile(file, text.replace('# Changelog' + eol + eol, '# Changelog' + eol + eol + '## Unreleased' + eol + eol + '- A pending change.' + eol + eol))
}

it('sets a workspace release in a temp copy without touching history', async () => {
  const dir = await copyRepoSubset(workspaceFiles)
  await withUnreleased(dir)
  const history = (await read(dir, 'CHANGELOG.md')).split(/^## 0\.3\.0/m)[1]
  const result = await run(['0.4.0', '--root', dir, '--date', '2026-11-20'])
  expect(result.code, result.stderr).toBe(0)
  for (const file of packageJsons) expect(JSON.parse(await read(dir, file)).version).toBe('0.4.0')
  const changelog = await read(dir, 'CHANGELOG.md')
  expect(changelog).toMatch(/## Unreleased\r?\n\r?\n## 0\.4\.0 — 20 November 2026\r?\n\r?\n- A pending change\./)
  expect(changelog.split(/^## 0\.3\.0/m)[1]).toBe(history)
  const release = await read(dir, 'docs/cli-release.md')
  expect(release).toContain('was published on 2026-11-04 from `a9e56fc`')
  expect(release).toContain('ombelle-ui-cli-0.4.0.tgz')
  expect(release).toContain('All six workspace packages use software version 0.4.0')
  expect(release).toContain('`@ombelle-ui/cli@0.3.0` was published')
  expect(await read(dir, 'README.md')).toContain('The six workspace packages are version **0.4.0**')
  expect(await read(dir, 'README.md')).toContain('`npx @ombelle-ui/cli@0.3.0`')
  expect(await read(dir, 'docs/04-presets-and-contracts.md')).toContain('Workspace packages and the published installer are version 0.4.0.')
  expect((await run(['--check', '--root', dir])).code).toBe(0)
})

it('--published only flips website commands', async () => {
  const dir = await copyRepoSubset([...publishedFiles, ...packageJsons])
  const result = await run(['--published', '0.4.0', '--root', dir])
  expect(result.code, result.stderr).toBe(0)
  expect(await read(dir, 'apps/www/src/snapshots/install-command.ts')).toContain("version: '0.4.0'")
  for (const file of ['README.md', 'docs/foundation-local-usage.md', 'docs/snapshot-service-operations.md', 'docs/07-delivery-plan.md']) {
    const text = await read(dir, file)
    expect(text, file).toContain('@ombelle-ui/cli@0.4.0')
    expect(text, file).not.toContain('@ombelle-ui/cli@0.3.0')
  }
  for (const file of packageJsons) expect(JSON.parse(await read(dir, file)).version).toBe('0.3.0')
  expect(await read(dir, 'README.md')).toContain('The six workspace packages are version **0.3.0**')
})

it('the website installer version matches every published-sentence site in the repository', async () => {
  const result = await run(['--check', '--published'])
  expect(result.code, result.stderr).toBe(0)
})

it('--check --published names a doc that disagrees with the website installer', async () => {
  const dir = await copyRepoSubset(publishedFiles)
  const file = path.join(dir, 'docs/snapshot-service-operations.md')
  await fs.writeFile(file, (await fs.readFile(file, 'utf8')).replace('cli@0.3.0', 'cli@0.2.9'))
  const result = await run(['--check', '--published', '--root', dir])
  expect(result.code).toBe(1)
  expect(result.stderr).toContain('docs/snapshot-service-operations.md')
})

it('--check fails and names a misaligned package', async () => {
  const dir = await copyRepoSubset(workspaceFiles)
  expect((await run(['--check', '--root', dir])).code).toBe(0)
  const file = path.join(dir, 'packages/compiler/package.json')
  await fs.writeFile(file, (await fs.readFile(file, 'utf8')).replace('"0.3.0"', '"0.3.1"'))
  const result = await run(['--check', '--root', dir])
  expect(result.code).toBe(1)
  expect(result.stderr).toContain('packages/compiler/package.json')
  expect(result.stderr).not.toContain('packages/catalog/package.json')
})

it('exits 1 without writing when a site pattern does not match exactly once', async () => {
  const dir = await copyRepoSubset(workspaceFiles)
  await withUnreleased(dir)
  const file = path.join(dir, 'README.md')
  await fs.writeFile(file, (await fs.readFile(file, 'utf8')).replace('The six workspace packages are version', 'Six packages are version'))
  const result = await run(['0.4.0', '--root', dir, '--date', '2026-11-20'])
  expect(result.code).toBe(1)
  expect(result.stderr).toContain('README.md')
  expect(JSON.parse(await read(dir, 'packages/cli/package.json')).version).toBe('0.3.0')
})
