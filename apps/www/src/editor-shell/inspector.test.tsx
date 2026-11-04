import { expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { ControlRow, InspectorSection, SegmentedControl, SliderRow } from './inspector'

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

it('SliderRow puts the range on its own line and shows reset only when edited', () => {
  const html = renderToStaticMarkup(<SliderRow {...slider} />)
  expect(html).toContain('data-row="slider"')
  expect(html).toContain('type="range"')
  expect(html).toContain('type="number"')
  expect(html).toContain('aria-label="Reset corner radius"')
  expect(renderToStaticMarkup(<SliderRow {...slider} edited={false} />)).not.toContain(
    'Reset corner radius',
  )
})

it('SliderRow links invalid state and description to both inputs', () => {
  const html = renderToStaticMarkup(<SliderRow {...slider} invalid describedBy="why" />)
  expect(html.match(/aria-invalid="true"/g)).toHaveLength(2)
  expect(html.match(/aria-describedby="why"/g)).toHaveLength(2)
})

it('SegmentedControl exposes one pressed option in a labelled group', () => {
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
  expect(html).toContain('role="group" aria-label="Preview mode"')
  expect(html.match(/aria-pressed="true"/g)).toHaveLength(1)
  expect(html.match(/aria-pressed="false"/g)).toHaveLength(1)
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
