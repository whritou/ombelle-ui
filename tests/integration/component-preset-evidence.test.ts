import { expect, it } from 'vitest'
import { consumerCases } from '../../scripts/consumer-matrix.js'
import type { ConsumerEvidence } from '../../scripts/consumer-evidence.js'
import {
  componentPresetMeasurementKeys,
  finalizeComponentPresetEvidence,
  validateComponentPresetConsumers,
  validateComponentPresetMeasurements,
} from '../../scripts/component-preset-evidence.js'
import {
  componentPresetReferences,
  componentPresetArtifact,
} from '../helpers/component-preset-fixture.js'
import { sha256 } from '@ombelle/compiler'
import { runNative } from '../helpers/bun-command.js'

it('loads the foundation evidence validator through native Node without loader aliases', async () => {
  const result = await runNative(
    process.execPath,
    [
      '--input-type=module',
      '--eval',
      "const {finalizeComponentPresetEvidence}=await import('./scripts/component-preset-evidence.ts'); await finalizeComponentPresetEvidence({measurements:[],consumers:{}},{}).then(()=>{throw Error('Accepted incomplete evidence')},error=>process.stdout.write(error.message))",
    ],
    process.cwd(),
  )
  expect(result.code, result.output).toBe(0)
  expect(result.output).toContain(
    'Expected all 90 component preset measurements',
  )
})

