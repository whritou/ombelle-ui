import fs from 'node:fs/promises'
import path from 'node:path'
import type {ProjectSpec} from './model.js'
export async function writeShowcase(project:string,spec:ProjectSpec,ids:readonly string[]){
 const source=spec.framework==='next'&&spec.shadcn?'':'src'
 for(const id of ids)await fs.access(path.join(project,source,'ombelle-examples',id+'.tsx'))
 const template=await fs.readFile(new URL('./showcase.tsx.txt',import.meta.url),'utf8')
 const imports=ids.map((id,i)=>"import {Example as E"+i+"} from '@/ombelle-examples/"+id+"'").join('\n')
 const sourceCode=template.replace('/*EXAMPLE_IMPORTS*/',imports)
  .replace('/*EXAMPLE_ITEMS*/',ids.map((id,i)=>"{id:'"+id+"',render:()=> <E"+i+" />},").join('\n'))
  .replaceAll('__PROJECT__',spec.id)
  .replaceAll('__BUTTON__',spec.shadcn?'ombelle/button':'button')
  .replace('/*SHADCN_IMPORT*/',spec.shadcn?"import {Button as ShadcnButton} from '@/components/ui/button'":'')
  .replace('{/*SHADCN_COMPARE*/}',spec.shadcn?'<section className="pg-comparison"><h2>Coexisting Buttons</h2><ShadcnButton>Original shadcn</ShadcnButton> <Button>Ombelle</Button></section>':'')
 await fs.mkdir(path.join(project,source),{recursive:true})
 await fs.writeFile(path.join(project,source,'playground.tsx'),sourceCode)
 await fs.copyFile(new URL('./showcase.css',import.meta.url),path.join(project,source,'playground.css'))
 const entry=spec.framework==='next'?path.join(source,'app/page.tsx'):'src/App.tsx'
 await fs.writeFile(path.join(project,entry),"export {default} from '@/playground'\n")
}
