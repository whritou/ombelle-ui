import { expect, it } from 'vitest'
import { getCatalog } from '@ombelle/catalog'
import { compile } from '../src/compile.js'
import { compileRecipeStyles, validateRecipeDarkSelector } from '../src/recipe-styles.js'
import postcss from 'postcss'
it.each(['flat', 'minimalist', 'neo-brutalism'] as const)('isolates %s styles with complete tokens and media rules', async family => {
  const catalog = getCatalog('0.1.0'), preset = (await compile({ preset: catalog.presets[family], componentIds: [], catalogRelease: '0.1.0', compilerVersion: '0.1.0' })).preset
  const css = compileRecipeStyles({ familyCss: catalog.styles[family], preset, overrides: { minHeightPx: 44 }, scope: 'a'.repeat(64), darkSelector: '.night' })
  expect(css).toContain('data-slot="recipe-button"')
  expect(css).toContain('data-ombelle-recipe=')
  expect(css).toContain('.night')
  expect(css).toContain('prefers-reduced-motion')
  expect(css).toContain('--primary:')
  expect(css).not.toMatch(/:root|@theme|data-slot="(?:button|input|dialog)/)
  expect(css.lastIndexOf('min-height:44px')).toBeGreaterThan(css.indexOf('[data-size="lg"]'))
})
it('validates the whole dark selector and trusted CSS selectors', () => {
  expect(validateRecipeDarkSelector('.theme-dark')).toBe('.theme-dark')
  for (const selector of ['.dark,body', 'body.dark', '.dark .other', ':root', '.a\\b']) expect(() => validateRecipeDarkSelector(selector)).toThrow()
})
it('does not let a more specific dark block undo saved design overrides', async () => {
  const catalog=getCatalog('0.1.0'), preset=(await compile({preset:catalog.presets.flat,componentIds:[],catalogRelease:'0.1.0',compilerVersion:'0.1.0'})).preset
  const css=compileRecipeStyles({familyCss:catalog.styles.flat,preset,overrides:{radiusRem:0},scope:'b'.repeat(64),darkSelector:'.dark'})
  const darkRules:string[]=[]
  postcss.parse(css).walkRules(rule=>{if(rule.selector.startsWith('.dark'))rule.walkDecls('--radius',d=>{darkRules.push(d.value)})})
  expect(darkRules.every(v=>v==='0rem')).toBe(true)
})
