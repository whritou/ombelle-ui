import fs from 'node:fs/promises'
import { managerEntry } from '../packages/cli/src/apply/manager.js'
import { run, pnpmEntry } from './process.js'
const map = JSON.parse(
  await fs.readFile('.artifacts/consumers.json', 'utf8'),
) as Record<string, { root: string; manager?: 'npm' | 'pnpm' }>
for (const [id, fixture] of Object.entries(map)) {
  console.log('Building ' + id)
  await run(
    process.execPath,
    [
      fixture.manager === 'npm' ? await managerEntry('npm') : pnpmEntry(),
      'run',
      'build',
    ],
    fixture.root,
  )
}
