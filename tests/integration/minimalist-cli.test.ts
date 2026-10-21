import { afterEach, expect, it, vi } from 'vitest'
import fs from 'node:fs/promises'
import path from 'node:path'
import { compile } from '@ombelle/compiler'
import { getCatalog } from '@ombelle/catalog'
import { createProject } from '../helpers/projects.js'
import { createNpmProject } from '../helpers/npm-project.js'
import { createYarnProject } from '../helpers/yarn-project.js'
import { createBunProject } from '../helpers/bun-project.js'
import { runBuiltCli, jsonRecord } from '../helpers/cli-runtime.js'
import { snapshotTree } from '../helpers/tree.js'
import { inspectProject } from '../../packages/cli/src/project/inspect.js'
import { planTheme } from '../../packages/cli/src/plan/theme.js'
import { applyPlan } from '../../packages/cli/src/apply/transaction.js'
const roots:string[]=[]
afterEach(async()=>{for(const root of roots.splice(0))await fs.rm(root,{recursive:true,force:true})})
it.each(['npm','pnpm','yarn','bun'] as const)('%s preserves an existing shadcn project through minimalist theme and reuse',async manager=>{
 let root:string,env:NodeJS.ProcessEnv={},runtime:'node'|'bun'='node'
 if(manager==='yarn'){const fixture=await createYarnProject('classic-vite','minimalist');root=fixture.root;env={OMBELLE_YARN_ENTRY:fixture.entry,npm_execpath:fixture.entry}}
 else if(manager==='bun'){root=(await createBunProject('vite','binary','minimalist')).root;runtime='bun'}
 else root=await(manager==='npm'?createNpmProject('vite'):createProject('vite'))
 roots.push(root)
 if(manager==='yarn'||manager==='bun')await fs.writeFile(path.join(root,'components.json'),JSON.stringify({style:'radix-nova',rsc:false,tsx:true,tailwind:{css:'src/index.css'},aliases:{components:'@/components',ui:'@/components/ui',utils:'@/lib/utils'}}))
 await fs.mkdir(path.join(root,'src/components'),{recursive:true});await fs.writeFile(path.join(root,'src/components/Existing.tsx'),'export const Existing=()=>null\n')
 const lock=manager==='npm'?'package-lock.json':manager==='pnpm'?'pnpm-lock.yaml':manager==='yarn'?'yarn.lock':'bun.lockb'
 const protectedFiles=['components.json','package.json',lock,'src/components/Existing.tsx']
 const before=await Promise.all(protectedFiles.map(f=>fs.readFile(path.join(root,f))))
 const preset=path.resolve('packages/catalog/src/presets/minimalist.json')
 const dryBefore=await snapshotTree(root)
 const dry=await runBuiltCli(runtime,['theme','add',preset,'--dry-run','--json'],root,env)
 expect(dry.code,dry.output).toBe(0);expect(await snapshotTree(root)).toEqual(dryBefore)
 const theme=await runBuiltCli(runtime,['theme','add',preset,'--yes','--json'],root,env)
 expect(theme.code,theme.output).toBe(0);expect(jsonRecord(theme.data).dependencyPlan).toEqual([])
 for(let i=0;i<protectedFiles.length;i++)expect(await fs.readFile(path.join(root,protectedFiles[i]))).toEqual(before[i])
 expect(await fs.readFile(path.join(root,'src/index.css'),'utf8')).toContain('--unrelated')
 const repeat=await runBuiltCli(runtime,['theme','add',preset,'--yes','--json'],root,env)
 expect(repeat.code,repeat.output).toBe(0)
 expect((jsonRecord(repeat.data).changes as {action:string}[]).every(c=>c.action==='noop')).toBe(true)
 for(const component of ['button','input']){
  const result=await runBuiltCli(runtime,['add',component,'--yes','--json'],root,env)
  expect(result.code,result.output).toBe(0);expect(jsonRecord(result.data).presetHash).toBe(jsonRecord(theme.data).presetHash)
 }
 await fs.appendFile(path.join(root,'src/components/ui/button.tsx'),'\n// owned user edit\n')
 const edited=await snapshotTree(root),conflict=await runBuiltCli(runtime,['add','button','--yes','--json'],root,env)
 expect(conflict.code,conflict.output).toBe(4);expect(await snapshotTree(root)).toEqual(edited)
},180000)
it('merges custom dark selectors without dependencies or duplicate declarations',async()=>{
 const root=await createProject('vite');roots.push(root)
 await fs.appendFile(path.join(root,'src/index.css'),'\n.theme-dark { --keep-dark: 42; }\n')
 await fs.writeFile(path.join(root,'ui-library.config.json'),JSON.stringify({configVersion:1,platform:'react-web',language:'tsx',presetFile:'ui-preset.json',lockFile:'ui-library.lock.json',packageManager:'auto',theme:{strategy:'merge',cssEntry:'src/index.css',darkSelector:'.theme-dark'},paths:{components:'src/components/ui',styleOutput:'src/styles/ui-style.css'}}))
 const context=await inspectProject(root)
 const compiled=await compile({preset:getCatalog('0.1.0').presets.minimalist,componentIds:[],catalogRelease:'0.1.0',compilerVersion:'0.1.0'})
 const deps=vi.fn(),plan=await planTheme(context,compiled)
 await applyPlan(plan,{dependencies:deps})
 expect(deps).not.toHaveBeenCalled()
 const before=await fs.readFile(path.join(root,'src/index.css'),'utf8')
 expect(before).toContain('--keep-dark: 42')
 const repeat=await planTheme(await inspectProject(root),compiled)
 await applyPlan(repeat,{dependencies:deps})
 expect(deps).not.toHaveBeenCalled();expect(await fs.readFile(path.join(root,'src/index.css'),'utf8')).toBe(before)
})
