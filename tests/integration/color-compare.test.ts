import { expect, it } from 'vitest'
import { colorParityDiff, colorsClose, resolveColor, splitColors } from '../helpers/color-compare.js'

it('treats the oklch and lab serialisations of the same ombelle ink as equal', () => {
  expect(colorsClose('oklch(0.22 0.012 275)', 'lab(9.43208 0.584111 -4.44785)')).toBe(true)
  expect(colorsClose('oklch(22% 0.012 275)', 'lab(9.43208 0.584111 -4.44785)')).toBe(true)
})
it('resolves other serialisations to sRGB', () => {
  expect(resolveColor('#ff0000').rgb).toEqual([255, 0, 0])
  expect(resolveColor('rgb(255, 0, 0)').rgb).toEqual([255, 0, 0])
  expect(resolveColor('rgba(0, 0, 0, 0)').alpha).toBe(0)
  expect(colorsClose('color(srgb 1 0 0)', '#ff0000')).toBe(true)
  expect(colorsClose('oklch(0.628 0.2577 29.23)', '#ff0000')).toBe(true)
  expect(colorsClose('lab(54.29 80.8 69.89)', '#ff0000')).toBe(true)
})
it('keeps clearly different colours and alphas unequal', () => {
  expect(colorsClose('oklch(0.22 0.012 275)', 'oklch(0.72 0.17 6)')).toBe(false)
  expect(colorsClose('lab(9.43208 0.584111 -4.44785)', '#ffffff')).toBe(false)
  expect(colorsClose('rgb(0 0 0 / 0.5)', 'rgb(0 0 0 / 0.6)')).toBe(false)
  expect(colorsClose('rgb(10, 10, 10)', 'rgb(13, 10, 10)')).toBe(false)
})
it('compares colours inside values with a tolerance and everything else exactly', () => {
  const a = { color: 'oklch(0.22 0.012 275)', shadow: 'oklch(0.22 0.012 275) 2px 2px 0px 0px', height: '38px' }
  const b = {
    color: 'lab(9.43208 0.584111 -4.44785)',
    shadow: 'lab(9.43208 0.584111 -4.44785) 2px 2px 0px 0px',
    height: '38px',
  }
  expect(colorParityDiff(a, b)).toEqual([])
  expect(colorParityDiff(a, { ...b, height: '39px' })).toHaveLength(1)
  expect(colorParityDiff(a, { ...b, shadow: 'lab(9.43208 0.584111 -4.44785) 3px 2px 0px 0px' })).toHaveLength(1)
  expect(colorParityDiff(a, { ...b, color: '#ffffff' })).toHaveLength(1)
  expect(splitColors('rgb(1, 2, 3) 1px 1px').colors).toEqual(['rgb(1, 2, 3)'])
})
