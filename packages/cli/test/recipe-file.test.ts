import { afterEach, expect, it } from 'vitest'
import fs from 'node:fs/promises'
import path from 'node:path'
import os from 'node:os'
import { readRecipeFile } from '../src/recipe-file.js'
import example from '../../../examples/recipe.example.json'
const roots:string[]=[]
afterEach(async()=>{for(const root of roots.splice(0))await fs.rm(root,{recursive:true,force:true})})
it('enforces actual bytes at the inclusive 64 KiB boundary and clones snapshot',async()=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'ombelle-recipe-'));roots.push(root)
 const file=path.join(root,'recipe.json'),json=JSON.stringify(example)
 await fs.writeFile(file,json+' '.repeat(65536-Buffer.byteLength(json)))
 const snapshot=await readRecipeFile(file);expect(snapshot).toEqual(example)
 await fs.appendFile(file,' ')
 await expect(readRecipeFile(file)).rejects.toMatchObject({code:'INVALID_DATA'})
 expect(snapshot.content).toBe(example.content)
 await fs.writeFile(file,Buffer.from([0xff,0xfe]))
 await expect(readRecipeFile(file)).rejects.toMatchObject({code:'INVALID_DATA'})
 await expect(readRecipeFile(root)).rejects.toMatchObject({code:'INVALID_DATA'})
 await fs.writeFile(file,'{')
 await expect(readRecipeFile(file)).rejects.toMatchObject({code:'INVALID_DATA'})
})
