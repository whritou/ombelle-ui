import fs from 'node:fs/promises'
import path from 'node:path'
import type { StyleFamily } from '@ombelle/contracts'
export async function writeScenarioFixture(root: string, family: StyleFamily): Promise<void> {
 const src=path.join(root,'src')
 await fs.mkdir(src,{recursive:true})
 await fs.writeFile(path.join(src,'index.css'),await fs.readFile('fixtures/shared/base.css','utf8'))
 await fs.writeFile(path.join(src,'scenario.tsx'),(await fs.readFile('fixtures/shared/scenario.tsx','utf8')).replaceAll('STYLE_FAMILY',family))
 for(const file of ['state-fixture.tsx','state-fixture.css'])await fs.copyFile(path.join('fixtures/shared',file),path.join(src,file))
}
