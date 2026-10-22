import { expect, it } from 'vitest'
import { spawnSync } from 'node:child_process'
import { compileButtonPreset } from '@ombelle/compiler'
import { consumerCases } from '../../scripts/consumer-matrix.js'
import type { ConsumerEvidence } from '../../scripts/consumer-evidence.js'
import type { RuntimeIdentity } from '../helpers/cli-runtime.js'
import {
  componentPresetMeasurementKeys,
  componentPresetTransformedArtifacts,
  validateComponentPresetMeasurements,
  validateComponentPresetConsumerRows,
} from '../../scripts/component-preset-evidence.ts'
import { componentPresetFixtures } from '../helpers/component-preset-fixture.js'

const checks = [
  'componentBehavior',
  'focus',
  'forcedColors',
  'reducedMotion',
  'hostStyleIsolation',
] as const

it('loads in the native Node foundation-gate bootstrap', () => {
  const result = spawnSync(
    process.execPath,
    [
      '--import',
      'tsx',
      '--input-type=module',
      '-e',
      "await import('./scripts/component-preset-evidence.ts')",
    ],
    { cwd: process.cwd(), encoding: 'utf8' },
  )
  expect(result.status, result.stderr).toBe(0)
})

async function measurements() {
  const refs = await Promise.all(
    componentPresetFixtures().map(async ({ family, preset }) => ({
      family,
      result: await compileButtonPreset({ preset }),
    })),
  )
  return Promise.all(
    componentPresetMeasurementKeys().map(async (key) => {
      const [hostFamily, presetFamily, mode, app] = key.split('/')
      const { result } = refs.find((entry) => entry.family === presetFamily)!
      return {
        hostFamily,
        presetFamily,
        presetId: result.preset.data.id,
        presetHash: result.preset.hash,
        scope: result.scope,
        mode,
        app,
        canonicalHashes: Object.fromEntries(
          result.artifacts
            .filter((artifact) => artifact.kind !== 'utility')
            .map((artifact) => [artifact.logicalPath, artifact.sha256]),
        ),
        transformedArtifacts: await componentPresetTransformedArtifacts(
          result,
          app,
        ),
        computedStyles: {
          color: 'rgb(1, 2, 3)',
          background: 'rgb(4, 5, 6)',
          borderRadius: '0px',
          minHeight: '40px',
          fontFamily: 'Arial, sans-serif',
        },
        ordinaryButtonBefore: { background: 'rgb(1, 2, 3)' },
        ordinaryButtonAfter: { background: 'rgb(1, 2, 3)' },
        checks: Object.fromEntries(checks.map((check) => [check, true])),
      }
    }),
  )
}

function runtime(name: 'node' | 'bun'): RuntimeIdentity {
  return {
    name,
    executable: '/fixture/' + name,
    version: name === 'bun' ? '1.4.3' : '24.19.0',
  }
}

async function consumerRows() {
  const presets = await Promise.all(
    componentPresetFixtures().map(async ({ family, preset }) => {
      const result = await compileButtonPreset({ preset }),
        transformedArtifacts = await componentPresetTransformedArtifacts(
          result,
          'vite',
        )
      return {
        family,
        result,
        transformedArtifacts,
      }
    }),
  )
  return Promise.all(
    consumerCases().flatMap((descriptor) =>
      presets.map(async ({ family, result, transformedArtifacts }) => {
        const managerVersion =
          descriptor.manager === 'npm'
            ? '11.19.0'
            : descriptor.manager === 'pnpm'
              ? '11.25.0'
              : descriptor.manager === 'bun'
                ? '1.4.3'
                : descriptor.yarnFixtureId === 'classic-vite'
                  ? '1.22.22'
                  : '4.18.1'
        return {
          descriptorId: descriptor.id,
          hostFamily: descriptor.family,
          manager: descriptor.manager,
          managerVersion,
          managerLockfile:
            descriptor.manager === 'npm'
              ? 'package-lock.json'
              : descriptor.manager === 'pnpm'
                ? 'pnpm-lock.yaml'
                : descriptor.manager === 'yarn'
                  ? 'yarn.lock'
                  : descriptor.bunFormat === 'binary'
                    ? 'bun.lockb'
                    : 'bun.lock',
          managerLockHash: 'c'.repeat(64),
          packageManagerDeclaration: descriptor.manager + '@' + managerVersion,
          cliRuntime: runtime(descriptor.cliRuntime),
          buildRuntime: runtime('node'),
          audit: {
            exitCode: 0,
            scope: descriptor.manager === 'bun' ? 'all' as const : 'production' as const,
          },
          build: { status: 'passed', exitCode: 0 },
          presetFamily: family,
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
          transformedArtifacts,
          dryRun: { status: 'planned', treeUnchanged: true },
          install: { status: 'success', exitCode: 0 },
          repeat: { status: 'success', allNoop: true },
          tamper: { status: 'conflict', exitCode: 4, treeUnchanged: true },
          preservation: { defaults: true, ordinaryComponents: true },
          protectedHashes: {
            'ui-preset.json': 'a'.repeat(64),
            'src/components/ui/button.tsx': 'b'.repeat(64),
          },
        }
      }),
    ),
  )
}

