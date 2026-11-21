// SEC-02: published recipes must not point links at protocol-relative, backslash or plain-HTTP targets.
import { expect, it } from 'vitest'
import { validateComponentRecipe } from '../src/index.js'
import { catalogRecipeFixtures } from '../../../tests/helpers/catalog-recipe-fixtures.js'

const fixture = (component: string) => catalogRecipeFixtures().find(item => item.component === component)!
const nav = fixture('navigation-menu') as unknown as { content: { items: { href?: string; links?: { href: string }[] }[] } }
const withNavHref = (href: string, nested = false) => {
  const recipe = structuredClone(nav)
  const item = recipe.content.items.find(entry => (nested ? entry.links?.length : entry.href !== undefined))!
  if (nested) item.links![0].href = href
  else item.href = href
  return recipe
}
const crumbs = fixture('breadcrumb') as unknown as { content: { items: { href: string }[] } }
const withCrumbHref = (href: string) => {
  const recipe = structuredClone(crumbs)
  recipe.content.items[0].href = href
  return recipe
}

const backslash = '/' + String.fromCharCode(92) + 'evil.example'
it.each(['//evil.example/login', backslash,'http://evil.example/', 'javascript:alert(1)', 'evil.example'])(
  'refuses Navigation Menu link %s, top-level and nested', (href) => {
    expect(() => validateComponentRecipe(withNavHref(href))).toThrow()
    expect(() => validateComponentRecipe(withNavHref(href, true))).toThrow()
  })
it.each(['/docs', '/', '#section', 'https://example.com/docs'])('accepts Navigation Menu link %s', (href) => {
  expect(() => validateComponentRecipe(withNavHref(href))).not.toThrow()
  expect(() => validateComponentRecipe(withNavHref(href, true))).not.toThrow()
})
it('refuses a backslash Breadcrumb link that browsers read as protocol-relative', () => {
  expect(() => validateComponentRecipe(withCrumbHref(backslash))).toThrow()
  expect(() => validateComponentRecipe(withCrumbHref('/projects'))).not.toThrow()
})
