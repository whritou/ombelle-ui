import fs from 'node:fs/promises'
import { constants } from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import { spawn } from 'node:child_process'
import { FoundationError } from '@ombelle/contracts'

export function supportedNodeVersion(version: string): boolean {
  const match = /^v24\.(\d+)\.(\d+)$/.exec(version)
  return !!match && Number(match[1]) >= 19
}
export function safeRuntimeEnv(env: NodeJS.ProcessEnv = process.env): NodeJS.ProcessEnv {
  return Object.fromEntries(Object.entries(env).filter(([key]) => !['NODE_OPTIONS','BUN_OPTIONS','BUN_RUNTIME_TRANSPILER_CACHE_PATH'].includes(key.toUpperCase())).map(([key,value]) => [process.platform === 'win32' ? key.toUpperCase() : key, value]))
}
async function versionAt(executable: string): Promise<string> {
  return new Promise((resolve,reject) => {
    const child=spawn(executable,['--version'], { cwd: os.tmpdir(), shell:false, windowsHide:true, timeout:15000, env:safeRuntimeEnv() })
    let output=''; child.stdout.on('data',c=>output=(output+c).slice(-2000));child.stderr.on('data',c=>output=(output+c).slice(-2000))
    child.on('error',reject);child.on('exit',code=>code===0?resolve(output.trim()):reject(new Error(output)))
  })
}
async function nativeFile(file: string): Promise<void> {
  if (!path.isAbsolute(file)) throw new Error('Executable path must be absolute')
  await fs.access(file, constants.X_OK)
  const handle=await fs.open(file,'r')
  try {
    const bytes=Buffer.alloc(4); await handle.read(bytes,0,4,0)
    const magic=bytes.toString('hex')
    if (!(bytes[0]===0x4d && bytes[1]===0x5a) && magic!=='7f454c46' && !['cffaedfe','cefaedfe','feedfacf','feedface','cafebabe'].includes(magic))
      throw new Error('Expected a native executable, not a script launcher')
  } finally { await handle.close() }
}
async function resolveExecutable(kind: 'node'|'bun'): Promise<string> {
  const explicit=process.env[kind==='bun'?'OMBELLE_BUN_EXECUTABLE':'OMBELLE_NODE_EXECUTABLE']
  const isBun=!!(process.versions as Record<string,string|undefined>).bun
  const candidates=explicit ? [explicit] : [
    ...(isBun === (kind==='bun') ? [process.execPath] : []),
    ...(process.env.PATH??process.env.Path??'').split(path.delimiter).filter(Boolean).map(dir=>path.resolve(dir,kind+(process.platform==='win32'?'.exe':''))),
  ]
  for (const candidate of [...new Set(candidates)]) {
    try {
      await nativeFile(candidate)
      const version=await versionAt(candidate)
      if (kind==='bun'?version!=='1.4.3':!supportedNodeVersion(version)) throw new Error('Unsupported '+kind+' version: '+version)
      return candidate
    } catch (e) {
      if (explicit) throw new FoundationError('UNSUPPORTED_PROJECT', (e as Error).message, candidate, 'Set an absolute OMBELLE_'+kind.toUpperCase()+'_EXECUTABLE path to '+(kind==='bun'?'Bun 1.4.3':'Node 24.19.0 or newer Node 24')+'.')
    }
  }
  throw new FoundationError('UNSUPPORTED_PROJECT','Cannot resolve a supported native '+kind+' executable',undefined,'Install '+(kind==='bun'?'Bun 1.4.3':'Node 24.19.0 or newer Node 24')+' and configure its executable path.')
}
export const resolveBunExecutable = (): Promise<string> => resolveExecutable('bun')
export const resolveNodeExecutable = (): Promise<string> => resolveExecutable('node')
