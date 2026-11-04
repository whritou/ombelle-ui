import { it, expect } from 'vitest'
import fs from 'node:fs/promises'
import { compile } from '../src/index.js'
import { getCatalog } from '@ombelle/catalog'
import { supportedStyleFamilies, isStyleFamily } from '@ombelle/contracts'
import baseline from './fixtures/style-baseline.json'
const build=(preset:unknown,componentIds:('button'|'dialog'|'input')[]=['button','dialog','input'])=>compile({preset,componentIds,catalogRelease:'0.1.0',compilerVersion:'0.1.0'})
it('registers the exact implemented families',()=>{
 expect(supportedStyleFamilies).toEqual(['flat','minimalist','neo-brutalism','ombelle'])
 expect(isStyleFamily('minimalist')).toBe(true)
 expect(isStyleFamily('liquid-glass')).toBe(true)
 for(const id of ['constructor','__proto__'])expect(isStyleFamily(id)).toBe(false)
 expect(getCatalog('0.1.0').presets.minimalist).toMatchObject({id:'builtin-minimalist',revision:1,styleFamily:'minimalist',design:{radiusRem:0.25,borderWidthPx:1,shadowOffsetXPx:0,shadowOffsetYPx:0}})
})
it('compiles minimalist deterministically',async()=>{
 const preset=getCatalog('0.1.0').presets.minimalist
 const first=await build(preset),second=await build(preset,['input','button','dialog','button'])
 expect(second).toEqual(first)
 expect(first.artifacts.find(a=>a.logicalPath==='styles/ui-style.css')?.content).toContain('minimalist family')
 expect(first.theme.light['--primary']).toBe('#111111')
 expect(first.theme.dark['--primary']).toBe('#f2f2ef')
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
 const expected={light:['#fafaf9','#111111','#ffffff','#111111','#ffffff','#111111','#111111','#ffffff','#f1f1ef','#111111','#f1f1ef','#5f5f5a','#f1f1ef','#111111','#b42318','#ffffff','#e5e5e1','#8c8c86','#111111'],dark:['#0e0e0d','#f2f2ef','#161615','#f2f2ef','#161615','#f2f2ef','#f2f2ef','#0e0e0d','#232321','#f2f2ef','#1d1d1b','#a6a6a0','#232321','#f2f2ef','#f97066','#0e0e0d','#2c2c2a','#76766f','#f2f2ef']}
 for(const mode of ['light','dark'] as const)expect(roles.map(role=>result.theme[mode]['--'+role])).toEqual(expected[mode])
})

const squash=(css:string)=>css.replace(/\/\*.*?\*\//g,'').replace(/\s+/g,'').replace(/'/g,'"')
const family=async(ids:string[])=>{
 const result=await compile({preset:getCatalog('0.1.0').presets.minimalist,componentIds:ids as never,catalogRelease:'0.1.0',compilerVersion:'0.1.0'})
 return (path:string)=>squash(result.artifacts.find(a=>a.logicalPath===path)!.content)
}
// Declarations of the first (base, not forced-colors) rule whose selector is exactly `selector`.
const rule=(css:string,selector:string)=>{
 const out:string[]=[]
 for(const m of css.matchAll(/(?<=^|[}{])([^{}@]+)\{([^{}]*)\}/g))if(m[1]===selector)out.push(m[2])
 return out[0]??''
}
const forcedColors=(css:string)=>css.split('@media(forced-colors:active){').slice(1).join('')
it('draws inputs and selects as underlines with no side or top borders',async()=>{
 const css=await family(['input','native-select','textarea'])
 const style=css('styles/ui-style.css')
 const input=rule(style,'[data-slot="input"]')
 expect(input).toContain('border:0')
 expect(input).toContain('border-bottom:var(--border-width)solidvar(--input)')
 expect(input).toContain('border-radius:0')
 expect(input).toContain('background:transparent')
 expect(input).not.toMatch(/(^|;)border:var/)
 expect(style).toMatch(/\[data-slot="input"\]:focus-visible\{[^}]*border-bottom:2pxsolidvar\(--ring\)/)
 expect(style).toMatch(/\[data-slot="input"\]\[aria-invalid="true"\][^{]*\{[^}]*border-bottom:2pxsolidvar\(--destructive\)/)
 const select=rule(css('components/ui/native-select.css'),'[data-slot="native-select"]')
 expect(select).toContain('border:0')
 expect(select).toContain('border-bottom:var(--border-width)solidvar(--input)')
 expect(select).toContain('border-radius:0')
 expect(select).toContain('background:transparent')
 const textarea=rule(css('components/ui/textarea.css'),'[data-slot="textarea"]')
 expect(textarea).toContain('border:var(--border-width)solidvar(--input)')
})
it('keeps a visible underline and focus ring in forced-colors mode',async()=>{
 const css=await family(['input','native-select'])
 const style=forcedColors(css('styles/ui-style.css'))
 expect(style).toContain('[data-slot="input"]{border-bottom-color:ButtonText')
 expect(style).toContain('outline-color:Highlight')
 expect(forcedColors(css('components/ui/native-select.css'))).toContain('border-bottom-color:ButtonText')
})
it('outlines the destructive button instead of filling it',async()=>{
 const style=(await family(['button']))('styles/ui-style.css')
 expect(style).toMatch(/\[data-slot="button"\]\[data-variant="destructive"\]\{background:transparent;color:var\(--destructive\);border-color:var\(--destructive\)/)
})
it('renders tabs as text on a hairline with an inset active underline',async()=>{
 const tabs=(await family(['tabs']))('components/ui/tabs.css')
 expect(tabs).toMatch(/\[data-slot="tabs-trigger"\]\[data-state="active"\]\{[^}]*box-shadow:inset0-2px0var\(--foreground\)/)
 expect(forcedColors(tabs)).toMatch(/\[data-slot="tabs-trigger"\]\[data-state="active"\]\{[^}]*border-bottom:2pxsolidHighlight/)
})
it('uses a 1px focus outline with a 4px offset and uppercase labels and badges',async()=>{
 const css=await family(['button','label','badge','tooltip'])
 expect(css('styles/ui-style.css')).toContain('outline:1pxsolidvar(--ring);outline-offset:4px')
 for(const name of ['label','badge']){
  const r=rule(css('components/ui/'+name+'.css'),'[data-slot="'+name+'"]')
  expect(r).toContain('font-size:11px')
  expect(r).toContain('text-transform:uppercase')
  expect(r).toMatch(name==='label'?/letter-spacing:0?\.12em/:/letter-spacing:0?\.1em/)
 }
 const tip=rule(css('components/ui/tooltip.css'),'[data-slot="tooltip-content"]')
 expect(tip).toContain('background:var(--card)')
 expect(tip).toContain('box-shadow:06px16px-8pxrgb(000/18%)')
 expect(forcedColors(css('components/ui/tooltip.css'))).toContain('border-color:CanvasText')
})
it('records the minimalist family refresh as an intentional baseline change',()=>{
 const entry=(baseline.intentionalChanges as any[]).find(c=>c.reason==='minimalist family refresh')
 expect(entry.families).toEqual(['minimalist'])
 expect(entry.logicalPaths).toEqual(['styles/ui-style.css','components/ui/*.css','scoped Button preset and recipe button.css','styles/ui-tokens.css','scoped Button preset and recipe components/ui/button.tsx'])
 expect((baseline.intentionalChanges as any[]).some(c=>c.reason==='flat family refresh')).toBe(true)
})
