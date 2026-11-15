import fs from 'node:fs'
import { describe, expect, it } from 'vitest'
import { contrastRatio, parseColor } from '../src/templates/color-picker.js'
import papier from '../src/presets/papier.json'

// Regression tests for the whole-branch review of the Papier family: each one pins a defect that the
// ported Ombelle rules and the Papier layer produced together.
const layerOf = (id: string) => {
  const css = fs.readFileSync(`packages/catalog/src/styles/${id}/papier.css`, 'utf8').replace(/\r\n?/g, '\n')
  return css.split('/* papier layer */')[1] ?? ''
}
const squash = (css: string) => css.replace(/\s+/g, '')

describe('papier review fixes', () => {
  it('combobox: the matched text never takes its fill from --primary, which highlighted rows redefine as currentColor', () => {
    const layer = squash(layerOf('combobox'))
    expect(layer).not.toMatch(/combobox-match'\]\{[^}]*var\(--primary\)/)
    expect(layer).toMatch(/\[data-highlighted\][^{]*combobox-match'\][^{]*\{[^}]*background:transparent/)
    expect(layer).toMatch(/\[data-selected='true'\][^{]*combobox-match'\][^{]*\{[^}]*background:transparent/)
  })

  it('tabs: an underline tab has one indicator (the double rule on its ::after), not a border plus a bar', () => {
    const layer = squash(layerOf('tabs'))
    expect(layer).not.toMatch(/data-appearance='underline'\][^{]*data-state='active'\]\{[^}]*border-bottom/)
    expect(layer).toMatch(/data-appearance='underline'\]\[data-orientation\]>\[role='tab'\]\[data-state='active'\]::after\{[^}]*border-block:1pxsolidcurrentColor/)
  })

  it.each([
    ['checkbox', "[data-slot='checkbox'][data-state='checked']", 'background:Highlight'],
    ['tabs', "[data-slot='tabs-trigger'][data-state='active']", 'background:Highlight'],
    ['tooltip', "[data-slot='tooltip-content']", 'border:1pxsolidCanvasText'],
  ])('%s: forced colors restore the system colours after the layer', (id, selector, declaration) => {
    const layer = squash(layerOf(id))
    const forced = layer.slice(layer.lastIndexOf('@media(forced-colors:active)'))
    expect(forced).toContain(squash(selector))
    expect(forced).toContain(declaration)
  })

  it('tooltip: the arrow is an svg, so it takes a fill and never a background box', () => {
    const layer = squash(layerOf('tooltip'))
    expect(layer).toMatch(/tooltip-arrow'\]\{[^}]*fill:var\(--foreground\)/)
    expect(layer).not.toMatch(/tooltip-arrow'\]\{[^}]*background/)
  })

  it('badge: the destructive double rule belongs to the solid appearance only', () => {
    const layer = squash(layerOf('badge'))
    expect(layer).toMatch(/data-variant='destructive'\]:not\(\[data-appearance='soft'\]\):not\(\[data-appearance='outline'\]\)\{[^}]*border-bottom:3pxdouble/)
    expect(layer).not.toMatch(/data-variant='destructive'\]\{[^}]*border-bottom:3pxdouble/)
  })

  it.each(['light', 'dark'] as const)('code block: every token reaches 4.5:1 on the card in %s mode, as the layer maps them to preset colours', mode => {
    const m = papier.modes[mode] as Record<string, string>
    const surface = parseColor(m.card)!.rgb
    // The layer maps comment/punct/line-number to mutedForeground, string to successForeground, keyword to
    // destructive, attr to warningForeground, property to infoForeground and the text to cardForeground.
    for (const name of ['cardForeground', 'mutedForeground', 'successForeground', 'destructive', 'warningForeground', 'infoForeground'])
      expect(contrastRatio(parseColor(m[name])!.rgb, surface), `${mode} ${name} on card`).toBeGreaterThanOrEqual(4.5)
    const css = squash(layerOf('code-block'))
    for (const token of ['foreground:var(--card-foreground)', 'comment:var(--muted-foreground)', 'string:var(--success-foreground', 'keyword:var(--destructive)', 'attr:var(--warning-foreground', 'property:var(--info-foreground', 'punct:var(--muted-foreground)', 'line-number:var(--muted-foreground)'])
      expect(css).toContain(token)
  })
})
