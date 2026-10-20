import fs from 'node:fs/promises'
import { run, pnpmEntry } from './process.js'
const map = JSON.parse(
  await fs.readFile('.artifacts/consumers.json', 'utf8'),
) as Record<string, { root: string }>
for (const [id, fixture] of Object.entries(map)) {
  console.log('Building ' + id)
  await run(process.execPath, [pnpmEntry(), 'run', 'build'], fixture.root)
}
