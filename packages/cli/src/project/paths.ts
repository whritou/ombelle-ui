import fs from 'node:fs/promises'
import path from 'node:path'
import {FoundationError} from '@ombelle/contracts'
const unsupported=(p:string)=>new FoundationError('UNSUPPORTED_PROJECT','Path escapes the targeted app or is not portable',p)
export async function safePath(root:string,relative:string):Promise<string>{
 if(typeof relative!=='string'||!relative||relative.includes('\0')||path.isAbsolute(relative)||path.win32.isAbsolute(relative)||relative.includes(':')||relative.split(/[\\/]/).some(p=>p==='..'||(p!=='.'&&/[. ]$/.test(p))||/^(con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i.test(p)))throw unsupported(relative)
 const base=await fs.realpath(root),target=path.resolve(root,relative);const rel=path.relative(base,target)
 if(rel.startsWith('..')||path.isAbsolute(rel))throw unsupported(relative)
 let ancestor=target
 while(true){try{const real=await fs.realpath(ancestor);const sub=path.relative(base,real);if(sub.startsWith('..')||path.isAbsolute(sub))throw unsupported(relative);break}catch(e){if((e as NodeJS.ErrnoException).code!=='ENOENT')throw e;const parent=path.dirname(ancestor);if(parent===ancestor)throw unsupported(relative);ancestor=parent}}
 return target
}
export const portable=(p:string)=>p.split(path.sep).join('/')
