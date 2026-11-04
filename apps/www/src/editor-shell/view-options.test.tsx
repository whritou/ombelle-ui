import { expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { SegmentedControl } from './inspector'
import { previewModeOptions, previewWidthOptions } from './view-options'

const noop = () => {}

it('shows a decorative icon beside each preview mode label', () => {
  const html = renderToStaticMarkup(
    <SegmentedControl label="Preview mode" value="light" options={previewModeOptions} onChange={noop} />,
  )
  expect(html.match(/<svg[^>]*aria-hidden="true"/g)).toHaveLength(2)
  expect(html).toContain('Light')
  expect(html).toContain('Dark')
})

it('shows icons for both widths and keeps each editor narrow label', () => {
  const html = renderToStaticMarkup(
    <SegmentedControl label="Preview width" value="wide" options={previewWidthOptions('320 px')} onChange={noop} />,
  )
  expect(html.match(/<svg[^>]*aria-hidden="true"/g)).toHaveLength(2)
  expect(html).toContain('Wide')
  expect(html).toContain('320 px')
})