function consumerMatrix(
  rows: Awaited<ReturnType<typeof consumerRows>>,
): Record<string, ConsumerEvidence> {
  return Object.fromEntries(
    consumerCases().map((descriptor) => {
      const records = rows.filter((row) => row.descriptorId === descriptor.id),
        first = records[0]!
      return [
        descriptor.id,
        {
          family: descriptor.family,
          manager: descriptor.manager,
          managerVersion: first.managerVersion,
          cliRuntime: first.cliRuntime,
          buildRuntime: first.buildRuntime,
          audit: first.audit,
          build: { exitCode: 0 },
          sourceHashes: Object.fromEntries(
            records.flatMap((record) =>
              record.transformedArtifacts.map((artifact) => [
                artifact.path,
                artifact.sha256,
              ]),
            ),
          ),
        },
      ]
    }),
  )
}

it('requires all 90 attributable app, host, selected-preset, and mode outcomes', async () => {
  const data = await measurements()
  expect(data).toHaveLength(90)
  await expect(validateComponentPresetMeasurements(data)).resolves.toHaveLength(90)
})

it('rejects missing, duplicate, mismatched, failed, or incomplete browser outcomes', async () => {
  const data = await measurements()
  await expect(validateComponentPresetMeasurements(data.slice(1))).rejects.toThrow()
  for (const patch of [
    { app: 'fake' },
    { presetHash: '0'.repeat(64) },
    { checks: {} },
    { canonicalHashes: {} },
    { transformedArtifacts: [] },
    { ordinaryButtonAfter: { background: 'rgb(9, 9, 9)' } },
  ])
    await expect(
      validateComponentPresetMeasurements([{ ...data[0]!, ...patch }, ...data.slice(1)]),
    ).rejects.toThrow()
  await expect(
    validateComponentPresetMeasurements([data[0], data[0], ...data.slice(2)]),
  ).rejects.toThrow()
  const wrongParity = await measurements()
  wrongParity[1]!.computedStyles.background = 'rgb(9, 9, 9)'
  await expect(validateComponentPresetMeasurements(wrongParity)).rejects.toThrow()
})

it('requires 102 successful preset installs with preservation and manager provenance', async () => {
  const rows = await consumerRows(), matrix = consumerMatrix(rows)
  expect(rows).toHaveLength(102)
  await expect(validateComponentPresetConsumerRows(rows, matrix)).resolves.toHaveLength(102)
})

it('rejects missing, duplicate, mismatched, failed, or incomplete consumer preset rows', async () => {
  const rows = await consumerRows(), matrix = consumerMatrix(rows)
  await expect(validateComponentPresetConsumerRows(rows.slice(1), matrix)).rejects.toThrow()
  for (const patch of [
    { presetHash: '0'.repeat(64) },
    { scope: 'not-a-hash' },
    { transformedArtifacts: [] },
    { dryRun: { status: 'planned', treeUnchanged: false } },
    { install: { status: 'failed', exitCode: 1 } },
    { repeat: { status: 'success', allNoop: false } },
    { tamper: { status: 'conflict', exitCode: 4, treeUnchanged: false } },
    { preservation: { defaults: false, ordinaryComponents: true } },
    { build: { status: 'pending' } },
    { managerLockfile: 'package-lock.json' },
    { managerLockHash: 'not-a-hash' },
    { packageManagerDeclaration: 'npm@0.0.0' },
  ])
    await expect(
      validateComponentPresetConsumerRows([{ ...rows[0]!, ...patch }, ...rows.slice(1)], matrix),
    ).rejects.toThrow()
  await expect(
    validateComponentPresetConsumerRows([rows[0], rows[0], ...rows.slice(2)], matrix),
  ).rejects.toThrow()
  await expect(validateComponentPresetConsumerRows(rows, {})).rejects.toThrow()
})
