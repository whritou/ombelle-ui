import { expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { createCatalogDraft } from '../catalog-draft'
import { CatalogProperties } from './catalog-properties'

const noop = () => {}
const panel = (component: Parameters<typeof createCatalogDraft>[0]) =>
  renderToStaticMarkup(<CatalogProperties recipe={createCatalogDraft(component).recipe} update={noop} />)
const tagOf = (html: string, pattern: RegExp) => html.match(pattern)?.[0] ?? ''

it('shows boolean fields as small switches in horizontal field rows', () => {
  const html = panel('checkbox')
  const disabled = tagOf(html, /<label[^>]*data-slot="field-label"[^>]*>Disabled<\/label>/)
  expect(disabled).toBeTruthy()
  const id = disabled.match(/for="([^"]+)"/)![1]
  const control = tagOf(html, new RegExp(`<button[^>]*id="${id}"[^>]*>`))
  expect(control).toContain('role="switch"')
  expect(control).toContain('data-size="sm"')
  expect(html).toMatch(/data-slot="field"[^>]*data-orientation="horizontal"|data-orientation="horizontal"[^>]*data-slot="field"/)
  // Radix keeps a hidden, aria-hidden input for forms; no visible native checkbox remains.
  expect(html).not.toMatch(/<input type="checkbox"(?![^>]*aria-hidden="true")/)
})

it('offers the checkbox option layout and its description', () => {
  const html = panel('checkbox')
  expect(html).toContain('Option layout')
  expect(html).toMatch(/<option value="card">card<\/option>/)
  expect(html).toMatch(/Description<textarea/)
})

it('shows multi-choice fields as checkbox option rows named by each choice', () => {
  const recipe = createCatalogDraft('accordion').recipe
  const content = recipe.content as { items: { id: string; label: string }[] }
  const items = [...content.items, { ...content.items[0]!, id: 'pricing', label: 'Pricing' }]
  const html = renderToStaticMarkup(<CatalogProperties recipe={{ ...recipe, content: { ...content, items } } as typeof recipe} update={noop} />)
  expect(html).toContain('data-slot="checkbox-option-title">Pricing</span>')
  const rows = html.match(/data-slot="checkbox-option"/g) ?? []
  expect(rows.length).toBeGreaterThan(1)
  expect(html).toMatch(/data-slot="checkbox-option-title">[^<]+<\/span>/)
  // Radix keeps a hidden, aria-hidden input for forms; no visible native checkbox remains.
  expect(html).not.toMatch(/<input type="checkbox"(?![^>]*aria-hidden="true")/)
})

it('edits the 0.7.6 lists that start empty, with Add and Remove', () => {
  const html = panel('checkbox')
  expect(html).toContain('Group')
  expect(html).toMatch(/<button[^>]*>Add Options<\/button>/)
  const recipe = createCatalogDraft('field').recipe
  const filled = renderToStaticMarkup(<CatalogProperties recipe={{ ...recipe, content: { ...recipe.content, fields: ['Preset name', 'Radius'] } } as typeof recipe} update={noop} />)
  expect(filled.match(/>Remove Fields \d<\/button>/g)).toHaveLength(2)
  expect(filled).toMatch(/<button[^>]*>Add Fields<\/button>/)
})
