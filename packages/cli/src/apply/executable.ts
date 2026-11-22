import fs from 'node:fs/promises'
import { constants } from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import { spawn } from 'node:child_process'
import { FoundationError } from '@ombelle/contracts'
import { classifyVersion, supportMatrix } from '../support.js'

/**
 * Node runs package managers. Versions below the tested minimum are refused (known not to work); a
 * newer major than the tested range is accepted with a notice (INS-02).
 */
export function supportedNodeVersion(version: string): boolean {
  return /^v\d+\.\d+\.\d+$/.test(version) && classifyVersion(version.slice(1), supportMatrix.node) !== 'refused'
}
export function supportedBunVersion(version: string): boolean {
  return /^\d+\.\d+\.\d+$/.test(version) && classifyVersion(version, supportMatrix.bun) !== 'refused'
}
/** The plan notice for a runtime newer than the tested range (RUNTIME_UNTESTED_MAJOR), or undefined. */
export function runtimeNotice(kind: 'node' | 'bun', version: string): string | undefined {
  const bare = version.replace(/^v/, '')
  if (classifyVersion(bare, supportMatrix[kind]) !== 'newer') return undefined
  const range = supportMatrix[kind]
  return (kind === 'bun' ? 'Bun ' : 'Node ') + bare + ' is newer than the versions this release was tested with (' +
    range.minimum + ' to below ' + range.below + '); dependency installs run on it, but check the result.'
}
/** The runtime a dependency install needs, in words, for messages and help. */
export function runtimeRequirement(kind: 'node' | 'bun'): string {
  const range = supportMatrix[kind]
  return (kind === 'bun' ? 'Bun ' : 'Node ') + range.minimum + ' or newer (tested below ' + range.below + ')'
}
export function safeRuntimeEnv(env: NodeJS.ProcessEnv = process.env): NodeJS.ProcessEnv {
  return Object.fromEntries(Object.entries(env).filter(([key]) => !['NODE_OPTIONS','BUN_OPTIONS','BUN_RUNTIME_TRANSPILER_CACHE_PATH'].includes(key.toUpperCase())).map(([key,value]) => [process.platform === 'win32' ? key.toUpperCase() : key, value]))
}
async function versionAt(executable: string): Promise<string> {
  return new Promise((resolve,reject) => {
    const child=spawn(executable,['--version'], { cwd: os.tmpdir(), shell:false, windowsHide:true, timeout:15000, env:safeRuntimeEnv() })
    let output=''; child.stdout.on('data',c=>output=(output+c).slice(-2000));child.stderr.on('data',c=>output=(output+c).slice(-2000))
    child.on('error',reject);child.on('close',code=>code===0?resolve(output.trim()):reject(new Error(output)))
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
async function resolveExecutable(kind: 'node'|'bun'): Promise<{ executable: string; version: string }> {
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
      if (kind==='bun'?!supportedBunVersion(version):!supportedNodeVersion(version)) throw new Error('Unsupported '+kind+' version: '+version)
      return { executable: candidate, version }
    } catch (e) {
      if (explicit) throw new FoundationError('UNSUPPORTED_PROJECT', (e as Error).message, candidate, 'Set an absolute OMBELLE_'+kind.toUpperCase()+'_EXECUTABLE path to '+runtimeRequirement(kind)+'.')
    }
  }
  throw new FoundationError('UNSUPPORTED_PROJECT','Cannot resolve a supported native '+kind+' executable',undefined,'Install '+runtimeRequirement(kind)+' and configure its executable path.')
}
export const resolveBunExecutable = async (): Promise<string> => (await resolveExecutable('bun')).executable
export const resolveNodeExecutable = async (): Promise<string> => (await resolveExecutable('node')).executable
/** The executable and its `--version` output. */
export const resolveRuntime = (kind: 'node' | 'bun') => resolveExecutable(kind)
