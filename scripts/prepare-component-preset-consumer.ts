import fs from 'node:fs/promises'
import path from 'node:path'
import type { InstalledComponentPreset } from '@ombelle/contracts'
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
      canonicalize(await snapshotTree(root)) !== canonicalize(initial)
    )
      throw Error(
        'Component preset dry-run mutated consumer ' + key + ': ' + dry.output,
      )
    const done = await execute([...args, '--yes'])
    if (done.code !== 0) throw Error(done.output)
    const installedTree = await snapshotTree(root)
    for (const [file, hash] of Object.entries(initial))
      if (file !== 'ui-library.lock.json' && installedTree[file] !== hash)
        throw Error('Component preset changed existing project file ' + file)
    const repeat = await execute([...args, '--yes'])
    const changes = jsonRecord(repeat.data).changes
    if (
      repeat.code !== 0 ||
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
    protectedHashes,
    protectedAfterHashes,
    globalPresetHashBefore: before.presetHash,
    globalPresetHashAfter: after.presetHash,
  }
}
