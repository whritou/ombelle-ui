import { expect, it } from 'vitest'
import { getCatalog } from '@ombelle/catalog'
import { supportedStyleFamilies } from '@ombelle/contracts'
import { compile } from '../src/index.js'
import baseline from './fixtures/style-baseline.json'

it.each(supportedStyleFamilies)(
  'compiles standalone Card artifacts and both theme modes in %s',
  async (family) => {
    const preset = getCatalog('0.1.0').presets[family]
    const result = await compile({
      preset,
      componentIds: ['card'],
      catalogRelease: '0.1.0',
      compilerVersion: '0.1.0',
    })
    expect(result.artifacts.map((a) => a.logicalPath)).toEqual([
      'components/ui/card.css',
      'components/ui/card.tsx',
      'examples/card.tsx',
      'lib/utils.ts',
      'styles/ui-style.css',
      'styles/ui-tokens.css',
    ])
    const source = result.artifacts.find(
      (a) => a.logicalPath === 'components/ui/card.tsx',
    )!.content
    expect(source).toContain("import './card.css'")
    expect(source).toContain("import { cn } from '@/lib/utils'")
    for (const part of [
      'Card',
      'CardHeader',
      'CardTitle',
      'CardDescription',
      'CardContent',
      'CardFooter',
    ])
      expect(source).toContain(`export function ${part}(`)
    expect(source).toContain("density?: 'default' | 'dense'")
    expect(source).toContain("density = 'default'")
    expect(source).toContain('data-density={density}')
    expect(source).not.toContain('use client')
    const css = result.artifacts.find(
      (a) => a.logicalPath === 'components/ui/card.css',
    )!.content
    expect(css).toContain(`/* ${family} Card */`)
    expect(css).toContain('--card-padding: 1.5rem')
    expect(css).toContain("[data-slot='card'][data-density='dense']")
    expect(css).toContain('--card-padding: 1rem')
    expect(css).toContain(
      family === 'neo-brutalism'
        ? 'box-shadow: var(--shadow-x) var(--shadow-y) 0 var(--border)'
        : 'box-shadow: none',
    )
    for (const mode of ['light', 'dark'] as const) {
      expect(result.theme[mode]['--card']).toBe(
        preset.modes[mode].card.toLowerCase(),
      )
      expect(result.theme[mode]['--card-foreground']).toBe(
        preset.modes[mode].cardForeground.toLowerCase(),
      )
    }
    expect(result.dependencies).toEqual([
      { name: 'clsx', version: '2.1.1' },
      { name: 'react', version: '19.3.1' },
      { name: 'tailwind-merge', version: '3.7.0' },
    ])
  },
)

it('emits a six-part Card usage example with default and dense roots', async () => {
  const result = await compile({
    preset: getCatalog('0.1.0').presets.flat,
    componentIds: ['card'],
    catalogRelease: '0.1.0',
    compilerVersion: '0.1.0',
  })
  const usage = result.artifacts.find(
    (a) => a.logicalPath === 'examples/card.tsx',
  )!.content
  expect(usage).toContain("from '@/components/ui/card'")
  for (const part of [
    'Card',
    'CardHeader',
    'CardTitle',
    'CardDescription',
    'CardContent',
    'CardFooter',
  ])
    expect(usage).toContain(`<${part}>`)
  expect(usage).toContain('<Card density="dense">')
  expect(usage).not.toMatch(/onClick|tabIndex|role="button"/)
})

it.each(supportedStyleFamilies)(
  'deduplicates and orders Card inputs without changing existing %s artifacts',
  async (family) => {
    const input = {
      preset: getCatalog('0.1.0').presets[family],
      catalogRelease: '0.1.0',
      compilerVersion: '0.1.0',
    }
    const card = await compile({ ...input, componentIds: ['card'] })
    expect(await compile({ ...input, componentIds: ['card', 'card'] })).toEqual(
      card,
    )
    const legacy = await compile({
      ...input,
      componentIds: ['button', 'badge', 'dialog', 'input'],
    })
    const combined = await compile({
      ...input,
      componentIds: ['card', 'button', 'badge', 'dialog', 'input'],
    })
    expect(
      await compile({
        ...input,
        componentIds: ['input', 'card', 'dialog', 'badge', 'button', 'card'],
      }),
    ).toEqual(combined)
    for (const artifact of legacy.artifacts)
      expect(
        combined.artifacts.find((a) => a.logicalPath === artifact.logicalPath),
      ).toEqual(artifact)
    if (family === 'flat' || family === 'neo-brutalism')
      for (const artifact of baseline.families[family].artifacts)
        expect(
          combined.artifacts.find((a) => a.logicalPath === artifact.logicalPath)
            ?.sha256,
        ).toBe(artifact.sha256)
    expect(combined.dependencies).toEqual(legacy.dependencies)
  },
)
