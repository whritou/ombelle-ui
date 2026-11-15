import { describe, expect, it } from 'vitest'
import { componentRecipeFontRoles, compileComponentRecipe, compileRecipe } from '../src/index.js'
import { catalogRecipeFixtures } from '../../../tests/helpers/catalog-recipe-fixtures.js'
import button from '../../../examples/recipe.example.json'

const style = (result: { artifacts: { kind: string; content: string }[] }) =>
  result.artifacts.find((artifact) => artifact.kind === 'style')!.content
const names = (result: { dependencies: { name: string }[] }) => result.dependencies.map((dependency) => dependency.name)

describe('Button recipe fonts', () => {
  it('installs and imports the registry font a recipe names, and only then', async () => {
    const plain = await compileRecipe({ recipe: button })
    expect(style(plain)).not.toContain('@fontsource')
    const result = await compileRecipe({ recipe: { ...button, overrides: { ...button.overrides, fontFamilyId: 'instrument-sans' } } })
    expect(style(result)).toMatch(/^@import ['"]@fontsource-variable\/instrument-sans['"];/)
    expect(style(result)).toContain("'Instrument Sans Variable'")
    expect(names(result)).toContain('@fontsource-variable/instrument-sans')
    expect(names(plain)).not.toContain('@fontsource-variable/instrument-sans')
    expect(result.scope).not.toBe(plain.scope)
  })

  it('rejects a font that is not in the registry or cannot be a body font', async () => {
    for (const fontFamilyId of ['no-such-font', 'geist-mono'])
      await expect(compileRecipe({ recipe: { ...button, overrides: { fontFamilyId } } })).rejects.toMatchObject({ path: '/design/fontFamilyId' })
  })
})

describe('catalog recipe fonts', () => {
  const card = catalogRecipeFixtures().find((item) => item.component === 'card')!
  const fonts = { fontFamilyId: 'instrument-sans', headingFontFamilyId: 'fraunces', monoFontFamilyId: 'ibm-plex-mono' }

  it('installs the fonts the component uses and leaves out the ones it has no slot for', async () => {
    const result = await compileComponentRecipe({ recipe: { ...card, appearance: { fonts } } })
    const css = style(result)
    expect(css).toContain("@import '@fontsource-variable/fraunces'")
    expect(css).toContain("@import '@fontsource-variable/instrument-sans'")
    expect(css).toContain('--font-heading')
    expect(names(result)).toEqual(expect.arrayContaining(['@fontsource-variable/fraunces', '@fontsource-variable/instrument-sans']))
    // A Card shows no code, so the mono font is neither imported nor installed.
    expect(css).not.toContain('ibm-plex-mono')
    expect(names(result)).not.toContain('@fontsource/ibm-plex-mono')
  })

  it('keeps a recipe without fonts free of font packages', async () => {
    const { appearance: _fonts, ...plain } = card
    const result = await compileComponentRecipe({ recipe: plain })
    expect(style(result)).not.toContain('@fontsource')
    expect(names(result).some((name) => name.startsWith('@fontsource'))).toBe(false)
  })
})

describe('component font roles', () => {
  it('counts a mono font as used when the component styles read it, not only for the mono slots', async () => {
    const roles = (component: string) => componentRecipeFontRoles(component as never, 'ombelle')
    expect(roles('card')).toEqual({ heading: true, mono: false })
    const withMono = ['alert-dialog', 'carousel', 'code-block'].filter((component) => roles(component).mono)
    expect(withMono.length).toBeGreaterThan(0)
    const recipe = catalogRecipeFixtures().find((item) => item.component === withMono[0])!
    const result = await compileComponentRecipe({ recipe: { ...recipe, appearance: { fonts: { monoFontFamilyId: 'ibm-plex-mono' } } } })
    expect(names(result)).toContain('@fontsource/ibm-plex-mono')
  })
})
