import path from 'node:path'
import os from 'node:os'
import { resolveBunExecutable, resolveNodeExecutable } from '../../packages/cli/src/apply/executable.js'
import { runNative } from './bun-command.js'
export type RuntimeIdentity={executable:string;name:'node'|'bun';version:string}
export function jsonRecord(value:unknown):Record<string,unknown> {
  if(!value || typeof value!=='object' || Array.isArray(value))throw new Error('Expected a JSON object')
  return value as Record<string,unknown>
}
export async function runtimeIdentity(runtime:'node'|'bun'):Promise<RuntimeIdentity> {
  const executable=await(runtime==='bun'?resolveBunExecutable():resolveNodeExecutable())
  const result=await runNative(executable,['--eval',"process.stdout.write(JSON.stringify({name:process.versions.bun?'bun':'node',version:process.versions.bun??process.versions.node}))"],os.tmpdir())
  const identity=jsonRecord(JSON.parse(result.output))
  if(result.code!==0 || identity.name!==runtime || typeof identity.version!=='string')throw new Error('Wrong actual CLI runtime: '+result.output)
  return {executable,name:runtime,version:identity.version}
}
export async function runBuiltCli(runtime:'node'|'bun',args:string[],cwd:string,env:NodeJS.ProcessEnv={}) {
  const identity=await runtimeIdentity(runtime)
  const result=await runNative(identity.executable,[path.resolve('packages/cli/dist/main.js'),...args],cwd,env)
  let data:unknown
  try{data=JSON.parse(result.output)}catch{throw new Error('Built CLI did not return JSON: '+result.output)}
  return {...result,data,runtime:identity}
}
