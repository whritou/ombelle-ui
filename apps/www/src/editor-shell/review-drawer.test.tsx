import { expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { ReviewDrawer } from './review-drawer'

const noop = () => {}
const tabs = [
  { id: 'checks', label: 'Checks', icon: null, badge: 1, content: 'x' },
  { id: 'export', label: 'Export', icon: null, content: 'y' },
]

it('closed ReviewDrawer renders a rail whose button names the badge count', () => {
  const html = renderToStaticMarkup(
    <ReviewDrawer label="Review" open={false} onOpenChange={noop} activeTab="checks" onTabChange={noop} tabs={tabs} />,
  )
  expect(html).toContain('aria-label="Open checks: 1 warning"')
  expect(html).toContain('aria-label="Open export"')
  expect(html).toContain('aria-expanded="false"')
  expect(html).not.toContain('role="tabpanel"')
})

it('open ReviewDrawer renders tabs and a close button', () => {
  const html = renderToStaticMarkup(
    <ReviewDrawer label="Review" open onOpenChange={noop} activeTab="checks" onTabChange={noop} tabs={tabs} />,
  )
  expect(html).toContain('role="tablist"')
  expect(html.match(/aria-selected="true"/g)).toHaveLength(1)
  expect(html).toContain('role="tabpanel"')
  expect(html).toContain('aria-label="Close review"')
  expect(html).toContain('>x<')
  expect(html).not.toContain('>y<')
})
