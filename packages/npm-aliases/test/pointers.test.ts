import fs from 'node:fs'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import { describe, expect, it } from 'vitest'
import { cliKeywords, cliPublicManifest, cliPublicReadme } from '../../../scripts/cli-public-package.mjs'

const repo = process.cwd()
const aliases = path.join(repo, 'packages/npm-aliases')
const names = ['ombelle', 'ombelle-ui'] as const
const read = (file: string) => fs.readFileSync(path.join(repo, file), 'utf8')
const published = /version: '(\d+\.\d+\.\d+)'/.exec(read('apps/www/src/snapshots/install-command.ts'))![1]

function runPointer(name: string, args: string[]) {
  return spawnSync(process.execPath, [path.join(aliases, name, 'bin/pointer.js'), ...args], {
    cwd: repo, encoding: 'utf8', windowsHide: true, timeout: 30_000,
  })
}

describe.each(names)('npm pointer package %s', name => {
  const manifest = JSON.parse(fs.readFileSync(path.join(aliases, name, 'package.json'), 'utf8'))

  it('is a public, dependency-free package with no lifecycle scripts', () => {
    expect(manifest).toMatchObject({ name, type: 'module', license: 'MIT', bin: { [name]: './bin/pointer.js' } })
    expect(manifest.private).toBeUndefined()
    for (const field of ['dependencies', 'optionalDependencies', 'peerDependencies', 'bundleDependencies', 'scripts'])
      expect(manifest[field], field).toBeUndefined()
    expect(manifest.files).toEqual(['bin', 'README.md', 'LICENSE'])
    const lf = (text: string) => text.replaceAll('\r\n', '\n')
    expect(lf(fs.readFileSync(path.join(aliases, name, 'LICENSE'), 'utf8'))).toBe(lf(read('LICENSE')))
  })

  it('points at the installer version the website publishes', () => {
    expect(manifest.version).toBe(published)
  })

  it('prints the scoped CLI command, repeats safe arguments and exits 1', () => {
    const result = runPointer(name, ['add', 'button', '--dry-run', '--json'])
    expect(result.status).toBe(1)
    expect(result.stdout).toBe('')
    expect(result.stderr).toContain(`"${name}" is not the Ombelle UI installer`)
    expect(result.stderr).toContain(`npx @ombelle-ui/cli@${published} add button --dry-run --json`)
    expect(result.stderr).toContain('https://ombelle-ui.com/llms.txt')
    expect(result.stderr).toContain('npx skills add whritou/ombelle-ui')
  })

  it('never echoes arguments that a shell could interpret', () => {
    const result = runPointer(name, ['add', 'button; rm -rf ~'])
    expect(result.status).toBe(1)
    expect(result.stderr).toContain(`npx @ombelle-ui/cli@${published} <command>`)
    expect(result.stderr).not.toContain('rm -rf')
  })

  it('keeps LF line endings so the shebang works on Linux and macOS', () => {
    expect(fs.readFileSync(path.join(aliases, name, 'bin/pointer.js'), 'utf8')).not.toContain('\r')
  })

  it('never runs, spawns, fetches or imports the real CLI', () => {
    const source = fs.readFileSync(path.join(aliases, name, 'bin/pointer.js'), 'utf8')
    const imports = [...source.matchAll(/from '([^']+)'|import\(['"]([^'"]+)['"]\)|require\(['"]([^'"]+)['"]\)/g)].map(match => match[1] ?? match[2] ?? match[3])
    expect(imports).toEqual(['node:fs'])
    expect(source).not.toMatch(/child_process|spawn|exec\w*\(|fetch\(|eval\(|new Function/)
  })

  it('README says it is not the installer and names the real package', () => {
    const readme = fs.readFileSync(path.join(aliases, name, 'README.md'), 'utf8')
    expect(readme).toContain('This is not the Ombelle UI installer')
    expect(readme).toContain('npx @ombelle-ui/cli@<version>')
    expect(readme).toContain('npx skills add whritou/ombelle-ui')
  })
})

it('pointers and CLI metadata link the current site, not the old vercel.app domain', () => {
  const texts = [
    ...names.flatMap(name => ['README.md', 'package.json', 'bin/pointer.js'].map(file => fs.readFileSync(path.join(aliases, name, file), 'utf8'))),
    JSON.stringify(cliPublicManifest('@ombelle-ui/cli', '9.9.9')), cliPublicReadme('@ombelle-ui/cli', '9.9.9'),
  ]
  for (const text of texts) {
    expect(text).not.toContain('vercel.app')
    expect(text).toContain('https://ombelle-ui.com')
  }
})

it('both pointer bins are the same file', () => {
  const [first, second] = names.map(name => fs.readFileSync(path.join(aliases, name, 'bin/pointer.js'), 'utf8'))
  expect(second).toBe(first)
})

describe('@ombelle-ui/cli public metadata', () => {
  it('carries the names agents search for as keywords', () => {
    for (const keyword of ['ombelle', 'ombelle-ui', 'react', 'components', 'tailwind', 'shadcn', 'cli']) expect(cliKeywords).toContain(keyword)
    expect(cliPublicManifest('@ombelle-ui/cli', '9.9.9')).toMatchObject({ name: '@ombelle-ui/cli', version: '9.9.9', keywords: cliKeywords, bin: { ombelle: './dist/main.js' } })
  })

  it('README has a section for AI coding agents with llms.txt, skills and the install loop', () => {
    const readme = cliPublicReadme('@ombelle-ui/cli', '9.9.9')
    const section = readme.split('## For AI coding agents')[1]
    expect(section).toBeDefined()
    expect(section).toContain('https://ombelle-ui.com/llms.txt')
    expect(section).toContain('npx skills add whritou/ombelle-ui')
    expect(section).toContain('--dry-run --json')
    expect(section).toContain('--yes')
    expect(readme).toContain('npx @ombelle-ui/cli@9.9.9 init')
  })
})
