import os from 'node:os'
import fs from 'node:fs/promises'
import path from 'node:path'
import { sha256 } from '@ombelle/compiler'
import type { CompileResult } from '@ombelle/contracts'
import { createProject } from '../tests/helpers/projects.js'
import { run, pnpmEntry } from './process.js'
type Fixture = {
  root: string
  port: number
  framework: 'vite' | 'next'
  family: 'flat' | 'neo-brutalism'
}
const repo = process.cwd(),
  map: Record<string, Fixture> = {},
  proof: Record<string, unknown> = {}
let previous: Record<string, Fixture> = {}
try {
  previous = JSON.parse(await fs.readFile('.artifacts/consumers.json', 'utf8'))
} catch (e) {
  if ((e as NodeJS.ErrnoException).code !== 'ENOENT') throw e
}
const temp = await fs.realpath(os.tmpdir())
for (const item of Object.values(previous)) {
  let real: string
  try {
    real = await fs.realpath(item.root)
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === 'ENOENT') continue
    throw e
  }
  const relative = path.relative(temp, real),
    marker = JSON.parse(
      await fs.readFile(path.join(real, '.ombelle-fixture.json'), 'utf8'),
    )
  if (
    relative.includes(path.sep) ||
    !relative.startsWith('ombelle-') ||
    marker.owner !== repo
  )
    throw new Error('Refusing to remove an unowned fixture')
  await fs.rm(real, { recursive: true, force: true })
}
await fs.mkdir('.artifacts', { recursive: true })
let port = 4174
for (const framework of ['vite', 'next'] as const)
  for (const family of ['flat', 'neo-brutalism'] as const) {
    const root = await createProject(framework),
      key = framework + '-' + family
    map[key] = { root, port: port++, framework, family }
    await fs.writeFile(
      root + '/.ombelle-fixture.json',
      JSON.stringify({ owner: repo, framework, family }),
    )
    await fs.writeFile(
      '.artifacts/consumers.json',
      JSON.stringify(map, null, 2),
    )
    console.log('Preparing ' + framework + ' / ' + family)
    await fs.cp(path.join(repo, 'fixtures', framework), root, {
      recursive: true,
    })
    await fs.writeFile(
      root + '/src/index.css',
      await fs.readFile('fixtures/shared/base.css', 'utf8'),
    )
    await fs.writeFile(
      root + '/src/scenario.tsx',
      (await fs.readFile('fixtures/shared/scenario.tsx', 'utf8')).replaceAll(
        'STYLE_FAMILY',
        family,
      ),
    )
    const templateLock = 'fixtures/' + framework + '/pnpm-lock.yaml',
      pinned = await fs.stat(templateLock).then(
        () => true,
        () => false,
      )
    await run(
      process.execPath,
      [
        pnpmEntry(),
        'install',
        '--ignore-scripts',
        '--package-import-method=copy',
        pinned ? '--frozen-lockfile' : '--no-frozen-lockfile',
      ],
      root,
    )
    const audit = await run(
      process.execPath,
      [pnpmEntry(), 'audit', '--prod', '--json'],
      root,
    )
    await fs.writeFile('.artifacts/audit-' + key + '.json', audit)
    const cli = path.join(repo, 'packages/cli/dist/main.js'),
      preset = path.join(
        repo,
        'packages/catalog/src/presets/' + family + '.json',
      )
    for (const args of [
      ['init', '--preset', preset],
      ['add', 'button', 'dialog'],
      ['add', 'input'],
    ])
      await run(
        process.execPath,
        [cli, ...args, '--cwd', root, '--yes', '--json'],
        repo,
      )
    const lock = JSON.parse(
        await fs.readFile(root + '/ui-library.lock.json', 'utf8'),
      ),
      canonical = JSON.parse(
        await fs.readFile(
          'apps/preview/src/generated/' + family + '/manifest.json',
          'utf8',
        ),
      ) as CompileResult,
      artifacts = []
    for (const [file, record] of Object.entries(lock.artifacts) as [
      string,
      { logicalPath: string; sha256: string },
    ][]) {
      const source = await fs.readFile(path.join(root, file), 'utf8'),
        reference = canonical.artifacts.find(
          (a) => a.logicalPath === record.logicalPath,
        )
      if (
        source.includes('@ombelle/') ||
        !reference ||
        source !== reference.content ||
        (await sha256(source)) !== record.sha256
      )
        throw new Error(
          'Installed source differs from independent canonical artifacts: ' +
            file,
        )
      artifacts.push({
        path: file,
        logicalPath: reference.logicalPath,
        sha256: record.sha256,
      })
    }
    const manifest = await fs.readFile(root + '/package.json', 'utf8')
    if (manifest.includes('workspace:') || manifest.includes('@ombelle/'))
      throw new Error('Workspace dependency leaked into consumer manifest')
    const actualLock = await fs.readFile(root + '/pnpm-lock.yaml', 'utf8')
    if (pinned && actualLock !== (await fs.readFile(templateLock, 'utf8')))
      throw new Error('Consumer lockfile changed despite frozen preparation')
    if (!pinned) await fs.writeFile(templateLock, actualLock)
    proof[key] = artifacts
  }
await fs.writeFile(
  '.artifacts/install-provenance.json',
  JSON.stringify(proof, null, 2),
)
