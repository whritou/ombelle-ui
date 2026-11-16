import {it,expect} from 'vitest'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import {writeShowcase} from '../../scripts/playground/showcase.js'
import {matrix} from '../../scripts/playground/model.js'
it('requires examples and generates links, features and beside imports',async()=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'ombelle-show-'))
 try{
  await expect(writeShowcase(root,matrix[3],['button'])).rejects.toThrow()
  await fs.mkdir(path.join(root,'src/ombelle-examples'),{recursive:true})
  await fs.writeFile(path.join(root,'src/ombelle-examples/button.tsx'),'export function Example(){return <button>Example</button>}')
  await writeShowcase(root,matrix[3],['button'])
  const page=await fs.readFile(path.join(root,'src/playground.tsx'),'utf8')
  expect(page).toContain('@/components/ui/ombelle/button')
  expect(page).toContain('Settings');expect(page).toContain('Dashboard')
  expect(page).toContain("id:'button'");expect(page).toContain('Filter components')
 }finally{await fs.rm(root,{recursive:true,force:true})}
})
