import { afterEach, expect, it } from 'vitest'
import fs from 'node:fs/promises'
import path from 'node:path'
import { compile } from '@ombelle/compiler'
import { createHash } from 'node:crypto'
import { createBunProject, buildBunFixture, bunEvidenceRow } from '../helpers/bun-project.js'
import { runBuiltCli, jsonRecord } from '../helpers/cli-runtime.js'
import { snapshotTree } from '../helpers/tree.js'
import { runNative } from '../helpers/bun-command.js'
const roots:string[]=[]
afterEach(async()=>{for(const root of roots.splice(0))await fs.rm(root,{recursive:true,force:true})})
const matrix=(['vite','next'] as const).flatMap(framework=>(['text','binary'] as const).flatMap(format=>(['node','bun'] as const).map(runtime=>({framework,format,runtime}))))
const preset=path.resolve('packages/catalog/src/presets/flat.json')
it('records measured Bun evidence and rejects failed or missing outcomes',()=>{
 const fixture={root:'/fixture',executable:'/tools/bun',version:'1.4.3' as const,lockfile:'bun.lockb' as const}
 const outcome={cliRuntime:{executable:'/tools/bun',name:'bun' as const,version:'1.4.3'},buildRuntime:{executable:'/tools/node',name:'node' as const,version:'24.19.0'},sourceHashes:{'src/components/ui/button.tsx':'hash'},auditExitCode:0,buildExitCode:0}
 const row=bunEvidenceRow(fixture,outcome)
 expect(row.bunVersion).toBe('1.4.3');expect(row.bunLockfile).toBe('bun.lockb');expect(row.cliRuntime).toEqual(outcome.cliRuntime)
 expect(()=>bunEvidenceRow(fixture,{...outcome,auditExitCode:1})).toThrow()
 expect(()=>bunEvidenceRow(fixture,{...outcome,buildExitCode:1})).toThrow()
 expect(()=>bunEvidenceRow(fixture,{...outcome,auditExitCode:undefined as unknown as number})).toThrow()
})
it.each(matrix)('$framework / $format / $runtime preserves manager and builds',async({framework,format,runtime})=>{
 const fixture=await createBunProject(framework,format);roots.push(fixture.root)
 const originalPkg=JSON.parse(await fs.readFile(path.join(fixture.root,'package.json'),'utf8'))
 await fs.appendFile(path.join(fixture.root,'src/index.css'),'\n.user-bun-style { color: hotpink; }\n')
 const init=await runBuiltCli(runtime,['init','--preset',preset,'--yes','--json'],fixture.root)
 expect(init.code,init.output).toBe(0);expect(init.runtime.name).toBe(runtime)
 if(runtime==='bun')expect(init.runtime.version).toBe('1.4.3')
 expect(jsonRecord(init.data).packageManager).toBe('bun');expect(jsonRecord(init.data).bunLockfile).toBe(fixture.lockfile)
 for(const args of [['add','button','dialog','--yes','--json'],['add','input','--yes','--json']]) {
   const added=await runBuiltCli(runtime,args,fixture.root);expect(added.code,added.output).toBe(0)
   expect(jsonRecord(added.data).presetHash).toBe(jsonRecord(init.data).presetHash)
 }
 const pkg=JSON.parse(await fs.readFile(path.join(fixture.root,'package.json'),'utf8'))
 expect(pkg.packageManager).toBe(originalPkg.packageManager);expect(pkg.dependencies.clsx).toBe('2.1.1')
 expect(JSON.parse(await fs.readFile(path.join(fixture.root,'node_modules/clsx/package.json'),'utf8')).version).toBe('2.1.1')
 expect(await fs.readFile(path.join(fixture.root,'src/index.css'),'utf8')).toContain('.user-bun-style')
 const lock=JSON.parse(await fs.readFile(path.join(fixture.root,'ui-library.lock.json'),'utf8'))
 const data=JSON.parse(await fs.readFile(preset,'utf8')),canonical=await compile({preset:data,componentIds:['button','dialog','input'],catalogRelease:data.catalogRelease,compilerVersion:data.compilerVersion})
 for(const [file,record] of Object.entries(lock.artifacts)) {
   const meta=jsonRecord(record),source=await fs.readFile(path.join(fixture.root,file),'utf8')
   expect(createHash('sha256').update(source).digest('hex')).toBe(meta.sha256)
   expect(source).toBe(canonical.artifacts.find(a=>a.logicalPath===meta.logicalPath)?.content)
 }
 for(const foreign of ['package-lock.json','pnpm-lock.yaml','yarn.lock',format==='text'?'bun.lockb':'bun.lock'])await expect(fs.access(path.join(fixture.root,foreign))).rejects.toMatchObject({code:'ENOENT'})
 if(format==='binary')expect((await fs.readFile(path.join(fixture.root,'bun.lockb'))).includes(0)).toBe(true)
 const lockBefore=await fs.readFile(path.join(fixture.root,fixture.lockfile))
 for(const args of [['add','input','--yes','--json'],['theme','add',preset,'--yes','--json'],['add','button','--dry-run','--json']]) {
   const noop=await runBuiltCli(runtime,args,fixture.root,{OMBELLE_BUN_EXECUTABLE:path.join(fixture.root,'missing.exe')})
   expect(noop.code,noop.output).toBe(0)
 }
 expect(await fs.readFile(path.join(fixture.root,fixture.lockfile))).toEqual(lockBefore)
 const frozen=await runNative(fixture.executable,['install','--frozen-lockfile','--ignore-scripts'],fixture.root)
 expect(frozen.code,frozen.output).toBe(0)
 expect(await fs.readFile(path.join(fixture.root,fixture.lockfile))).toEqual(lockBefore)
 const built=await buildBunFixture(fixture.root,framework);expect(built.code,built.output).toBe(0);expect(built.runtime.name).toBe('node')
 await fs.appendFile(path.join(fixture.root,'src/components/ui/button.tsx'),'\n// user edit\n')
 const before=await snapshotTree(fixture.root),conflict=await runBuiltCli(runtime,['add','button','--yes','--json'],fixture.root)
 expect(conflict.code,conflict.output).toBe(4);expect(await snapshotTree(fixture.root)).toEqual(before)
},180000)
it('generates equivalent output and errors under both CLI runtimes',async()=>{
 const outputs:unknown[]=[],errors:unknown[]=[]
 for(const runtime of ['node','bun'] as const) {
   const fixture=await createBunProject('vite','text');roots.push(fixture.root)
   const result=await runBuiltCli(runtime,['init','--preset',preset,'--dry-run','--json'],fixture.root)
   expect(result.code,result.output).toBe(0)
   outputs.push(JSON.parse(JSON.stringify(result.data).replaceAll(fixture.root,'<root>').replaceAll(fixture.root.replaceAll('\\','\\\\'),'<root>')))
   const invalid=await runBuiltCli(runtime,['add','bad-component','--json'],fixture.root)
   expect(invalid.code).not.toBe(0)
   errors.push(JSON.parse(JSON.stringify(invalid.data).replaceAll(fixture.root,'<root>').replaceAll(fixture.root.replaceAll('\\','\\\\'),'<root>')))
 }
 expect(outputs[1]).toEqual(outputs[0])
 expect(errors[1]).toEqual(errors[0])
})
