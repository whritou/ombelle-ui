import { expect, it } from 'vitest'
import postcss from 'postcss'
import { recipeIcons } from '@ombelle/contracts'
import { compileRecipe } from '../src/recipe.js'
import example from '../../../examples/recipe.example.json'

type Fields = Record<string, unknown>
const squash = (selector: string) => selector.replace(/\s+/g, '').replaceAll("'", '"')

async function compiled(extra: { overrides?: Fields; icon?: unknown; props?: Fields } = {}) {
  const result = await compileRecipe({
    recipe: {
      ...example,
      ...(extra.icon ? { icon: extra.icon } : {}),
      props: { ...example.props, ...extra.props },
      overrides: { ...example.overrides, ...extra.overrides },
    },
  })
  const file = (kind: string) => result.artifacts.find((a) => a.kind === kind)!.content
  const scope = `[data-slot="recipe-button"][data-ombelle-recipe="${result.scope}"]`
  // Top-level rules by selector, compared without the formatter's whitespace and quote style.
  const rules = new Map<string, Record<string, string>>()
  postcss.parse(file('style')).walkRules((rule) => {
    if (rule.parent?.type !== 'root') return
    const selector = squash(rule.selector)
    const decls: Record<string, string> = { ...rules.get(selector) }
    rule.walkDecls((d) => {
      decls[d.prop] = d.value
    })
    rules.set(selector, decls)
  })
  const rule = (suffix: string) => rules.get(squash(scope + suffix))
  return { result, file, scope, rules, rule, css: squash(file('style')) }
}

it('keeps recipes without the new fields free of their rules and of lucide-react', async () => {
  const plain = await compiled()
  expect(plain.file('component')).not.toContain('lucide-react')
  expect(plain.css).not.toMatch(/padding-inline|letter-spacing|text-transform|:hover:not\(\.dark/)
  expect(plain.result.dependencies.map((d) => d.name)).not.toContain('lucide-react')
  expect(plain.result.recipe.data).not.toHaveProperty('icon')
})

it('applies padding to the text sizes only, leaving the icon size square', async () => {
  const { rule, css } = await compiled({ overrides: { paddingXPx: 20, paddingYPx: 6 } })
  expect(rule('[data-size]:not([data-size="icon"])')).toEqual({ 'padding-block': '6px', 'padding-inline': '20px' })
  expect(rule('[data-size="icon"]')).toMatchObject({ padding: '0.5rem' })
  // Emitted after the family's size rules and more specific than them.
  expect(css.indexOf('padding-inline:20px')).toBeGreaterThan(css.lastIndexOf('[data-size="sm"]'))
  const onlyX = await compiled({ overrides: { paddingXPx: 0 } })
  expect(onlyX.rule('[data-size]:not([data-size="icon"])')).toEqual({ 'padding-inline': '0px' })
})

it('maps gap and typography overrides onto the scoped Button', async () => {
  const { rule } = await compiled({
    overrides: { gapPx: 10, fontWeight: 700, fontSizePx: 15, letterSpacingEm: 0.05, uppercase: true },
  })
  expect(rule('')).toMatchObject({
    gap: '10px',
    'font-weight': '700',
    'font-size': '15px',
    'letter-spacing': '0.05em',
    'text-transform': 'uppercase',
  })
  expect((await compiled({ overrides: { uppercase: false } })).rule('')).toMatchObject({ 'text-transform': 'none' })
})

it('renders a leading or trailing lucide icon and adds the pinned dependency', async () => {
  const start = await compiled({ icon: { name: 'arrow-right' } })
  const source = start.file('component')
  expect(source).toContain("import { ArrowRight } from 'lucide-react'")
  expect(source).toMatch(/<ArrowRight[\s\S]*?aria-hidden="true"[\s\S]*?\/>\s*\{children\}/)
  expect(source).toContain('data-icon-position="start"')
  expect(start.result.recipe.data.icon).toEqual({ name: 'arrow-right', position: 'start', iconOnly: false })
  expect(start.result.dependencies).toContainEqual({ name: 'lucide-react', version: '1.55.0' })
  expect(start.rule('>svg')).toEqual({ 'flex-shrink': '0', height: '1.25em', width: '1.25em' })
  const end = await compiled({ icon: { name: 'trash', position: 'end' } })
  expect(end.file('component')).toMatch(/\{children\}\s*<Trash/)
  expect(end.file('component')).toContain("import { Trash } from 'lucide-react'")
})

it('renders icon-only Buttons with the content as their accessible label', async () => {
  const { file, rule } = await compiled({ icon: { name: 'plus', iconOnly: true } })
  const source = file('component')
  expect(source).toContain("'aria-label': ariaLabel = 'Create project'")
  expect(source).toContain('aria-label={ariaLabel}')
  expect(source).toContain('data-icon-only=""')
  expect(source).not.toContain('{children}')
  expect(source).toMatch(/Omit<\s*React\.ComponentProps<'button'>,\s*'children'\s*>/)
  expect(file('usage')).toContain("aria-label={'Create project'}")
  expect(file('usage')).not.toContain('</RecipeButton>')
  expect(rule('[data-icon-only][data-size]')).toEqual({
    'aspect-ratio': '1 / 1',
    'justify-content': 'center',
    'padding-inline': '0',
  })
})

it.each(['default', 'outline', 'ghost', 'link'] as const)(
  'paints %s hover and pressed colors per mode after the family state rules',
  async (variant) => {
    const { rule, rules, css } = await compiled({
      props: { variant },
      overrides: {
        colors: {
          light: { hoverBackground: '#AABBCC', pressedForeground: 'oklch(40% 0.1 200)' },
          dark: { hoverForeground: '#ffffff', hoverBorder: '#000000' },
        },
      },
    })
    const state = `[data-variant="${variant}"]:not(:disabled)`
    expect(rule(`${state}:hover:not(.dark,.dark *)`)).toEqual({ background: '#aabbcc' })
    expect(rule(`${state}:active:not(.dark,.dark *)`)).toEqual({ color: 'oklch(0.4 0.1 200)' })
    const dark = [...rules.entries()].filter(([selector]) => selector.startsWith('.dark') && selector.includes(':not(:disabled)'))
    expect(dark).toHaveLength(1)
    expect(dark[0]![0]).toMatch(/:hover$/)
    expect(dark[0]![1]).toEqual({ 'border-color': '#000000', color: '#ffffff' })
    // State rules follow the family rules and the scoped overrides, so they also win where specificity ties.
    expect(css.indexOf(':hover:not(.dark,.dark*)')).toBeGreaterThan(css.indexOf('min-height:44px'))
  },
)

it('keeps the family state colors in a mode without its own override', async () => {
  const { rules } = await compiled({ overrides: { colors: { light: { hoverBackground: '#ff0000' } } } })
  expect([...rules.keys()].some((selector) => selector.startsWith('.dark') && selector.includes(':hover'))).toBe(false)
})

it('compiles every reviewed icon, with or without explicit defaults, to the same bytes', async () => {
  for (const [name, exportName] of Object.entries(recipeIcons)) {
    const a = await compiled({ icon: { name } })
    const b = await compiled({ icon: { name, position: 'start', iconOnly: false } })
    expect(a.file('component')).toContain(`import { ${exportName} } from 'lucide-react'`)
    expect(a.result.artifacts).toEqual(b.result.artifacts)
    expect(a.result.recipe.hash).toBe(b.result.recipe.hash)
  }
})
