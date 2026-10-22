import { expect, it } from 'vitest'
import { transform } from 'esbuild'
import postcss from 'postcss'
import { getCatalog } from '@ombelle/catalog'
import { compileButtonPreset, sha256 } from '../src/index.js'

const presetFor = (family: 'flat' | 'minimalist' | 'neo-brutalism') =>
  structuredClone(getCatalog('0.1.0').presets[family])

const variable = (key: string) =>
  '--' + key.replace(/[A-Z]/g, (match) => '-' + match.toLowerCase())

it.each(['flat', 'minimalist', 'neo-brutalism'] as const)(
  'compiles isolated scoped artifacts for the %s preset',
  async (family) => {
    const preset = presetFor(family)
    const result = await compileButtonPreset({ preset })
    const revisionPath = `scoped-presets/${preset.id}/r${preset.revision}`

    expect(result.preset.data.styleFamily).toBe(family)
    expect(result.scope).toMatch(/^[a-f0-9]{64}$/)
    expect(result.artifacts.map(({ logicalPath }) => logicalPath)).toEqual([
      `examples/scoped-presets/${preset.id}/r${preset.revision}.tsx`,
      'lib/utils.ts',
      `${revisionPath}/button.css`,
      `${revisionPath}/button.tsx`,
    ])
    for (const artifact of result.artifacts)
      expect(await sha256(artifact.content)).toBe(artifact.sha256)

    const source = result.artifacts.find((artifact) => artifact.kind === 'component')!.content
    const usage = result.artifacts.find((artifact) => artifact.kind === 'usage')!.content
    expect(source).toContain('data-slot="scoped-button"')
    expect(source).toContain(`data-ombelle-scope="${result.scope}"`)
    expect(source.indexOf('{...props}')).toBeLessThan(
      source.indexOf('data-ombelle-scope='),
    )
    await expect(transform(source, { loader: 'tsx' })).resolves.toBeDefined()
    expect(usage).toContain(
      `from '@/components/ui/${revisionPath}/button'`,
    )
    expect(result.dependencies.length).toBeGreaterThan(0)
    expect(result.dependencies.map(({ name }) => name)).not.toContain(
      '@radix-ui/react-slot',
    )
  },
)

it('writes complete light and dark tokens only under the generated scope', async () => {
  const preset = presetFor('flat')
  preset.modes.light.primary = '#123456'
  preset.modes.dark.primary = '#ABCDEF'
  const result = await compileButtonPreset({ preset, darkSelector: '.night' })
  const css = result.artifacts.find((artifact) => artifact.kind === 'style')!.content
  const rules: postcss.Rule[] = []
  postcss.parse(css).walkRules((rule) => {
    rules.push(rule)
  })

  const scopeSelector = `[data-slot='scoped-button'][data-ombelle-scope='${result.scope}']`
  const lightRule = rules.find((rule) => rule.selector === scopeSelector)!
  const darkRule = rules.find(
    (rule) => rule.selector.includes('.night') && rule.selector.includes(scopeSelector),
  )!
  const declarations = (rule: postcss.Rule) =>
    Object.fromEntries(
      rule.nodes
        ?.filter((node): node is postcss.Declaration => node.type === 'decl')
        .map(({ prop, value }) => [prop, value]) ?? [],
    )

  for (const [key, value] of Object.entries(result.preset.data.modes.light))
    expect(declarations(lightRule)[variable(key)]).toBe(value)
  for (const [key, value] of Object.entries(result.preset.data.modes.dark))
    expect(declarations(darkRule)[variable(key)]).toBe(value)

  expect(declarations(lightRule)['--primary']).toBe('#123456')
  expect(declarations(darkRule)['--primary']).toBe('#abcdef')
  expect(rules.length).toBeGreaterThan(0)
  for (const rule of rules) {
    expect(rule.selector).toContain("data-slot='scoped-button'")
    expect(rule.selector).toContain(`data-ombelle-scope='${result.scope}'`)
    expect(rule.selector).not.toMatch(/:root|data-slot=['"](?:button|input|dialog)/)
  }
  expect(css).not.toMatch(/:root|@theme/)
})

it('keeps scope identity stable and applies resolved Button defaults', async () => {
  const preset = {
    ...presetFor('minimalist'),
    componentDefaults: { button: { variant: 'outline' as const, size: 'sm' as const } },
  }
  const day = await compileButtonPreset({ preset })
  const night = await compileButtonPreset({ preset, darkSelector: '.night' })
  const changedPreset = await compileButtonPreset({
    preset: { ...preset, name: 'Changed preset name' },
  })
  const source = day.artifacts.find((artifact) => artifact.kind === 'component')!.content

  expect(day.scope).toBe(night.scope)
  expect(day.scope).not.toBe(changedPreset.scope)
  expect(source).toContain("variant = 'outline'")
  expect(source).toContain("size = 'sm'")
})

it('rejects unsupported preset releases and unsafe dark selectors', async () => {
  const preset = presetFor('flat')
  await expect(
    compileButtonPreset({ preset: { ...preset, catalogRelease: '9.9.9' } }),
  ).rejects.toThrow()
  await expect(
    compileButtonPreset({ preset: { ...preset, compilerVersion: '9.9.9' } }),
  ).rejects.toThrow()
  for (const darkSelector of ['.dark,body', 'body.dark', '.dark .other', ':root'])
    await expect(compileButtonPreset({ preset, darkSelector })).rejects.toThrow()
})
