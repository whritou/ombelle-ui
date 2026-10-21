import { expect, it } from 'vitest'
import { selectFamily } from '../../apps/preview/src/scenarios.js'
it('selects exact implemented preview routes',()=>{
 expect(selectFamily('/minimalist/')).toBe('minimalist')
 expect(selectFamily('/minimalist')).toBe('minimalist')
 expect(selectFamily('/flat/')).toBe('flat')
 expect(selectFamily('/neo-brutalism/')).toBe('neo-brutalism')
 expect(selectFamily('/')).toBe('neo-brutalism')
 for(const p of ['/minimalist-extra/','/x/minimalist/','/liquid-glass/','/flatty/'])expect(selectFamily(p)).toBeNull()
})
