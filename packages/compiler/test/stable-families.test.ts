import { expect, it } from 'vitest'
import fixture from './fixtures/stable-family-hashes.json'
import { stableArtifactHashes } from '../../../scripts/record-stable-hashes.ts'
import { compile } from '../src/index.js'
import { getCatalog } from '@ombelle/catalog'

it('stable family artifacts are byte-identical', async () => {
  expect(await stableArtifactHashes()).toEqual(fixture)
})

const flatCss = async (borderWidthPx?: number) => {
  const flat = structuredClone(getCatalog('0.1.0').presets.flat) as any
  if (borderWidthPx !== undefined) flat.design.borderWidthPx = borderWidthPx
  const result = await compile({
    preset: flat,
    componentIds: ['button', 'card', 'input'],
    catalogRelease: '0.1.0',
    compilerVersion: '0.1.0',
  })
  const css = (path: string) =>
    result.artifacts.find((a) => a.logicalPath === path)!.content
  return { style: css('styles/ui-style.css'), card: css('components/ui/card.css') }
}
// The compiler formats CSS, so compare whitespace- and quote-insensitively.
const squash = (css: string) => css.replace(/\s+/g, '').replace(/'/g, '"')

it('flat uses a zero border width and filled-well inputs', async () => {
  expect(getCatalog('0.1.0').presets.flat.design.borderWidthPx).toBe(0)
  const { style } = await flatCss()
  expect(squash(style)).toContain(
    '[data-slot="input"]{background:var(--muted);border:0;border-bottom:2pxsolidvar(--input)',
  )
})

it('flat border width reaches the card rule while the input bottom rule stays 2px', async () => {
  const { style, card } = await flatCss(2)
  expect(squash(card)).toMatch(
    /\[data-slot="card"\]\{[^}]*box-shadow:inset000var\(--border-width\)var\(--border\)/,
  )
  expect(squash(style)).toContain('border-bottom:2pxsolidvar(--input)')
  expect(squash(style)).not.toContain('border-bottom:var(--border-width)')
})

it('flat surfaces keep a boundary in forced-colors mode', async () => {
  const flat = getCatalog('0.1.0').presets.flat
  const result = await compile({
    preset: flat,
    componentIds: ['badge', 'button', 'card', 'dialog', 'switch', 'tabs', 'tooltip'],
    catalogRelease: '0.1.0',
    compilerVersion: '0.1.0',
  })
  const forced = (path: string) => {
    const css = squash(result.artifacts.find((a) => a.logicalPath === path)!.content)
    return css
      .split('@media(forced-colors:active){')
      .slice(1)
      .join('')
  }
  const style = forced('styles/ui-style.css')
  expect(style).toContain('[data-slot="dialog-content"]{border:1pxsolidCanvasText')
  expect(style).toContain('[data-slot="button"][data-variant="outline"]{border:2pxsolidButtonText')
  expect(forced('components/ui/card.css')).toContain('border:1pxsolidCanvasText')
  expect(forced('components/ui/badge.css')).toContain('[data-slot="badge"]{background:Canvas;color:CanvasText;border:1pxsolidCanvasText')
  expect(forced('components/ui/tooltip.css')).toContain('border:1pxsolidCanvasText')
  expect(forced('components/ui/switch.css')).toContain('border:2pxsolidButtonText')
  expect(forced('components/ui/tabs.css')).toContain('border:1pxsolidButtonText')
})

const strip = (css: string) =>
  css.replace(/\/\*.*?\*\//g, '').replace(/\s+/g, '').replace(/'/g, '"')
// Declarations of every base rule whose selector list is exactly `selector`, joined.
const rule = (css: string, selector: string) => {
  const out: string[] = []
  for (const m of css.matchAll(/(?<=^|[}{])([^{}@]+){([^{}]*)}/g))
    if (m[1] === selector) out.push(m[2])
  return out.join(';')
}
const forcedBlock = (css: string) =>
  css.split('@media(forced-colors:active){').slice(1).join('')
const neo = async () => {
  const result = await compile({
    preset: getCatalog('0.1.0').presets['neo-brutalism'],
    componentIds: [
      'button', 'card', 'input', 'dialog', 'tabs', 'checkbox', 'switch',
      'badge', 'label', 'native-select',
    ] as never,
    catalogRelease: '0.1.0',
    compilerVersion: '0.1.0',
  })
  return (path: string) =>
    strip(result.artifacts.find((a) => a.logicalPath === path)!.content)
}

it('neo-brutalism preset carries the refreshed design values', () => {
  const p = getCatalog('0.1.0').presets['neo-brutalism']
  expect(p.design).toMatchObject({
    radiusRem: 0, borderWidthPx: 2.5, shadowOffsetXPx: 4, shadowOffsetYPx: 4,
    motion: 'reduced', transparency: 'reduced',
  })
  expect(p.modes.light.primary).toBe('#FFD23F')
  expect(p.modes.dark.border).toBe('#F5F5F5')
})

it('neo-brutalism derives card and dialog shadows from the offsets', async () => {
  const css = await neo()
  const shadow = 'box-shadow:calc(var(--shadow-x)*2)calc(var(--shadow-y)*2)0var(--border)'
  expect(rule(css('components/ui/card.css'), '[data-slot="card"]')).toContain(shadow)
  expect(rule(css('styles/ui-style.css'), '[data-slot="dialog-content"]')).toContain(shadow)
})

it('neo-brutalism keys lift on hover, sink on press, and go dashed when disabled', async () => {
  const css = await neo()
  const style = css('styles/ui-style.css')
  expect(rule(style, '[data-slot="button"]:not(:disabled):hover')).toContain(
    'transform:translate(-2px,-2px);box-shadow:calc(var(--shadow-x)+2px)calc(var(--shadow-y)+2px)0var(--border)',
  )
  expect(rule(style, '[data-slot="button"]:not(:disabled):active')).toContain(
    'transform:translate(var(--shadow-x),var(--shadow-y));box-shadow:000var(--border)',
  )
  const disabled = rule(style, '[data-slot="button"]:disabled,[data-slot="input"]:disabled')
  expect(disabled).toContain('border-style:dashed')
  expect(disabled).toContain('box-shadow:none')
  const tabs = css('components/ui/tabs.css')
  const active = rule(tabs, '[data-slot="tabs-trigger"][data-state="active"]')
  expect(active).toContain('background:var(--accent)')
  expect(active).toContain('transform:translate(var(--shadow-x),var(--shadow-y))')
  expect(active).toContain('box-shadow:none')
  for (const name of ['checkbox', 'switch'])
    expect(css(`components/ui/${name}.css`)).toContain(
      `[data-slot="${name}"]:not(:disabled):not([data-disabled]):hover{transform:translate(-2px,-2px)`,
    )
})

it('neo-brutalism uses a 3px dashed focus outline that forced-colors keeps visible', async () => {
  const css = await neo()
  const style = css('styles/ui-style.css')
  expect(style).toContain('outline:3pxdashedvar(--ring);outline-offset:4px')
  expect(style).not.toContain('outline:3pxsolid')
  for (const c of ['checkbox', 'switch', 'tabs', 'native-select'])
    expect(css(`components/ui/${c}.css`)).toContain('outline:3pxdashedvar(--ring)')
  const f = forcedBlock(style)
  expect(f).toContain('outline-color:Highlight')
  expect(f).toContain('box-shadow:none')
  expect(f).not.toContain('outline:none')
  expect(forcedBlock(css('components/ui/checkbox.css'))).toContain('border-color:ButtonText')
  expect(forcedBlock(css('components/ui/switch.css'))).toContain('border-color:ButtonText')
})

it('neo-brutalism badges tilt statically and never animate the rotation', async () => {
  const badge = (await neo())('components/ui/badge.css')
  expect(rule(badge, '[data-slot="badge"]:nth-child(odd)')).toContain('transform:rotate(-2deg)')
  expect(rule(badge, '[data-slot="badge"]:nth-child(even)')).toContain('transform:rotate(2deg)')
  expect(rule(badge, '[data-slot="badge"]')).toContain('transition:none')
  expect(badge).not.toMatch(/transition:[^;}]*transform/)
})

it('neo-brutalism native select icon sits in a primary box behind a border', async () => {
  const css = await neo()
  const icon = rule(css('components/ui/native-select.css'), '[data-slot="native-select-icon"]')
  expect(icon).toContain('background:var(--primary)')
  expect(icon).toContain('border-inline-start:var(--border-width)solidvar(--border)')
  expect(forcedBlock(css('components/ui/native-select.css'))).toContain('border-inline-start-color:ButtonText')
})

it('neo-brutalism label requirement marker is a destructive tag', async () => {
  const label = (await neo())('components/ui/label.css')
  const mark = rule(label, '[data-slot="label"]>[aria-hidden="true"]')
  expect(mark).toContain('background:var(--destructive)')
  expect(mark).toContain('color:var(--destructive-foreground)')
})
