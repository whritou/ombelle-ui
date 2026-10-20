import { it,expect } from 'vitest'
import { registryItemSchema,registrySchema } from 'shadcn/schema'
import { compile } from '@ombelle/compiler'
import example from '../../../examples/preset.example.json'
import { buildRegistry } from '../src/registry/build.js'
it('exports schema-valid source and themes with exact compiler bytes',async()=>{const r=await compile({preset:example,componentIds:['button'],catalogRelease:'0.1.0',compilerVersion:'0.1.0'});const registry=buildRegistry(r);expect(registrySchema.safeParse(registry.index).success).toBe(true);for(const item of Object.values(registry.items))expect(registryItemSchema.safeParse(item).success).toBe(true);expect(registry.items.button.files[0].content).toBe(r.artifacts.find(a=>a.logicalPath==='components/ui/button.tsx')!.content);expect(registry.items.theme.cssVars.light.primary).toBe('#facc15');expect(registry.items.button).not.toHaveProperty('presetHash')})