// Structural fixtures only; synthetic success records never enter retained run evidence.
async function fixtures() {
  const refs = await componentPresetReferences()
  const matrix: Record<string, ConsumerEvidence> = {}
  const consumers: Record<string, any> = {}
  for (const c of consumerCases()) {
    const cliRuntime = {
      name: c.cliRuntime,
      executable: '/fixture/' + c.cliRuntime,
      version: c.cliRuntime === 'bun' ? '1.4.3' : '24.19.0',
    }
    const buildRuntime = {
      name: 'node' as const,
      executable: '/fixture/node',
      version: '24.19.0',
    }
    const sourceHashes: Record<string, string> = {
      'src/components/ui/button.tsx': 'a'.repeat(64),
    }
    const presets: Record<string, any> = {}
    for (const ref of refs) {
      const artifacts: Record<string, any> = {},
        transformedHashes: Record<string, string> = {}
      for (const a of ref.artifacts.filter((a) => a.kind !== 'utility')) {
        const transformed = await componentPresetArtifact(a, 'consumer')
        const hash = await sha256(transformed.content)
        artifacts[transformed.path] = {
          logicalPath: a.logicalPath,
          kind: a.kind,
          sha256: hash,
        }
        transformedHashes[transformed.path] = hash
        sourceHashes[transformed.path] = hash
      }
      const { artifacts: unused, dependencies: ignored, ...identity } = ref
      presets[ref.preset.data.id + '@1'] = {
        installed: { ...identity, artifacts },
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
    const protectedHashes = Object.fromEntries(
      [
        'ui-preset.json',
        'ui-library.config.json',
        'src/index.css',
        'src/components/ui/button.tsx',
        'package.json',
        'src/ombelle-examples/recipes/example/r1.tsx',
        c.manager === 'bun'
          ? c.bunFormat === 'binary'
            ? 'bun.lockb'
            : 'bun.lock'
          : c.manager === 'npm'
            ? 'package-lock.json'
            : c.manager === 'yarn'
              ? 'yarn.lock'
              : 'pnpm-lock.yaml',
      ].map((p) => [p, 'a'.repeat(64)]),
    )
    matrix[c.id] = {
      family: c.family,
      manager: c.manager,
      managerVersion:
        c.manager === 'npm'
          ? '11.19.0'
          : c.manager === 'pnpm'
            ? '11.25.0'
            : c.manager === 'bun'
              ? '1.4.3'
              : c.yarnFixtureId === 'classic-vite'
                ? '1.22.22'
                : '4.18.1',
      cliRuntime,
      buildRuntime,
      sourceHashes,
      audit: { exitCode: 0, scope: c.manager === 'bun' ? 'all' : 'production' },
      build: { exitCode: 0 },
    }
    consumers[c.id] = {
      family: c.family,
      framework: c.framework,
      manager: c.manager,
      managerVersion: matrix[c.id].managerVersion,
      cliRuntime,
      buildRuntime,
      audit: matrix[c.id].audit,
      build: { status: 'passed', exitCode: 0 },
      presets,
      globalPresetHashBefore: refs.find(
        (r) => r.preset.data.styleFamily === c.family,
      )!.preset.hash,
      globalPresetHashAfter: refs.find(
        (r) => r.preset.data.styleFamily === c.family,
      )!.preset.hash,
      packageManagerDeclaration: c.manager + '@' + matrix[c.id].managerVersion,
      managerLockfile: Object.keys(protectedHashes).find(p => ['bun.lock','bun.lockb','package-lock.json','yarn.lock','pnpm-lock.yaml'].includes(p))!,
      managerLockfiles: Object.keys(protectedHashes).filter(p => ['bun.lock','bun.lockb','package-lock.json','yarn.lock','pnpm-lock.yaml'].includes(p)),
      managerLockHash: 'a'.repeat(64),
      protectedHashes,
      protectedAfterHashes: { ...protectedHashes },
    }
  }
  return { refs, matrix, consumers }
}
async function measurements() {
  const refs = await componentPresetReferences()
  return Promise.all(
    componentPresetMeasurementKeys().map(async (key) => {
      const [hostFamily, presetId, mode, app] = key.split('/'),
        ref = refs.find((r) => r.preset.data.id === presetId)!
      const transformedHashes: Record<string, string> = {}
      for (const a of ref.artifacts.filter((a) => a.kind !== 'utility'))
        transformedHashes[a.logicalPath] = await sha256(
          (
            await componentPresetArtifact(
              a,
              app === 'preview' ? 'preview' : 'consumer',
            )
          ).content,
        )
      return {
        hostFamily,
        presetId,
        mode,
        app,
        presetHash: ref.preset.hash,
        scope: ref.scope,
        canonicalHashes: Object.fromEntries(
          ref.artifacts.map((a) => [a.logicalPath, a.sha256]),
        ),
        transformedHashes,
        isolationMethod: 'separate host page without component preset imports',
        computedStyles: {
          color: 'rgb(1, 2, 3)',
          background: 'rgb(4, 5, 6)',
          border: '1px solid rgb(1, 2, 3)',
          borderRadius: '4px',
          minHeight: '36px',
          fontFamily: 'Arial',
          fontSize: '14px',
          lineHeight: '20px',
          boxShadow: 'none',
          padding: '8px',
        },
        domHash: 'b'.repeat(64),
        screenshotHash: 'c'.repeat(64),
        focusOutlineWidth: 3,
        forcedColorsOutline: 'solid',
        motionPositiveControlMs: 150,
        reducedMotionMs: 0,
        checks: Object.fromEntries(
          [
            'parity',
            'isolation',
            'activation',
            'disabled',
            'loading',
            'focus',
            'forcedColors',
            'reducedMotion',
          ].map((k) => [k, true]),
        ),
      }
    }),
  )
}
it('requires all 102 descriptor/preset installs and 90 app/host/preset/mode measurements', async () => {
  const { matrix, consumers } = await fixtures()
  await expect(
    validateComponentPresetConsumers(consumers, matrix),
  ).resolves.toBeUndefined()
  await expect(
    validateComponentPresetMeasurements(await measurements()),
  ).resolves.toHaveLength(90)
  await expect(
    finalizeComponentPresetEvidence(
      { measurements: await measurements(), consumers },
      matrix,
    ),
  ).resolves.toMatchObject({ consumers })
  expect(
    Object.values(consumers).reduce(
      (sum, row) => sum + Object.keys(row.presets).length,
      0,
    ),
  ).toBe(102)
})
it('rejects missing, duplicate, failed, stale, transformed or incomplete consumer records', async () => {
  const base = await fixtures(),
    id = 'vite-flat',
    preset = 'builtin-flat@1'
  const mutations: ((r: Record<string, any>) => void)[] = [
    (r) => { delete r[id].protectedHashes['src/ombelle-examples/recipes/example/r1.tsx'] },
    (r) => { r[id].protectedHashes['src/ombelle-examples/recipes/example/r1.tsx'] = 'invalid' },
    (r) => { r[id].managerLockfile = 'package-lock.json' },
    (r) => { r[id].managerLockHash = 'not-a-hash' },
    (r) => { r[id].packageManagerDeclaration = 'npm@0.0.0' },
    (r) => {
      delete r[id]
    },
    (r) => {
      r.extra = r[id]
    },
    (r) => {
      delete r[id].presets[preset]
    },
    (r) => {
      r[id].presets.extra = r[id].presets[preset]
    },
    (r) => {
      r[id].presets[preset].installed.scope = 'f'.repeat(64)
    },
    (r) => {
      r[id].presets[preset].installed.provenance.compilerVersion = '9.0.0'
    },
    (r) => {
      r[id].presets[preset].transformedHashes = {}
    },
    (r) => {
      r[id].presets[preset].checks.tamperConflict = false
    },
    (r) => {
      r[id].presets[preset].checks.repeatNoop = false
    },
    (r) => {
      r[id].presets[preset].checks.dryRun = false
    },
    (r) => {
      r[id].globalPresetHashAfter = 'f'.repeat(64)
    },
    (r) => {
      r[id].protectedAfterHashes['src/components/ui/button.tsx'] = 'f'.repeat(
        64,
      )
    },
    (r) => {
      delete r[id].protectedHashes['ui-library.config.json']
    },
    (r) => {
      r[id].build.status = 'pending'
    },
    (r) => {
      r[id].audit.exitCode = 1
    },
    (r) => {
      r[id].manager = 'npm'
    },
    (r) => {
      r[id].cliRuntime.name = 'bun'
    },
    (r) => {
      r[id].managerVersion = '0.0.0'
    },
    (r) => {
      r[id].framework = 'next'
    },
    (r) => {
      const a = Object.values(
        r[id].presets[preset].installed.artifacts,
      )[0] as any
      a.sha256 = 'f'.repeat(64)
    },
  ]
  for (const mutate of mutations) {
    const data = structuredClone(base.consumers)
    mutate(data)
    await expect(
      validateComponentPresetConsumers(data, base.matrix),
    ).rejects.toThrow()
  }
  const matrix = structuredClone(base.matrix)
  matrix[id].sourceHashes = {}
  await expect(
    validateComponentPresetConsumers(base.consumers, matrix),
  ).rejects.toThrow()
})
it('rejects missing, duplicate, failed and cross-host browser parity evidence', async () => {
  const base = await measurements()
  const mutations: ((r: any[]) => void)[] = [
    (r) => {
      r.pop()
    },
    (r) => {
      r[1] = r[0]
    },
    (r) => {
      r[0].presetHash = 'f'.repeat(64)
    },
    (r) => {
      r[0].scope = 'f'.repeat(64)
    },
    (r) => {
      r[0].checks.isolation = false
    },
    (r) => {
      delete r[0].isolationMethod
    },
    (r) => {
      r[0].transformedHashes[Object.keys(r[0].transformedHashes)[0]] =
        'f'.repeat(64)
    },
    (r) => {
      r[0].computedStyles.color = 'pink'
    },
    (r) => {
      for (const row of r) delete row.computedStyles.fontSize
    },
    (r) => {
      r[0].screenshotHash = 'e'.repeat(64)
    },
    (r) => {
      r[0].focusOutlineWidth = 0
    },
    (r) => {
      r[0].forcedColorsOutline = 'none'
    },
    (r) => {
      r[0].reducedMotionMs = 150
    },
  ]
  for (const mutate of mutations) {
    const data = structuredClone(base)
    mutate(data)
    await expect(validateComponentPresetMeasurements(data)).rejects.toThrow()
  }
})
