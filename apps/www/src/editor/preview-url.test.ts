import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, expect, it, vi } from 'vitest'
import { previewFrameUrl } from './preview-url'
import { PreviewFrame } from './components/preview-frame'
import { PresetPreviewFrame } from '../preset-editor/components/preset-preview-frame'
afterEach(() => vi.unstubAllEnvs())
it.each(['editor', 'preset'] as const)('uses a hosted %s path by default', kind => {
  expect(previewFrameUrl(kind)).toBe(`/ombelle-preview/${kind}-preview/`)
  expect(previewFrameUrl(kind)).not.toMatch(/127\.0\.0\.1|localhost|[A-Z]:\\/)
})
it.each(['http://127.0.0.1:4173', 'http://[::1]:4173', 'https://127.0.0.1:4173'])('allows an explicit literal loopback dev origin %s', origin => {
  expect(previewFrameUrl('editor', origin)).toBe(origin + '/editor-preview/')
})
it.each(['javascript:alert(1)', '//example.com', 'file:///tmp/preview', 'http://localhost:4173', 'http://127.1:4173', 'https://127.1:4173', 'https://example.com', 'http://user:password@127.0.0.1:4173', 'http://127.0.0.1:4173/path', 'http://127.0.0.1:4173?query=1', 'http://127.0.0.1:4173/#hash'])('rejects unsafe override %s', origin => {
  expect(() => previewFrameUrl('preset', origin)).toThrow(/loopback|origin/i)
})
it('keeps both hosted iframes opaque with scripts as their only sandbox privilege', () => {
  vi.stubEnv('NEXT_PUBLIC_OMBELLE_PREVIEW_ORIGIN', '')
  const editor = renderToStaticMarkup(createElement(PreviewFrame, { result: null, view: { mode: 'light', viewport: 'wide', forcedState: 'none', panel: 'customize' } }))
  const preset = renderToStaticMarkup(createElement(PresetPreviewFrame, { result: null, view: { mode: 'light', viewport: 'wide' }, stale: false, onStatus() {} }))
  for (const [html, kind] of [[editor, 'editor'], [preset, 'preset']]) {
    expect(html).toContain(`src="/ombelle-preview/${kind}-preview/"`)
    expect(html).toContain('sandbox="allow-scripts"')
    expect(html).not.toContain('allow-same-origin')
  }
})
