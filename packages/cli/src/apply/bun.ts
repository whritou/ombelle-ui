import fs from 'node:fs/promises'
import path from 'node:path'
import os from 'node:os'
import { spawn } from 'node:child_process'
import { FoundationError, type BunLockfile, type Dependency } from '@ombelle/contracts'
import type { PreparedManager } from './manager.js'
import { safeRuntimeEnv } from './executable.js'

type Settings = { install?: { dryRun?: boolean; production?: boolean; frozenLockfile?: boolean; saveTextLockfile?: boolean; lockfile?: { save?: boolean; print?: string; savePath?: string; path?: string } } }
const configReader = `import {readFileSync} from 'node:fs'; const files=JSON.parse(process.env.OMBELLE_CONFIG_FILES); const configs=files.map(file=>{try{return Bun.TOML.parse(readFileSync(file,'utf8'))}catch(e){if(e.code==='ENOENT')return {};throw e}});process.stdout.write(JSON.stringify(configs));`
const bad = (message: string, root: string) => new FoundationError('UNSUPPORTED_PROJECT', 'Bun configuration: '+message, root, 'Align Bun settings with a real exact dependency install and the existing lockfile format before retrying.')
async function readSettings(root: string, executable: string): Promise<Settings> {
  const scratch=await fs.mkdtemp(path.join(os.tmpdir(),'ombelle-bun-config-'))
  try {
    const config=path.join(scratch,'empty.toml'); await fs.writeFile(config,'')
    const global=process.env.XDG_CONFIG_HOME && path.isAbsolute(process.env.XDG_CONFIG_HOME) ? path.join(process.env.XDG_CONFIG_HOME,'.bunfig.toml') : path.join(os.homedir(),'.bunfig.toml')
    const result=await new Promise<string>((resolve,reject)=>{
      const child=spawn(executable,['--config='+config,'--no-env-file','--eval',configReader],{cwd:scratch,shell:false,windowsHide:true,timeout:15000,env:{...safeRuntimeEnv(),OMBELLE_CONFIG_FILES:JSON.stringify([global,path.join(root,'bunfig.toml')])}})
      let output='';child.stdout.on('data',c=>output=(output+c).slice(-1000000));child.stderr.on('data',c=>output=(output+c).slice(-1000000));child.on('error',reject);child.on('close',code=>code===0?resolve(output):reject(new Error(output)))
    })
    const configs=JSON.parse(result) as Settings[]
    const merged: Settings={install:{}}
    for(const current of configs) merged.install={...merged.install,...current.install,lockfile:{...merged.install?.lockfile,...current.install?.lockfile}}
    return merged
  } catch(e) { throw bad('Cannot inspect effective TOML safely: '+(e as Error).message,root) }
  finally { await fs.rm(scratch,{recursive:true,force:true}) }
}
export async function prepareBun(root:string, executable:string, lockfile:BunLockfile, deps:Dependency[]=[]):Promise<PreparedManager> {
  const config=await readSettings(root,executable), install=config.install??{}, locks=install.lockfile??{}
  if(install.dryRun || install.production || install.frozenLockfile || locks.save===false || locks.print || locks.path || locks.savePath)
    throw bad('Simulated, frozen, disabled-save, custom-path, or foreign-lockfile installation is unsupported',root)
  if(install.saveTextLockfile!==undefined && install.saveTextLockfile!==(lockfile==='bun.lock'))
    throw bad('saveTextLockfile disagrees with '+lockfile,root)
  const settings: Record<string,string|undefined>={}
  for(const file of [path.join(os.homedir(),'.npmrc'),path.join(root,'.npmrc')]) {
    try { for(const line of (await fs.readFile(file,'utf8')).split(/\r?\n/)) { const match=/^\s*([^#;=]+?)\s*=\s*(.*?)\s*$/.exec(line); if(match)settings['npm-config-'+match[1].toLowerCase()]=match[2] } }
    catch(e){if((e as NodeJS.ErrnoException).code!=='ENOENT')throw e}
  }
  for(const [key,value] of Object.entries(process.env))settings[key.toLowerCase().replaceAll('_','-')]=value
  for(const [key,value] of Object.entries(settings)) {
    if(!/^(?:npm-config|bun-config)-/.test(key))continue
    const option=key.replace(/^(?:npm-config|bun-config)-/,'')
    if(['dry-run','lockfile-only','package-lock-only','yarn','production','frozen-lockfile'].includes(option) && /^(true|1)$/i.test(value??''))throw bad(key+' must not alter install behavior',root)
    if(['save','save-lockfile'].includes(option) && /^(false|0)$/i.test(value??''))throw bad(key+' must allow saved dependencies',root)
    if(option==='save-text-lockfile' && value!==undefined && /^(true|false|0|1)$/i.test(value) && /^(true|1)$/i.test(value)!==(lockfile==='bun.lock'))throw bad(key+' changes the owned format',root)
  }
  const pkg=JSON.parse(await fs.readFile(path.join(root,'package.json'),'utf8').catch(e=>{if(e.code==='ENOENT')return '{}';throw e}))
  for(const dep of deps) if(pkg.dependencies?.[dep.name]===undefined && (pkg.devDependencies?.[dep.name]!==undefined || pkg.optionalDependencies?.[dep.name]!==undefined || pkg.peerDependencies?.[dep.name]!==undefined))
    throw bad('Move '+dep.name+' into dependencies before installing; Bun 1.4.3 cannot safely promote its dependency group',root)
  return {executable,prefixArgs:[],version:'1.4.3'}
}
export function bunAddArgs(deps:Dependency[],lockfile:BunLockfile):string[] {
  return ['add','--exact','--save','--ignore-scripts',...(lockfile==='bun.lock'?['--save-text-lockfile']:[]),...deps.map(d=>d.name+'@'+d.version)]
}
export async function assertBunOwnership(root:string,lockfile:BunLockfile):Promise<void> {
  for(const file of ['bun.lock','bun.lockb','pnpm-lock.yaml','package-lock.json','yarn.lock','npm-shrinkwrap.json']) {
    let exists=true;try{await fs.access(path.join(root,file))}catch(e){if((e as NodeJS.ErrnoException).code==='ENOENT')exists=false;else throw e}
    if(exists!==(file===lockfile))throw new FoundationError('DEPENDENCY_FAILURE','Bun did not preserve owned lockfile '+lockfile+'; unexpected state of '+file,root)
  }
}
export async function assertBunInstalled(root:string,deps:Dependency[]):Promise<void> {
  try {
    const pkg=JSON.parse(await fs.readFile(path.join(root,'package.json'),'utf8'))
    for(const dep of deps) {
      const installed=JSON.parse(await fs.readFile(path.join(root,'node_modules',dep.name,'package.json'),'utf8'))
      if(pkg.dependencies?.[dep.name]!==dep.version || installed.version!==dep.version)throw new Error(dep.name+' is not installed at exact production version '+dep.version)
    }
  } catch(e) {throw new FoundationError('DEPENDENCY_FAILURE','Bun reported success without the required installed dependency: '+(e as Error).message,root)}
}
