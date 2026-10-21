import { afterEach, expect, it } from 'vitest'
import fs from 'node:fs/promises'
import path from 'node:path'
import { compile, compileRecipe } from '@ombelle/compiler'
import { getCatalog } from '@ombelle/catalog'
import { createProject } from '../../../tests/helpers/projects.js'
import { snapshotTree } from '../../../tests/helpers/tree.js'
import { inspectProject } from '../src/project/inspect.js'
import { planTheme } from '../src/plan/theme.js'
import { planAdd } from '../src/plan/components.js'
import { planRecipe } from '../src/plan/recipe.js'
import { applyPlan } from '../src/apply/transaction.js'
import example from '../../../examples/recipe.example.json'
const roots:string[]=[]
afterEach(async()=>{for(const root of roots.splice(0))await fs.rm(root,{recursive:true,force:true})})
async function setup(){const root=await createProject('vite');roots.push(root);const ordinary=await compile({preset:getCatalog('0.1.0').presets.minimalist,componentIds:['button'],catalogRelease:'0.1.0',compilerVersion:'0.1.0'});await applyPlan(await planTheme(await inspectProject(root),ordinary));await applyPlan(await planAdd(await inspectProject(root),ordinary),{dependencies:async()=>{}});return root}
it('installs alongside ordinary source and keeps global bytes, repeat is noop',async()=>{
 const root=await setup(),before=await snapshotTree(root)
 const result=await compileRecipe({recipe:example}),plan=await planRecipe(await inspectProject(root),result)
 expect(plan.changes.filter(c=>c.action!=='noop').map(c=>c.path)).not.toContain('ui-preset.json')
 await applyPlan(plan,{dependencies:async()=>{}})
 const after=await snapshotTree(root)
 for(const [file,bytes] of Object.entries(before))if(file!=='ui-library.lock.json')expect(after[file],file).toEqual(bytes)
 const repeat=await planRecipe(await inspectProject(root),result)
 expect(repeat.changes.every(c=>c.action==='noop')).toBe(true)
 const lock=JSON.parse(await fs.readFile(path.join(root,'ui-library.lock.json'),'utf8'))
 expect(lock.recipes['rc_primary-button@2'].recipe.hash).toBe(result.recipe.hash)
 const input=await compile({preset:(await inspectProject(root)).preset,componentIds:['input'],catalogRelease:'0.1.0',compilerVersion:'0.1.0'})
 await applyPlan(await planAdd(await inspectProject(root),input),{dependencies:async()=>{}})
 await applyPlan(await planTheme(await inspectProject(root),await compile({preset:getCatalog('0.1.0').presets.flat,componentIds:[],catalogRelease:'0.1.0',compilerVersion:'0.1.0'})))
 expect((await inspectProject(root)).lock!.recipes).toEqual(lock.recipes)
})
it('conflicts for immutable revisions, edited utilities and changed dark context',async()=>{
 const root=await setup(),result=await compileRecipe({recipe:example})
 await applyPlan(await planRecipe(await inspectProject(root),result),{dependencies:async()=>{}})
 for(const changed of [await compileRecipe({recipe:{...example,content:'Different'}}),await compileRecipe({recipe:example,darkSelector:'.night'})]){
  expect((await planRecipe(await inspectProject(root),changed)).diagnostics.length).toBeGreaterThan(0)
 }
 await fs.appendFile(path.join(root,'src/lib/utils.ts'),'\n// edited\n')
 expect((await planRecipe(await inspectProject(root),result)).changes.some(c=>c.action==='conflict')).toBe(true)
})
it('rolls back recipe artifacts and metadata after a write failure',async()=>{
 const root=await setup(),before=await snapshotTree(root),plan=await planRecipe(await inspectProject(root),await compileRecipe({recipe:example}))
 await expect(applyPlan(plan,{dependencies:async()=>{},beforeWrite:async(_,i)=>{if(i===1)throw Error('injected')}})).rejects.toThrow('injected')
 const after=await snapshotTree(root)
 for(const [file,bytes] of Object.entries(before))expect(after[file],file).toEqual(bytes)
 expect(Object.keys(after).filter(f=>f.includes('recipes/'))).toEqual([])
})
