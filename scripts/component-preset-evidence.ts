import { compileButtonPreset, sha256 } from '@ombelle/compiler'
import type {
  Artifact,
  ComponentPresetCompileResult,
  StyleFamily,
} from '@ombelle/contracts'
import { supportedStyleFamilies } from '../packages/contracts/src/style-families.js'
import { transformComponentPresetArtifact } from '../packages/cli/src/project/component-preset-transform.js'
import type { ConsumerEvidence } from './consumer-evidence.js'
import { consumerCases } from './consumer-matrix.js'
import {
  componentPresetFixtures,
  previewComponentPresetContent,
  previewComponentPresetPath,
} from '../tests/helpers/component-preset-fixture.js'

const apps = ['preview', 'vite', 'next', 'npm-vite', 'npm-next'] as const
const requiredChecks = [
  'componentBehavior',
  'focus',
  'forcedColors',
  'reducedMotion',
  'hostStyleIsolation',
] as const
const context = {
  componentsDir: 'src/components/ui',
  sourceDir: 'src',
  utilsFile: 'src/lib/utils.ts',
  uiAlias: '@/components/ui',
  utilsAlias: '@/lib/utils',
}
export type ComponentPresetArtifactProof = {
  path: string
  logicalPath: string
  kind: Artifact['kind']
  sha256: string
}

let referencesPromise:
  | Promise<
      Map<
        string,
        { family: StyleFamily; result: ComponentPresetCompileResult }
      >
    >
  | undefined

async function references() {
  return (referencesPromise ??= Promise.all(
    componentPresetFixtures().map(async ({ family, preset }) => ({
      family,
      result: await compileButtonPreset({ preset }),
    })),
  ).then((items) => new Map(items.map((item) => [item.family, item]))))
}

export function componentPresetMeasurementKeys(): readonly string[] {
  return supportedStyleFamilies.flatMap((hostFamily) =>
    componentPresetFixtures().flatMap(({ family }) =>
      ['light', 'dark'].flatMap((mode) =>
        apps.map((app) =>
          [hostFamily, family, mode, app].join('/'),
        ),
      ),
    ),
  )
}

export async function componentPresetTransformedArtifacts(
  result: ComponentPresetCompileResult,
  app: string,
): Promise<ComponentPresetArtifactProof[]> {
  if (!apps.includes(app as (typeof apps)[number]))
    throw new Error('Unknown component preset application ' + app)
  const proofs: ComponentPresetArtifactProof[] = []
  for (const artifact of result.artifacts.filter((item) => item.kind !== 'utility')) {
    if (app === 'preview') {
      const file = previewComponentPresetPath(artifact.logicalPath, artifact.kind),
        content = await previewComponentPresetContent(
          artifact.content,
          artifact.logicalPath,
          artifact.kind,
        )
      proofs.push({
        path: file,
        logicalPath: artifact.logicalPath,
        kind: artifact.kind,
        sha256: await sha256(content),
      })
    } else {
      const transformed = await transformComponentPresetArtifact(context, artifact)
      proofs.push({
        path: transformed.path,
        logicalPath: artifact.logicalPath,
        kind: artifact.kind,
        sha256: await sha256(transformed.content),
      })
    }
  }
  return proofs
}

function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new Error('Expected component preset evidence object')
  return value as Record<string, unknown>
}

function equal(a: unknown, b: unknown): boolean {
  return JSON.stringify(sort(a)) === JSON.stringify(sort(b))
}

function sort(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sort)
  if (value && typeof value === 'object')
    return Object.fromEntries(
      Object.entries(value)
        .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
        .map(([key, entry]) => [key, sort(entry)]),
    )
  return value
}

function canonicalHashes(result: ComponentPresetCompileResult) {
  return Object.fromEntries(
    result.artifacts
      .filter((artifact) => artifact.kind !== 'utility')
      .map((artifact) => [artifact.logicalPath, artifact.sha256]),
  )
}

