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
  // The shared material's shadow list rides along on the Button; it is checked in liquid-glass.test.ts.
  expect(tokens[light]?.['--glass-material-shadow']).toContain('var(--glass-depth, 0)')
  delete tokens[light]!['--glass-material-shadow']
  expect(tokens[light]?.['--glass-plate']).toContain('var(--card)')
  delete tokens[light]!['--glass-plate']
  expect(tokens[light]).toEqual({
    '--glass-blur': '3px',
    '--glass-brightness': '1.4',
    '--glass-contrast': '0.45',
    '--glass-destructive-tint': '16%',
    '--glass-highlight': 'color-mix(in srgb, white 60%, transparent)',
    '--glass-nested-opacity': '0.69',
    '--glass-opacity': '0.57',
    '--glass-primary-tint': '18%',
    '--glass-saturation': '2',
    '--glass-sheen': '0.25',
    // The family's one-ink Button rule resets its tint and glow on the same selector.
    '--glass-glow': 'transparent',
    '--glass-tint': 'transparent',
    '--glass-tint-amount': '0%',
  })
  expect(tokens[`.night ${light},.night${light}`]).toEqual({
    '--glass-brightness': '0.6',
    '--glass-destructive-tint': '20%',
    '--glass-highlight': 'color-mix(in srgb, white 20%, transparent)',
    '--glass-nested-opacity': '0.92',
    '--glass-primary-tint': '22%',
    '--glass-sheen': '0.0625',
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
  failing.data.design.glassOpacity = 0.3
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
  expect(style).toContain('--glass-opacity: 0.5')
  expect(style).not.toContain('data-slot="button"')
})
const colorScope = 'c'.repeat(64)
const colorSelector = `[data-slot="recipe-button"][data-ombelle-recipe="${colorScope}"]`
async function colorCss(
  family: 'flat' | 'minimalist' | 'neo-brutalism' | 'liquid-glass',
  variant: 'default' | 'secondary' | 'outline' | 'ghost' | 'link' | 'destructive',
  colors: NonNullable<Parameters<typeof compileRecipeStyles>[0]['overrides']['colors']>,
) {
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
    overrides: { colors },
    scope: colorScope,
    darkSelector: '.dark',
    variant,
  })
  // Declarations of the first (token block) or last top-level rule with this exact selector.
  const decls = (selector: string, which: 'first' | 'last' = 'first') => {
    let out: Record<string, string> | undefined
    postcss.parse(css).walkRules((rule) => {
      if (rule.selector !== selector || rule.parent?.type !== 'root') return
      if (out && which === 'first') return
      out = {}
      rule.walkDecls((d) => {
        out![d.prop] = d.value
      })
    })
    return out ?? {}
  }
  return {
    css,
    light: decls(colorSelector),
    dark: decls(`.dark ${colorSelector},.dark${colorSelector}`),
    paint: decls(`${colorSelector}[data-variant="${variant}"]`, 'last'),
  }
}
it.each([
  ['default', '--primary', '--primary-foreground'],
  ['secondary', '--secondary', '--secondary-foreground'],
  ['destructive', '--destructive', '--destructive-foreground'],
  ['outline', '--card', '--card-foreground'],
  ['ghost', '--background', '--foreground'],
  ['link', '--background', '--foreground'],
] as const)(
  'maps %s color overrides to %s and %s in both modes',
  async (variant, background, foreground) => {
    const { light, dark } = await colorCss('flat', variant, {
      light: { background: '#AABBCC', foreground: '#112233', border: '#445566' },
      dark: { background: 'oklch(40% 0.1 200)', foreground: '#ddeeff' },
    })
    expect(light[background]).toBe('#aabbcc')
    expect(light[foreground]).toBe('#112233')
    expect(light['--border']).toBe('#445566')
    expect(dark[background]).toBe('oklch(0.4 0.1 200)')
    expect(dark[foreground]).toBe('#ddeeff')
    // An omitted dark border keeps the preset token.
    expect(dark['--border']).toBe(getCatalog('0.1.0').presets.flat.modes.dark.border!.toLowerCase())
  },
)
it('paints only the overridden roles that families do not read from the mapped token', async () => {
  const def = await colorCss('minimalist', 'default', { light: { background: '#ff0000' } })
  expect(def.paint).toEqual({})
  expect(def.css).not.toContain('[data-variant="default"]{')
  const border = await colorCss('minimalist', 'default', { dark: { border: '#00ff00' } })
  expect(border.paint).toEqual({ 'border-color': 'var(--border)' })
  const ghost = await colorCss('flat', 'ghost', { light: { background: '#ff0000' } })
  expect(ghost.paint).toEqual({ background: 'var(--background)' })
  // Flat draws outline Buttons transparent and neo-brutalism on the card: painting makes
  // the override show in every family.
  for (const family of ['flat', 'neo-brutalism'] as const) {
    const outline = await colorCss(family, 'outline', { light: { background: '#ff0000', foreground: '#00ff00' } })
    expect(outline.paint).toEqual({ background: 'var(--card)', color: 'var(--card-foreground)' })
  }
  const link = await colorCss('liquid-glass', 'link', {
    dark: { background: '#ff0000', foreground: '#00ff00' },
  })
  expect(link.paint).toEqual({ background: 'var(--background)', color: 'var(--foreground)' })
  // The paint rule follows the family rules so it wins at equal specificity.
  expect(link.css.indexOf(`${colorSelector}[data-variant="link"]{background:var`)).toBe(
    link.css.lastIndexOf(`${colorSelector}[data-variant="link"]{`),
  )
})
it('keeps color override output deterministic and unchanged without colors', async () => {
  const a = await colorCss('neo-brutalism', 'secondary', {
    dark: { foreground: '#ABCDEF', background: '#123456' },
    light: { border: 'oklch(0.5 0.1 20)' },
  })
  const b = await colorCss('neo-brutalism', 'secondary', {
    light: { border: 'oklch(50% 0.1 20)' },
    dark: { background: '#123456', foreground: '#abcdef' },
  })
  expect(a.css).toBe(b.css)
  const none = await colorCss('neo-brutalism', 'secondary', {})
  const catalog = getCatalog('0.1.0')
  const preset = (
    await compile({
      preset: catalog.presets['neo-brutalism'],
      componentIds: [],
      catalogRelease: '0.1.0',
      compilerVersion: '0.1.0',
    })
  ).preset
  expect(none.css).toBe(
    compileRecipeStyles({
      familyCss: catalog.styles['neo-brutalism'],
      preset,
      overrides: {},
      scope: colorScope,
      darkSelector: '.dark',
    }),
  )
})
it('glass recipe Button uses its shadow and border overrides', async () => {
  const { catalog, preset } = await glassPreset()
  const css = compileRecipeStyles({
    familyCss: catalog.styles['liquid-glass'],
    preset,
    overrides: { shadowOffsetYPx: 4, borderWidthPx: 2 },
    scope: glassScope,
    darkSelector: '.night',
  })
  const scope = `[data-slot="recipe-button"][data-ombelle-recipe="${glassScope}"]`
  // The last top-level rule on the scope carries the overrides, after the preset tokens.
  let last: Record<string, string> = {}
  const root = postcss.parse(css)
  root.each((node) => {
    if (node.type !== 'rule' || node.selector !== scope) return
    last = {}
    node.walkDecls((d) => {
      last[d.prop] = d.value
    })
  })
  expect(last).toMatchObject({ '--shadow-y': '4px', '--border-width': '2px' })
  // The scoped one-ink rules read those tokens for the glow and the edge.
  const body: string[] = []
  root.walkRules((rule) => {
    if (rule.parent?.type === 'root' && rule.selector === scope)
      rule.walkDecls((d) => {
        body.push(d.prop + ':' + d.value.replace(/\s+/g, ''))
      })
  })
  expect(body).toContain('border:var(--border-width)solidvar(--border)')
  expect(body.filter((d) => d.startsWith('box-shadow:')).join(';')).toContain('calc(var(--shadow-y)*0.5)')
  const flat = css.replace(/\s+/g, '')
  expect(flat).toContain('color:var(--foreground)')
  expect(flat).toContain(`${scope}[data-variant="default"]{--glass-tint:var(--primary)`)
})
it('glass recipe colour overrides apply over one ink', async () => {
  const fg = await colorCss('liquid-glass', 'default', { light: { foreground: '#112233' } })
  expect(fg.light['--primary-foreground']).toBe('#112233')
  expect(fg.paint).toEqual({ color: 'var(--primary-foreground)' })
  const sec = await colorCss('liquid-glass', 'secondary', { dark: { background: '#223344' } })
  expect(sec.dark['--secondary']).toBe('#223344')
  // Secondary is card glass: the override replaces the card this Button's glass reads.
  expect(sec.paint).toEqual({ '--card': 'var(--secondary)' })
  // Default and destructive read their background token as the glass tint.
  const def = await colorCss('liquid-glass', 'default', { light: { background: '#ff0000' } })
  expect(def.light['--primary']).toBe('#ff0000')
  expect(def.css).not.toContain('[data-variant="default"]{')
})
it.each(['default', 'secondary', 'destructive', 'outline'] as const)(
  'a one-mode glass %s foreground override leaves the other mode on the one-ink label',
  async (variant) => {
    const token = { default: '--primary-foreground', secondary: '--secondary-foreground', destructive: '--destructive-foreground', outline: '--card-foreground' }[variant]
    const lightOnly = await colorCss('liquid-glass', variant, { light: { foreground: '#112233' } })
    expect(lightOnly.light[token]).toBe('#112233')
    expect(lightOnly.dark[token]).toBe(lightOnly.dark['--foreground'])
    const darkOnly = await colorCss('liquid-glass', variant, { dark: { foreground: '#ddeeff' } })
    expect(darkOnly.dark[token]).toBe('#ddeeff')
    expect(darkOnly.light[token]).toBe(darkOnly.light['--foreground'])
    // Other families keep the preset token in the mode without an override.
    const flat = await colorCss('flat', variant, { light: { foreground: '#112233' } })
    expect(flat.dark[token]).toBe(getCatalog('0.1.0').presets.flat.modes.dark[token.slice(2).replace(/-(.)/g, (_, c: string) => c.toUpperCase()) as 'foreground']!.toLowerCase())
  },
)
it('a one-mode glass secondary background override leaves the other mode on card glass', async () => {
  const lightOnly = await colorCss('liquid-glass', 'secondary', { light: { background: '#223344' } })
  expect(lightOnly.light['--secondary']).toBe('#223344')
  expect(lightOnly.dark['--secondary']).toBe(lightOnly.dark['--card'])
  const darkOnly = await colorCss('liquid-glass', 'secondary', { dark: { background: '#223344' } })
  expect(darkOnly.light['--secondary']).toBe(darkOnly.light['--card'])
})
it.each(['outline', 'ghost'] as const)(
  'a glass %s background override replaces the colour of the glass mix instead of painting it solid',
  async (variant) => {
    const { css, paint } = await colorCss('liquid-glass', variant, { light: { background: '#ff0000' }, dark: { background: '#00ff00' } })
    const token = variant === 'outline' ? 'var(--card)' : 'var(--background)'
    // Without backdrop filters the override is opaque; outline keeps its hover tint.
    expect(paint).toEqual({
      background: variant === 'outline' ? `color-mix(in srgb, var(--glass-tint) var(--glass-tint-amount), ${token})` : token,
    })
    const selector = `${colorSelector}[data-variant="${variant}"]`
    const inSupports = (media?: string) => {
      const out: Record<string, string> = {}
      postcss.parse(css).walkRules((rule) => {
        if (rule.selector !== selector) return
        const parent = rule.parent
        const supports = media ? parent?.parent : parent
        if (supports?.type !== 'atrule' || (supports as postcss.AtRule).name !== 'supports') return
        if (media && (parent as postcss.AtRule).params !== media) return
        if (!media && supports.parent?.type !== 'root') return
        rule.walkDecls((d) => {
          out[d.prop] = d.value.replace(/\s+/g, '')
        })
      })
      return out
    }
    const glass = inSupports()
    if (variant === 'outline')
      expect(glass.background).toBe(
        'linear-gradient(tobottom,color-mix(insrgb,whitecalc(var(--glass-sheen)*100%),transparent),transparent60%),' +
          'color-mix(insrgb,color-mix(insrgb,var(--glass-tint)var(--glass-tint-amount),var(--card))calc(var(--glass-inner-opacity,calc(var(--glass-opacity)*0.6))*100%),transparent)',
      )
    else {
      // The ghost hover surface, in the override colour.
      expect(glass.background).toBe(
        'color-mix(insrgb,var(--background)calc(var(--glass-inner-opacity,var(--glass-opacity))*100%),transparent)',
      )
      expect(glass['backdrop-filter']).toContain('var(--glass-inner-filter,')
    }
    expect(inSupports('(prefers-reduced-transparency: reduce)')).toMatchObject({
      background: paint.background.replace(/\s+/g, ''),
      'backdrop-filter': 'none',
    })
    // The paint follows the family's glass rules, so it wins at equal specificity.
    expect(css.lastIndexOf('@supports')).toBeGreaterThan(css.indexOf(`${selector}{background:`))
  },
)
it('a one-mode glass outline background override leaves the other mode on background glass', async () => {
  const lightOnly = await colorCss('liquid-glass', 'outline', { light: { background: '#ff0000' } })
  expect(lightOnly.light['--card']).toBe('#ff0000')
  // Outline glass reads the overridden card token, which in dark falls back to the dark background.
  expect(lightOnly.dark['--card']).toBe(lightOnly.dark['--background'])
  const darkOnly = await colorCss('liquid-glass', 'outline', { dark: { background: '#ff0000' } })
  expect(darkOnly.light['--card']).toBe(darkOnly.light['--background'])
})
it('a one-mode glass ghost background override leaves the other mode with no surface at rest', async () => {
  const selector = `${colorSelector}[data-variant="ghost"]`
  const lightOnly = await colorCss('liquid-glass', 'ghost', { light: { background: '#ff0000' } })
  expect(lightOnly.light['--background']).toBe('#ff0000')
  expect(lightOnly.dark['--background']).toBe('transparent')
  // The glass surface and its filter apply only in the overridden mode.
  const flat = lightOnly.css.replace(/\s+/g, '')
  expect(flat).toContain(`${selector}:not(.dark,.dark*){-webkit-backdrop-filter:var(--glass-inner-filter,`)
  expect(flat).not.toContain(`${selector}{-webkit-backdrop-filter:var(--glass-inner-filter,`)
  const darkOnly = await colorCss('liquid-glass', 'ghost', { dark: { background: '#ff0000' } })
  expect(darkOnly.light['--background']).toBe('transparent')
  expect(darkOnly.css.replace(/\s+/g, '')).toContain(`.dark${selector},.dark${selector}{-webkit-backdrop-filter:var(--glass-inner-filter,`)
})
it('glass recipe overrides become scoped material tokens', async () => {
  const { catalog, preset } = await glassPreset()
  const scoped = (family: 'liquid-glass' | 'flat', p = preset) =>
    compileRecipeStyles({
      familyCss: catalog.styles[family],
      preset: p,
      overrides: { glassHalo: 0.9, glassDepth: 0.4, glassOpacity: 0.8 },
      scope: glassScope,
      darkSelector: '.dark',
    })
  const tokens: Record<string, string> = {}
  postcss.parse(scoped('liquid-glass')).walkDecls(/^--glass-/, (decl) => {
    if ((decl.parent as postcss.Rule).selector === `[data-slot="recipe-button"][data-ombelle-recipe="${glassScope}"]`)
      tokens[decl.prop] = decl.value
  })
  expect(tokens['--glass-halo']).toBe('0.9')
  expect(tokens['--glass-depth']).toBe('0.4')
  expect(tokens['--glass-opacity']).toBe('0.8')
  expect(tokens['--glass-material']).toBe('1')
  // A flat recipe ignores them: its preset may have changed family after the recipe was edited.
  const flat = (
    await compile({ preset: catalog.presets.flat, componentIds: [], catalogRelease: '0.1.0', compilerVersion: '0.1.0' })
  ).preset
  expect(scoped('flat', flat)).not.toMatch(/--glass-(halo|depth|opacity)/)
})
it('glass recipe overrides stay inside the contrast bound', async () => {
  const { catalog, preset } = await glassPreset()
  expect(() =>
    compileRecipeStyles({
      familyCss: catalog.styles['liquid-glass'],
      preset,
      overrides: { glassOpacity: 0.3 },
      scope: glassScope,
      darkSelector: '.dark',
    }),
  ).toThrow(expect.objectContaining({ code: 'INVALID_DATA', path: '/design/glassOpacity' }))
})

it('accepts the Dialog small-screen breakpoint in a family stylesheet and keeps it out of Button recipe styles', async () => {
  const { catalog, preset } = await glassPreset()
  const css = compileRecipeStyles({
    familyCss: catalog.styles['liquid-glass'] + "@media (max-width: 639.98px) { [data-slot='dialog-footer'] { flex-direction: column-reverse } }",
    preset,
    overrides: {},
    scope: glassScope,
    darkSelector: '.dark',
  })
  expect(css).not.toContain('dialog-footer')
  expect(() => compileRecipeStyles({
    familyCss: catalog.styles['liquid-glass'] + '@media (max-width: 500px) { [data-slot="button"] { color: red } }',
    preset, overrides: {}, scope: glassScope, darkSelector: '.dark',
  })).toThrow('Unsupported recipe style condition')
})
