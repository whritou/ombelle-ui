import { expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { drawerFocusId, ReviewDrawer } from './review-drawer'

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
  // The drawer and its tablist have distinct names, and the open tab's badge stays out of its name.
  expect(html).toContain('<aside aria-label="Review"')
  expect(html).toContain('role="tablist" aria-label="Review sections"')
  expect(html).toMatch(/role="tab"[^>]*>Checks<span[^>]*aria-hidden="true"[^>]*>1<\/span>/)
  expect(html.match(/aria-selected="true"/g)).toHaveLength(1)
  expect(html).toContain('role="tabpanel"')
  expect(html).toContain('aria-label="Close review"')
  expect(html).toContain('>x<')
  expect(html).not.toContain('>y<')
})

it('gives each focus target an id that matches where focus is restored', () => {
  const closed = renderToStaticMarkup(
    <ReviewDrawer label="Review" open={false} onOpenChange={noop} activeTab="checks" onTabChange={noop} tabs={tabs} />,
  )
  const open = renderToStaticMarkup(
    <ReviewDrawer label="Review" open onOpenChange={noop} activeTab="checks" onTabChange={noop} tabs={tabs} />,
  )
  expect(closed).toContain(`id="${drawerFocusId(false, 'checks')}"`)
  expect(open).toContain(`id="${drawerFocusId(true, 'checks')}"`)
})
