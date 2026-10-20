import os from 'node:os'
import fs from 'node:fs/promises'
import path from 'node:path'
import { sha256 } from '@ombelle/compiler'
import type { CompileResult } from '@ombelle/contracts'
import { createProject } from '../tests/helpers/projects.js'
import { managerEntry } from '../packages/cli/src/apply/manager.js'
import { createNpmProject } from '../tests/helpers/npm-project.js'
import { createYarnProject, type YarnFixtureId } from '../tests/helpers/yarn-project.js'
import { run, pnpmEntry } from './process.js'
type Fixture = {
  root: string
  port: number
  framework: 'vite' | 'next'
  family: 'flat' | 'neo-brutalism'
  manager: 'pnpm' | 'npm' | 'yarn'
  version?: string
  linker?: string
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
let port = 4174,
  npmPort = 4190
const npm = await managerEntry('npm')
const npmVersion = (await run(process.execPath, [npm, '--version'])).trim()
if (npmVersion !== '11.19.0')
  throw new Error(
    'Consumer verification requires npm 11.19.0; found ' + npmVersion,
  )
await fs.writeFile(
  '.artifacts/npm-version.json',
  JSON.stringify({ version: npmVersion }),
)
for (const manager of ['pnpm', 'npm'] as const)
  for (const framework of ['vite', 'next'] as const)
    for (const family of ['flat', 'neo-brutalism'] as const) {
      const root = await (manager === 'npm'
          ? createNpmProject(framework)
          : createProject(framework)),
        key = (manager === 'npm' ? 'npm-' : '') + framework + '-' + family
      map[key] = {
        root,
        port: manager === 'npm' ? npmPort++ : port++,
        framework,
        family,
        manager,
      }
      await fs.writeFile(
        root + '/.ombelle-fixture.json',
        JSON.stringify({ owner: repo, framework, family }),
      )
      await fs.writeFile(
        '.artifacts/consumers.json',
        JSON.stringify(map, null, 2),
      )
      console.log('Preparing ' + manager + ' / ' + framework + ' / ' + family)
      await fs.cp(path.join(repo, 'fixtures', framework), root, {
        recursive: true,
      })
      if (manager === 'npm') {
        await fs.rm(root + '/pnpm-lock.yaml')
        await fs.rm(root + '/package-lock.json')
        const pkg = JSON.parse(
          await fs.readFile(root + '/package.json', 'utf8'),
        )
        pkg.packageManager = 'npm@11.19.0'
        await fs.writeFile(
          root + '/package.json',
          JSON.stringify(pkg, null, 2) + '\n',
        )
      }
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
      const templateLock =
          manager === 'npm'
            ? 'fixtures/npm/' + framework + '/package-lock.json'
            : 'fixtures/' + framework + '/pnpm-lock.yaml',
        pinned = await fs.stat(templateLock).then(
          () => true,
          () => false,
        )
      if (manager === 'npm' && pinned)
        await fs.copyFile(templateLock, root + '/package-lock.json')
      await run(
        process.execPath,
        manager === 'npm'
          ? [
              npm,
              pinned ? 'ci' : 'install',
              '--ignore-scripts',
              '--no-audit',
              '--no-fund',
            ]
          : [
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
        manager === 'npm'
          ? [npm, 'audit', '--omit=dev', '--json']
          : [pnpmEntry(), 'audit', '--prod', '--json'],
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
      const actualLock = await fs.readFile(
        root +
          '/' +
          (manager === 'npm' ? 'package-lock.json' : 'pnpm-lock.yaml'),
        'utf8',
      )
      if (pinned && actualLock !== (await fs.readFile(templateLock, 'utf8')))
        throw new Error('Consumer lockfile changed despite frozen preparation')
      if (!pinned) {
        await fs.mkdir(path.dirname(templateLock), { recursive: true })
        await fs.writeFile(templateLock, actualLock)
      }
      const foreignLock =
        root +
        '/' +
        (manager === 'npm' ? 'pnpm-lock.yaml' : 'package-lock.json')
      if (
        await fs.stat(foreignLock).then(
          () => true,
          () => false,
        )
      )
        throw new Error('Foreign manager lockfile created: ' + key)
      proof[key] = artifacts
    }
for (const id of ['classic-vite', 'modern-next', 'pnp-vite'] as const satisfies readonly YarnFixtureId[]) {
  const fixture = await createYarnProject(id),
    key = 'yarn-' + id,
    version = fixture.version
  map[key] = { root: fixture.root, port: port++, framework: fixture.framework, family: 'flat', manager: 'yarn', version, linker: fixture.linker }
  await fs.writeFile(fixture.root + '/.ombelle-fixture.json', JSON.stringify({ owner: repo, framework: fixture.framework, family: 'flat' }))
  await fs.writeFile('.artifacts/consumers.json', JSON.stringify(map, null, 2))
  console.log('Preparing yarn ' + version + ' / ' + fixture.framework + ' / ' + fixture.linker)
  await fs.writeFile(fixture.root + '/src/index.css', await fs.readFile('fixtures/shared/base.css', 'utf8'))
  await fs.writeFile(fixture.root + '/src/scenario.tsx', (await fs.readFile('fixtures/shared/scenario.tsx', 'utf8')).replaceAll('STYLE_FAMILY', 'flat'))
  const cli = path.join(repo, 'packages/cli/dist/main.js'), preset = path.join(repo, 'packages/catalog/src/presets/flat.json')
  const priorExecPath = process.env.npm_execpath
  const priorYarnEntry = process.env.OMBELLE_YARN_ENTRY
  process.env.npm_execpath = fixture.entry
  process.env.OMBELLE_YARN_ENTRY = fixture.entry
  for (const args of [['init', '--preset', preset], ['add', 'button', 'dialog'], ['add', 'input']])
    await run(process.execPath, [cli, ...args, '--cwd', fixture.root, '--yes', '--json'], repo)
  if (priorExecPath === undefined) delete process.env.npm_execpath
  else process.env.npm_execpath = priorExecPath
  if (priorYarnEntry === undefined) delete process.env.OMBELLE_YARN_ENTRY
  else process.env.OMBELLE_YARN_ENTRY = priorYarnEntry
  const lock = JSON.parse(await fs.readFile(fixture.root + '/ui-library.lock.json', 'utf8')),
    canonical = JSON.parse(await fs.readFile('apps/preview/src/generated/flat/manifest.json', 'utf8')) as CompileResult,
    artifacts = []
  for (const [file, record] of Object.entries(lock.artifacts) as [string, { logicalPath: string; sha256: string }][]) {
    const source = await fs.readFile(path.join(fixture.root, file), 'utf8'), reference = canonical.artifacts.find(a => a.logicalPath === record.logicalPath)
    if (source.includes('@ombelle/') || !reference || source !== reference.content || await sha256(source) !== record.sha256)
      throw new Error('Installed source differs from independent canonical artifacts: ' + file)
    artifacts.push({ path: file, logicalPath: reference.logicalPath, sha256: record.sha256 })
  }
  const foreign = await fs.stat(fixture.root + '/package-lock.json').then(() => true, () => false) || await fs.stat(fixture.root + '/pnpm-lock.yaml').then(() => true, () => false)
  if (foreign) throw new Error('Foreign manager lockfile created: ' + key)
  if (fixture.linker === 'pnp' && await fs.stat(fixture.root + '/node_modules').then(() => true, () => false)) throw new Error('PnP fixture unexpectedly created node_modules')
  const auditArgs = version.startsWith('1.') ? ['audit', '--groups', 'dependencies', '--json'] : ['npm', 'audit', '--environment', 'production', '--json']
  const audit = await run(process.execPath, [fixture.entry, ...auditArgs], fixture.root)
  await fs.writeFile('.artifacts/audit-' + key + '.json', audit)
  const actualLock = await fs.readFile(fixture.root + '/yarn.lock', 'utf8')
  if (actualLock === '' || !(await fs.readFile(fixture.root + '/package.json', 'utf8')).includes('"packageManager": "yarn@' + version + '"')) throw new Error('Yarn fixture metadata missing: ' + key)
  proof[key] = { version, linker: fixture.linker, framework: fixture.framework, lockfile: 'yarn.lock', artifacts, audit: 'passed', immutableInstall: true, noForeignLockfiles: true }
  await fs.writeFile('.artifacts/consumers.json', JSON.stringify(map, null, 2))
  await fs.writeFile('.artifacts/install-provenance.json', JSON.stringify(proof, null, 2))
}
await fs.writeFile(
  '.artifacts/install-provenance.json',
  JSON.stringify(proof, null, 2),
)
const yarnRows = Object.fromEntries(Object.entries(proof).filter(([key]) => key.startsWith('yarn-')))
await fs.writeFile('.artifacts/yarn-matrix.json', JSON.stringify(yarnRows, null, 2))
await fs.writeFile('.artifacts/yarn-versions.json', JSON.stringify({ classic: '1.22.22', modern: '4.18.1' }, null, 2))
