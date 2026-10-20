import { afterAll, beforeAll, expect, it } from 'vitest'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { spawn } from 'node:child_process'
import { pathToFileURL } from 'node:url'
import { build } from 'esbuild'
import { supportedNodeVersion } from '../../packages/cli/src/apply/executable.js'

const bun = process.env.OMBELLE_BUN_EXECUTABLE ?? path.resolve('.artifacts/bun-tool/bun-windows-x64/bun.exe')
const probe = path.resolve('packages/cli/dist/runtime-probe.js')
let root: string
it.each([['v20.18.3',false],['v24.18.9',false],['v24.19.0',true],['v24.21.0',true],['v25.0.0',false]])('checks supported Node version %s', (version, expected) => {
  expect(supportedNodeVersion(version as string)).toBe(expected)
})
beforeAll(async () => {
  root = await fs.mkdtemp(path.join(os.tmpdir(), 'ombelle-runtime-'))
  await build({ entryPoints: ['packages/cli/src/apply/manager.ts'], outfile: probe, bundle: true, platform: 'node', format: 'esm', packages: 'external' })
})
afterAll(async () => { if(root) await fs.rm(root, { recursive: true, force: true }); await fs.rm(probe, { force: true }) })
function execute(runtime: string, manager: string, env: NodeJS.ProcessEnv = {}) {
  const source = `import { prepareManager } from ${JSON.stringify(pathToFileURL(probe).href)}; try { console.log(JSON.stringify(await prepareManager(${JSON.stringify(root)},${JSON.stringify(manager)},'bun.lock'))) } catch(e) { console.log(JSON.stringify({error:e.code,message:e.message})); process.exitCode=3 }`
  return new Promise<{code: number | null; data: { executable?: string; prefixArgs?: string[]; error?: string }; output: string}>((resolve,reject) => {
    const child=spawn(runtime,['--input-type=module','--eval',source],{ shell:false, windowsHide:true, env:Object.fromEntries(Object.entries({...process.env, OMBELLE_BUN_EXECUTABLE:bun, OMBELLE_NODE_EXECUTABLE:process.execPath,...env}).map(([k,v])=>[process.platform==='win32'?k.toUpperCase():k,v])) })
    let output=''; child.stdout.on('data',c=>output+=c);child.stderr.on('data',c=>output+=c);child.on('error',reject);child.on('exit',code=>{try{resolve({code,data:JSON.parse(output),output})}catch{reject(new Error(output))}})
  })
}
it.each(['node','bun'])('prepares native Bun directly under %s',async runtime=>{
  const result=await execute(runtime==='node'?process.execPath:bun,'bun')
  expect(result.code,result.output).toBe(0)
  expect(result.data.executable).toBe(bun)
  expect(result.data.prefixArgs).toEqual([])
})
it.each(['npm','pnpm','yarn'])('keeps %s on verified Node under Bun',async manager=>{
  const entry=path.join(root,manager==='npm'?'npm-cli.js':manager+'.cjs')
  await fs.writeFile(entry,"if(process.argv[2]==='--version')process.stdout.write('4.18.1')")
  const result=await execute(bun,manager,{npm_execpath:entry, ...(manager==='yarn'?{OMBELLE_YARN_ENTRY:entry}:{})})
  expect(result.code,result.output).toBe(0)
  expect(result.data.executable).toBe(process.execPath)
  expect(result.data.prefixArgs?.[0]).toBe(entry)
})
it.each(['missing','wrong-runtime','script'])('rejects %s Node executable',async kind=>{
  const entry=path.join(root,'npm-cli.js'); await fs.writeFile(entry,'')
  const script=path.join(root,'node.cmd');await fs.writeFile(script,'@echo unsafe')
  const result=await execute(bun,'npm',{npm_execpath:entry,OMBELLE_NODE_EXECUTABLE:kind==='missing'?path.join(root,'missing.exe'):kind==='script'?script:bun})
  expect(result.code,result.output).toBe(3)
  expect(result.data.error).toBe('UNSUPPORTED_PROJECT')
})
