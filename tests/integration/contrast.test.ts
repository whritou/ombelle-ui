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
