import { expect, it } from 'vitest'
import fixture from './fixtures/stable-family-hashes.json'
import { stableArtifactHashes } from '../../../scripts/record-stable-hashes.ts'
import { compile } from '../src/index.js'
import { getCatalog } from '@ombelle/catalog'
import { validatePreset } from '@ombelle/contracts'

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

it('minimalist buttons thin toward the page on hover and press, and go hairline when disabled', async () => {
  const result = await compile({
    preset: getCatalog('0.1.0').presets.minimalist,
    componentIds: ['button'],
    catalogRelease: '0.1.0',
    compilerVersion: '0.1.0',
  })
  const style = strip(result.artifacts.find((a) => a.logicalPath === 'styles/ui-style.css')!.content)
  expect(rule(style, '[data-slot="button"]:not(:disabled):hover')).toContain('background:color-mix(inoklab,var(--primary)82%,var(--background))')
  expect(rule(style, '[data-slot="button"]:not(:disabled):active')).toContain('background:color-mix(inoklab,var(--primary)70%,var(--background))')
  expect(style).not.toContain('var(--primary)90%,black')
  const disabled = rule(style, '[data-slot="button"]:disabled')
  expect(disabled).toContain('background:transparent')
  expect(disabled).toContain('border-color:var(--border)')
  expect(disabled).toContain('color:var(--muted-foreground)')
})

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

const ombelle = async () => {
  const result = await compile({
    preset: getCatalog('0.1.0').presets.ombelle,
    componentIds: [
      'button', 'card', 'input', 'dialog', 'tabs', 'checkbox', 'switch',
      'badge', 'label', 'native-select', 'textarea', 'tooltip',
    ] as never,
    catalogRelease: '0.1.0',
    compilerVersion: '0.1.0',
  })
  return (path: string) =>
    strip(result.artifacts.find((a) => a.logicalPath === path)!.content)
}

it('ombelle preset validates and carries the designed values', () => {
  const p = getCatalog('0.1.0').presets.ombelle
  expect(validatePreset(p).styleFamily).toBe('ombelle')
  expect(p.id).toBe('builtin-ombelle')
  expect(p.name).toBe('Ombelle')
  expect(p.design).toEqual({
    fontFamilyId: 'system-sans', radiusRem: 0.75, density: 'comfortable',
    borderWidthPx: 1.5, shadowOffsetXPx: 3, shadowOffsetYPx: 3,
    motion: 'full', transparency: 'reduced',
  })
  expect(p.modes.light.primary).toBe('oklch(55% 0.22 6)')
  expect(p.modes.dark.border).toBe('oklch(97% 0.004 350 / 80%)')
})

it('ombelle buttons, tabs, switches and badges are pills; inputs keep the radius', async () => {
  const css = await ombelle()
  const style = css('styles/ui-style.css')
  expect(style).toContain('border-radius:999px')
  expect(rule(style, '[data-slot="input"]')).toContain('border-radius:var(--radius)')
  expect(rule(css('components/ui/tabs.css'), '[data-slot="tabs-list"]')).toContain('border-radius:999px')
  expect(rule(css('components/ui/tabs.css'), '[data-slot="tabs-trigger"]')).toContain('border-radius:999px')
  expect(rule(css('components/ui/switch.css'), '[data-slot="switch"]')).toContain('border-radius:999px')
  expect(rule(css('components/ui/badge.css'), '[data-slot="badge"]')).toContain('border-radius:999px')
  expect(rule(css('components/ui/card.css'), '[data-slot="card"]')).toContain('border-radius:calc(var(--radius)+8px)')
  expect(rule(style, '[data-slot="dialog-content"]')).toContain('border-radius:calc(var(--radius)+8px)')
})

it('ombelle compiles a button pill rule', async () => {
  const css = await ombelle()
  expect(css('styles/ui-style.css')).toMatch(/\[data-slot="button"\][^{}]*\{[^}]*border-radius:999px/)
})

it('ombelle outlines every control and casts hard offset shadows', async () => {
  const css = await ombelle()
  const style = css('styles/ui-style.css')
  const outline = 'border:var(--border-width)solidvar(--border)'
  const shadow = 'box-shadow:var(--shadow-x)var(--shadow-y)0var(--border)'
  expect(style).toContain(outline)
  expect(style).toContain(shadow)
  for (const [file, slot] of [['checkbox', 'checkbox'], ['switch', 'switch'], ['tabs', 'tabs-list'], ['native-select', 'native-select'], ['textarea', 'textarea']] as const) {
    const base = rule(css(`components/ui/${file}.css`), `[data-slot="${slot}"]`)
    expect(base, slot).toContain(outline)
    expect(base, slot).toContain(shadow)
  }
  const big = 'box-shadow:calc(var(--shadow-x)*5/3)calc(var(--shadow-y)*5/3)0var(--border)'
  expect(rule(css('components/ui/card.css'), '[data-slot="card"]')).toContain(big)
  expect(rule(style, '[data-slot="dialog-content"]')).toContain(big)
})

