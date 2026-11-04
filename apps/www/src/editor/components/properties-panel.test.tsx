import { expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { validateRecipe } from '@ombelle/contracts'
import exampleRecipe from '../../../../../examples/recipe.example.json'
import { withRecipeColor } from '../model'
import { PropertiesPanel, VariantPicker, shownNumber } from './properties-panel'

const noop = () => {}
const recipe = validateRecipe(exampleRecipe)
const panel = (value = recipe) =>
  renderToStaticMarkup(<PropertiesPanel recipe={value} diagnostic={null} onChange={noop} onDiagnostic={noop} />)

it('VariantPicker presses default for the example recipe and offers all six variants', () => {
  const html = renderToStaticMarkup(<VariantPicker value={recipe.props.variant ?? 'default'} onChange={noop} />)
  const buttons = html.split('<button').slice(1)
  expect(buttons).toHaveLength(6)
  expect(html).toContain('role="group" aria-label="Variant"')
  const pressed = buttons.filter((button) => button.includes('aria-pressed="true"'))
  expect(pressed).toHaveLength(1)
  expect(pressed[0]).toContain('data-variant="default"')
  for (const variant of ['default', 'secondary', 'outline', 'ghost', 'link', 'destructive'])
    expect(html).toContain(`data-variant="${variant}"`)
})

it('shows an inherited color as Preset with no reset button', () => {
  const html = panel()
  expect(html).toContain('Preset')
  expect(html).toContain('data-inherited="true"')
  expect(html).not.toContain('Reset light background')
  expect(html).not.toContain('Reset dark text')
})

it('offers a reset only for an overridden color value', () => {
  const html = panel(withRecipeColor(recipe, 'dark', 'foreground', '#ffffff'))
  expect(html).toContain('aria-label="Reset dark text to preset"')
  expect(html).not.toContain('aria-label="Reset light text to preset"')
  expect(html).toContain('value="#ffffff"')
})

it('labels the button type group and switches', () => {
  const html = panel()
  expect(html).toContain('role="group" aria-label="Button type"')
  expect(html).toContain('role="group" aria-label="Size"')
  expect(html.match(/role="switch"/g)).toHaveLength(2)
  expect(html).toContain('aria-checked="false"')
})

it('orders the inspector sections as the canvas does', () => {
  const html = panel()
  const titles = ['Content', 'Variant', 'Size &amp; behavior', 'Colors', 'Shape &amp; depth']
  const positions = titles.map((title) => html.indexOf(`>${title}</h2>`))
  expect(positions.every((position) => position >= 0)).toBe(true)
  expect([...positions].sort((a, b) => a - b)).toEqual(positions)
})

it('shows typed number text only while its error is reported or it spells the saved value', () => {
  expect(shownNumber('3', 1.5, 0, 2, true)).toBe('3')
  expect(shownNumber('3', 1.5, 0, 2, false)).toBe('1.5')
  expect(shownNumber('1.', 1, 0, 2, false)).toBe('1.')
  expect(shownNumber('1.2', 1, 0, 2, false)).toBe('1')
  expect(shownNumber(undefined, undefined, 0, 2, false)).toBe('')
})

it('keeps the recipe ID read-only in the top bar', async () => {
  const { renderToStaticMarkup: render } = await import('react-dom/server')
  const { ButtonEditor } = await import('./button-editor')
  const html = render(<ButtonEditor />)
  expect(html).toMatch(/<input id="button-recipe-id"[^>]*readOnly=""/)
})
