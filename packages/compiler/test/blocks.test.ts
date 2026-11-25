import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { supportedComponentIds } from '@ombelle/contracts'
import { blockManifest, getCatalog } from '@ombelle/catalog'
import { compile } from '../src/index.js'

const catalog = getCatalog('0.1.0')
const run = (edition: 'radix' | 'base', blockIds: readonly 'login-01'[] = ['login-01']) =>
  compile({
    preset: catalog.presets.ombelle,
    componentIds: [],
    blockIds,
    catalogRelease: '0.1.0',
    compilerVersion: '0.1.0',
    edition,
  })
const source = (result: Awaited<ReturnType<typeof run>>, path: string) =>
  result.artifacts.find((artifact) => artifact.logicalPath === path)!

describe('block artifacts', () => {
  it('emits the block files and every component the block imports', async () => {
    const result = await run('radix')
    const paths = result.artifacts.map((artifact) => artifact.logicalPath)
    expect(source(result, 'blocks/login-01.tsx').kind).toBe('block')
    expect(source(result, 'blocks/login-01.css').kind).toBe('block')
    for (const id of blockManifest['login-01'].components) {
      expect(paths).toContain(`components/ui/${id}.tsx`)
      expect(paths).toContain(`examples/${id}.tsx`)
    }
    expect(source(result, 'blocks/login-01.tsx').content).toContain("'./login-01.css'")
  })

  it('is deterministic', async () => {
    const hashes = async () => (await run('radix')).artifacts.map((artifact) => artifact.sha256)
    expect(await hashes()).toEqual(await hashes())
  })

  it.each(['radix', 'base'] as const)('keeps the %s source example-only and landmark-correct', async (edition) => {
    const content = source(await run(edition), 'blocks/login-01.tsx').content
    if (edition === 'base') expect(content).not.toContain('asChild')
    // The heading is the Card title rendered as an h2; no other heading is written.
    expect(content.match(/level=\{2\}/g) ?? []).toHaveLength(1)
    expect(content.match(/<h[1-6]|level=\{[13-6]\}/g) ?? []).toHaveLength(0)
    expect(content).not.toContain('<h1')
    expect(content).toContain('showExampleNotice')
    expect(content).toContain("Example only: this form doesn't sign anyone in")
    expect(content).not.toContain('fetch(')
    expect(content).not.toContain('Acme')
  })

  it('leaves output without blockIds byte-identical', async () => {
    const result = await compile({
      preset: catalog.presets.ombelle,
      componentIds: supportedComponentIds,
      catalogRelease: '0.1.0',
      compilerVersion: '0.1.0',
      edition: 'radix',
    })
    const expected = JSON.parse(
      readFileSync(new URL('./fixtures/no-block-hashes.json', import.meta.url), 'utf8'),
    ) as [string, string][]
    expect(result.artifacts.map((artifact) => [artifact.logicalPath, artifact.sha256])).toEqual(expected)
  }, 120000)
})
