import fs from 'node:fs/promises'
import { managerEntry } from '../packages/cli/src/apply/manager.js'
import { run, pnpmEntry } from './process.js'
import { yarnEntry } from '../tests/helpers/yarn-project.js'
import { buildBunFixture, bunEvidenceRow } from '../tests/helpers/bun-project.js'
import { jsonRecord } from '../tests/helpers/cli-runtime.js'
import { resolveBunExecutable } from '../packages/cli/src/apply/executable.js'
const map = JSON.parse(
  await fs.readFile('.artifacts/consumers.json', 'utf8'),
) as Record<string, { root: string; manager?: 'npm' | 'pnpm' | 'yarn' | 'bun'; version?: string; framework:'vite'|'next';bunLockfile?:'bun.lock'|'bun.lockb' }>
const bunRows=jsonRecord(JSON.parse(await fs.readFile('.artifacts/bun-matrix.json','utf8')))
for (const [id, fixture] of Object.entries(map)) {
  console.log('Building ' + id)
  if(fixture.manager==='bun') {
    const built=await buildBunFixture(fixture.root,fixture.framework)
    if(built.code!==0)throw new Error(built.output)
    const pending=jsonRecord(bunRows[id]),identity=jsonRecord(pending.cliRuntime)
    if((identity.name!=='node' && identity.name!=='bun') || typeof identity.executable!=='string' || typeof identity.version!=='string')throw new Error('Missing measured CLI runtime')
    if(pending.auditExitCode!==0 || !fixture.bunLockfile)throw new Error('Missing successful Bun preparation/audit')
    const hashes=jsonRecord(pending.sourceHashes)
    if(Object.values(hashes).some(hash=>typeof hash!=='string'))throw new Error('Invalid source hashes')
    bunRows[id]=bunEvidenceRow({root:fixture.root,executable:await resolveBunExecutable(),version:'1.4.3',lockfile:fixture.bunLockfile},{cliRuntime:{executable:identity.executable,name:identity.name,version:identity.version},buildRuntime:{...built.runtime,name:'node'},sourceHashes:hashes as Record<string,string>,auditExitCode:0,buildExitCode:built.code})
    await fs.writeFile('.artifacts/bun-matrix.json',JSON.stringify(bunRows,null,2))
    continue
  }
  await run(
    process.execPath,
    [
      fixture.manager === 'npm'
        ? await managerEntry('npm')
        : fixture.manager === 'yarn'
          ? await yarnEntry(fixture.version!)
          : pnpmEntry(),
      'run',
      'build',
    ],
    fixture.root,
  )
}
