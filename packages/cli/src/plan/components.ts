import {FoundationError,type CompileResult,type ProjectContext,type InstallPlan,type FileChange,type ProjectLock,type ProjectConfig} from '@ombelle/contracts'
import {sha256,canonicalize} from '@ombelle/compiler'
import {safePath} from '../project/paths.js'
import {readText} from '../project/inspect.js'
import {transformArtifact} from '../project/transform.js'
export async function fileChange(root:string,file:string,content:string,kind:FileChange['kind']):Promise<FileChange>{await safePath(root,file);const before=await readText(root,file);return {path:file,beforeHash:before===null?null:await sha256(before),afterContent:content,kind,action:before===null?'create':before===content?'noop':'update'}}
export function projectConfig(context:ProjectContext):ProjectConfig{return context.config??{configVersion:1,platform:'react-web',language:'tsx',presetFile:'./ui-preset.json',lockFile:'./ui-library.lock.json',packageManager:'auto',theme:{strategy:'merge',cssEntry:context.cssEntry},paths:{components:context.componentsDir,styleOutput:context.styleFile}}}
export function baseLock(context:ProjectContext,result:CompileResult):ProjectLock{return {lockVersion:1,...result.provenance,presetHash:result.preset.hash,artifacts:{...context.lock?.artifacts},managedDeclarations:context.lock?.managedDeclarations??[]}}
export async function appendState(plan:InstallPlan,context:ProjectContext,result:CompileResult,lock:ProjectLock):Promise<void>{const config=projectConfig(context);for(const [p,obj,kind]of [[config.presetFile,result.preset.data,'preset'],['ui-library.config.json',config,'config'],[config.lockFile,lock,'lock']] as const)plan.changes.push(await fileChange(context.root,p,canonicalize(obj)+'\n',kind))}
export async function planAdd(context:ProjectContext,result:CompileResult):Promise<InstallPlan>{
 if(context.upstream&&!['radix-nova','new-york'].includes(context.upstream.style))throw new FoundationError('UNSUPPORTED_PROJECT','Component primitive edition is not supported','components.json')
 const plan:InstallPlan={projectRoot:context.root,preset:result.preset,provenance:result.provenance,changes:[],managedDeclarations:context.lock?.managedDeclarations??[],dependencyPlan:[],diagnostics:[],networkAccess:false};const lock=baseLock(context,result),seen=new Set<string>()
 for(const a of result.artifacts.filter(a=>a.logicalPath!=='styles/ui-tokens.css')){
 const target=transformArtifact(context,a);const lower=target.path.toLowerCase();if(seen.has(lower))throw new FoundationError('FILE_CONFLICT','Duplicate destination',target.path);seen.add(lower)
 const c=await fileChange(context.root,target.path,target.content,a.kind),record=context.lock?.artifacts[target.path]
 if(c.beforeHash!==null&&(!record||record.sha256!==c.beforeHash||c.action==='update')){c.action='conflict';plan.diagnostics.push({code:'FILE_CONFLICT',message:'Existing source requires an explicit migration',path:target.path})}
 plan.changes.push(c);if(c.action!=='conflict')lock.artifacts[target.path]={logicalPath:a.logicalPath,kind:a.kind,sha256:await sha256(c.afterContent)}
 }
 const installed={...context.packageJson.devDependencies,...context.packageJson.dependencies};plan.dependencyPlan=result.dependencies.filter(d=>installed[d.name]!==d.version)
 await appendState(plan,context,result,lock)
 const targets=new Set<string>();for(const c of plan.changes){const key=c.path.replace(/^\.\//,'').toLowerCase();if(targets.has(key))throw new FoundationError('FILE_CONFLICT','Duplicate state or artifact destination',c.path);targets.add(key)}
 return plan
}
