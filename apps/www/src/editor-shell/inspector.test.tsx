import { expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { ControlRow, InspectorSection, keepChoice, SegmentedControl, SliderRow, sliderThumbValue } from './inspector'

const noop = () => {}
const slider = {
  id: 'r',
  label: 'Corner radius',
  value: '0.75',
  min: 0,
  max: 2,
  step: 0.05,
  unit: 'rem',
  edited: true,
  onChange: noop,
  onReset: noop,
}

it('SliderRow puts the catalog slider on its own line and shows reset only when edited', () => {
  const html = renderToStaticMarkup(<SliderRow {...slider} />)
  expect(html).toContain('data-row="slider"')
  expect(html).toMatch(/role="slider"[^>]*aria-label="Corner radius slider"|aria-label="Corner radius slider"[^>]*role="slider"/)
  expect(html).toContain('inputMode="decimal"')
  expect(html).not.toContain('type="number"')
  expect(html).toContain('aria-label="Reset corner radius"')
  expect(renderToStaticMarkup(<SliderRow {...slider} edited={false} />)).not.toContain(
    'Reset corner radius',
  )
})

it('SliderRow uses the catalog Number Input for its value, with named steppers and its unit', () => {
  const html = renderToStaticMarkup(<SliderRow {...slider} />)
  expect(html).toMatch(/<input[^>]*id="r-number"[^>]*role="spinbutton"|<input[^>]*role="spinbutton"[^>]*id="r-number"/)
  expect(html).toContain('aria-valuenow="0.75"')
  expect(html).toContain('aria-valuemin="0"')
  expect(html).toContain('aria-valuemax="2"')
  expect(html).toContain('data-slot="number-input-unit" aria-hidden="true">rem<')
  expect(html).toContain('value="0.75"')
})

it('SliderRow links invalid state and description to both inputs', () => {
  const html = renderToStaticMarkup(<SliderRow {...slider} invalid describedBy="why" />)
  expect(html.match(/aria-invalid="true"/g)).toHaveLength(2)
  expect(html.match(/aria-describedby="why"/g)).toHaveLength(2)
})

it('SegmentedControl is a labelled radio group with one checked option', () => {
  const html = renderToStaticMarkup(
    <SegmentedControl
      label="Preview mode"
      value="dark"
      options={[
        { value: 'light', label: 'Light' },
        { value: 'dark', label: 'Dark' },
      ]}
      onChange={noop}
    />,
  )
  expect(html).toMatch(/role="radiogroup"[^>]*aria-label="Preview mode"|aria-label="Preview mode"[^>]*role="radiogroup"/)
  expect(html.match(/role="radio"/g)).toHaveLength(2)
  expect(html.match(/aria-checked="true"/g)).toHaveLength(1)
  expect(html.match(/aria-checked="false"/g)).toHaveLength(1)
  expect(html).not.toContain('aria-pressed')
})

it('SegmentedControl keeps its choice when the checked option is activated again', () => {
  const calls: string[] = []
  const change = keepChoice((value: string) => calls.push(value))
  change('')
  change('dark')
  expect(calls).toEqual(['dark'])
})

it('InspectorSection labels its section with the heading', () => {
  const html = renderToStaticMarkup(
    <InspectorSection id="shape" title="Shape" meta="2 edited">
      body
    </InspectorSection>,
  )
  expect(html).toContain('<section aria-labelledby="shape"')
  expect(html).toContain('<h2 id="shape"')
  expect(html).toContain('2 edited')
  expect(html).toContain('body')
})

it('ControlRow ties the label to its control and marks edited rows', () => {
  const html = renderToStaticMarkup(
    <ControlRow label="Name" htmlFor="n" edited>
      <input id="n" />
    </ControlRow>,
  )
  expect(html).toContain('<label')
  expect(html).toContain('for="n"')
  expect(html).toContain('data-edited="true"')
})

it('SliderRow parks the slider thumb at the minimum for partial or invalid text', () => {
  for (const value of ['-', 'invalid', '', '1.', '+5', ' 5'])
    expect(sliderThumbValue(value, undefined, 0, 2)).toBe(0)
  expect(sliderThumbValue('1.25', undefined, 0, 2)).toBe(1.25)
  // An empty field shows the value in effect.
  expect(sliderThumbValue('', '0.5', 0, 2)).toBe(0.5)
  // A value past the bounds sits at the nearer end, as a native range input does.
  expect(sliderThumbValue('500', undefined, 0, 48)).toBe(48)
  expect(sliderThumbValue('-3', undefined, 0, 48)).toBe(0)
  // The text field keeps what was typed.
  expect(renderToStaticMarkup(<SliderRow {...slider} value="-" />)).toContain('value="-"')
})
