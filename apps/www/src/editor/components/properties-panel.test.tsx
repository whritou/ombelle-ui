import { expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { validateRecipe } from '@ombelle/contracts'
import exampleRecipe from '../../../../../examples/recipe.example.json'
import { withRecipeColor, withRecipeIcon, withRecipeOverride } from '../model'
import { glassControlHints } from '../../preset-editor/model'
import { PropertiesPanel, VariantPicker, shownNumber } from './properties-panel'

const noop = () => {}
const recipe = validateRecipe(exampleRecipe)
const panel = (value = recipe) =>
  renderToStaticMarkup(<PropertiesPanel recipe={value} family="flat" onFamily={noop} diagnostic={null} onChange={noop} onDiagnostic={noop} />)

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
  // Disabled, Loading and Uppercase; Icon only appears once an icon is chosen.
  expect(html.match(/role="switch"/g)).toHaveLength(3)
  expect(html).toContain('aria-checked="false"')
})

it('orders the inspector sections as the canvas does', () => {
  const html = panel()
  const titles = ['Content', 'Variant', 'Size &amp; behavior', 'Icon', 'Padding &amp; gap', 'Typography', 'Colors', 'Shape &amp; depth']
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

it('offers bounded padding, gap and typography sliders with resets once edited', () => {
  const html = panel()
  for (const [id, min, max, step] of [
    ['paddingXPx', 0, 48, 1], ['paddingYPx', 0, 24, 1], ['gapPx', 0, 24, 1],
    ['fontWeight', 300, 800, 100], ['fontSizePx', 11, 24, 1], ['letterSpacingEm', -0.05, 0.2, 0.01],
  ] as const) {
    expect(html).toContain(`id="button-${id}-number"`)
    expect(html).toMatch(new RegExp(`id="button-${id}"[^>]*min="${min}" max="${max}" step="${step}"`))
  }
  expect(html).not.toContain('aria-label="Reset horizontal padding"')
  const edited = panel(withRecipeOverride(withRecipeOverride(recipe, 'paddingXPx', 20), 'uppercase', true))
  expect(edited).toContain('aria-label="Reset horizontal padding"')
  expect(edited).toMatch(/id="button-uppercase"[^>]*aria-checked="true"/)
})

it('offers icons, a position and an icon-only mode that relabels the content field', () => {
  const html = panel()
  expect(html).toContain('<option value="" selected="">None</option>')
  expect(html).toContain('<option value="arrow-right">Arrow right</option>')
  expect(html).not.toContain('aria-label="Icon position"')
  const withIcon = panel(withRecipeIcon(recipe, { name: 'arrow-right' }))
  expect(withIcon).toContain('aria-label="Icon position"')
  expect(withIcon).toContain('aria-label="Remove icon"')
  expect(withIcon).toContain('>Button text<')
  const only = panel(withRecipeIcon(recipe, { name: 'plus', iconOnly: true }))
  expect(only).toContain('>Accessible label<')
  expect(only).toMatch(/id="button-icon-only"[^>]*aria-checked="true"/)
  expect(only).toContain('aria-describedby="button-text-hint"')
})

it('switches the color fields between base, hover and pressed states', () => {
  const html = panel()
  expect(html).toContain('role="group" aria-label="Color state"')
  expect(html).toContain('aria-label="Light background"')
})

it('Button editor relabels shadow and border overrides for glass', () => {
  const render = (family: 'flat' | 'liquid-glass') =>
    renderToStaticMarkup(<PropertiesPanel recipe={recipe} family={family} onFamily={noop} diagnostic={null} onChange={noop} onDiagnostic={noop} />)
  const glass = render('liquid-glass')
  for (const label of ['Glass shadow X', 'Glass shadow Y', 'Glass edge width', 'Glass edge colour'])
    expect(glass).toContain(label)
  for (const hint of Object.values(glassControlHints)) expect(glass).toContain(hint)
  expect(glass).not.toContain('Shadow X offset')
  expect(glass).not.toContain('>Border width<')
  const flat = render('flat')
  expect(flat).toContain('Shadow X offset')
  expect(flat).toContain('Border width')
  expect(flat).not.toContain('Glass shadow')
  expect(flat).not.toContain('Glass edge')
  for (const hint of Object.values(glassControlHints)) expect(flat).not.toContain(hint)
})

it('Button editor describes the glass edge colour fields with their hint', () => {
  const render = (family: 'flat' | 'liquid-glass') =>
    renderToStaticMarkup(<PropertiesPanel recipe={recipe} family={family} onFamily={noop} diagnostic={null} onChange={noop} onDiagnostic={noop} />)
  const glass = render('liquid-glass')
  expect(glass).toContain(`<p id="color-role-border-hint" class="colorHint">${glassControlHints.border}</p>`)
  for (const mode of ['light', 'dark'])
    expect(glass).toMatch(new RegExp(`id="color-${mode}-border"[^>]*aria-describedby="color-role-border-hint"`))
  expect(glass.match(/aria-describedby="color-role-border-hint"/g)).toHaveLength(4)
  const flat = render('flat')
  expect(flat).not.toContain('color-role-border-hint')
})

it('the Button editor shows material sliders for glass recipes only', () => {
  const render = (family: 'flat' | 'liquid-glass', value = recipe) =>
    renderToStaticMarkup(<PropertiesPanel recipe={value} family={family} onFamily={noop} diagnostic={null} onChange={noop} onDiagnostic={noop} />)
  const flat = render('flat')
  expect(flat).not.toContain('id="inspector-glass-material"')
  expect(flat).not.toContain('button-glassHalo')
  const glass = render('liquid-glass')
  expect(glass).toContain('id="inspector-glass-material"')
  for (const key of ['glassOpacity', 'glassBlurPx', 'glassBackdropContrast', 'glassSheen', 'glassRim', 'glassHalo', 'glassDepth', 'glassMotion', 'glassDispersion'])
    expect(glass).toContain(`id="button-${key}"`)
  expect(glass).toContain('Pointer halo')
  // An override shows its value and a reset; the rest follow the preset.
  const edited = render('liquid-glass', withRecipeOverride(recipe, 'glassHalo', 0.9))
  expect(edited).toMatch(/id="button-glassHalo-number"[^>]*value="0.9"/)
})
