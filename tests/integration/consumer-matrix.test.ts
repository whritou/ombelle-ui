import { expect, it } from 'vitest'
import { consumerCases, assignConsumerPorts } from '../../scripts/consumer-matrix.js'
const legacy=['vite-flat','vite-neo-brutalism','next-flat','next-neo-brutalism','npm-vite-flat','npm-vite-neo-brutalism','npm-next-flat','npm-next-neo-brutalism','yarn-classic-vite','yarn-modern-next','yarn-pnp-vite','bun-text-vite-node','bun-text-vite-bun','bun-binary-vite-node','bun-binary-vite-bun','bun-text-next-node','bun-text-next-bun','bun-binary-next-node','bun-binary-next-bun']
it('retains nineteen IDs and adds fifteen minimalist cases',()=>{
 const rows=consumerCases(),minimal=rows.filter(r=>r.family==='minimalist')
 expect(rows).toHaveLength(34)
 expect(rows.filter(r=>r.family!=='minimalist').map(r=>r.id).sort()).toEqual([...legacy].sort())
 expect(new Set(rows.map(r=>r.id)).size).toBe(34)
 expect(minimal).toHaveLength(15)
 expect(['npm','pnpm','yarn','bun'].map(manager=>minimal.filter(r=>r.manager===manager).length)).toEqual([2,2,3,8])
 for(const framework of ['vite','next'])for(const runtime of ['node','bun'])for(const format of ['text','binary'])expect(minimal.filter(r=>r.manager==='bun'&&r.framework===framework&&r.cliRuntime===runtime&&r.bunFormat===format)).toHaveLength(1)
 expect(minimal.filter(r=>r.manager==='yarn').map(r=>r.yarnFixtureId).sort()).toEqual(['classic-vite','modern-next','pnp-vite'])
})
it('allocates unique ports across all manager groups',()=>{
 const rows=consumerCases(),ports=Object.values(assignConsumerPorts(rows))
 expect(ports).toHaveLength(34);expect(new Set(ports).size).toBe(34);expect(ports).not.toContain(4173)
 expect(()=>assignConsumerPorts([...rows,rows[0]])).toThrow()
 expect(()=>assignConsumerPorts(rows,65530)).toThrow()
})
