import { describe, expect, it } from 'vitest'
import { getCatalog } from '@ombelle/catalog'
import { FoundationError } from '@ombelle/contracts'
import { compile } from '../src/compile.js'
import { compileRecipeStyles } from '../src/recipe-styles.js'
import { fontRuleBlock, resolveTypography } from '../src/typography.js'

const sansStack = "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif"
const catalog = getCatalog('0.1.0')
const squash = (css: string) => css.replace(/\s+/g, '').replace(/'/g, '"')
const art = (result: Awaited<ReturnType<typeof compile>>, logicalPath: string) =>
  result.artifacts.find((a) => a.logicalPath === logicalPath)!.content
const fonted = (design: Record<string, string>) => ({
  ...structuredClone(catalog.presets.ombelle),
  schemaVersion: '1.1',
  design: { ...catalog.presets.ombelle.design, ...design },
})
const trio = {
  fontFamilyId: 'inter',
  headingFontFamilyId: 'fraunces',
  monoFontFamilyId: 'jetbrains-mono',
}
const compileFonted = (design: Record<string, string>, componentIds: string[]) =>
  compile({
    preset: fonted(design),
    componentIds: componentIds as never,
    catalogRelease: '0.1.0',
    compilerVersion: '0.1.0',
  })

describe('resolveTypography', () => {
  it("reproduces today's system stacks", () => {
    expect(resolveTypography({})).toEqual({ family: sansStack, imports: [], dependencies: [] })
    expect(resolveTypography({ fontFamilyId: 'system-serif' }).family).toBe('Georgia, serif')
    expect(resolveTypography({ fontFamilyId: 'system-mono' }).family).toBe('monospace')
  })

  it('resolves registry fonts with imports and pinned dependencies', () => {
    const typography = resolveTypography(trio)
    expect(typography.family).toBe("'Inter Variable', system-ui, sans-serif")
    expect(typography.heading).toBe("'Fraunces Variable', Georgia, serif")
    expect(typography.mono).toBe("'JetBrains Mono Variable', ui-monospace, monospace")
    expect(typography.imports).toEqual([
      "@import '@fontsource-variable/fraunces';",
      "@import '@fontsource-variable/inter';",
      "@import '@fontsource-variable/jetbrains-mono';",
    ])
    expect(typography.dependencies).toEqual([
      { name: '@fontsource-variable/fraunces', version: '5.3.0' },
      { name: '@fontsource-variable/inter', version: '5.3.0' },
      { name: '@fontsource-variable/jetbrains-mono', version: '5.3.0' },
    ])
  })

  it('imports one font used twice only once', () => {
    const typography = resolveTypography({ fontFamilyId: 'geist', headingFontFamilyId: 'geist' })
    expect(typography.imports).toEqual(["@import '@fontsource-variable/geist';"])
    expect(typography.dependencies).toEqual([{ name: '@fontsource-variable/geist', version: '5.3.0' }])
  })

  it('imports every static weight of a static font', () => {
    expect(resolveTypography({ monoFontFamilyId: 'space-mono' }).imports).toEqual([
      "@import '@fontsource/space-mono/400.css';",
      "@import '@fontsource/space-mono/700.css';",
    ])
  })

  it.each([
    [{ fontFamilyId: 'young-serif' }, '/design/fontFamilyId'],
    [{ fontFamilyId: 'jetbrains-mono' }, '/design/fontFamilyId'],
    [{ monoFontFamilyId: 'inter' }, '/design/monoFontFamilyId'],
    [{ headingFontFamilyId: 'jetbrains-mono' }, '/design/headingFontFamilyId'],
    [{ fontFamilyId: 'not-a-font' }, '/design/fontFamilyId'],
  ])('refuses a font in the wrong role %j', (design, path) => {
    try {
      resolveTypography(design)
      expect.fail('expected rejection')
    } catch (error) {
      expect(error).toBeInstanceOf(FoundationError)
      expect(error).toMatchObject({ code: 'INVALID_DATA', path })
    }
  })
})

describe('fontRuleBlock', () => {
  it('is empty without a heading or mono font', () => {
    expect(fontRuleBlock(resolveTypography({ fontFamilyId: 'inter' }))).toBe('')
  })
  it('targets title slots with the heading font and code slots with the mono font', () => {
    const block = squash(fontRuleBlock(resolveTypography(trio)))
    expect(block).toContain('[data-slot="card-title"]{font-family:var(--font-heading)}')
    expect(block).toContain('[data-slot="kbd"]{font-family:var(--font-mono)}')
  })
  it('emits only the heading rules when only a heading font is set', () => {
    const block = squash(fontRuleBlock(resolveTypography({ headingFontFamilyId: 'fraunces' })))
    expect(block).toContain('var(--font-heading)')
    expect(block).not.toContain('var(--font-mono)')
  })
})

describe('compile with typography', () => {
  it('writes the import first, the tokens, the rule block and the pinned dependencies', async () => {
    const result = await compileFonted(trio, ['card', 'kbd'])
    const tokens = art(result, 'styles/ui-tokens.css')
    expect(tokens.startsWith('@import')).toBe(true)
    // The CLI installs ui-style.css, not ui-tokens.css, so the imports lead it too.
    expect(art(result, 'styles/ui-style.css').startsWith('@import')).toBe(true)
    expect(tokens).toContain('--font-heading:')
    expect(tokens).toContain('--font-mono:')
    // The compiler formats CSS, which adds the trailing semicolon.
    expect(squash(art(result, 'styles/ui-style.css'))).toContain(
      '[data-slot="card-title"]{font-family:var(--font-heading);}',
    )
    expect(result.dependencies).toEqual(
      expect.arrayContaining([
        { name: '@fontsource-variable/inter', version: '5.3.0' },
        { name: '@fontsource-variable/fraunces', version: '5.3.0' },
        { name: '@fontsource-variable/jetbrains-mono', version: '5.3.0' },
      ]),
    )
  })

  it('still emits the imports and dependencies when no components are installed', async () => {
    const result = await compileFonted(trio, [])
    expect(art(result, 'styles/ui-tokens.css').startsWith('@import')).toBe(true)
    expect(art(result, 'styles/ui-style.css').startsWith('@import')).toBe(true)
    expect(result.dependencies.map((d) => d.name)).toEqual([
      '@fontsource-variable/fraunces',
      '@fontsource-variable/inter',
      '@fontsource-variable/jetbrains-mono',
    ])
  })

  it.each(['flat', 'minimalist', 'neo-brutalism', 'ombelle'] as const)(
    'adds nothing for the %s preset without fonts',
    async (family) => {
      const result = await compile({
        preset: catalog.presets[family],
        componentIds: ['card', 'kbd'],
        catalogRelease: '0.1.0',
        compilerVersion: '0.1.0',
      })
      const tokens = art(result, 'styles/ui-tokens.css')
      expect(tokens).not.toContain('@import')
      expect(tokens).not.toContain('--font-heading')
      expect(tokens).not.toContain('--font-mono')
      expect(art(result, 'styles/ui-style.css')).not.toContain('--font-heading')
      expect(art(result, 'styles/ui-style.css').startsWith('@import')).toBe(false)
      expect(result.dependencies.some((d) => d.name.startsWith('@fontsource'))).toBe(false)
    },
  )

  it('keeps the family design for a preset that sets only system ids under 1.1', async () => {
    const result = await compileFonted({ fontFamilyId: 'system-serif' }, ['card'])
    expect(art(result, 'styles/ui-tokens.css')).toContain('Georgia, serif')
    expect(art(result, 'styles/ui-tokens.css')).not.toContain('@import')
  })
})

describe('scoped button recipes', () => {
  it('resolve a registry body font without importing it', async () => {
    const preset = (await compileFonted({ fontFamilyId: 'inter' }, [])).preset
    const css = compileRecipeStyles({
      familyCss: catalog.styles.ombelle,
      preset,
      overrides: { minHeightPx: 44 },
      scope: 'a'.repeat(64),
      darkSelector: '.night',
    })
    expect(css).toContain('Inter Variable')
    expect(css).not.toContain('@import')
    expect(css).not.toContain('Roboto')
  })
})
