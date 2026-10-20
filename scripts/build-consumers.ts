import fs from 'node:fs/promises'
import { managerEntry } from '../packages/cli/src/apply/manager.js'
import { run, pnpmEntry } from './process.js'
import { yarnEntry } from '../tests/helpers/yarn-project.js'
const map = JSON.parse(
  await fs.readFile('.artifacts/consumers.json', 'utf8'),
) as Record<string, { root: string; manager?: 'npm' | 'pnpm' | 'yarn'; version?: string }>
for (const [id, fixture] of Object.entries(map)) {
  console.log('Building ' + id)
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
