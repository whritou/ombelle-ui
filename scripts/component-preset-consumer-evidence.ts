import { consumerCases } from './consumer-matrix.ts'
import {
  finalizeConsumerEvidence,
  type ConsumerEvidence,
} from './consumer-evidence.ts'
import {
  componentPresetReferences,
  componentPresetArtifact,
} from '../tests/helpers/component-preset-fixture.ts'
import { canonicalize } from '../packages/compiler/src/canonicalize.ts'
import { sha256 } from '../packages/compiler/src/hash.ts'
function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw Error('Expected component preset evidence object')
  return value as Record<string, unknown>
}
const equal = (a: unknown, b: unknown) => canonicalize(a) === canonicalize(b)
const digest = (v: unknown) => typeof v === 'string' && /^[a-f0-9]{64}$/.test(v)

export async function validateComponentPresetConsumers(
  value: unknown,
  matrix: Record<string, ConsumerEvidence>,
): Promise<void> {
  const cases = consumerCases(),
    rows = object(value),
    refs = await componentPresetReferences()
  finalizeConsumerEvidence(cases, matrix)
  if (!equal(Object.keys(rows).sort(), cases.map((c) => c.id).sort()))
    throw Error('Component preset consumer descriptor set mismatch')
  for (const c of cases) {
    const row = object(rows[c.id]),
      global = matrix[c.id],
      build = object(row.build),
      presets = object(row.presets)
    if (
      row.family !== c.family ||
      row.framework !== c.framework ||
      row.manager !== c.manager ||
      row.managerVersion !== global.managerVersion ||
      !equal(row.cliRuntime, global.cliRuntime) ||
      !equal(row.buildRuntime, global.buildRuntime) ||
      !equal(row.audit, global.audit) ||
      build.status !== 'passed' ||
      build.exitCode !== 0
    )
      throw Error(
        'Component preset requires measured manager/runtime/audit/build ' +
          c.id,
      )
    const host = refs.find((r) => r.preset.data.styleFamily === c.family)!
    if (
      row.globalPresetHashBefore !== host.preset.hash ||
      row.globalPresetHashAfter !== host.preset.hash
    )
      throw Error('Component preset changed global defaults ' + c.id)
    const before = object(row.protectedHashes),
      after = object(row.protectedAfterHashes)
    const managerLock =
      c.manager === 'bun'
        ? c.bunFormat === 'binary'
          ? 'bun.lockb'
          : 'bun.lock'
        : c.manager === 'npm'
          ? 'package-lock.json'
          : c.manager === 'yarn'
            ? 'yarn.lock'
            : 'pnpm-lock.yaml'
    if (
      row.packageManagerDeclaration !== c.manager + '@' + row.managerVersion ||
      row.managerLockfile !== managerLock ||
      !equal(row.managerLockfiles, [managerLock]) ||
      row.managerLockHash !== before[managerLock]
    )
      throw Error('Missing or incorrect manager lock provenance ' + c.id)
    if (
      !Object.keys(before).some((file) =>
        /^src\/ombelle-examples\/(?:recipes|presets)\/.+\.tsx$/.test(file),
      )
    )
      throw Error('Missing pre-existing usage-file hash ' + c.id)
    if (
      [
        'ui-preset.json',
        'ui-library.config.json',
        'src/index.css',
        'src/components/ui/button.tsx',
        'package.json',
        managerLock,
      ].some((p) => !digest(before[p])) ||
      Object.values(before).some((h) => !digest(h)) ||
      !equal(before, after) ||
      global.sourceHashes['src/components/ui/button.tsx'] !==
        before['src/components/ui/button.tsx']
    )
      throw Error(
        'Missing or changed protected defaults/ordinary component/manager lock ' +
          c.id,
      )
    if (
      !equal(
        Object.keys(presets).sort(),
        refs.map((r) => r.preset.data.id + '@' + r.preset.data.revision).sort(),
      )
    )
      throw Error('Missing or duplicate component preset install ' + c.id)
    for (const ref of refs) {
      const entry = object(
          presets[ref.preset.data.id + '@' + ref.preset.data.revision],
        ),
        installed = object(entry.installed),
        { artifacts, ...meta } = installed
      const { artifacts: unused, dependencies: ignored, ...identity } = ref
      if (
        !equal(meta, identity) ||
        !equal(
          entry.canonicalHashes,
          Object.fromEntries(
            ref.artifacts.map((a) => [a.logicalPath, a.sha256]),
          ),
        )
      )
        throw Error('Installed component preset provenance mismatch ' + c.id)
      const expectedFiles: Record<string, unknown> = {},
        hashes: Record<string, string> = {}
      for (const a of ref.artifacts.filter((a) => a.kind !== 'utility')) {
        const transformed = await componentPresetArtifact(a, 'consumer'),
          hash = await sha256(transformed.content)
        expectedFiles[transformed.path] = {
          logicalPath: a.logicalPath,
          kind: a.kind,
          sha256: hash,
        }
        hashes[transformed.path] = hash
        if (global.sourceHashes[transformed.path] !== hash)
          throw Error(
            'Component preset differs from measured built source ' + c.id,
          )
      }
      if (
        !equal(artifacts, expectedFiles) ||
        !equal(entry.transformedHashes, hashes) ||
        [
          'dryRun',
          'install',
          'repeatNoop',
          'tamperConflict',
          'preservation',
        ].some((k) => object(entry.checks)[k] !== true)
      )
        throw Error(
          'Incomplete component preset install/source/safety outcomes ' + c.id,
        )
    }
  }
}
