import fs from 'node:fs/promises'
import path from 'node:path'
import { createHash } from 'node:crypto'
import type { ComponentPresetCompileResult, StyleFamily, PackageManager } from '@ombelle/contracts'
import { compileButtonPreset, sha256 } from '@ombelle/compiler'
import { transformComponentPresetArtifact } from '../packages/cli/src/project/component-preset-transform.js'
import { jsonRecord, runBuiltCli, type RuntimeIdentity } from '../tests/helpers/cli-runtime.js'
import { snapshotTree } from '../tests/helpers/tree.js'
import { componentPresetFixtures } from '../tests/helpers/component-preset-fixture.js'

type ComponentPresetConsumerInput = {
  root: string
  descriptorId: string
  hostFamily: StyleFamily
  manager: PackageManager
  managerVersion: string
  cliRuntime: RuntimeIdentity
  audit: { exitCode: number; scope: 'production' | 'all' }
  env?: NodeJS.ProcessEnv
}

const transformContext = {
  componentsDir: 'src/components/ui',
  sourceDir: 'src',
  utilsFile: 'src/lib/utils.ts',
  uiAlias: '@/components/ui',
  utilsAlias: '@/lib/utils',
}

export async function prepareComponentPresetConsumer(
  input: ComponentPresetConsumerInput,
): Promise<Record<string, unknown>[]> {
  const records: Record<string, unknown>[] = [],
    lockfileNames = [
      'package-lock.json',
      'pnpm-lock.yaml',
      'yarn.lock',
      'bun.lock',
      'bun.lockb',
    ],
    fixedProtectedPaths = [
      'ui-preset.json',
      'ui-library.config.json',
      'src/index.css',
      'src/components/ui/button.tsx',
      'src/components/ui/input.tsx',
    ],
    packageJson = JSON.parse(
      await fs.readFile(path.join(input.root, 'package.json'), 'utf8'),
    ) as { packageManager?: string },
    lockfiles = (
      await Promise.all(
        lockfileNames.map(async (file) =>
          (await fs.stat(path.join(input.root, file)).then(
            () => true,
            (error: NodeJS.ErrnoException) => {
              if (error.code === 'ENOENT') return false
              throw error
            },
          ))
            ? file
            : undefined,
        ),
      )
    ).filter((file): file is string => Boolean(file))
  if (lockfiles.length !== 1)
    throw new Error('Expected exactly one consumer lockfile in ' + input.descriptorId)
  const expectedLockfile =
      input.manager === 'npm'
        ? 'package-lock.json'
        : input.manager === 'pnpm'
          ? 'pnpm-lock.yaml'
          : input.manager === 'yarn'
            ? 'yarn.lock'
            : lockfiles[0]!,
    managerLockfile = lockfiles[0]!
  if (managerLockfile !== expectedLockfile)
    throw new Error('Consumer manager lockfile changed before preset preparation')
  const managerLockBytes = await fs.readFile(path.join(input.root, managerLockfile)),
    managerLockHash = createHash('sha256').update(managerLockBytes).digest('hex'),
    packageManagerDeclaration = packageJson.packageManager ?? null
  const defaultPresetHash = jsonRecord(
    JSON.parse(await fs.readFile(path.join(input.root, 'ui-library.lock.json'), 'utf8')),
  ).presetHash

  for (const { family: presetFamily, preset } of componentPresetFixtures()) {
    const result: ComponentPresetCompileResult = await compileButtonPreset({ preset }),
      inputDirectory = path.resolve('.artifacts/component-preset-inputs'),
      inputFile = path.join(inputDirectory, presetFamily + '.json'),
      key = result.preset.data.id + '@' + result.preset.data.revision,
      args = ['add', 'button', '--preset', inputFile, '--cwd', input.root],
      beforeLock = jsonRecord(
        JSON.parse(await fs.readFile(path.join(input.root, 'ui-library.lock.json'), 'utf8')),
      ),
      existingUsagePaths = Object.entries(jsonRecord(beforeLock.artifacts))
        .filter(([, metadata]) => jsonRecord(metadata).kind === 'usage')
        .map(([file]) => file),
      protectedHashes: Record<string, string> = {}
    if (existingUsagePaths.length === 0)
      throw new Error('Expected pre-existing usage files in ' + input.descriptorId)
    for (const file of new Set([...fixedProtectedPaths, ...existingUsagePaths]))
      protectedHashes[file] = await sha256(
        await fs.readFile(path.join(input.root, file), 'utf8'),
      )
    await fs.mkdir(inputDirectory, { recursive: true })
    await fs.writeFile(inputFile, JSON.stringify(preset, null, 2) + '\n')

    const unchanged = async () => {
      for (const [file, expected] of Object.entries(protectedHashes))
        if ((await sha256(await fs.readFile(path.join(input.root, file), 'utf8'))) !== expected)
          return false
      const currentManagerDeclaration =
        JSON.parse(await fs.readFile(path.join(input.root, 'package.json'), 'utf8'))
          .packageManager ?? null
      if (currentManagerDeclaration !== packageManagerDeclaration)
        return false
      if (
        !(await fs.readFile(path.join(input.root, managerLockfile))).equals(
          managerLockBytes,
        )
      )
        return false
      return true
    }

    const beforeDryRun = await snapshotTree(input.root),
      dry = await runBuiltCli(
        input.cliRuntime.name,
        [...args, '--dry-run', '--json'],
        input.root,
        input.env,
      )
    if (
      dry.code !== 0 ||
      jsonRecord(dry.data).status !== 'planned' ||
      !Array.isArray(jsonRecord(dry.data).dependencyPlan) ||
      (jsonRecord(dry.data).dependencyPlan as unknown[]).length !== 0 ||
      JSON.stringify(await snapshotTree(input.root)) !== JSON.stringify(beforeDryRun) ||
      !(await unchanged())
    )
      throw new Error('Component preset dry-run mutated or failed in ' + input.descriptorId)

    const install = await runBuiltCli(
      input.cliRuntime.name,
      [...args, '--yes', '--json'],
      input.root,
      input.env,
    )
    if (
      install.code !== 0 ||
      jsonRecord(install.data).status !== 'success' ||
      !Array.isArray(jsonRecord(install.data).dependencyPlan) ||
      (jsonRecord(install.data).dependencyPlan as unknown[]).length !== 0 ||
      !(await unchanged())
    )
      throw new Error('Component preset install failed in ' + input.descriptorId + ': ' + install.output)

    const installedLock = jsonRecord(
      JSON.parse(await fs.readFile(path.join(input.root, 'ui-library.lock.json'), 'utf8')),
    ),
      installedRecords = jsonRecord(installedLock.componentPresets),
      installed = jsonRecord(installedRecords[key]),
      installedPreset = jsonRecord(installed.preset),
      installedArtifactMap = jsonRecord(installed.artifacts),
      expectedArtifacts = [] as {
        path: string
        logicalPath: string
        kind: string
        sha256: string
      }[]
    if (
      installedLock.presetHash !== defaultPresetHash ||
      installed.scope !== result.scope ||
      installedPreset.hash !== result.preset.hash ||
      installed.darkSelector !== result.darkSelector
    )
      throw new Error('Component preset provenance mismatch in ' + input.descriptorId)

    for (const artifact of result.artifacts.filter((candidate) => candidate.kind !== 'utility')) {
      const transformed = await transformComponentPresetArtifact(transformContext, artifact),
        content = await fs.readFile(path.join(input.root, transformed.path), 'utf8'),
        digest = await sha256(content),
        metadata = jsonRecord(installedArtifactMap[transformed.path])
      if (
        content !== transformed.content ||
        metadata.logicalPath !== artifact.logicalPath ||
        metadata.kind !== artifact.kind ||
        metadata.sha256 !== digest
      )
        throw new Error('Component preset output differs from compiled source: ' + transformed.path)
      expectedArtifacts.push({
        path: transformed.path,
        logicalPath: artifact.logicalPath,
        kind: artifact.kind,
        sha256: digest,
      })
    }
    if (Object.keys(installedArtifactMap).length !== expectedArtifacts.length)
      throw new Error('Unexpected component preset artifact ownership in ' + input.descriptorId)

    const repeat = await runBuiltCli(
      input.cliRuntime.name,
      [...args, '--yes', '--json'],
      input.root,
      input.env,
    ),
      repeatData = jsonRecord(repeat.data),
      repeatChanges = repeatData.changes
    if (
      repeat.code !== 0 ||
      repeatData.status !== 'success' ||
      !Array.isArray(repeatChanges) ||
      repeatChanges.length === 0 ||
      !repeatChanges.every((change) => jsonRecord(change).action === 'noop') ||
      !(await unchanged())
    )
      throw new Error('Component preset repeat was not a no-op in ' + input.descriptorId)

    const tamperedPreset = structuredClone(preset) as typeof preset
    tamperedPreset.modes.light.primary =
      tamperedPreset.modes.light.primary === '#010101' ? '#010102' : '#010101'
    const tamperedFile = path.join(inputDirectory, input.descriptorId + '-' + presetFamily + '-tampered.json'),
      beforeConflict = await snapshotTree(input.root)
    await fs.writeFile(tamperedFile, JSON.stringify(tamperedPreset, null, 2) + '\n')
    const conflict = await runBuiltCli(
      input.cliRuntime.name,
      [
        'add',
        'button',
        '--preset',
        tamperedFile,
        '--cwd',
        input.root,
        '--yes',
        '--json',
      ],
      input.root,
      input.env,
    )
    if (
      conflict.code !== 4 ||
      jsonRecord(conflict.data).status !== 'conflict' ||
      JSON.stringify(await snapshotTree(input.root)) !== JSON.stringify(beforeConflict) ||
      !(await unchanged())
    )
      throw new Error('Same-revision component preset tamper did not safely conflict in ' + input.descriptorId)

    records.push({
      descriptorId: input.descriptorId,
      hostFamily: input.hostFamily,
      manager: input.manager,
      managerVersion: input.managerVersion,
      managerLockfile,
      managerLockHash,
      packageManagerDeclaration,
      cliRuntime: input.cliRuntime,
      audit: input.audit,
      build: { status: 'pending' },
      presetFamily,
      presetId: result.preset.data.id,
      presetRevision: result.preset.data.revision,
      presetHash: result.preset.hash,
      scope: result.scope,
      darkSelector: result.darkSelector,
      provenance: result.provenance,
      canonicalHashes: Object.fromEntries(
        result.artifacts
          .filter((artifact) => artifact.kind !== 'utility')
          .map((artifact) => [artifact.logicalPath, artifact.sha256]),
      ),
      transformedArtifacts: expectedArtifacts,
      dryRun: { status: 'planned', treeUnchanged: true },
      install: { status: 'success', exitCode: install.code },
      repeat: { status: 'success', allNoop: true },
      tamper: { status: 'conflict', exitCode: conflict.code, treeUnchanged: true },
      preservation: {
        defaults: true,
        ordinaryComponents: true,
        usageFiles: true,
      },
      protectedHashes,
    })
  }
  return records
}
