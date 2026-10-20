import fs from 'node:fs/promises'
import path from 'node:path'
import {randomUUID} from 'node:crypto'
import {FoundationError,type InstallPlan,type Dependency} from '@ombelle/contracts'
import {sha256} from '@ombelle/compiler'
import {safePath} from '../project/paths.js'
import {readText} from '../project/inspect.js'
import {runDependencies} from './manager.js'
export type ApplyPorts={dependencies?:(root:string,deps:Dependency[])=>Promise<void>;beforeWrite?:(file:string,index:number)=>Promise<void>}
export type ApplyResult={status:'success';writtenPaths:string[]}
const hashAt=async(root:string,file:string)=>{const text=await readText(root,file);return text===null?null:await sha256(text)}
export async function applyPlan(plan:InstallPlan,ports:ApplyPorts={}):Promise<ApplyResult>{
 if(plan.diagnostics.length||plan.changes.some(c=>c.action==='conflict'))throw new FoundationError('FILE_CONFLICT','Resolve all plan conflicts before applying')
 const seen=new Set<string>();for(const c of plan.changes){const key=path.normalize(c.path).toLowerCase();if(seen.has(key))throw new FoundationError('FILE_CONFLICT','Duplicate destination',c.path);seen.add(key);await safePath(plan.projectRoot,c.path)}
 const lockPath=await safePath(plan.projectRoot,'.ombelle-operation.lock');let operation:fs.FileHandle
 try{operation=await fs.open(lockPath,'wx')}catch(e){if((e as NodeJS.ErrnoException).code==='EEXIST')throw new FoundationError('FILE_CONFLICT','Another operation or an unrecovered lock exists',lockPath);throw e}
 let folder:string|undefined,dependencyStarted=false
 const written:{path:string;afterHash:string;before:Buffer|null}[]=[]
 try{
  for(const [file,hash]of Object.entries(plan.preconditions??{}))if(await hashAt(plan.projectRoot,file)!==hash)throw new FoundationError('FILE_CONFLICT','Project metadata changed after planning',file)
  for(const c of plan.changes)if(await hashAt(plan.projectRoot,c.path)!==c.beforeHash)throw new FoundationError('FILE_CONFLICT','File changed after planning',c.path)
  const pending=plan.changes.filter(c=>c.action!=='noop')
  if(!pending.length&&!plan.dependencyPlan.length)return {status:'success',writtenPaths:[]}
  const relative='.ombelle-transactions/'+randomUUID();folder=await safePath(plan.projectRoot,relative);await fs.mkdir(path.dirname(folder),{recursive:true});await fs.mkdir(folder)
  await fs.writeFile(path.join(folder,'plan.json'),JSON.stringify(plan,null,2))
  for(let i=0;i<pending.length;i++){
   const c=pending[i];await ports.beforeWrite?.(c.path,i)
   const target=await safePath(plan.projectRoot,c.path)
   if(await hashAt(plan.projectRoot,c.path)!==c.beforeHash)throw new FoundationError('FILE_CONFLICT','File changed while applying',c.path)
   const before=c.beforeHash===null?null:await fs.readFile(target)
   if(before!==null)await fs.writeFile(path.join(folder,i+'.bak'),before)
   const staged=path.join(folder,i+'.tmp');await fs.writeFile(staged,c.afterContent);await fs.mkdir(path.dirname(target),{recursive:true})
   await safePath(plan.projectRoot,c.path);await fs.rename(staged,target)
   written.push({path:c.path,afterHash:await sha256(c.afterContent),before})
  }
  if(plan.dependencyPlan.length){dependencyStarted=true;await (ports.dependencies??runDependencies)(plan.projectRoot,plan.dependencyPlan)}
  await fs.rm(folder,{recursive:true});folder=undefined
  try{await fs.rmdir(await safePath(plan.projectRoot,'.ombelle-transactions'))}catch(e){if(!['ENOTEMPTY','ENOENT','EEXIST'].includes((e as NodeJS.ErrnoException).code??''))throw e}
  return {status:'success',writtenPaths:written.map(w=>w.path)}
 }catch(cause){
  if(!folder)throw cause
  const unrestoredPaths:string[]=[]
  for(const entry of written.toReversed()){
   try{const target=await safePath(plan.projectRoot,entry.path);if(await hashAt(plan.projectRoot,entry.path)!==entry.afterHash){unrestoredPaths.push(entry.path);continue}if(entry.before===null)await fs.unlink(target);else await fs.writeFile(target,entry.before)}catch{unrestoredPaths.push(entry.path)}
  }
  const recovery={sourceRestored:unrestoredPaths.length===0,unrestoredPaths,transactionPath:folder,packageStateMayHaveChanged:dependencyStarted}
  await fs.writeFile(path.join(folder,'recovery.json'),JSON.stringify(recovery,null,2))
  const error=new FoundationError(dependencyStarted?'DEPENDENCY_FAILURE':cause instanceof FoundationError?cause.code:'INTERNAL_ERROR',cause instanceof Error?cause.message:'Installation failed',folder,'Review recovery.json and repair the project with pnpm before retrying.');error.recovery=recovery;throw error
 }finally{await operation.close();await fs.unlink(lockPath)}
}
