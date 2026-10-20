import fs from 'node:fs/promises'
import path from 'node:path'
import type { CompileResult } from '@ombelle/contracts'
import { sha256 } from '@ombelle/compiler'
import { createBunProject, auditBunFixture } from '../tests/helpers/bun-project.js'
import { runBuiltCli, jsonRecord } from '../tests/helpers/cli-runtime.js'
import { assertBunOwnership } from '../packages/cli/src/apply/bun.js'

export async function prepareBunConsumer(framework:'vite'|'next',format:'text'|'binary',runtime:'node'|'bun') {
 const fixture=await createBunProject(framework,format),repo=process.cwd()
 try {
  await fs.writeFile(path.join(fixture.root,'.ombelle-fixture.json'),JSON.stringify({owner:repo,framework,family:'flat'}))
  await fs.appendFile(path.join(fixture.root,'src/index.css'),'\n.user-bun-style {color:hotpink;}\n')
  const preset=path.join(repo,'packages/catalog/src/presets/flat.json')
  const init=await runBuiltCli(runtime,['init','--preset',preset,'--yes','--json'],fixture.root)
  if(init.code!==0)throw new Error(init.output)
  for(const args of [['add','button','dialog','--yes','--json'],['add','input','--yes','--json']]) {
   const result=await runBuiltCli(runtime,args,fixture.root)
   if(result.code!==0 || jsonRecord(result.data).presetHash!==jsonRecord(init.data).presetHash)throw new Error(result.output)
  }
  if(!(await fs.readFile(path.join(fixture.root,'src/index.css'),'utf8')).includes('.user-bun-style'))throw new Error('Bun lost unrelated CSS')
  const canonical=JSON.parse(await fs.readFile('apps/preview/src/generated/flat/manifest.json','utf8')) as CompileResult
  const lock=jsonRecord(JSON.parse(await fs.readFile(path.join(fixture.root,'ui-library.lock.json'),'utf8')))
  const sourceHashes:Record<string,string>={},artifacts=[]
  for(const [file,record] of Object.entries(jsonRecord(lock.artifacts))) {
   const meta=jsonRecord(record),source=await fs.readFile(path.join(fixture.root,file),'utf8'),reference=canonical.artifacts.find(a=>a.logicalPath===meta.logicalPath)
   const hash=await sha256(source)
   if(!reference || source!==reference.content || hash!==meta.sha256 || source.includes('@ombelle/'))throw new Error('Bun installed source differs from canonical artifact: '+file)
   sourceHashes[file]=hash;artifacts.push({path:file,logicalPath:reference.logicalPath,sha256:hash})
  }
  await assertBunOwnership(fixture.root,fixture.lockfile)
  const audit=await auditBunFixture(fixture)
  return {fixture,cliRuntime:init.runtime,sourceHashes,artifacts,audit}
 }catch(e){await fs.rm(fixture.root,{recursive:true,force:true});throw e}
}
