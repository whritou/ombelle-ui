import fs from 'node:fs/promises'
import path from 'node:path'
import os from 'node:os'
import type { BunLockfile } from '@ombelle/contracts'
import { resolveBunExecutable } from '../../packages/cli/src/apply/executable.js'
import { runNative } from './bun-command.js'
import { runtimeIdentity, type RuntimeIdentity } from './cli-runtime.js'
export type BunFixture={root:string;executable:string;version:'1.4.3';lockfile:BunLockfile}
export async function prepareBunTemplate(framework:'vite'|'next',format:'text'|'binary'):Promise<BunFixture> {
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'ombelle-bun-'+format+'-'+framework+'-'))
 try {
  await fs.cp(path.resolve('fixtures',framework),root,{recursive:true})
  await fs.rm(path.join(root,'pnpm-lock.yaml'))
  await fs.writeFile(path.join(root,'src/index.css'),await fs.readFile('fixtures/shared/base.css','utf8'))
  await fs.writeFile(path.join(root,'src/scenario.tsx'),(await fs.readFile('fixtures/shared/scenario.tsx','utf8')).replaceAll('STYLE_FAMILY','flat'))
  const pkg=JSON.parse(await fs.readFile(path.join(root,'package.json'),'utf8'));pkg.packageManager='bun@1.4.3';delete pkg.dependencies.clsx
  await fs.writeFile(path.join(root,'package.json'),JSON.stringify(pkg,null,2)+'\n')
  return {root,executable:await resolveBunExecutable(),version:'1.4.3',lockfile:format==='text'?'bun.lock':'bun.lockb'}
 } catch(e){await fs.rm(root,{recursive:true,force:true});throw e}
}
export async function createBunProject(framework:'vite'|'next',format:'text'|'binary'):Promise<BunFixture> {
 const fixture=await prepareBunTemplate(framework,format)
 try {
  await fs.copyFile(path.resolve('fixtures/bun',format+'-'+framework,fixture.lockfile),path.join(fixture.root,fixture.lockfile))
  const before=await fs.readFile(path.join(fixture.root,fixture.lockfile))
  const result=await runNative(fixture.executable,['install','--frozen-lockfile','--ignore-scripts'],fixture.root)
  if(result.code!==0)throw new Error(result.output)
  if(!(await fs.readFile(path.join(fixture.root,fixture.lockfile))).equals(before))throw new Error('Frozen Bun preparation changed the lockfile')
  return fixture
 } catch(e){await fs.rm(fixture.root,{recursive:true,force:true});throw e}
}
export async function buildBunFixture(root:string,framework:'vite'|'next') {
 const runtime=await runtimeIdentity('node')
 const entry=path.join(root,'node_modules',framework==='vite'?'vite/bin/vite.js':'next/dist/bin/next')
 const result=await runNative(runtime.executable,[entry,'build'],root,{NEXT_TELEMETRY_DISABLED:'1'})
 return {...result,runtime}
}
export type BunOutcome={cliRuntime:RuntimeIdentity;buildRuntime:RuntimeIdentity & {name:'node'};sourceHashes:Record<string,string>;auditExitCode:number;buildExitCode:number}
export function bunEvidenceRow(fixture:BunFixture,outcome:BunOutcome):Record<string,unknown> {
 if(outcome.auditExitCode!==0 || outcome.buildExitCode!==0 || outcome.buildRuntime?.name!=='node' || !outcome.cliRuntime?.version || !Object.keys(outcome.sourceHashes??{}).length)throw new Error('Bun evidence requires measured successful audit/build/runtime/source outcomes')
 return {bunVersion:fixture.version,bunLockfile:fixture.lockfile,cliRuntime:outcome.cliRuntime,buildRuntime:outcome.buildRuntime,sourceHashes:outcome.sourceHashes,audit:{exitCode:outcome.auditExitCode,scope:'all dependencies (includes production)',command:['bun','audit','--json']},build:{exitCode:outcome.buildExitCode},foreignLockfiles:false}
}
export async function auditBunFixture(fixture:BunFixture) {
 const lockPath=path.join(fixture.root,fixture.lockfile),before=await fs.readFile(lockPath)
 const result=await runNative(fixture.executable,['audit','--json'],fixture.root)
 let parsed:unknown
 try {parsed=JSON.parse(result.output)}catch{throw new Error('Bun audit returned a non-JSON report: '+result.output)}
 if(result.code!==0 || !parsed || typeof parsed!=='object' || Array.isArray(parsed) || Object.keys(parsed).length!==0)throw new Error('Bun audit failed or reported advisories/skips: '+result.output)
 if(!(await fs.readFile(lockPath)).equals(before))throw new Error('Bun audit changed the owned lockfile')
 return result
}
