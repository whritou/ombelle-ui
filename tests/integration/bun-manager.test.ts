import { afterEach, expect, it } from 'vitest'
import fs from 'node:fs/promises'
import path from 'node:path'
import { runDependencies, managerEntry } from '../../packages/cli/src/apply/manager.js'
import { smallBunProject, runNative } from '../helpers/bun-command.js'
import { snapshotTree } from '../helpers/tree.js'
const roots:string[]=[]
afterEach(async()=>{for(const root of roots.splice(0))await fs.rm(root,{recursive:true,force:true})})
it.each(['text','binary'] as const)('raw Bun preserves existing %s format',async format=>{
 const fixture=await smallBunProject(format);roots.push(fixture.root)
 const result=await runNative(fixture.executable,['add','--exact','--save-prod','--save','--ignore-scripts','clsx@2.1.1'],fixture.root)
 expect(result.code,result.output).toBe(0)
 await expect(fs.access(path.join(fixture.root,fixture.lockfile))).resolves.toBeUndefined()
 await expect(fs.access(path.join(fixture.root,format==='text'?'bun.lockb':'bun.lock'))).rejects.toMatchObject({code:'ENOENT'})
})
it.each(['text','binary'] as const)('adapter installs exact dependencies preserving %s lock',async format=>{
 const fixture=await smallBunProject(format);roots.push(fixture.root)
 await runDependencies(fixture.root,[{name:'clsx',version:'2.1.1'}],'bun',undefined,fixture.lockfile)
 expect(JSON.parse(await fs.readFile(path.join(fixture.root,'package.json'),'utf8')).dependencies.clsx).toBe('2.1.1')
 expect(JSON.parse(await fs.readFile(path.join(fixture.root,'node_modules/clsx/package.json'),'utf8')).version).toBe('2.1.1')
 for(const foreign of ['yarn.lock','pnpm-lock.yaml','package-lock.json',format==='text'?'bun.lockb':'bun.lock']) await expect(fs.access(path.join(fixture.root,foreign))).rejects.toMatchObject({code:'ENOENT'})
})
it('rejects a development-only dependency before mutation when Bun cannot promote it',async()=>{
 const fixture=await smallBunProject('text');roots.push(fixture.root)
 const pkg=JSON.parse(await fs.readFile(path.join(fixture.root,'package.json'),'utf8'));pkg.devDependencies={clsx:'1.2.1'}
 await fs.writeFile(path.join(fixture.root,'package.json'),JSON.stringify(pkg))
 const before=await snapshotTree(fixture.root)
 await expect(runDependencies(fixture.root,[{name:'clsx',version:'2.1.1'}],'bun',undefined,fixture.lockfile)).rejects.toMatchObject({code:'UNSUPPORTED_PROJECT'})
 expect(await snapshotTree(fixture.root)).toEqual(before)
})
it('rejects a zero-exit command that does not install the dependency',async()=>{
 const fixture=await smallBunProject('text');roots.push(fixture.root)
 const fake=path.join(fixture.root,'fake.cjs');await fs.writeFile(fake,'process.exit(0)')
 await expect(runDependencies(fixture.root,[{name:'clsx',version:'2.1.1'}],'bun',{executable:process.execPath,prefixArgs:[fake],version:'1.4.3'},fixture.lockfile)).rejects.toMatchObject({code:'DEPENDENCY_FAILURE'})
})
it('suppresses project and trusted-dependency scripts with a positive raw control',async()=>{
 const fixture=await smallBunProject('text');roots.push(fixture.root)
 const dep=path.join(fixture.root,'script-package');await fs.mkdir(dep)
 const script=`node -e "require('fs').writeFileSync(process.env.OMBELLE_LIFECYCLE,'ran')"`
 await fs.writeFile(path.join(dep,'package.json'),JSON.stringify({name:'ombelle-script-sentinel',version:'1.0.0',scripts:{postinstall:script}}))
 const packed=await runNative(process.execPath,[await managerEntry('npm'),'pack','--ignore-scripts','--pack-destination',fixture.root],dep)
 expect(packed.code,packed.output).toBe(0)
 const manifest=JSON.parse(await fs.readFile(path.join(fixture.root,'package.json'),'utf8'))
 manifest.devDependencies={'ombelle-script-sentinel':'file:./ombelle-script-sentinel-1.0.0.tgz'}
 manifest.trustedDependencies=['ombelle-script-sentinel'];manifest.scripts={preinstall:script.replace('OMBELLE_LIFECYCLE','OMBELLE_PROJECT_LIFECYCLE')}
 await fs.writeFile(path.join(fixture.root,'package.json'),JSON.stringify(manifest))
 const locked=await runNative(fixture.executable,['install','--lockfile-only','--ignore-scripts'],fixture.root)
 expect(locked.code,locked.output).toBe(0)
 const control=await smallBunProject('text');roots.push(control.root)
 await fs.cp(fixture.root,control.root,{recursive:true})
 const sentinel=path.join(fixture.root,'script-ran')
 const projectSentinel=path.join(fixture.root,'project-script-ran')
 const raw=await runNative(fixture.executable,['install'],control.root,{OMBELLE_LIFECYCLE:sentinel,OMBELLE_PROJECT_LIFECYCLE:projectSentinel})
 expect(raw.code,raw.output).toBe(0)
 expect(await fs.readFile(sentinel,'utf8')).toBe('ran');await fs.rm(sentinel)
 expect(await fs.readFile(projectSentinel,'utf8')).toBe('ran');await fs.rm(projectSentinel)
 const old=process.env.OMBELLE_LIFECYCLE;process.env.OMBELLE_LIFECYCLE=sentinel
 const oldProject=process.env.OMBELLE_PROJECT_LIFECYCLE;process.env.OMBELLE_PROJECT_LIFECYCLE=projectSentinel
 try { await runDependencies(fixture.root,[{name:'clsx',version:'2.1.1'}],'bun',undefined,fixture.lockfile) }
 finally {if(old===undefined)delete process.env.OMBELLE_LIFECYCLE;else process.env.OMBELLE_LIFECYCLE=old;if(oldProject===undefined)delete process.env.OMBELLE_PROJECT_LIFECYCLE;else process.env.OMBELLE_PROJECT_LIFECYCLE=oldProject}
 await expect(fs.access(sentinel)).rejects.toMatchObject({code:'ENOENT'})
 await expect(fs.access(projectSentinel)).rejects.toMatchObject({code:'ENOENT'})
 expect(JSON.parse(await fs.readFile(path.join(fixture.root,'package.json'),'utf8')).trustedDependencies).toEqual(['ombelle-script-sentinel'])
})
