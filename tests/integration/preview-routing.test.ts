import fs from 'node:fs'
import { expect, it } from 'vitest'
import { selectFamily } from '../../apps/preview/src/scenarios.js'
it('selects exact implemented preview routes',()=>{
 expect(selectFamily('/minimalist/')).toBe('minimalist')
 expect(selectFamily('/minimalist')).toBe('minimalist')
 expect(selectFamily('/flat/')).toBe('flat')
 expect(selectFamily('/neo-brutalism/')).toBe('neo-brutalism')
 expect(selectFamily('/ombelle/')).toBe('ombelle')
 expect(selectFamily('/liquid-glass/')).toBe('liquid-glass')
 expect(selectFamily('/liquid-glass')).toBe('liquid-glass')
 expect(selectFamily('/')).toBe('neo-brutalism')
 for(const p of ['/minimalist-extra/','/x/minimalist/','/liquid-glass-extra/','/flatty/'])expect(selectFamily(p)).toBeNull()
})
it('maps the ombelle family to a generated preview entry',()=>{
 const main=fs.readFileSync('apps/preview/src/main.tsx','utf8')
 expect(main).toContain("ombelle: () => import('./generated/ombelle/entry')")
})
it('maps the liquid-glass family to a generated preview entry',()=>{
 const main=fs.readFileSync('apps/preview/src/main.tsx','utf8')
 expect(main).toContain("'liquid-glass': () => import('./generated/liquid-glass/entry')")
})
