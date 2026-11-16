import {it,expect} from 'vitest'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import {snapshot,recordManaged,restore} from '../../scripts/playground/baseline.js'
import {assertOwned,scaffold,projectPath} from '../../scripts/playground/projects.js'
import {matrix,parseArguments} from '../../scripts/playground/model.js'
it('restores baselines, preserves unrelated files and refuses edits atomically',async()=>{
 const dir=await fs.mkdtemp(path.join(os.tmpdir(),'ombelle-life-')),app=path.join(dir,'app'),base=path.join(dir,'baseline')
 try {
  await fs.mkdir(app);await fs.writeFile(path.join(app,'original'),'before')
  await snapshot(app,base)
  await fs.writeFile(path.join(app,'original'),'after');await fs.writeFile(path.join(app,'generated'),'generated')
  await recordManaged(app,base)
  await fs.writeFile(path.join(app,'unrelated'),'keep');await fs.writeFile(path.join(app,'original'),'edited')
  await expect(restore(app,base)).rejects.toThrow('modified')
  expect(await fs.readFile(path.join(app,'generated'),'utf8')).toBe('generated')
  await fs.writeFile(path.join(app,'original'),'after');await restore(app,base)
  expect(await fs.readFile(path.join(app,'original'),'utf8')).toBe('before')
  expect(await fs.readFile(path.join(app,'unrelated'),'utf8')).toBe('keep')
  await expect(fs.access(path.join(app,'generated'))).rejects.toThrow()
  await restore(app,base)
 } finally {await fs.rm(dir,{recursive:true,force:true})}
})
it('creates fresh and shadcn rows and rejects unowned roots',async()=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'ombelle-owned-'))
 try{
  const opts=parseArguments(['setup','--root',root],process.cwd())
  const fresh=matrix[2],existing=matrix[3]
  await scaffold(opts,fresh);await scaffold(opts,existing)
  await expect(fs.access(path.join(projectPath(opts,fresh),'components.json'))).rejects.toThrow()
  expect(await fs.readFile(path.join(projectPath(opts,existing),'src/components/ui/button.tsx'),'utf8')).toContain('Button')
  await assertOwned(opts,fresh)
  await expect(scaffold(opts,fresh)).rejects.toThrow()
  await fs.writeFile(path.join(projectPath(opts,fresh),'.ombelle-playground.json'),'{}')
  await expect(assertOwned(opts,fresh)).rejects.toThrow('ownership')
 }finally{await fs.rm(root,{recursive:true,force:true})}
})
