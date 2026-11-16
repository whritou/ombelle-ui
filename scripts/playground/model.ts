import path from 'node:path'
import { supportedComponentIds } from '../../packages/contracts/src/component-ids.js'
export const matrix = [
 {id:'next-fresh',framework:'next',shadcn:false,port:4401},
 {id:'next-shadcn',framework:'next',shadcn:true,port:4402},
 {id:'vite-fresh',framework:'vite',shadcn:false,port:4403},
 {id:'vite-shadcn',framework:'vite',shadcn:true,port:4404},
] as const
export type ProjectSpec = typeof matrix[number]
export type Options = {command:string;projects:string[];root:string;repo:string;preset:string;components:string[]}
const commands=['setup','install','add','theme','dev','stop','build','verify','status','report','uninstall','clean','help']
export function parseArguments(argv:string[],repo:string):Options {
 const command=argv[0]??'help'
 if(!commands.includes(command)) throw Error('Unknown command: '+command)
 const o:Options={command,repo:path.resolve(repo),root:path.resolve(repo,'.artifacts/playground'),preset:path.resolve(repo,'packages/catalog/src/presets/ombelle.json'),projects:matrix.map(x=>x.id),components:[]}
 const seen=new Set<string>()
 for(let i=1;i<argv.length;i++){
  const arg=argv[i]!
  if(arg.startsWith('--')){
   if(!['--root','--project','--preset'].includes(arg)||seen.has(arg))throw Error('Unknown or repeated option: '+arg)
   seen.add(arg)
   const v=argv[++i]
   if(!v||v.startsWith('--'))throw Error('Missing value for '+arg)
   if(arg==='--root')o.root=path.resolve(repo,v)
   if(arg==='--preset')o.preset=path.resolve(repo,v)
   if(arg==='--project'){
    if(v!=='all'&&!matrix.some(x=>x.id===v))throw Error('Unknown project: '+v)
    o.projects=v==='all'?matrix.map(x=>x.id):[v]
   }
  }else if(command==='add'&&(supportedComponentIds as readonly string[]).includes(arg))o.components.push(arg)
  else throw Error('Unexpected argument: '+arg)
 }
 if(command==='add'&&!o.components.length)throw Error('add requires component IDs')
 if(command==='theme'&&!seen.has('--preset'))throw Error('theme requires --preset')
 if(command==='dev'&&o.projects.length!==1)throw Error('dev requires --project <one-id>')
 return o
}
export const help = `pnpm playground <command> [--project <id|all>] [--root <directory>]
Projects: next-fresh, next-shadcn, vite-fresh, vite-shadcn
setup / install [--preset <local-json>]   Prepare projects / install Ombelle
add <component...>                       Add catalog components
theme --preset <local-json>              Change global preset
dev --project <id> / stop                Run foreground server / stop owned servers
build / verify                          Build / browser-check production apps
status / report                         Show state / regenerate reports
uninstall / clean                       Restore baseline / delete owned projects
Reports: <root>/runs/<run-id>/report.md (retained after cleanup)
`
