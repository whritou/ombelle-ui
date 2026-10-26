import fs from 'node:fs/promises'
import path from 'node:path'
import type { CompileResult } from '@ombelle/contracts'
import { sha256 } from '@ombelle/compiler'
import { createProject } from '../tests/helpers/projects.js'
import { createNpmProject } from '../tests/helpers/npm-project.js'
import { createYarnProject } from '../tests/helpers/yarn-project.js'
import { writeScenarioFixture } from '../tests/helpers/scenario-fixture.js'
import {
  runBuiltCli,
  runtimeIdentity,
  jsonRecord,
  type RuntimeIdentity,
} from '../tests/helpers/cli-runtime.js'
import { runNative } from '../tests/helpers/bun-command.js'
import { managerEntry } from '../packages/cli/src/apply/manager.js'
import { pnpmEntry } from './process.js'
import type { ConsumerCase } from './consumer-matrix.js'
import { prepareRecipeConsumer } from './prepare-recipe-consumer.js'
import { recipeReferenceBank } from '../tests/helpers/recipe-fixture.js'
import { prepareComponentPresetConsumer } from './prepare-component-preset-consumer.js'
import { componentPresetReferenceBank } from '../tests/helpers/component-preset-fixture.js'
export type ArtifactProof = {
  path: string
  logicalPath: string
  sha256: string
}
export async function prepareNodeConsumer(spec: ConsumerCase) {
  if (
    spec.manager === 'bun' ||
    spec.cliRuntime !== 'node' ||
    (spec.manager === 'yarn' && !spec.yarnFixtureId)
  )
    throw new Error('Invalid Node-manager consumer descriptor')
  const runtime = await runtimeIdentity('node')
  let root: string,
    entry: string,
    version: string,
    linker: string | undefined,
    env: NodeJS.ProcessEnv = {}
  if (spec.manager === 'yarn') {
    const fixture = await createYarnProject(spec.yarnFixtureId!, spec.family)
    root = fixture.root
    entry = fixture.entry
    version = fixture.version
    linker = fixture.linker
    env = { OMBELLE_YARN_ENTRY: entry, npm_execpath: entry }
  } else {
    root = await (spec.manager === 'npm'
      ? createNpmProject(spec.framework)
      : createProject(spec.framework))
    entry = spec.manager === 'npm' ? await managerEntry('npm') : pnpmEntry()
    version = spec.manager === 'npm' ? '11.19.0' : '11.25.0'
  }
  try {
    await fs.writeFile(
      path.join(root, '.ombelle-fixture.json'),
      JSON.stringify({
        owner: process.cwd(),
        framework: spec.framework,
        family: spec.family,
      }),
    )
    const execute = async (args: string[]) => {
      const result = await runNative(
        runtime.executable,
        [entry, ...args],
        root,
        env,
      )
      if (result.code !== 0) throw new Error(result.output)
      return result.output
    }
    const actual = (await execute(['--version'])).trim()
    if (actual !== version)
      throw new Error(
        'Expected ' + spec.manager + ' ' + version + '; found ' + actual,
      )
    version = actual
    let originalLock: Buffer | undefined
    const lock =
      spec.manager === 'npm'
        ? 'package-lock.json'
        : spec.manager === 'pnpm'
          ? 'pnpm-lock.yaml'
          : 'yarn.lock'
    if (spec.manager !== 'yarn') {
      await fs.cp(path.resolve('fixtures', spec.framework), root, {
        recursive: true,
      })
      const pkgPath = path.join(root, 'package.json'),
        pkg = JSON.parse(await fs.readFile(pkgPath, 'utf8'))
      pkg.packageManager = spec.manager + '@' + version
      await fs.writeFile(pkgPath, JSON.stringify(pkg, null, 2) + '\n')
      if (spec.manager === 'npm') {
        await fs.rm(path.join(root, 'pnpm-lock.yaml'), { force: true })
        await fs.copyFile(
          path.resolve('fixtures/npm', spec.framework, lock),
          path.join(root, lock),
        )
      }
      originalLock = await fs.readFile(path.join(root, lock))
      await execute(
        spec.manager === 'npm'
          ? ['ci', '--ignore-scripts', '--no-audit', '--no-fund']
          : [
              'install',
              '--ignore-scripts',
              '--package-import-method=copy',
              '--frozen-lockfile',
            ],
      )
    }
    await writeScenarioFixture(root, spec.family, {
      recipes: true,
      badges: true,
      cards: true,
      forms: true,
      checkboxes: true,
      switches: true,
      tabs: true,
      tooltips: true,
    })
    await fs.appendFile(
      path.join(root, 'src/index.css'),
      '\n.user-consumer-style { color:hotpink; }\n',
    )
    const preset = path.resolve(
      'packages/catalog/src/presets',
      spec.family + '.json',
    )
    let presetHash: unknown
    for (const args of [
      ['init', '--preset', preset],
      ['add', 'button', 'dialog'],
      ['add', 'input'],
      ['add', 'badge'],
      ['add', 'card'],
      ['add', 'label', 'textarea', 'native-select'],
      ['add', 'checkbox', 'switch', 'tabs', 'tooltip'],
    ]) {
      const result = await runBuiltCli(
        'node',
        [...args, '--yes', '--json'],
        root,
        env,
      )
      if (result.code !== 0) throw new Error(result.output)
      const data = jsonRecord(result.data)
      if (presetHash === undefined) presetHash = data.presetHash
      if (
        data.presetHash !== presetHash ||
        data.packageManager !== spec.manager
      )
        throw new Error('Consumer preset/manager changed')
    }
    const recipeEvidence = await prepareRecipeConsumer({
        root,
        cliRuntime: 'node',
        env,
        family: spec.family,
      }),
      recipeBank = await recipeReferenceBank()
    const componentPresetEvidence = await prepareComponentPresetConsumer({
        root,
        cliRuntime: 'node',
        manager: spec.manager,
        managerVersion: version,
        env,
      }),
      componentPresetBank = await componentPresetReferenceBank()
    const canonical = JSON.parse(
      await fs.readFile(
        'apps/preview/src/generated/' + spec.family + '/manifest.json',
        'utf8',
      ),
    ) as CompileResult
    const installed = jsonRecord(
      JSON.parse(
        await fs.readFile(path.join(root, 'ui-library.lock.json'), 'utf8'),
      ),
    )
    const artifacts: ArtifactProof[] = []
    const installedArtifacts = { ...jsonRecord(installed.artifacts) }
    for (const preset of Object.values(componentPresetEvidence.presets))
      for (const [file, record] of Object.entries(
        jsonRecord(jsonRecord(jsonRecord(preset).installed).artifacts),
      )) {
        if (
          installedArtifacts[file] &&
          JSON.stringify(installedArtifacts[file]) !== JSON.stringify(record)
        )
          throw Error('Conflicting scoped artifact ownership: ' + file)
        installedArtifacts[file] = record
      }
    for (const [file, record] of Object.entries(installedArtifacts)) {
      const meta = jsonRecord(record),
        content = await fs.readFile(path.join(root, file), 'utf8'),
        reference =
          canonical.artifacts.find((a) => a.logicalPath === meta.logicalPath) ??
          recipeBank.get(String(meta.logicalPath)) ??
          componentPresetBank.get(String(meta.logicalPath)),
        hash = await sha256(content)
      if (
        !reference ||
        content !== reference.content ||
        hash !== meta.sha256 ||
        content.includes('@ombelle/')
      )
        throw new Error(
          'Consumer source differs from canonical artifact: ' + file,
        )
      artifacts.push({
        path: file,
        logicalPath: reference.logicalPath,
        sha256: hash,
      })
    }
    const pkg = JSON.parse(
      await fs.readFile(path.join(root, 'package.json'), 'utf8'),
    )
    if (
      JSON.stringify(pkg).includes('workspace:') ||
      JSON.stringify(pkg).includes('@ombelle/')
    )
      throw new Error('Repository dependency leaked into consumer')
    for (const dep of canonical.dependencies)
      if (pkg.dependencies?.[dep.name] !== dep.version)
        throw new Error('Missing exact production dependency ' + dep.name)
    const verifyInstalled = `const fs=require('node:fs'),path=require('node:path'),r=require('node:module').createRequire(process.cwd()+'/package.json');for(const d of ${JSON.stringify(canonical.dependencies)}){let dir=path.dirname(r.resolve(d.name)),found=false;for(;;){try{const p=JSON.parse(fs.readFileSync(path.join(dir,'package.json'),'utf8'));if(p.name===d.name){if(p.version!==d.version)throw Error('Wrong installed version '+d.name);found=true;break}}catch(e){if(e.code!=='ENOENT')throw e}const up=path.dirname(dir);if(up===dir)break;dir=up}if(!found)throw Error('Missing installed package '+d.name)}`
    const physical = await runNative(
      runtime.executable,
      [
        ...(spec.manager === 'yarn' ? [entry, 'node'] : []),
        '--eval',
        verifyInstalled,
      ],
      root,
      env,
    )
    if (physical.code !== 0) throw new Error(physical.output)
    for (const file of [
      'package-lock.json',
      'pnpm-lock.yaml',
      'yarn.lock',
      'bun.lock',
      'bun.lockb',
      'npm-shrinkwrap.json',
    ]) {
      const present = await fs.stat(path.join(root, file)).then(
        () => true,
        (e) => {
          if (e.code === 'ENOENT') return false
          throw e
        },
      )
      if (present !== (file === lock))
        throw new Error('Foreign or missing consumer lockfile: ' + file)
    }
    if (
      originalLock &&
      !(await fs.readFile(path.join(root, lock))).equals(originalLock)
    )
      throw new Error('Frozen Node-manager consumer lock changed')
    if (
      linker === 'pnp' &&
      (await fs.stat(path.join(root, 'node_modules')).then(
        () => true,
        () => false,
      ))
    )
      throw new Error('PnP consumer created node_modules')
    if (
      !(await fs.readFile(path.join(root, 'src/index.css'), 'utf8')).includes(
        '.user-consumer-style',
      )
    )
      throw new Error('Lost unrelated CSS')
    const auditArgs =
      spec.manager === 'npm'
        ? ['audit', '--omit=dev', '--json']
        : spec.manager === 'pnpm'
          ? ['audit', '--prod', '--json']
          : version.startsWith('1.')
            ? ['audit', '--groups', 'dependencies', '--json']
            : ['npm', 'audit', '--environment', 'production', '--json']
    const output = await execute(auditArgs)
    return {
      root,
      version,
      linker,
      cliRuntime: runtime,
      artifacts,
      recipeEvidence,
      componentPresetEvidence,
      audit: { code: 0, output, scope: 'production' as const },
    }
  } catch (e) {
    await fs.rm(root, { recursive: true, force: true })
    throw e
  }
}
