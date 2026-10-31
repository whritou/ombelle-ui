import fs from 'node:fs/promises'
import path from 'node:path'
import {
  createNpmManifestProject,
  npmFixtureLock,
} from '../tests/helpers/npm-project.js'
import { managerEntry } from '../packages/cli/src/apply/manager.js'
import { runNative } from '../tests/helpers/bun-command.js'
// Resolve only versions published before this cutoff so regeneration is
// reproducible and never picks up a release that is still propagating.
// Move it forward deliberately when the fixture dependencies change.
const before = '2026-10-28T00:00:00.000Z'
const entry = await managerEntry('npm')
for (const kind of ['vite', 'next'] as const) {
  const { root } = await createNpmManifestProject(kind)
  try {
    const version = await runNative(process.execPath, [entry, '--version'], root)
    if (version.output.trim() !== '11.19.0')
      throw new Error('Expected npm 11.19.0; found ' + version.output.trim())
    const result = await runNative(
      process.execPath,
      [
        entry,
        'install',
        '--package-lock-only',
        '--before=' + before,
        '--ignore-scripts',
        '--no-audit',
        '--no-fund',
      ],
      root,
    )
    if (result.code !== 0) throw new Error(result.output)
    const target = npmFixtureLock(kind)
    await fs.mkdir(path.dirname(target), { recursive: true })
    await fs.copyFile(path.join(root, 'package-lock.json'), target)
    console.log('Wrote ' + path.relative(process.cwd(), target))
  } finally {
    await fs.rm(root, { recursive: true, force: true })
  }
}
