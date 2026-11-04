import { expect, it } from 'vitest'
import { contrastRatio } from '../helpers/contrast.js'
it('computes opaque contrast accurately',()=>{
 expect(contrastRatio([0,0,0],[255,255,255])).toBe(21)
 expect(contrastRatio([128,128,128],[128,128,128])).toBe(1)
 expect(contrastRatio([107,114,128],[250,250,250])).toBeCloseTo(4.63,1)
 expect(contrastRatio([107,114,128],[250,250,250])).toBe(contrastRatio([250,250,250],[107,114,128]))
})
it('rejects invalid contrast samples',()=>{
 for(const sample of [[-1,0,0],[256,0,0],[NaN,0,0],[0,0],[0,0,0,1]])expect(()=>contrastRatio(sample as [number,number,number],[0,0,0])).toThrow()
})
import flat from '../../packages/catalog/src/presets/flat.json'
const rgb = (hex: string): [number, number, number] => [
  parseInt(hex.slice(1, 3), 16),
  parseInt(hex.slice(3, 5), 16),
  parseInt(hex.slice(5, 7), 16),
]
it.each(['light', 'dark'] as const)('flat %s token pairs reach 4.5:1 and control boundaries 3:1', (mode) => {
  const m = flat.modes[mode] as Record<string, string>
  for (const [f, b] of [
    ['foreground', 'background'],
    ['cardForeground', 'card'],
    ['popoverForeground', 'popover'],
    ['primaryForeground', 'primary'],
    ['secondaryForeground', 'secondary'],
    ['mutedForeground', 'muted'],
    ['accentForeground', 'accent'],
    ['destructiveForeground', 'destructive'],
  ])
    expect(contrastRatio(rgb(m[f]), rgb(m[b])), `${mode} ${f}/${b}`).toBeGreaterThanOrEqual(4.5)
  expect(contrastRatio(rgb(m.input), rgb(m.muted)), `${mode} input/muted`).toBeGreaterThanOrEqual(3)
  expect(contrastRatio(rgb(m.input), rgb(m.card)), `${mode} input/card`).toBeGreaterThanOrEqual(3)
  expect(contrastRatio(rgb(m.input), rgb(m.background)), `${mode} input/background`).toBeGreaterThanOrEqual(3)
})