export async function validateComponentPresetMeasurements(
  value: unknown,
): Promise<unknown[]> {
  const expected = new Set(componentPresetMeasurementKeys()),
    refs = await references(),
    styles = new Map<string, unknown>()
  if (!Array.isArray(value) || value.length !== expected.size)
    throw new Error('Expected all 90 component preset measurements')
  for (const item of value) {
    const row = object(item),
      key = [row.hostFamily, row.presetFamily, row.mode, row.app].join('/')
    if (!expected.delete(key))
      throw new Error('Duplicate or unexpected component preset measurement ' + key)
    const reference = refs.get(String(row.presetFamily))?.result
    if (
      !reference ||
      row.presetId !== reference.preset.data.id ||
      row.presetHash !== reference.preset.hash ||
      row.scope !== reference.scope ||
      !equal(row.canonicalHashes, canonicalHashes(reference))
    )
      throw new Error('Component preset canonical identity mismatch ' + key)
    const expectedArtifacts = await componentPresetTransformedArtifacts(
      reference,
      String(row.app),
    )
    if (!equal(row.transformedArtifacts, expectedArtifacts))
      throw new Error('Missing or incorrect transformed component preset hashes ' + key)
    const checks = object(row.checks)
    if (requiredChecks.some((check) => checks[check] !== true))
      throw new Error('Missing or failed component preset browser check ' + key)
    const measuredStyles = object(row.computedStyles),
      before = object(row.ordinaryButtonBefore),
      after = object(row.ordinaryButtonAfter),
      styleKey = String(row.presetFamily) + '/' + String(row.mode)
    if (
      !Object.keys(measuredStyles).length ||
      Object.values(measuredStyles).some((entry) => typeof entry !== 'string')
    )
      throw new Error('Missing rendered component preset styles ' + key)
    if (!equal(before, after))
      throw new Error('Component preset changed the ordinary host Button ' + key)
    if (styles.has(styleKey) && !equal(styles.get(styleKey), measuredStyles))
      throw new Error('Component preset appearance differs across hosts/apps ' + key)
    styles.set(styleKey, measuredStyles)
  }
  if (expected.size)
    throw new Error('Missing component preset browser rows: ' + [...expected].join(', '))
  return value
}

function expectedManagerVersion(
  manager: string,
  yarnFixtureId: string | undefined,
): string {
  return manager === 'npm'
    ? '11.19.0'
    : manager === 'pnpm'
      ? '11.25.0'
      : manager === 'bun'
        ? '1.4.3'
        : yarnFixtureId === 'classic-vite'
          ? '1.22.22'
          : '4.18.1'
}

