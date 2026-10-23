import { expect, it } from 'vitest'
import { getCatalog } from '@ombelle/catalog'
import postcss from 'postcss'
import { canonicalize, compileButtonPreset, sha256 } from '../src/index.js'

const catalog = getCatalog('0.1.0')
const scopedButtonSelector = (scope: string) =>
  `[data-slot=scoped-button][data-ombelle-scope=${scope}]`
const normalizeSelectorQuotes = (selector: string) =>
  selector.replace(/["']/g, '')

it.each(['flat', 'minimalist', 'neo-brutalism'] as const)(
  'compiles isolated %s Button preset artifacts',
  async (family) => {
    const preset = catalog.presets[family]
    const result = await compileButtonPreset({ preset })
    const component = result.artifacts.find(
      (artifact) => artifact.kind === 'component',
    )!
    const style = result.artifacts.find(
      (artifact) => artifact.kind === 'style',
    )!
    const usage = result.artifacts.find(
      (artifact) => artifact.kind === 'usage',
    )!

    expect(result.preset.data.styleFamily).toBe(family)
    expect(result.provenance).toEqual({
      catalogRelease: '0.1.0',
      compilerVersion: '0.1.0',
    })
    expect(result.darkSelector).toBe('.dark')
    expect(result.scope).toMatch(/^[a-f0-9]{64}$/)
    expect(result.artifacts.map((artifact) => artifact.logicalPath)).toEqual([
      `examples/scoped-presets/builtin-${family}/r1.tsx`,
      'lib/utils.ts',
      `scoped-presets/builtin-${family}/r1/button.css`,
      `scoped-presets/builtin-${family}/r1/button.tsx`,
    ])
    for (const artifact of result.artifacts)
      expect(await sha256(artifact.content)).toBe(artifact.sha256)

    expect(component.content).toContain("import './button.css'")
    expect(component.content).toContain('export function Button(')
    expect(component.content).toContain('data-slot="scoped-button"')
    expect(component.content).toContain(`data-ombelle-scope="${result.scope}"`)
    expect(component.content).not.toContain('Slot')
    expect(component.content).not.toContain('asChild')
    expect(component.content.indexOf('{...props}')).toBeLessThan(
      component.content.indexOf('data-ombelle-scope='),
    )
    expect(
      result.dependencies.map((dependency) => dependency.name),
    ).not.toContain('@radix-ui/react-slot')

    expect(usage.content).toContain(
      `from '@/components/ui/scoped-presets/builtin-${family}/r1/button'`,
    )
    expect(usage.content).toContain('<Button')

    const selectors: string[] = []
    postcss.parse(style.content).walkRules((rule) => {
      selectors.push(rule.selector)
    })
    expect(selectors.length).toBeGreaterThan(0)
    expect(
      selectors.filter((selector) => {
        const normalized = normalizeSelectorQuotes(selector)
        return (
          !normalized.includes('[data-slot=scoped-button]') ||
          !normalized.includes(`[data-ombelle-scope=${result.scope}]`)
        )
      }),
    ).toEqual([])
    expect(style.content).not.toMatch(/:root|@theme/)
    expect(style.content).not.toContain('data-slot="button"')
  },
)

it('includes complete local mode tokens and resolved Button defaults', async () => {
  const base = catalog.presets.flat
  const preset = {
    ...base,
    id: 'brand-buttons',
    name: 'Brand Buttons',
    revision: 3,
    modes: {
      light: { ...base.modes.light, primary: '#123456' },
      dark: { ...base.modes.dark, primary: '#abcdef' },
    },
    design: { ...base.design, radiusRem: 0.5, density: 'compact' as const },
    componentDefaults: {
      button: { variant: 'destructive' as const, size: 'lg' as const },
    },
  }
  const result = await compileButtonPreset({ preset, darkSelector: '.night' })
  const style = result.artifacts.find((artifact) => artifact.kind === 'style')!
  const component = result.artifacts.find(
    (artifact) => artifact.kind === 'component',
  )!
  const declarations: { property: string; value: string; selector: string }[] =
    []
  postcss.parse(style.content).walkDecls((declaration) => {
    declarations.push({
      property: declaration.prop,
      value: declaration.value,
      selector:
        declaration.parent?.type === 'rule' ? declaration.parent.selector : '',
    })
  })

  expect(result.preset.data.componentDefaults?.button).toEqual({
    variant: 'destructive',
    size: 'lg',
  })
  expect(component.content).toContain("variant = 'destructive'")
  expect(component.content).toContain("size = 'lg'")
  expect(style.content).toContain('--radius: 0.5rem')
  expect(style.content).toContain('--control-height: 2.25rem')

  const missingLightTokens = Object.entries(result.preset.data.modes.light)
    .filter(
      ([name, value]) =>
        !declarations.some(
          (declaration) =>
            declaration.property ===
              '--' +
                name.replace(/[A-Z]/g, (match) => '-' + match.toLowerCase()) &&
            declaration.value === value &&
            normalizeSelectorQuotes(declaration.selector).includes(
              scopedButtonSelector(result.scope),
            ),
        ),
    )
    .map(([name, value]) => ({ name, value }))
  const missingDarkTokens = Object.entries(result.preset.data.modes.dark)
    .filter(
      ([name, value]) =>
        !declarations.some(
          (declaration) =>
            declaration.property ===
              '--' +
                name.replace(/[A-Z]/g, (match) => '-' + match.toLowerCase()) &&
            declaration.value === value &&
            declaration.selector.includes('.night') &&
            normalizeSelectorQuotes(declaration.selector).includes(
              scopedButtonSelector(result.scope),
            ),
        ),
    )
    .map(([name, value]) => ({ name, value }))
  expect(missingLightTokens).toEqual([])
  expect(missingDarkTokens).toEqual([])
})

it('derives a stable scope from resolved preset provenance, independent of dark selector', async () => {
  const preset = catalog.presets.minimalist
  const dark = await compileButtonPreset({ preset })
  const night = await compileButtonPreset({ preset, darkSelector: '.night' })
  const expectedScope = await sha256(
    canonicalize({
      presetHash: dark.preset.hash,
      ...dark.provenance,
    }),
  )

  expect(dark.scope).toBe(expectedScope)
  expect(night.scope).toBe(dark.scope)
  expect(
    night.artifacts.find((artifact) => artifact.kind === 'style')?.content,
  ).toContain('.night')
})

it('rejects unsupported preset/compiler releases and unsafe dark selectors', async () => {
  const preset = catalog.presets.flat
  await expect(
    compileButtonPreset({ preset: { ...preset, catalogRelease: '9.0.0' } }),
  ).rejects.toMatchObject({ code: 'UNSUPPORTED_RELEASE' })
  await expect(
    compileButtonPreset({ preset: { ...preset, compilerVersion: '9.0.0' } }),
  ).rejects.toMatchObject({ code: 'UNSUPPORTED_RELEASE' })
  await expect(
    compileButtonPreset({ preset, darkSelector: '.dark,body' }),
  ).rejects.toMatchObject({ code: 'UNSUPPORTED_PROJECT' })
})
