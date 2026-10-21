import { it, expect } from 'vitest'
import fs from 'node:fs/promises'
import { compile } from '../src/index.js'
import { getCatalog } from '@ombelle/catalog'
import { supportedStyleFamilies, isStyleFamily } from '@ombelle/contracts'
import baseline from './fixtures/style-baseline.json'
const build=(preset:unknown,componentIds:('button'|'dialog'|'input')[]=['button','dialog','input'])=>compile({preset,componentIds,catalogRelease:'0.1.0',compilerVersion:'0.1.0'})
it('registers the exact implemented families',()=>{
 expect(supportedStyleFamilies).toEqual(['flat','minimalist','neo-brutalism'])
 expect(isStyleFamily('minimalist')).toBe(true)
 for(const id of ['liquid-glass','constructor','__proto__'])expect(isStyleFamily(id)).toBe(false)
 expect(getCatalog('0.1.0').presets.minimalist).toMatchObject({id:'builtin-minimalist',revision:1,styleFamily:'minimalist',design:{radiusRem:0.375,borderWidthPx:1}})
})
it('compiles minimalist deterministically',async()=>{
 const preset=getCatalog('0.1.0').presets.minimalist
 const first=await build(preset),second=await build(preset,['input','button','dialog','button'])
 expect(second).toEqual(first)
 expect(first.artifacts.find(a=>a.logicalPath==='styles/ui-style.css')?.content).toContain('minimalist family')
 expect(first.theme.light['--primary']).toBe('#111827')
 expect(first.theme.dark['--primary']).toBe('#f9fafb')
 await expect(build({...preset,styleFamily:'liquid-glass'})).rejects.toMatchObject({code:'INVALID_DATA',path:'/styleFamily'})
})
it('preserves legacy artifact hashes',async()=>{
 for(const family of ['flat','neo-brutalism'] as const){
  const preset=JSON.parse(await fs.readFile('packages/catalog/src/presets/'+family+'.json','utf8'))
  const actual=await build(preset)
  expect({presetHash:actual.preset.hash,artifacts:actual.artifacts.map(({logicalPath,sha256})=>({logicalPath,sha256}))}).toEqual(baseline.families[family])
 }
})
it('preserves minimalist overrides',async()=>{
 const preset=getCatalog('0.1.0').presets.minimalist
 const result=await build({...preset,design:{...preset.design,density:'compact',fontFamilyId:'system-mono',motion:'full'},modes:{...preset.modes,light:{...preset.modes.light,primary:'#2563EB'}}})
 expect(result.theme.light['--control-height']).toBe('2.25rem')
 expect(result.theme.light['--font-family']).toBe('monospace')
 expect(result.theme.light['--motion-duration']).toBe('150ms')
 expect(result.theme.light['--primary']).toBe('#2563eb')
})
it('emits every reviewed semantic color in both modes',async()=>{
 const result=await build(getCatalog('0.1.0').presets.minimalist)
 const roles=['background','foreground','card','card-foreground','popover','popover-foreground','primary','primary-foreground','secondary','secondary-foreground','muted','muted-foreground','accent','accent-foreground','destructive','destructive-foreground','border','input','ring']
 const expected={light:['#fafafa','#111827','#ffffff','#111827','#ffffff','#111827','#111827','#ffffff','#f3f4f6','#111827','#f3f4f6','#4b5563','#e5e7eb','#111827','#b91c1c','#ffffff','#d1d5db','#6b7280','#111827'],dark:['#111827','#f9fafb','#1f2937','#f9fafb','#1f2937','#f9fafb','#f9fafb','#111827','#374151','#f9fafb','#1f2937','#d1d5db','#374151','#f9fafb','#fca5a5','#111827','#4b5563','#9ca3af','#f9fafb']}
 for(const mode of ['light','dark'] as const)expect(roles.map(role=>result.theme[mode]['--'+role])).toEqual(expected[mode])
})
