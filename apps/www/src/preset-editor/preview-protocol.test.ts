import { beforeAll, expect, it } from 'vitest'
import { compile, sha256 } from '@ombelle/compiler'
import { getCatalogPresets } from '@ombelle/catalog/presets'
import {
  componentsWithStyleSupport,
  supportedComponentIds,
  supportedStyleFamilies,
  type CompileResult,
} from '@ombelle/contracts'
import { handlePresetCompileMessage } from './compile-protocol'
import { createPresetDraft, materializePreset } from './model'
import type { PresetSourceManifest } from '../../../../scripts/generate-preset-gallery'
import {
  verifyPresetRender,
  verifyGallerySources,
  presetRuntimeStyles,
  isPresetHandshake,
  isPresetAck,
  verifyPresetTokens,
  presetHashOf,
  maxPresetRenderBytes,
} from './preview-protocol'

let result: CompileResult, manifest: PresetSourceManifest
beforeAll(async () => {
  result = await compile({
    preset: getCatalogPresets('0.1.0').presets.flat,
    componentIds: supportedComponentIds,
    catalogRelease: '0.1.0',
    compilerVersion: '0.1.0',
  })
  manifest = {
    catalogRelease: '0.1.0',
    compilerVersion: '0.1.0',
    sources: Object.fromEntries(
      await Promise.all(
        result.artifacts
          .filter((a) => a.kind === 'component' || a.kind === 'utility')
          .map(async (a) => [
            a.logicalPath,
            {
              canonicalHash: a.sha256,
              transformedHash: await sha256(a.content),
            },
          ]),
      ),
    ),
  }
})
const message = () => ({
  type: 'preset-render',
  requestId: 1,
  result: structuredClone(result),
  view: { mode: 'light', viewport: 'wide' },
})
it('accepts only a complete current compiler result with matching reviewed source', async () => {
  expect(await verifyPresetRender(message(), 0, manifest)).toEqual(message())
  expect(await verifyPresetRender(message(), 1, manifest)).toBeNull()
  const css = presetRuntimeStyles(result)
  expect(css).toContain(':root')
  expect(css).not.toContain('@theme')
  expect(
    await verifyGallerySources(
      manifest,
      Object.fromEntries(
        result.artifacts
          .filter((a) => a.kind === 'component' || a.kind === 'utility')
          .map((a) => [a.logicalPath, async () => a.content]),
      ),
    ),
  ).toBe(true)
  expect(await verifyGallerySources(manifest, {})).toBe(false)
})
it('accepts a focused view only for a catalog component', async () => {
  const focused = { ...message(), view: { mode: 'dark', viewport: 'wide', focus: 'tabs' } }
  expect(await verifyPresetRender(focused, 0, manifest)).toEqual(focused)
  for (const focus of ['unknown', '', 1, null, '__proto__'])
    expect(
      await verifyPresetRender({ ...message(), view: { mode: 'light', viewport: 'wide', focus } }, 0, manifest),
    ).toBeNull()
})
it('accepts a named scene, treats a missing scene as the gallery and rejects unknown scenes', async () => {
  for (const scene of ['gallery', 'dashboard', 'projects', 'settings', 'sign-in']) {
    const scened = { ...message(), view: { mode: 'light', viewport: 'wide', scene } }
    expect(await verifyPresetRender(scened, 0, manifest)).toEqual(scened)
  }
  expect(await verifyPresetRender(message(), 0, manifest)).not.toBeNull()
  for (const scene of ['billing', '', 1, null, '__proto__', 'Settings'])
    expect(
      await verifyPresetRender({ ...message(), view: { mode: 'light', viewport: 'wide', scene } }, 0, manifest),
    ).toBeNull()
  // A scene and a focus are alternatives, never combined.
  expect(
    await verifyPresetRender(
      { ...message(), view: { mode: 'light', viewport: 'wide', scene: 'settings', focus: 'tabs' } },
      0,
      manifest,
    ),
  ).toBeNull()
})
it.each([
  'css',
  'hash',
  'source',
  'provenance',
  'duplicate',
  'missing',
  'extra',
  'huge',
  'manifest',
])('rejects %s tampering', async (kind) => {
  const input = message(),
    expected = structuredClone(manifest)
  if (kind === 'css')
    input.result.artifacts.find((a) => a.kind === 'style')!.content +=
      '\nbody { display:none }'
  if (kind === 'hash') input.result.preset.hash = 'a'.repeat(64)
  if (kind === 'source')
    input.result.artifacts.find((a) => a.kind === 'component')!.content +=
      '\nalert(1)'
  if (kind === 'provenance') input.result.provenance.compilerVersion = '99.0.0'
  if (kind === 'duplicate')
    input.result.artifacts.push(input.result.artifacts[0])
  if (kind === 'missing') input.result.artifacts.pop()
  if (kind === 'extra') Object.assign(input.view, { unsafe: true })
  if (kind === 'huge')
    input.result.artifacts[0].content = 'é'.repeat(maxPresetRenderBytes / 2)
  if (kind === 'manifest')
    expected.sources[Object.keys(expected.sources)[0]].canonicalHash =
      'a'.repeat(64)
  expect(await verifyPresetRender(input, 0, expected)).toBeNull()
})
it('fits each family gallery render well under the frame size bound', async () => {
  // The frame drops a larger message, so the preview would fail for that family (Liquid glass passed 1 MiB).
  for (const family of supportedStyleFamilies) {
    const compiled = await handlePresetCompileMessage({ type: 'compile-preset', requestId: 1, draft: createPresetDraft(family) })
    if (compiled.type !== 'preset-compiled') throw new Error(`${family} did not compile`)
    const message = { type: 'preset-render', requestId: 1, result: compiled.result, view: { mode: 'light', viewport: 'wide' } }
    expect(new TextEncoder().encode(JSON.stringify(message)).length, family).toBeLessThan(maxPresetRenderBytes * 0.5)
  }
}, 120000)
it('accepts a liquid-glass draft below the contrast bound so the editor can preview it', async () => {
  const preset = structuredClone(getCatalogPresets('0.1.0').presets['liquid-glass'])
  preset.design = { ...preset.design, glassOpacity: 0.3 }
  const failing = await compile({
    preset,
    componentIds: componentsWithStyleSupport('liquid-glass', ['stable', 'experimental']),
    catalogRelease: '0.1.0',
    compilerVersion: '0.1.0',
    glassContrast: 'report',
  })
  const input = { ...message(), result: failing }
  const filter = failing.artifacts.find((a) => a.logicalPath === 'components/ui/liquid-glass-filter.tsx')!
  const withFilter = { ...manifest, sources: { ...manifest.sources, [filter.logicalPath]: { canonicalHash: filter.sha256, transformedHash: await sha256(filter.content) } } }
  expect(await verifyPresetRender(input, 0, withFilter)).toEqual(input)
})
it('accepts a liquid-glass render compiled from every component, all stable in glass', async () => {
  const glass = await compile({
    preset: getCatalogPresets('0.1.0').presets['liquid-glass'],
    componentIds: componentsWithStyleSupport('liquid-glass', ['stable', 'experimental']),
    catalogRelease: '0.1.0',
    compilerVersion: '0.1.0',
  })
  const input = { ...message(), result: glass }
  // The real gallery manifest carries the glass-only filter as well.
  const filter = glass.artifacts.find((a) => a.logicalPath === 'components/ui/liquid-glass-filter.tsx')!
  const withFilter = { ...manifest, sources: { ...manifest.sources, [filter.logicalPath]: { canonicalHash: filter.sha256, transformedHash: await sha256(filter.content) } } }
  expect(await verifyPresetRender(input, 0, withFilter)).toEqual(input)
  expect(await verifyPresetRender(message(), 0, withFilter)).toEqual(message())
  const tampered = structuredClone(input)
  tampered.result.artifacts.find((a) => a.kind === 'component')!.content +=
    '\nalert(1)'
  expect(await verifyPresetRender(tampered, 0, manifest)).toBeNull()
  const flatWithGlassFamily = structuredClone(message())
  flatWithGlassFamily.result.preset.data.styleFamily = 'liquid-glass'
  expect(await verifyPresetRender(flatWithGlassFamily, 0, manifest)).toBeNull()
})
it('requires exact handshake and acknowledgement shapes', () => {
  expect(
    isPresetHandshake(
      { type: 'ombelle-preset-preview-ready', version: 1 },
      'ready',
    ),
  ).toBe(true)
  expect(
    isPresetHandshake(
      { type: 'ombelle-preset-preview-ready', version: 1, extra: true },
      'ready',
    ),
  ).toBe(false)
  expect(
    isPresetAck({
      type: 'preset-render-ack',
      requestId: 1,
      presetHash: result.preset.hash,
      status: 'applied',
    }),
  ).toBe(true)
  expect(
    isPresetAck({
      type: 'preset-render-ack',
      requestId: -1,
      presetHash: result.preset.hash,
      status: 'applied',
    }),
  ).toBe(false)
})
it('accepts a glass preview backdrop with or without a scene and rejects unknown ones', async () => {
  for (const backdrop of ['kit', 'mist', 'dawn', 'grid', 'peach', 'prism', 'night']) {
    const view = { ...message(), view: { mode: 'light', viewport: 'wide', backdrop } }
    expect(await verifyPresetRender(view, 0, manifest)).toEqual(view)
    const scened = { ...message(), view: { mode: 'dark', viewport: 'wide', scene: 'settings', backdrop } }
    expect(await verifyPresetRender(scened, 0, manifest)).toEqual(scened)
  }
  for (const backdrop of ['beach', '', 1, null, '__proto__'])
    expect(
      await verifyPresetRender({ ...message(), view: { mode: 'light', viewport: 'wide', backdrop } }, 0, manifest),
    ).toBeNull()
})
it('the editor sends the glass backdrop with the view it renders', async () => {
  const { sentPresetView } = await import('./preview-protocol')
  expect(sentPresetView({ mode: 'light', viewport: 'wide', backdrop: 'peach' })).toEqual({ mode: 'light', viewport: 'wide', backdrop: 'peach' })
  expect(sentPresetView({ mode: 'dark', viewport: 'wide', scene: 'dashboard', backdrop: 'night' })).toEqual({
    mode: 'dark',
    viewport: 'wide',
    scene: 'dashboard',
    backdrop: 'night',
  })
  // Unset focus and the default scene stay out, as the sandbox accepts only exact view shapes.
  expect(sentPresetView({ mode: 'light', viewport: 'wide', scene: 'gallery' })).toEqual({ mode: 'light', viewport: 'wide' })
  for (const view of [
    { mode: 'light', viewport: 'wide', backdrop: 'grid' },
    { mode: 'light', viewport: 'wide', focus: 'button', backdrop: 'prism' },
  ] as const) {
    const sent = { ...message(), view: sentPresetView(view) }
    expect(await verifyPresetRender(sent, 0, manifest)).toEqual(sent)
  }
})
it('accepts a lab ink with a backdrop', async () => {
  for (const labInk of ['light', 'dark']) {
    const view = { ...message(), view: { mode: labInk, viewport: 'wide', backdrop: 'night', labInk } }
    expect(await verifyPresetRender(view, 0, manifest)).toEqual(view)
  }
})
it('rejects an unknown lab ink', async () => {
  for (const labInk of ['dim', '', true, null])
    expect(await verifyPresetRender({ ...message(), view: { mode: 'light', viewport: 'wide', backdrop: 'dawn', labInk } }, 0, manifest)).toBeNull()
})
it('sentPresetView keeps the lab ink', async () => {
  const { sentPresetView } = await import('./preview-protocol')
  expect(sentPresetView({ mode: 'dark', viewport: 'wide', scene: 'dashboard', backdrop: 'night', labInk: 'dark' })).toEqual({
    mode: 'dark', viewport: 'wide', scene: 'dashboard', backdrop: 'night', labInk: 'dark',
  })
})
it('accepts the reduced-transparency flag only as true, and sends it', async () => {
  const { sentPresetView } = await import('./preview-protocol')
  const view = { ...message(), view: { mode: 'light', viewport: 'wide', backdrop: 'mist', reducedTransparency: true } }
  expect(await verifyPresetRender(view, 0, manifest)).toEqual(view)
  for (const reducedTransparency of [false, 'yes'])
    expect(await verifyPresetRender({ ...message(), view: { mode: 'light', viewport: 'wide', reducedTransparency } }, 0, manifest)).toBeNull()
  expect(sentPresetView({ mode: 'light', viewport: 'wide', reducedTransparency: true })).toEqual({ mode: 'light', viewport: 'wide', reducedTransparency: true })
})
it('rejects a lab ink without a backdrop', async () => {
  expect(await verifyPresetRender({ ...message(), view: { mode: 'light', viewport: 'wide', labInk: 'light' } }, 0, manifest)).toBeNull()
})

