import { validatePreset, FoundationError, type StyleFamily, type ResolvedPreset } from '@ombelle/contracts'
import type { Catalog } from '@ombelle/catalog'
import { canonicalize } from './canonicalize.js'
import { sha256 } from './hash.js'
function normalizeColor(color: string): string {
 if(color.startsWith('#'))return color.toLowerCase()
 const [l,c,h,,a]=color.slice(6,-1).split(' ')
 const n=(s:string)=>Number(s.replace('%',''))/(s.endsWith('%')?100:1)
 return 'oklch('+n(l)+' '+Number(c)+' '+Number(h)+(a===undefined?'':' / '+n(a))+')'
}
export async function resolvePreset(input: unknown, catalog: Catalog): Promise<ResolvedPreset> {
 const p=validatePreset(input)
 if(p.catalogRelease!==catalog.release||p.compilerVersion!=='0.1.0')throw new FoundationError('UNSUPPORTED_RELEASE','Preset release mismatch','/catalogRelease')
 const base=catalog.presets[p.styleFamily as StyleFamily]
 if(!base)throw new FoundationError('INVALID_DATA','Style family is not available in the foundation','/styleFamily')
 const data={...base,...p,design:{...base.design,...p.design},componentDefaults:{button:{variant:'default' as const,size:'default' as const,...base.componentDefaults?.button,...p.componentDefaults?.button}},modes:{light:{...base.modes.light,...p.modes.light},dark:{...base.modes.dark,...p.modes.dark}}}
 for(const mode of ['light','dark'] as const) for(const key of Object.keys(data.modes[mode]) as (keyof typeof data.modes.light)[]) data.modes[mode][key]=normalizeColor(data.modes[mode][key]!)
 return {data,hash:await sha256(canonicalize(data))}
}
