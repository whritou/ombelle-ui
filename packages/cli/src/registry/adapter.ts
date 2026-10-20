// Development-only compatibility probe. Never imported by the production CLI.
import fs from 'node:fs/promises'
import path from 'node:path'
import { addRegistryItems } from 'shadcn/registry'
export async function probeUpstream(input:{cwd:string;registryUrl:string}):Promise<{files:string[];dependencyChanges:{name:string;version:string}[]}>{
 const before=JSON.parse(await fs.readFile(path.join(input.cwd,'package.json'),'utf8'))
 const config=JSON.parse(await fs.readFile(path.join(input.cwd,'components.json'),'utf8'))
 const absolute=(p:string)=>path.join(input.cwd,p)
 config.resolvedPaths={cwd:input.cwd,tailwindConfig:'',tailwindCss:absolute('src/index.css'),utils:absolute('src/lib/utils'),components:absolute('src/components'),lib:absolute('src/lib'),hooks:absolute('src/hooks'),ui:absolute('src/components/ui')}
 await addRegistryItems([input.registryUrl],{cwd:input.cwd,config,overwrite:false,silent:true,skipFonts:true})
 const files:string[]=[];async function walk(dir:string){for(const entry of await fs.readdir(dir,{withFileTypes:true})){const full=path.join(dir,entry.name);if(entry.isDirectory())await walk(full);else files.push(path.relative(input.cwd,full).split(path.sep).join('/'))}}await walk(absolute('src'))
 const after=JSON.parse(await fs.readFile(path.join(input.cwd,'package.json'),'utf8'))
 const dependencyChanges=Object.entries(after.dependencies??{}).filter(([name,version])=>before.dependencies?.[name]!==version).map(([name,version])=>({name,version:String(version)}))
 return {files,dependencyChanges}
}
