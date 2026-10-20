import path from 'node:path'
import fs from 'node:fs/promises'
import {spawn} from 'node:child_process'
import {FoundationError,type Dependency} from '@ombelle/contracts'
export async function runDependencies(root:string,deps:Dependency[]):Promise<void>{
 if(!deps.length)return
 for(const d of deps)if(!/^(@[a-z0-9_-]+\/)?[a-z0-9][a-z0-9._-]*$/.test(d.name)||!/^\d+\.\d+\.\d+(?:-[a-zA-Z0-9.-]+)?$/.test(d.version))throw new FoundationError('INVALID_DATA','Invalid reviewed dependency name/version')
 const script=process.env.npm_execpath
 if(!script||!/^pnpm\.(?:cjs|mjs|js)$/.test(path.basename(script)))throw new FoundationError('UNSUPPORTED_PROJECT','Launch the local CLI through pnpm exec so its JS entry can be resolved without a shell',root,'Run pnpm exec node <path-to-cli> with the same arguments.')
 await fs.access(script)
 await new Promise<void>((resolve,reject)=>{const child=spawn(process.execPath,[script,'add','--save-exact','--ignore-scripts',...deps.map(d=>d.name+'@'+d.version)],{cwd:root,shell:false,windowsHide:true,stdio:['ignore','pipe','pipe'],timeout:120000,env:{...process.env,CI:'true'}});let tail='';const collect=(chunk:Buffer)=>{tail=(tail+chunk.toString()).slice(-2000)};child.stdout.on('data',collect);child.stderr.on('data',collect);child.once('error',e=>reject(new FoundationError('DEPENDENCY_FAILURE',e.message,root)));child.once('exit',code=>code===0?resolve():reject(new FoundationError('DEPENDENCY_FAILURE','pnpm installation failed: '+tail,root)))})
}
