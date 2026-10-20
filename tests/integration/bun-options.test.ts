import { afterEach, expect, it } from 'vitest'
import fs from 'node:fs/promises'
import path from 'node:path'
import { prepareManager } from '../../packages/cli/src/apply/manager.js'
import { snapshotTree } from '../helpers/tree.js'
import { createProject } from '../helpers/projects.js'
import { inspectProject } from '../../packages/cli/src/project/inspect.js'
import { planAdd } from '../../packages/cli/src/plan/components.js'
import { applyPlan } from '../../packages/cli/src/apply/transaction.js'
import { compile } from '@ombelle/compiler'
import { runDependencies } from '../../packages/cli/src/apply/manager.js'
import { resolveBunExecutable } from '../../packages/cli/src/apply/executable.js'
import { runNative } from '../helpers/bun-command.js'
const roots:string[]=[]
const originalDryRun=process.env.NPM_CONFIG_DRY_RUN
afterEach(()=>{if(originalDryRun===undefined)delete process.env.NPM_CONFIG_DRY_RUN;else process.env.NPM_CONFIG_DRY_RUN=originalDryRun})
afterEach(async()=>{for(const root of roots.splice(0))await fs.rm(root,{recursive:true,force:true})})
const settings=[
 '[install]\ndryRun=true', '[install]\nproduction=true', '[install]\nfrozenLockfile=true',
 '[install.lockfile]\nsave=false', '[install.lockfile]\nprint="yarn"', '[install.lockfile]\nsavePath="elsewhere.lock"', '[install.lockfile]\npath="elsewhere.lock"',
 '[install]\nsaveTextLockfile=true',
]
it.each(settings)('rejects unsafe configuration %s without writing',async setting=>{
 const root=await createProject('vite');roots.push(root)
 await fs.writeFile(path.join(root,'bunfig.toml'),setting+'\n')
 const before=await snapshotTree(root)
 await expect(prepareManager(root,'bun','bun.lockb')).rejects.toMatchObject({code:'UNSUPPORTED_PROJECT'})
 expect(await snapshotTree(root)).toEqual(before)
})
it('does not let local npmrc hide an unsafe environment value',async()=>{
 const root=await createProject('vite');roots.push(root)
 await fs.writeFile(path.join(root,'.npmrc'),'dry-run=false\n')
 process.env.NPM_CONFIG_DRY_RUN='true'
 await expect(prepareManager(root,'bun','bun.lock')).rejects.toMatchObject({code:'UNSUPPORTED_PROJECT'})
})
it('inspects configuration without executing its runtime preload',async()=>{
 const root=await createProject('vite');roots.push(root)
 const sentinel=path.join(root,'preload-ran')
 await fs.writeFile(path.join(root,'preload.js'),`require('fs').writeFileSync(${JSON.stringify(sentinel)},'ran')`)
 await fs.writeFile(path.join(root,'bunfig.toml'),'preload=["./preload.js"]\n[install]\nignoreScripts=false\n')
 await prepareManager(root,'bun','bun.lock')
 await expect(fs.access(sentinel)).rejects.toMatchObject({code:'ENOENT'})
})
async function plannedRoot() {
 const root=await createProject('vite');roots.push(root)
 await fs.rm(path.join(root,'pnpm-lock.yaml'))
 const pkg=JSON.parse(await fs.readFile(path.join(root,'package.json'),'utf8'));pkg.packageManager='bun@1.4.3'
 await fs.writeFile(path.join(root,'package.json'),JSON.stringify(pkg));await fs.writeFile(path.join(root,'bun.lockb'),Buffer.from([0x80]))
 const preset=JSON.parse(await fs.readFile('examples/preset.example.json','utf8'))
 return {root,plan:await planAdd(await inspectProject(root),await compile({preset,componentIds:['button'],catalogRelease:preset.catalogRelease,compilerVersion:preset.compilerVersion}))}
}
it('rejects unsafe settings before entering the source transaction',async()=>{
 const {root}=await plannedRoot();await fs.writeFile(path.join(root,'bunfig.toml'),'[install]\ndryRun=true\n')
 const context=await inspectProject(root),preset=JSON.parse(await fs.readFile('examples/preset.example.json','utf8'))
 const plan=await planAdd(context,await compile({preset,componentIds:['button'],catalogRelease:preset.catalogRelease,compilerVersion:preset.compilerVersion}))
 const before=await snapshotTree(root)
 await expect(applyPlan(plan)).rejects.toMatchObject({code:'UNSUPPORTED_PROJECT'})
 expect(await snapshotTree(root)).toEqual(before)
})
it('names Bun and its binary lock in honest dependency-failure recovery',async()=>{
 const {root,plan}=await plannedRoot(),executable=await resolveBunExecutable()
 const failure=applyPlan(plan,{dependencies:(r,deps,manager)=>runDependencies(r,deps,manager,{executable,prefixArgs:['--eval','process.exit(1)'],version:'1.4.3'},'bun.lockb')})
 await expect(failure).rejects.toMatchObject({code:'DEPENDENCY_FAILURE',nextAction:expect.stringContaining('bun.lockb'),recovery:{sourceRestored:true,packageStateMayHaveChanged:true}})
 await expect(fs.access(path.join(root,'src/components/ui/button.tsx'))).rejects.toMatchObject({code:'ENOENT'})
})
it('performs dry-run, theme add, and no-op add with Bun unavailable',async()=>{
 const {root}=await plannedRoot(),preset=path.resolve('examples/preset.example.json')
 const pkg=JSON.parse(await fs.readFile(path.join(root,'package.json'),'utf8'))
 const data=JSON.parse(await fs.readFile(preset,'utf8'))
 const result=await compile({preset:data,componentIds:['button'],catalogRelease:data.catalogRelease,compilerVersion:data.compilerVersion})
 for(const dep of result.dependencies)pkg.dependencies[dep.name]=dep.version
 await fs.writeFile(path.join(root,'package.json'),JSON.stringify(pkg))
 const cli=path.resolve('packages/cli/dist/main.js')
 for(const args of [['init','--preset',preset,'--dry-run'],['init','--preset',preset,'--yes'],['add','button','--yes'],['add','button','--yes'],['theme','add',preset,'--yes']]) {
   const command=await runNative(process.execPath,[cli,...args,'--cwd',root,'--json'],root,{OMBELLE_BUN_EXECUTABLE:path.join(root,'missing.exe')})
   expect(command.code,command.output).toBe(0)
 }
})
