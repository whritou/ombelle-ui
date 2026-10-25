import { afterEach, expect, it } from 'vitest'
import fs from 'node:fs/promises'
import path from 'node:path'
import os from 'node:os'
import { writeScenarioFixture } from '../helpers/scenario-fixture.js'
const roots:string[]=[]
afterEach(async()=>{for(const root of roots.splice(0))await fs.rm(root,{recursive:true,force:true})})
it('copies state fixtures without changing the default specimen',async()=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'ombelle-scenario-'));roots.push(root)
 await writeScenarioFixture(root,'minimalist')
 const scenario=await fs.readFile(path.join(root,'src/scenario.tsx'),'utf8')
 expect(scenario).toContain('minimalist')
 expect(scenario).not.toContain('STYLE_FAMILY')
 expect(scenario).toMatch(/get\('states'\)\s*===\s*'1'/)
 expect(scenario).toContain('{states && <StateFixture')
 expect(await fs.readFile(path.join(root,'src/state-fixture.tsx'),'utf8')).toContain('@/components/ui/button')
 expect(await fs.readFile(path.join(root,'src/state-fixture.css'),'utf8')).toContain('.state-fixture')
 expect(await fs.readFile(path.join(root,'src/index.css'),'utf8')).toContain('@import "tailwindcss"')
})
it.each([false, true])('writes an optional Card fixture without dangling imports (cards=%s)', async (cards) => {
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'ombelle-card-scenario-'));roots.push(root)
 await writeScenarioFixture(root,'flat',false,false,false,cards)
 const scenario=await fs.readFile(path.join(root,'src/scenario.tsx'),'utf8')
 expect(scenario.includes("import { CardFixture } from './card-fixture'")).toBe(cards)
 expect(scenario.includes('{cards && <CardFixture />}')).toBe(cards)
 expect(await fs.stat(path.join(root,'src/card-fixture.tsx')).then(()=>true,()=>false)).toBe(cards)
 if(cards) {
  expect(scenario).toMatch(/get\('cards'\)\s*===\s*'1'/)
  const fixture=await fs.readFile(path.join(root,'src/card-fixture.tsx'),'utf8')
  expect(fixture).toContain("from '@/components/ui/card'")
  expect(fixture).toContain('density="dense"')
 }
})
