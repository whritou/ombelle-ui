import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { spawn } from 'node:child_process'
import { resolveBunExecutable, safeRuntimeEnv } from '../../packages/cli/src/apply/executable.js'
export async function runNative(file: string, args: string[], cwd: string, extra: NodeJS.ProcessEnv = {}) {
  return new Promise<{ code: number | null; output: string }>((resolve,reject)=>{
    const child=spawn(file,args,{cwd,shell:false,windowsHide:true,timeout:180000,env:safeRuntimeEnv({...process.env,...extra})})
    let output='';child.stdout.on('data',c=>output+=c);child.stderr.on('data',c=>output+=c);child.on('error',reject);child.on('close',code=>resolve({code,output}))
  })
}
export async function smallBunProject(format: 'text'|'binary') {
  const root=await fs.mkdtemp(path.join(os.tmpdir(),'ombelle-bun-pm-'))
  const executable=await resolveBunExecutable()
  await fs.writeFile(path.join(root,'package.json'),JSON.stringify({name:'pm-fixture',version:'1.0.0',private:true,packageManager:'bun@1.4.3',dependencies:{'is-number':'7.0.0'}}))
  if(format==='binary') await fs.writeFile(path.join(root,'bunfig.toml'),'[install]\nsaveTextLockfile = false\n')
  const result=await runNative(executable,['install','--lockfile-only','--ignore-scripts'],root)
  if(result.code!==0) throw new Error(result.output)
  await fs.rm(path.join(root,'bunfig.toml'),{force:true})
  return {root,executable,lockfile:format==='text'?'bun.lock' as const:'bun.lockb' as const}
}
