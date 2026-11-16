import { describe, it, expect } from 'vitest'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { parseArguments, matrix } from '../../scripts/playground/model.js'
import { createRun } from '../../scripts/playground/evidence.js'
describe('playground', () => {
 it('validates matrix and commands', () => {
  expect(matrix.map(x=>x.id)).toEqual(['next-fresh','next-shadcn','vite-fresh','vite-shadcn'])
  expect(parseArguments(['setup'],process.cwd()).projects).toHaveLength(4)
  expect(parseArguments(['build','--project','vite-fresh'],process.cwd()).projects).toEqual(['vite-fresh'])
  for(const args of [['unknown'],['setup','--project','../x'],['setup','--bad'],['dev'],['add','unknown']]) expect(()=>parseArguments(args,process.cwd())).toThrow()
 })
 it('records failure, skips dependents and continues independent steps',async()=>{
  const root=await fs.mkdtemp(path.join(os.tmpdir(),'ombelle-playground-test-'))
  try {
   const run=await createRun(root,'setup')
   expect(await run.step('next-fresh','install',async()=>{throw Error('offline | retry')})).toBe(false)
   let called=false
   expect(await run.step('next-fresh','build',async()=>{called=true},false)).toBe(false)
   expect(called).toBe(false)
   expect(await run.step('vite-fresh','install',async()=>{})).toBe(true)
   await run.finish()
   const saved=JSON.parse(await fs.readFile(path.join(run.dir,'summary.json'),'utf8'))
   expect(saved.steps.map((x:{status:string})=>x.status)).toEqual(['failed','skipped','passed'])
   expect(await fs.readFile(path.join(run.dir,'report.md'),'utf8')).toContain('offline')
   expect((await fs.readFile(path.join(run.dir,'events.jsonl'),'utf8')).trim().split('\n').length).toBeGreaterThan(3)
  } finally {await fs.rm(root,{recursive:true,force:true})}
 })
})
