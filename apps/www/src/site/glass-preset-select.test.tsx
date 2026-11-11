import { expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { GlassPresetSelect } from './glass-preset-select'

const noop = () => {}

it('names a searchable combobox after its label and shows the chosen preset', () => {
  const html = renderToStaticMarkup(<GlassPresetSelect label="Glass preset" value="builtin-liquid-glass" onChange={noop} />)
  const id = /<label[^>]*for="([^"]+)"[^>]*>Glass preset</.exec(html)![1]
  const input = new RegExp(`<input[^>]*id="${id}"[^>]*>`).exec(html)![0]
  expect(input).toContain('role="combobox"')
  expect(input).toMatch(/value="[^"]+"/)
})

it('offers the standard preview when no preset is required', () => {
  expect(renderToStaticMarkup(<GlassPresetSelect value={undefined} allowNone onChange={noop} />)).toContain('value="Standard preview"')
})
