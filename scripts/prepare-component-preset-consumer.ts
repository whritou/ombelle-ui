import fs from 'node:fs/promises'
import path from 'node:path'
import type { InstalledComponentPreset, PackageManager } from '@ombelle/contracts'
import { canonicalize, sha256 } from '@ombelle/compiler'
import {
  componentPresetReferences,
  componentPresetArtifact,
  writeComponentPresetScenario,
} from '../tests/helpers/component-preset-fixture.js'
import { runBuiltCli, jsonRecord } from '../tests/helpers/cli-runtime.js'
import { snapshotTree } from '../tests/helpers/tree.js'

export async function prepareComponentPresetConsumer(input: {
  root: string
  cliRuntime: 'node' | 'bun'
  manager: PackageManager
  managerVersion: string
  bunFormat?: 'text' | 'binary'
  env?: NodeJS.ProcessEnv
}) {
  const { root } = input
  // These fixture imports are part of the project before any safety snapshot.
  await writeComponentPresetScenario(path.join(root, 'src'))
  const before = JSON.parse(
    await fs.readFile(path.join(root, 'ui-library.lock.json'), 'utf8'),
  )
  const config = JSON.parse(
    await fs.readFile(path.join(root, 'ui-library.config.json'), 'utf8'),
  )
  const packageJson = JSON.parse(await fs.readFile(path.join(root, 'package.json'), 'utf8'))
  const packageManagerDeclaration = packageJson.packageManager
  if (packageManagerDeclaration !== input.manager + '@' + input.managerVersion)
    throw Error('Consumer package manager declaration mismatch')
  const existingUsagePaths = Object.entries(before.artifacts as Record<string, {kind: string}>)
    .filter(([file, record]) => record.kind === 'usage' && /^src\/ombelle-examples\/(?:recipes|presets)\/.+\.tsx$/.test(file))
    .map(([file]) => file)
  if (!existingUsagePaths.length) throw Error('Expected pre-existing consumer usage files')
  const lockfileNames = ['package-lock.json', 'pnpm-lock.yaml', 'yarn.lock', 'bun.lock', 'bun.lockb', 'npm-shrinkwrap.json']
  const lockfiles = (await Promise.all(lockfileNames.map(async file =>
    await fs.stat(path.join(root, file)).then(() => file, (error: NodeJS.ErrnoException) => {
      if (error.code === 'ENOENT') return undefined
      throw error
    })
  ))).filter((file): file is string => Boolean(file))
  const expectedLockfile = input.manager === 'npm' ? 'package-lock.json'
    : input.manager === 'pnpm' ? 'pnpm-lock.yaml'
    : input.manager === 'yarn' ? 'yarn.lock'
    : input.bunFormat === 'binary' ? 'bun.lockb' : 'bun.lock'
  if (lockfiles.length !== 1 || lockfiles[0] !== expectedLockfile)
    throw Error('Expected exactly one consumer manager lockfile')
  const protectedHashes: Record<string, string> = {}
  for (const file of [
    'ui-preset.json',
    'ui-library.config.json',
    config.theme.cssEntry,
    'package.json',
    ...Object.keys(before.artifacts),
  ]) {
    protectedHashes[file] = await sha256(
      await fs.readFile(path.join(root, file), 'utf8'),
    )
  }
  for (const file of [
    'package-lock.json',
    'pnpm-lock.yaml',
    'yarn.lock',
    'bun.lock',
    'bun.lockb',
  ]) {
    try {
      protectedHashes[file] = await sha256(
        (await fs.readFile(path.join(root, file))).toString('base64'),
      )
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code !== 'ENOENT') throw e
    }
  }
  const presets: Record<string, unknown> = {}
  const execute = (args: string[]) =>
    runBuiltCli(input.cliRuntime, args, root, input.env)
  for (const ref of await componentPresetReferences()) {
    const key = ref.preset.data.id + '@' + ref.preset.data.revision
    const file = path.resolve(
      '.artifacts/component-preset-inputs',
      key + '.json',
    )
    await fs.mkdir(path.dirname(file), { recursive: true })
    await fs.writeFile(file, JSON.stringify(ref.preset.data))
    const args = ['add', 'button', '--preset', file, '--json']
    const initial = await snapshotTree(root),
      dry = await execute([...args, '--dry-run'])
    if (
      dry.code !== 0 ||
      jsonRecord(dry.data).status !== 'planned' ||
      !Array.isArray(jsonRecord(dry.data).dependencyPlan) ||
      (jsonRecord(dry.data).dependencyPlan as unknown[]).length !== 0 ||
      canonicalize(await snapshotTree(root)) !== canonicalize(initial)
    )
      throw Error(
        'Component preset dry-run mutated consumer ' + key + ': ' + dry.output,
      )
    const done = await execute([...args, '--yes'])
    if (done.code !== 0 || jsonRecord(done.data).status !== 'success' ||
        !Array.isArray(jsonRecord(done.data).dependencyPlan) ||
        (jsonRecord(done.data).dependencyPlan as unknown[]).length !== 0) throw Error(done.output)
    const installedTree = await snapshotTree(root)
    for (const [file, hash] of Object.entries(initial))
      if (file !== 'ui-library.lock.json' && installedTree[file] !== hash)
        throw Error('Component preset changed existing project file ' + file)
    const repeat = await execute([...args, '--yes'])
    const changes = jsonRecord(repeat.data).changes
    if (
      repeat.code !== 0 ||
      jsonRecord(repeat.data).status !== 'success' ||
      !Array.isArray(changes) ||
      changes.length === 0 ||
      changes.some((c) => jsonRecord(c).action !== 'noop') ||
      canonicalize(await snapshotTree(root)) !== canonicalize(installedTree)
    )
      throw Error('Repeated component preset was not a no-op ' + key)
    // Same ID/revision with different valid preset data must conflict without writes.
    await fs.writeFile(
      file,
      JSON.stringify({
        ...ref.preset.data,
        name: ref.preset.data.name + ' changed',
      }),
    )
    const changedPreset = await execute([...args, '--yes'])
    await fs.writeFile(file, JSON.stringify(ref.preset.data))
    if (
      changedPreset.code !== 4 ||
      jsonRecord(changedPreset.data).status !== 'conflict' ||
      canonicalize(await snapshotTree(root)) !== canonicalize(installedTree)
    )
      throw Error(
        'Changed same-revision component preset did not safely conflict ' + key,
      )
    const first = await componentPresetArtifact(
      ref.artifacts.find((a) => a.kind === 'component')!,
      'consumer',
    )
    const installedFile = path.join(root, first.path),
      original = await fs.readFile(installedFile)
    try {
      await fs.appendFile(installedFile, '\n// consumer edit\n')
      const edited = await snapshotTree(root),
        tamper = await execute([...args, '--yes'])
      if (
        tamper.code !== 4 ||
        jsonRecord(tamper.data).status !== 'conflict' ||
        canonicalize(await snapshotTree(root)) !== canonicalize(edited)
      )
        throw Error('Edited component preset did not safely conflict ' + key)
    } finally {
      await fs.writeFile(installedFile, original)
    }
    const lock = JSON.parse(
      await fs.readFile(path.join(root, 'ui-library.lock.json'), 'utf8'),
    )
    const installed = lock.componentPresets[key] as InstalledComponentPreset
    const transformedHashes: Record<string, string> = {}
    for (const artifact of ref.artifacts.filter((a) => a.kind !== 'utility')) {
      const expected = await componentPresetArtifact(artifact, 'consumer'),
        content = await fs.readFile(path.join(root, expected.path), 'utf8'),
        hash = await sha256(content)
      if (
        content !== expected.content ||
        installed.artifacts[expected.path]?.sha256 !== hash ||
        content.includes('@ombelle/')
      )
        throw Error(
          'Component preset transformed source mismatch ' + expected.path,
        )
      transformedHashes[expected.path] = hash
    }
    if (
      lock.presetHash !== before.presetHash ||
      canonicalize(lock.managedDeclarations) !==
        canonicalize(before.managedDeclarations)
    )
      throw Error('Component preset changed saved global defaults')
    presets[key] = {
      installed,
      canonicalHashes: Object.fromEntries(
        ref.artifacts.map((a) => [a.logicalPath, a.sha256]),
      ),
      transformedHashes,
      checks: {
        dryRun: true,
        install: true,
        repeatNoop: true,
        tamperConflict: true,
        preservation: true,
      },
    }
  }
  const protectedAfterHashes: Record<string, string> = {}
  for (const file of Object.keys(protectedHashes)) {
    const binary = [
      'package-lock.json',
      'pnpm-lock.yaml',
      'yarn.lock',
      'bun.lock',
      'bun.lockb',
    ].includes(file)
    protectedAfterHashes[file] = await sha256(
      binary
        ? (await fs.readFile(path.join(root, file))).toString('base64')
        : await fs.readFile(path.join(root, file), 'utf8'),
    )
  }
  if (canonicalize(protectedHashes) !== canonicalize(protectedAfterHashes))
    throw Error(
      'Component preset changed defaults, ordinary components or manager lockfile',
    )
  const after = JSON.parse(
    await fs.readFile(path.join(root, 'ui-library.lock.json'), 'utf8'),
  )
  return {
    presets,
    packageManagerDeclaration,
    managerLockfile: expectedLockfile,
    managerLockfiles: lockfiles,
    managerLockHash: protectedHashes[expectedLockfile],
    protectedHashes,
    protectedAfterHashes,
    globalPresetHashBefore: before.presetHash,
    globalPresetHashAfter: after.presetHash,
  }
}
