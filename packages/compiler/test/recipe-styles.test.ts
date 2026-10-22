import { expect, it } from 'vitest'
import { getCatalog } from '@ombelle/catalog'
import { compile } from '../src/compile.js'
import {
  compileScopedStyles,
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
it('uses explicit slot and scope-attribute inputs for scoped style compilation', async () => {
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
  const css = compileScopedStyles({
    familyCss: catalog.styles.flat,
    preset,
    overrides: {},
    scope,
    darkSelector: '.night',
    slot: 'scoped-button',
    scopeAttribute: 'data-ombelle-scope',
  })
  const rules: postcss.Rule[] = []
  postcss.parse(css).walkRules((rule) => {
    rules.push(rule)
  })

  expect(css).toContain(
    `[data-slot="scoped-button"][data-ombelle-scope="${scope}"]`,
  )
  expect(css).toContain('.night')
  expect(css).not.toContain('data-ombelle-recipe')
  expect(css).not.toContain('[data-slot="button"]')
  expect(rules.length).toBeGreaterThan(0)
  for (const rule of rules) {
    expect(rule.selector).toContain('data-slot="scoped-button"')
    expect(rule.selector).toContain(`data-ombelle-scope="${scope}"`)
  }
})
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
  const preset = (await compile({preset:catalog.presets.flat, componentIds:[], catalogRelease:'0.1.0', compilerVersion:'0.1.0'})).preset
  for (const familyCss of [':not([data-slot="button"]){color:red}', '[data-slot="button"] > span{color:red}']) {
    expect(() => compileRecipeStyles({familyCss, preset, overrides:{}, scope:'c'.repeat(64), darkSelector:'.dark'})).toThrow()
  }
})
