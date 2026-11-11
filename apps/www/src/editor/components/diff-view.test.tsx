import { expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { DiffView } from './diff-view'

it('renders + and − in text, and the skip row', () => {
  const html = renderToStaticMarkup(<DiffView rows={[
    { kind: 'skip', count: 17 },
    { kind: 'same', text: 'kept', before: 18, after: 18 },
    { kind: 'remove', text: 'removed', before: 19 },
    { kind: 'add', text: 'added', after: 19 },
  ]} added={1} removed={1} />)
  expect(html).toContain('+ added')
  expect(html).toContain('− removed')
  expect(html).toContain('17 unchanged lines')
  expect(html).toContain('+1 −1')
  expect(html).not.toContain('aria-hidden')
})

it('says when a file has no change', () => {
  expect(renderToStaticMarkup(<DiffView rows={[{ kind: 'same', text: 'a', before: 1, after: 1 }]} added={0} removed={0} />))
    .toContain('No change from the catalog default.')
})

it('names the changes on a region, not on the pre', () => {
  const html = renderToStaticMarkup(<DiffView rows={[{ kind: 'add', text: 'x', after: 1 }]} added={1} removed={0} id="changes" />)
  expect(html).toMatch(/<div[^>]*role="region"[^>]*aria-label="Changes: 1 added, 0 removed"/)
  expect(html).not.toMatch(/<pre[^>]*aria-label/)
})