it('drops the font imports a browser cannot resolve and keeps the font tokens', async () => {
  const ombelle = structuredClone(getCatalogPresets('0.1.0').presets.ombelle)
  const fonted = await compile({
    preset: {
      ...ombelle,
      schemaVersion: '1.1',
      design: { ...ombelle.design, fontFamilyId: 'inter', headingFontFamilyId: 'fraunces' },
    },
    componentIds: ['card'],
    catalogRelease: '0.1.0',
    compilerVersion: '0.1.0',
  })
  expect(fonted.artifacts.some((a) => a.content.includes('@fontsource'))).toBe(true)
  const css = presetRuntimeStyles(fonted)
  expect(css).not.toContain('@fontsource')
  expect(css).toContain('--font-heading')
  expect(css).toContain('Inter Variable')
})

const tokens = (over: Record<string, unknown> = {}) => ({
  type: 'preset-tokens',
  requestId: 2,
  preset: materializePreset(createPresetDraft('ombelle')),
  view: { mode: 'light', viewport: 'wide' },
  ...over,
})
it('accepts a materialized draft as preset-tokens and returns its css and hash', async () => {
  const input = tokens()
  const verified = await verifyPresetTokens(input, 1)
  expect(verified?.message).toEqual(input)
  expect(verified?.css).toMatch(new RegExp(`--radius:\s*${input.preset.design.radiusRem}rem`))
  // The same CSS split into its sheets, the token sheet last, so the preview re-parses only that on a token edit.
  expect(verified?.sheets.join('\n')).toBe(verified?.css)
  expect(verified?.sheets.length).toBeGreaterThan(1)
  expect(verified?.sheets.at(-1)).toMatch(/--radius:/)
  expect(verified?.sheets[0]).not.toMatch(/--radius:\s*[\d.]+rem/)
  expect(verified?.presetHash).toBe(await presetHashOf(input.preset))
  const compiled = await compile({
    preset: input.preset,
    componentIds: ['button'],
    catalogRelease: '0.1.0',
    compilerVersion: '0.1.0',
  })
  expect(verified?.presetHash).toBe(compiled.preset.hash)
})
it('derives css from the resolved preset, with normalised colours', async () => {
  const verified = await verifyPresetTokens(tokens(), 1)
  expect(verified?.css).toContain('#ffffff')
  expect(verified?.css).not.toContain('#FFFFFF')
})
it('rejects malformed preset-tokens messages', async () => {
  const preset = materializePreset(createPresetDraft('ombelle')) as unknown as Record<string, unknown>
  expect(await verifyPresetTokens({ ...tokens(), extra: 1 }, 1)).toBeNull()
  expect(await verifyPresetTokens(tokens({ requestId: 1 }), 1)).toBeNull()
  expect(await verifyPresetTokens(tokens({ requestId: 0 }), 0)).toBeNull()
  expect(await verifyPresetTokens(tokens({ view: { mode: 'light', viewport: 'wide', bogus: 1 } }), 1)).toBeNull()
  expect(await verifyPresetTokens(tokens({ preset: materializePreset(createPresetDraft('liquid-glass')) }), 1)).toBeNull()
  expect(await verifyPresetTokens(tokens({ preset: { ...preset, design: { ...(preset.design as object), bogus: 'x' } } }), 1)).toBeNull()
  expect(await verifyPresetTokens(tokens({ preset: { ...preset, name: 'x'.repeat(1024 * 1024) } }), 1)).toBeNull()
})
