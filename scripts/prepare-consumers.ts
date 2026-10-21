import os from 'node:os'
import fs from 'node:fs/promises'
import path from 'node:path'
import { consumerCases, assignConsumerPorts, type ConsumerCase } from './consumer-matrix.js'
import { prepareNodeConsumer } from './prepare-node-consumer.js'
import { prepareBunConsumer } from './prepare-bun-consumers.js'
type Fixture=ConsumerCase & {root:string;port:number;version?:string;linker?:string;bunVersion?:string;bunLockfile?:'bun.lock'|'bun.lockb';buildRuntime?:'node'}
const repo=process.cwd(),map:Record<string,Fixture>={},proof:Record<string,unknown>={},bunRows:Record<string,unknown>={}
let previous:Record<string,Fixture>={}
try{previous=JSON.parse(await fs.readFile('.artifacts/consumers.json','utf8'))}catch(e){if((e as NodeJS.ErrnoException).code!=='ENOENT')throw e}
const temp=await fs.realpath(os.tmpdir())
for(const item of Object.values(previous)){
 let real:string
 try{real=await fs.realpath(item.root)}catch(e){if((e as NodeJS.ErrnoException).code==='ENOENT')continue;throw e}
 const relative=path.relative(temp,real),marker=JSON.parse(await fs.readFile(path.join(real,'.ombelle-fixture.json'),'utf8'))
 if(relative.includes(path.sep)||!relative.startsWith('ombelle-')||marker.owner!==repo)throw new Error('Refusing to remove an unowned fixture')
 await fs.rm(real,{recursive:true,force:true})
}
await fs.mkdir('.artifacts',{recursive:true})
const cases=consumerCases(),ports=assignConsumerPorts(cases),versions:Record<string,string>={}
for(const spec of cases){
 console.log('Preparing '+spec.id)
 if(spec.manager==='bun'){
  if(!spec.bunFormat)throw new Error('Missing Bun lockfile format')
  const row=await prepareBunConsumer(spec.framework,spec.bunFormat,spec.cliRuntime,spec.family)
  map[spec.id]={...spec,root:row.fixture.root,port:ports[spec.id],buildRuntime:'node',bunLockfile:row.fixture.lockfile,bunVersion:row.fixture.version,version:row.fixture.version}
  proof[spec.id]={family:spec.family,manager:'bun',version:row.fixture.version,cliRuntime:row.cliRuntime,artifacts:row.artifacts,audit:{exitCode:row.audit.code,scope:'all'}}
  bunRows[spec.id]={family:spec.family,bunVersion:row.fixture.version,bunLockfile:row.fixture.lockfile,cliRuntime:row.cliRuntime,sourceHashes:row.sourceHashes,auditExitCode:row.audit.code,build:{status:'pending'}}
  await fs.writeFile('.artifacts/audit-'+spec.id+'.json',row.audit.output)
  versions.bun=row.fixture.version
 }else{
  const row=await prepareNodeConsumer(spec)
  map[spec.id]={...spec,root:row.root,port:ports[spec.id],version:row.version,linker:row.linker}
  proof[spec.id]={family:spec.family,manager:spec.manager,version:row.version,framework:spec.framework,linker:row.linker,cliRuntime:row.cliRuntime,artifacts:row.artifacts,audit:{exitCode:row.audit.code,scope:row.audit.scope},immutableInstall:true,noForeignLockfiles:true}
  await fs.writeFile('.artifacts/audit-'+spec.id+'.json',row.audit.output)
  versions[spec.manager==='yarn'?(row.version.startsWith('1.')?'classic':'modern'):spec.manager]=row.version
 }
 await fs.writeFile('.artifacts/consumers.json',JSON.stringify(map,null,2))
 await fs.writeFile('.artifacts/install-provenance.json',JSON.stringify(proof,null,2))
 await fs.writeFile('.artifacts/bun-matrix.json',JSON.stringify(bunRows,null,2))
}
await fs.writeFile('.artifacts/npm-version.json',JSON.stringify({version:versions.npm}))
await fs.writeFile('.artifacts/bun-version.json',JSON.stringify({version:versions.bun}))
await fs.writeFile('.artifacts/yarn-matrix.json',JSON.stringify(Object.fromEntries(Object.entries(proof).filter(([id])=>id.startsWith('yarn-'))),null,2))
await fs.writeFile('.artifacts/yarn-versions.json',JSON.stringify({classic:versions.classic,modern:versions.modern},null,2))
