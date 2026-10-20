import { afterEach, expect, it } from 'vitest'
import fs from 'node:fs/promises'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { createProject } from '../helpers/projects.js'
import { createNpmProject } from '../helpers/npm-project.js'
import { createYarnProject } from '../helpers/yarn-project.js'
import { runBuiltCli, jsonRecord } from '../helpers/cli-runtime.js'
import { managerEntry } from '../../packages/cli/src/apply/manager.js'
const roots:string[]=[]
afterEach(async()=>{for(const root of roots.splice(0))await fs.rm(root,{recursive:true,force:true})})
it.each(['npm','pnpm','yarn'] as const)('Bun-hosted CLI keeps %s dependency execution on Node',async manager=>{
 const yarn=manager==='yarn'?await createYarnProject('classic-vite'):undefined
 const root=yarn?.root??await(manager==='npm'?createNpmProject('vite'):createProject('vite'));roots.push(root)
 const actual=yarn?.entry??await managerEntry(manager)
 const capture=path.join(root,'manager-runtime.jsonl'),wrapper=path.join(root,manager==='npm'?'npm-cli.js':manager+'.cjs')
 const head=manager==='npm'?"import fs from 'node:fs';":"const fs=require('node:fs');"
 await fs.writeFile(wrapper,head+`fs.appendFileSync(${JSON.stringify(capture)},JSON.stringify({node:process.versions.node,bun:process.versions.bun??null})+'\\n');import(${JSON.stringify(pathToFileURL(actual).href)}).catch(e=>{console.error(e);process.exitCode=1});`)
 const env={npm_execpath:wrapper,...(manager==='yarn'?{OMBELLE_YARN_ENTRY:wrapper}:{})}
 const preset=path.resolve('packages/catalog/src/presets/flat.json')
 for(const args of [['init','--preset',preset,'--yes','--json'],['add','button','--yes','--json']]) {
   const result=await runBuiltCli('bun',args,root,env);expect(result.code,result.output).toBe(0);expect(jsonRecord(result.data).packageManager).toBe(manager)
 }
 const runs=(await fs.readFile(capture,'utf8')).trim().split('\n').map(line=>jsonRecord(JSON.parse(line)))
 expect(runs.length).toBeGreaterThan(0)
 for(const run of runs){expect(run.bun).toBeNull();expect(String(run.node)).toMatch(/^24\./)}
 const pkg=JSON.parse(await fs.readFile(path.join(root,'package.json'),'utf8'));expect(pkg.dependencies.clsx).toBe('2.1.1')
 for(const lock of ['bun.lock','bun.lockb'])await expect(fs.access(path.join(root,lock))).rejects.toMatchObject({code:'ENOENT'})
},180000)