it('ombelle buttons nudge on hover, press into the shadow and go dashed when disabled', async () => {
  const css = await ombelle()
  const style = css('styles/ui-style.css')
  expect(rule(style, '[data-slot="button"]:not(:disabled):hover')).toContain(
    'transform:translate(-1px,-1px);box-shadow:calc(var(--shadow-x)+1px)calc(var(--shadow-y)+1px)0var(--border)',
  )
  expect(rule(style, '[data-slot="button"]:not(:disabled):active')).toContain(
    'transform:translate(var(--shadow-x),var(--shadow-y));box-shadow:000var(--border)',
  )
  const disabled = rule(style, '[data-slot="button"]:disabled,[data-slot="input"]:disabled')
  expect(disabled).toContain('border-style:dashed')
  expect(disabled).toContain('box-shadow:none')
  expect(disabled).toContain('opacity:0.45')
})

it('ombelle uses a 2.5px solid ring outline offset by 3px', async () => {
  const css = await ombelle()
  expect(css('styles/ui-style.css')).toContain('outline:2.5pxsolidvar(--ring);outline-offset:3px')
  expect(css('styles/ui-style.css')).not.toContain('dashedvar(--ring)')
  for (const c of ['checkbox', 'switch', 'tabs', 'native-select', 'textarea', 'tooltip'])
    expect(css(`components/ui/${c}.css`)).toContain('outline:2.5pxsolidvar(--ring);outline-offset:3px')
})

it('ombelle fills the active tab with the foreground and styles the switch thumb by state', async () => {
  const css = await ombelle()
  const active = rule(css('components/ui/tabs.css'), '[data-slot="tabs-trigger"][data-state="active"]')
  expect(active).toContain('background:var(--foreground)')
  expect(active).toContain('color:var(--background)')
  const sw = css('components/ui/switch.css')
  expect(rule(sw, '[data-slot="switch-thumb"]')).toContain('background:var(--foreground)')
  const on = rule(sw, '[data-slot="switch-thumb"][data-state="checked"]')
  expect(on).toContain('background:var(--card)')
  expect(rule(sw, '[data-slot="switch-thumb"]')).toContain('border:var(--border-width)solidtransparent')
  expect(on).toContain('border-color:var(--border)')
  expect(rule(sw, '[data-slot="switch"][data-state="checked"]')).toContain('background:var(--primary)')
})

it('ombelle tooltip is primary with an outlined arrow; labels, badges and tabs are uppercase', async () => {
  const css = await ombelle()
  const tip = css('components/ui/tooltip.css')
  const content = rule(tip, '[data-slot="tooltip-content"]')
  expect(content).toContain('background:var(--primary)')
  expect(content).toContain('border:var(--border-width)solidvar(--border)')
  expect(rule(tip, '[data-slot="tooltip-arrow"]')).toContain('stroke:var(--border)')
  for (const [file, slot, spacing] of [['label', 'label', true], ['badge', 'badge', true], ['tabs', 'tabs-trigger', false]] as const) {
    const base = rule(css(`components/ui/${file}.css`), `[data-slot="${slot}"]`)
    expect(base, slot).toContain('text-transform:uppercase')
    expect(base, slot).toContain('font-weight:700')
    if (spacing) expect(base, slot).toContain('letter-spacing:0.07em')
  }
})

it('ombelle keeps borders and focus in forced-colors but drops every shadow', async () => {
  const css = await ombelle()
  const f = forcedBlock(css('styles/ui-style.css'))
  expect(f).toContain('box-shadow:none')
  expect(f).toContain('outline-color:Highlight')
  expect(f).toContain('border-color:ButtonText')
  expect(f).not.toContain('outline:none')
  for (const c of ['checkbox', 'switch', 'tabs', 'native-select', 'textarea', 'card', 'badge', 'tooltip']) {
    const block = forcedBlock(css(`components/ui/${c}.css`))
    expect(block, c).toContain('border-color:')
    expect(block, c).not.toMatch(/box-shadow:(?!none)/)
  }
  expect(forcedBlock(css('components/ui/tabs.css'))).toContain('background:Highlight')
  expect(forcedBlock(css('components/ui/switch.css'))).toContain('background:Highlight')
})

it('ombelle jumps instantly under reduced motion', async () => {
  const css = await ombelle()
  const block = (path: string) =>
    (css(path).match(/@media\(prefers-reduced-motion:reduce\)\{.*?\}\}/g) ?? []).join('')
  expect(block('styles/ui-style.css')).toContain('transition:none')
  expect(block('styles/ui-style.css')).not.toContain('transform:none')
  for (const c of ['checkbox', 'switch', 'tabs'])
    expect(block(`components/ui/${c}.css`), c).toContain('transition:none')
  expect(block('components/ui/tooltip.css')).toContain('animation:none')
})
