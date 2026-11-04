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
