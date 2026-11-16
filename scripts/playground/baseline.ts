import fs from 'node:fs/promises'
import path from 'node:path'
import {createHash,randomUUID} from 'node:crypto'
const excluded=new Set(['node_modules','.next','dist','.git','.ombelle-playground.json','next-env.d.ts','tsconfig.tsbuildinfo'])
export async function files(root:string):Promise<Record<string,string>>{
 const out:Record<string,string>={}
 async function walk(dir:string){
  for(const e of await fs.readdir(dir,{withFileTypes:true})){
   if(excluded.has(e.name))continue
   if(e.isSymbolicLink())throw Error('Refusing symlink in managed project: '+e.name)
   const abs=path.join(dir,e.name)
   if(e.isDirectory())await walk(abs)
   else if(e.isFile())out[path.relative(root,abs).replaceAll('\\','/')]=createHash('sha256').update(await fs.readFile(abs)).digest('hex')
  }
 }
 await walk(root);return out
}
type Manifest={before:Record<string,string>;after:Record<string,string>;restored:boolean}
const read=async(base:string)=>JSON.parse(await fs.readFile(path.join(base,'manifest.json'),'utf8')) as Manifest
const save=async(base:string,m:Manifest)=>fs.writeFile(path.join(base,'manifest.json'),JSON.stringify(m,null,2))
export async function snapshot(project:string,base:string){
 await fs.mkdir(base,{recursive:true})
 try{await fs.access(path.join(base,'manifest.json'));throw Error('Baseline already exists')}catch(e){if((e as NodeJS.ErrnoException).code!=='ENOENT')throw e}
 const before=await files(project)
 for(const file of Object.keys(before)){const dest=path.join(base,'files',file);await fs.mkdir(path.dirname(dest),{recursive:true});await fs.copyFile(path.join(project,file),dest)}
 await save(base,{before,after:before,restored:true})
}
export async function assertUnmodified(project:string,base:string){
 const m=await read(base),current=await files(project)
 for(const file of new Set([...Object.keys(m.before),...Object.keys(m.after)])){
  if(current[file]!==m.after[file])throw Error('Refusing modified managed file: '+file)
 }
}
export async function recordManaged(project:string,base:string){
 const m=await read(base);m.after=await files(project);m.restored=false;await save(base,m)
}
export async function restore(project:string,base:string){
 const m=await read(base)
 if(m.restored)return
 await assertUnmodified(project,base)
 const recovery=path.join(base,'recovery-'+randomUUID())
 for(const file of Object.keys(m.after)){
  const dest=path.join(recovery,file);await fs.mkdir(path.dirname(dest),{recursive:true});await fs.copyFile(path.join(project,file),dest)
 }
 for(const file of Object.keys(m.after))if(!(file in m.before))await fs.rm(path.join(project,file))
 for(const file of Object.keys(m.before)){
  const dest=path.join(project,file);await fs.mkdir(path.dirname(dest),{recursive:true});await fs.copyFile(path.join(base,'files',file),dest)
 }
 m.after=m.before;m.restored=true;await save(base,m)
}
