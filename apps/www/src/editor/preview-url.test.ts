import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, expect, it, vi } from 'vitest'
import { blockStylesOrigin, previewFrameUrl } from './preview-url'
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
it('lets a block preview take its stylesheets only from its own origin or a loopback dev site', () => {
  // Hosted: the site frames the preview on its own origin, so the stylesheet path stays relative.
  expect(blockStylesOrigin('https://ombelle.example/blocks/login-01', 'https://ombelle.example/ombelle-preview/block-preview/?block=login-01&family=ombelle#light')).toBe('')
  // Development, as the site e2e runs it: the site on port 3000 frames the preview app on 4173. These are the values
  // the sandboxed frame reported: document.referrer and location.href (its self.origin is "null").
  expect(blockStylesOrigin('http://127.0.0.1:3000/', 'http://127.0.0.1:4173/block-preview/?block=login-01&family=ombelle#light')).toBe('http://127.0.0.1:3000')
  expect(blockStylesOrigin('http://[::1]:3000/blocks/login-01', 'http://[::1]:4173/block-preview/')).toBe('http://[::1]:3000')
  // An opaque own origin names no server, so nothing is trusted.
  expect(blockStylesOrigin('http://127.0.0.1:3000/', 'null')).toBe('')
  expect(blockStylesOrigin('null', 'http://127.0.0.1:4173/block-preview/')).toBe('')
  // Anything else falls back to the frame's own origin.
  for (const referrer of ['https://evil.example/', 'http://localhost:3000/', 'http://127.0.0.1:3000/', '', 'not a url', 'file:///C:/site/'])
    expect(blockStylesOrigin(referrer, 'https://ombelle.example/ombelle-preview/block-preview/')).toBe('')
  expect(blockStylesOrigin('https://evil.example/', 'http://127.0.0.1:4173/block-preview/')).toBe('')
  expect(blockStylesOrigin('http://localhost:3000/', 'http://127.0.0.1:4173/block-preview/')).toBe('')
})
