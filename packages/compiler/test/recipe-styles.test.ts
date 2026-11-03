import { expect, it } from 'vitest'
import { getCatalog, resolveRecipePreset } from '@ombelle/catalog'
import { compile } from '../src/compile.js'
import { compileRecipe } from '../src/recipe.js'
import example from '../../../examples/recipe.example.json'
import {
  compileScopedButtonStyles,
  compileRecipeStyles,
  validateRecipeDarkSelector,
} from '../src/recipe-styles.js'
import postcss from 'postcss'
it.each(['flat', 'minimalist', 'neo-brutalism'] as const)(
  'isolates %s styles with complete tokens and media rules',
  async (family) => {
    const catalog = getCatalog('0.1.0'),
      preset = (
        await compile({
          preset: catalog.presets[family],
          componentIds: [],
          catalogRelease: '0.1.0',
          compilerVersion: '0.1.0',
        })
      ).preset
    const css = compileRecipeStyles({
      familyCss: catalog.styles[family],
      preset,
      overrides: { minHeightPx: 44 },
      scope: 'a'.repeat(64),
      darkSelector: '.night',
    })
    expect(css).toContain('data-slot="recipe-button"')
    expect(css).toContain('data-ombelle-recipe=')
    expect(css).toContain('.night')
    expect(css).toContain('prefers-reduced-motion')
    expect(css).toContain('--primary:')
    expect(css).not.toMatch(/:root|@theme|data-slot="(?:button|input|dialog)/)
    expect(css.lastIndexOf('min-height:44px')).toBeGreaterThan(
      css.indexOf('[data-size="lg"]'),
    )
  },
)
it('validates the whole dark selector and trusted CSS selectors', () => {
  expect(validateRecipeDarkSelector('.theme-dark')).toBe('.theme-dark')
  for (const selector of [
    '.dark,body',
    'body.dark',
    '.dark .other',
    ':root',
    '.a\\b',
  ])
    expect(() => validateRecipeDarkSelector(selector)).toThrow()
})
it('compiles button styles with explicit slot and scope attributes', async () => {
  const catalog = getCatalog('0.1.0')
  const preset = (
    await compile({
      preset: catalog.presets.flat,
      componentIds: [],
      catalogRelease: '0.1.0',
      compilerVersion: '0.1.0',
    })
  ).preset
  const scope = 'd'.repeat(64)
  const css = compileScopedButtonStyles({
    familyCss: catalog.styles.flat,
    preset,
    overrides: {},
    scope,
    darkSelector: '.night',
    slot: 'scoped-button',
    scopeAttribute: 'data-ombelle-scope',
  })
  const selectors: string[] = []
  postcss.parse(css).walkRules((rule) => {
    selectors.push(rule.selector)
  })

  expect(selectors.length).toBeGreaterThan(0)
  expect(
    selectors.every(
      (selector) =>
        selector.replace(/["']/g, '').includes('[data-slot=scoped-button]') &&
        selector.replace(/["']/g, '').includes(`[data-ombelle-scope=${scope}]`),
    ),
  ).toBe(true)
  expect(css).toContain('.night')
  expect(css).not.toContain('data-ombelle-recipe')
  expect(css).not.toContain('data-slot="button"')
})
it('does not let a more specific dark block undo saved design overrides', async () => {
  const catalog = getCatalog('0.1.0'),
    preset = (
      await compile({
        preset: catalog.presets.flat,
        componentIds: [],
        catalogRelease: '0.1.0',
        compilerVersion: '0.1.0',
      })
    ).preset
  const css = compileRecipeStyles({
    familyCss: catalog.styles.flat,
    preset,
    overrides: { radiusRem: 0 },
    scope: 'b'.repeat(64),
    darkSelector: '.dark',
  })
  const darkRules: string[] = []
  postcss.parse(css).walkRules((rule) => {
    if (rule.selector.startsWith('.dark'))
      rule.walkDecls('--radius', (d) => {
        darkRules.push(d.value)
      })
  })
  expect(darkRules.every((v) => v === '0rem')).toBe(true)
})
it('rejects inverse or nested slot selectors instead of producing rules outside the recipe element', async () => {
  const catalog = getCatalog('0.1.0')
  const preset = (
    await compile({
      preset: catalog.presets.flat,
      componentIds: [],
      catalogRelease: '0.1.0',
      compilerVersion: '0.1.0',
    })
  ).preset
  for (const familyCss of [
    ':not([data-slot="button"]){color:red}',
    '[data-slot="button"] > span{color:red}',
  ]) {
    expect(() =>
      compileRecipeStyles({
        familyCss,
        preset,
        overrides: {},
        scope: 'c'.repeat(64),
        darkSelector: '.dark',
      }),
    ).toThrow()
  }
})
const glassScope = 'e'.repeat(64)
const glassScopeSelector = `[data-slot=recipe-button][data-ombelle-recipe=${glassScope}]`
async function glassPreset() {
  const catalog = getCatalog('0.1.0')
  const preset = (
    await compile({
      preset: catalog.presets['liquid-glass'],
      componentIds: [],
      catalogRelease: '0.1.0',
      compilerVersion: '0.1.0',
    })
  ).preset
  return { catalog, preset }
}
it('scopes glass at-rules', async () => {
  const { catalog, preset } = await glassPreset()
  const css = compileRecipeStyles({
    familyCss: catalog.styles['liquid-glass'],
    preset,
    overrides: {},
    scope: glassScope,
    darkSelector: '.dark',
  })
  const root = postcss.parse(css)
  const nested: string[] = []
  root.walkAtRules((atRule) => {
    if (
      atRule.name === 'supports' ||
      atRule.params === '(prefers-reduced-transparency: reduce)'
    )
      atRule.walkRules((rule) => {
        nested.push(rule.selector)
      })
  })
  const supports = root.nodes.filter(
    (node): node is postcss.AtRule =>
      node.type === 'atrule' && node.name === 'supports',
  )
  expect(supports).toHaveLength(1)
  expect(supports[0].params).toBe(
    '((backdrop-filter: blur(1px)) or (-webkit-backdrop-filter: blur(1px)))',
  )
  expect(css).toContain('@media (prefers-reduced-transparency: reduce)')
  expect(nested.length).toBeGreaterThan(0)
  for (const selector of nested)
    for (const part of selector.split(','))
      expect(part.trim().replace(/["']/g, '').startsWith(glassScopeSelector)).toBe(
        true,
      )
  expect(css).not.toMatch(/data-slot=["'](?:button|input|dialog)/)
  expect(css).not.toContain('svg')
})
it('scoped glass tokens', async () => {
  const { catalog, preset } = await glassPreset()
  const css = compileRecipeStyles({
    familyCss: catalog.styles['liquid-glass'],
    preset,
    overrides: {},
    scope: glassScope,
    darkSelector: '.night',
  })
  const tokens: Record<string, Record<string, string>> = {}
  postcss.parse(css).walkDecls(/^--glass-/, (decl) => {
    const selector = (decl.parent as postcss.Rule).selector
    ;(tokens[selector] ??= {})[decl.prop] = decl.value
  })
  const light = `[data-slot="recipe-button"][data-ombelle-recipe="${glassScope}"]`
  expect(tokens[light]).toEqual({
    '--glass-blur': '12px',
    '--glass-highlight': 'color-mix(in srgb, white 35%, transparent)',
    '--glass-opacity': '0.87',
  })
  expect(tokens[`.night ${light},.night${light}`]).toEqual({
    '--glass-highlight': 'color-mix(in srgb, white 12%, transparent)',
  })
})
it('scoped glass tokens go opaque when transparency is reduced', async () => {
  const { catalog, preset } = await glassPreset()
  const reduced = structuredClone(preset)
  reduced.data.design.transparency = 'reduced'
  const css = compileRecipeStyles({
    familyCss: catalog.styles['liquid-glass'],
    preset: reduced,
    overrides: {},
    scope: glassScope,
    darkSelector: '.dark',
  })
  expect(css).toContain('--glass-blur:0px;')
  expect(css).toContain('--glass-opacity:1;')
})
it.each(['flat', 'minimalist', 'neo-brutalism'] as const)(
  'emits no glass tokens for %s',
  async (family) => {
    const catalog = getCatalog('0.1.0')
    const preset = (
      await compile({
        preset: catalog.presets[family],
        componentIds: [],
        catalogRelease: '0.1.0',
        compilerVersion: '0.1.0',
      })
    ).preset
    const css = compileRecipeStyles({
      familyCss: catalog.styles[family],
      preset,
      overrides: {},
      scope: glassScope,
      darkSelector: '.dark',
    })
    expect(css).not.toContain('--glass-')
  },
)
it('still rejects other at-rules', async () => {
  const { catalog, preset } = await glassPreset()
  for (const extra of [
    '@container (min-width: 1px) { [data-slot="button"] { color: red } }',
    '@supports (display: grid) { [data-slot="button"] { color: red } }',
    '@media (prefers-reduced-transparency: no-preference) { [data-slot="button"] { color: red } }',
    '@supports ((backdrop-filter: blur(1px)) or (-webkit-backdrop-filter: blur(1px))) { @container (min-width: 1px) { [data-slot="button"] { color: red } } }',
  ])
    expect(() =>
      compileRecipeStyles({
        familyCss: catalog.styles['liquid-glass'] + extra,
        preset,
        overrides: {},
        scope: glassScope,
        darkSelector: '.dark',
      }),
    ).toThrow('Unsupported recipe style condition')
})
it('accepts the exact glass @supports condition across whitespace', async () => {
  const { preset } = await glassPreset()
  const css = compileRecipeStyles({
    familyCss:
      '@supports (\n  (backdrop-filter: blur(1px)) or\n    (-webkit-backdrop-filter: blur(1px))\n) { [data-slot="button"] { color: red } }',
    preset,
    overrides: {},
    scope: glassScope,
    darkSelector: '.dark',
  })
  expect(css).toContain('@supports')
  expect(css).toContain(
    `[data-slot="recipe-button"][data-ombelle-recipe="${glassScope}"]`,
  )
  expect(css).not.toContain('data-slot="button"')
})
it('rejects glass presets that fail the contrast bound', async () => {
  const { catalog, preset } = await glassPreset()
  const failing = structuredClone(preset)
  failing.data.design.glassOpacity = 0.6
  expect(() =>
    compileRecipeStyles({
      familyCss: catalog.styles['liquid-glass'],
      preset: failing,
      overrides: {},
      scope: glassScope,
      darkSelector: '.dark',
    }),
  ).toThrow(
    expect.objectContaining({
      code: 'INVALID_DATA',
      path: '/design/glassOpacity',
      message: expect.stringMatching(/^Liquid glass text contrast fails in /),
    }),
  )
})
it('builtin-liquid-glass recipe compiles', async () => {
  const presetRef = {
    id: 'builtin-liquid-glass',
    revision: 1,
    catalogRelease: '0.1.0',
    compilerVersion: '0.1.0',
  }
  expect(resolveRecipePreset(presetRef).styleFamily).toBe('liquid-glass')
  const result = await compileRecipe({
    recipe: { ...example, presetRef },
  })
  const style = result.artifacts.find((a) => a.kind === 'style')!.content
  expect(result.preset.data.styleFamily).toBe('liquid-glass')
  expect(style).toContain('@supports')
  expect(style).toContain('--glass-opacity: 0.87')
  expect(style).not.toContain('data-slot="button"')
})