export async function validateComponentPresetConsumerRows(
  value: unknown,
  matrix: Record<string, ConsumerEvidence>,
): Promise<unknown[]> {
  const descriptors = consumerCases(),
    expected = new Set(
      descriptors.flatMap((descriptor) =>
        componentPresetFixtures().map(({ family }) => descriptor.id + '/' + family),
      ),
    ),
    refs = await references(),
    lockProvenance = new Map<string, { file: string; hash: string; declaration: unknown }>()
  if (!Array.isArray(value) || value.length !== expected.size)
    throw new Error('Expected all 102 component preset consumer installations')
  if (
    Object.keys(matrix).length !== descriptors.length ||
    descriptors.some((descriptor) => !Object.hasOwn(matrix, descriptor.id))
  )
    throw new Error('Component preset consumer descriptor set mismatch')

  for (const item of value) {
    const row = object(item),
      id = String(row.descriptorId),
      presetFamily = String(row.presetFamily),
      key = id + '/' + presetFamily,
      descriptor = descriptors.find((candidate) => candidate.id === id),
      global = matrix[id]
    if (!descriptor || !global || !expected.delete(key))
      throw new Error('Duplicate or unexpected component preset consumer row ' + key)
    if (
      row.hostFamily !== descriptor.family ||
      row.manager !== descriptor.manager ||
      row.managerVersion !== expectedManagerVersion(descriptor.manager, descriptor.yarnFixtureId) ||
      !equal(row.cliRuntime, global.cliRuntime) ||
      !equal(row.buildRuntime, global.buildRuntime) ||
      !equal(row.audit, global.audit) ||
      !equal(row.build, { status: 'passed', exitCode: 0 }) ||
      global.build.exitCode !== 0
    )
      throw new Error('Wrong or unsuccessful consumer provenance ' + key)

    const expectedLockfile =
        descriptor.manager === 'npm'
          ? 'package-lock.json'
          : descriptor.manager === 'pnpm'
            ? 'pnpm-lock.yaml'
            : descriptor.manager === 'yarn'
              ? 'yarn.lock'
              : descriptor.bunFormat === 'binary'
                ? 'bun.lockb'
                : 'bun.lock',
      lockHash = row.managerLockHash,
      declaration = row.packageManagerDeclaration
    if (
      row.managerLockfile !== expectedLockfile ||
      typeof lockHash !== 'string' ||
      !/^[a-f0-9]{64}$/.test(lockHash) ||
      typeof declaration !== 'string'
    )
      throw new Error('Missing or incorrect manager lock provenance ' + key)
    if (declaration !== descriptor.manager + '@' + row.managerVersion)
      throw new Error('Consumer package manager declaration mismatch ' + key)
    const previousLock = lockProvenance.get(id),
      currentLock = { file: expectedLockfile, hash: lockHash, declaration }
    if (previousLock && !equal(previousLock, currentLock))
      throw new Error('Manager lock changed between preset installs ' + id)
    lockProvenance.set(id, currentLock)

    const result = refs.get(presetFamily)?.result
    if (
      !result ||
      row.presetId !== result.preset.data.id ||
      row.presetRevision !== result.preset.data.revision ||
      row.presetHash !== result.preset.hash ||
      row.scope !== result.scope ||
      row.darkSelector !== result.darkSelector ||
      !equal(row.provenance, result.provenance) ||
      !equal(row.canonicalHashes, canonicalHashes(result))
    )
      throw new Error('Component preset consumer identity mismatch ' + key)

    const expectedArtifacts = await componentPresetTransformedArtifacts(result, 'vite')
    if (!equal(row.transformedArtifacts, expectedArtifacts))
      throw new Error('Missing or incorrect consumer source hashes ' + key)
    for (const artifact of expectedArtifacts) {
      if (global.sourceHashes[artifact.path] !== artifact.sha256)
        throw new Error('Consumer matrix source hash mismatch ' + key + '/' + artifact.path)
    }

    const dryRun = object(row.dryRun),
      install = object(row.install),
      repeat = object(row.repeat),
      tamper = object(row.tamper),
      preservation = object(row.preservation),
      protectedHashes = object(row.protectedHashes)
    if (dryRun.status !== 'planned' || dryRun.treeUnchanged !== true)
      throw new Error('Component preset dry-run mutated consumer ' + key)
    if (install.status !== 'success' || install.exitCode !== 0)
      throw new Error('Component preset install failed ' + key)
    if (repeat.status !== 'success' || repeat.allNoop !== true)
      throw new Error('Component preset repeat was not a no-op ' + key)
    if (tamper.status !== 'conflict' || tamper.exitCode !== 4 || tamper.treeUnchanged !== true)
      throw new Error('Same-revision tamper did not conflict safely ' + key)
    if (preservation.defaults !== true || preservation.ordinaryComponents !== true)
      throw new Error('Component preset changed saved defaults or ordinary components ' + key)
    for (const path of ['ui-preset.json', 'src/components/ui/button.tsx'])
      if (typeof protectedHashes[path] !== 'string' || !/^[a-f0-9]{64}$/.test(protectedHashes[path] as string))
        throw new Error('Missing protected-file hash ' + key + '/' + path)
  }
  if (expected.size)
    throw new Error('Missing component preset consumer rows: ' + [...expected].join(', '))
  return value
}

export async function finalizeComponentPresetEvidence(
  input: { measurements: unknown; consumers: unknown },
  matrix: Record<string, ConsumerEvidence>,
): Promise<{ measurements: unknown[]; consumers: unknown[] }> {
  const measurements = await validateComponentPresetMeasurements(input.measurements),
    consumers = await validateComponentPresetConsumerRows(input.consumers, matrix)
  return { measurements, consumers }
}
