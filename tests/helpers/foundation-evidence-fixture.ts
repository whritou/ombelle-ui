// Structural test fixtures only. Never retained as measured run evidence.
import { consumerCases } from '../../scripts/consumer-matrix.js'
import type { ConsumerEvidence } from '../../scripts/consumer-evidence.js'
import { componentPresetMeasurementKeys } from '../../scripts/component-preset-evidence.js'
import { componentPresetReferences, componentPresetArtifact } from './component-preset-fixture.js'
import { compileRecipe, sha256 } from '@ombelle/compiler'
import { recipeFixtures } from '../../fixtures/shared/recipes.js'
import { recipeMeasurementKeys, recipeTransformedHashes } from '../../scripts/recipe-evidence.js'
export async function presetFixtures() {
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
export async function presetMeasurements() {
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
      const normalizedScreenshotPixels = Buffer.alloc(16 * 16 * 4)
      for (let i = 0; i < normalizedScreenshotPixels.length; i += 4) {
        normalizedScreenshotPixels[i] = 80
        normalizedScreenshotPixels[i + 1] = 90
        normalizedScreenshotPixels[i + 2] = 100
        normalizedScreenshotPixels[i + 3] = 255
      }
      const normalizedScreenshot = {
        width: 64,
        height: 64,
        pixels: normalizedScreenshotPixels.toString('base64'),
      }
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
        normalizedScreenshotHash: await sha256(normalizedScreenshot.pixels),
        normalizedScreenshot,
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
export async function recipeMeasurements() {
  const compiled = await Promise.all(
    recipeFixtures().map((recipe) => compileRecipe({ recipe })),
  )
  return Promise.all(
    recipeMeasurementKeys().map(async (key) => {
      const [hostFamily, recipeId, mode, app] = key.split('/'),
        r = compiled.find((r) => r.recipe.data.id === recipeId)!
      return {
        hostFamily,
        recipeId,
        mode,
        app,
        recipeHash: r.recipe.hash,
        canonicalHashes: Object.fromEntries(
          r.artifacts.map((a) => [a.logicalPath, a.sha256]),
        ),
        transformedHashes: await recipeTransformedHashes(r, app),
        computedStyles: { color: 'rgb(1, 2, 3)', background: 'rgb(4, 5, 6)' },
        checks: Object.fromEntries(
          [
            'parity',
            'isolation',
            'activation',
            'disabled',
            'loading',
            'focus',
            'text',
            'overrideHeight',
            'reducedMotion',
            'forcedColors',
            'axe',
            'enlargement',
          ].map((k) => [k, true]),
        ),
        textEvidence: [1100, 320].map((width) => ({
          width,
          samples: [{ before: 14, after: 28 }],
        })),
      }
    }),
  )
}
export function minimalistMeasurements() {
  return ['preview', 'vite', 'next', 'npm-vite', 'npm-next'].flatMap(app => ['light', 'dark'].map(mode => ({
    app, mode, ratios: Object.fromEntries(['placeholder','placeholderFocus','error','inputBoundary','focus','muted','dialogText','dialogFocus', ...['default','secondary','outline','ghost','link','destructive'].flatMap(v => ['', 'Hover','Pressed'].flatMap(s => ['ghost','link'].includes(v) ? [v+s] : [v+s,v+s+'Boundary']))].map(key => [key, 7])),
    disabledContrast: 'exempt', textMethod: 'synthetic font enlargement (not native browser zoom)', forcedColors: 'active', motionPositiveControlMs: 150,
    textEvidence: [1100,320].flatMap(width => [false,true].map(dialogOpen => ({width, dialogOpen, samples: Array.from({length:16}, (_,i) => ({selector: i === 0 ? 'input' : dialogOpen ? '[role="dialog"] p'+i : 'p'+i, before:16, after:32}))}))),
  })))
}

export async function consumerFixture() {
  const {matrix, consumers} = await presetFixtures()
  const refs = await Promise.all(recipeFixtures().map(recipe => compileRecipe({recipe})))
  const recipes: Record<string, any> = {}
  for (const [id, row] of Object.entries(matrix)) {
    const installed: Record<string, any> = {}
    for (const ref of refs) {
      const artifacts: Record<string, any> = {}
      for (const source of ref.artifacts.filter(a => a.kind !== 'utility')) {
        const file = source.kind === 'usage' ? 'src/ombelle-examples/' + source.logicalPath.slice('examples/'.length) : 'src/components/ui/' + source.logicalPath
        artifacts[file] = {logicalPath: source.logicalPath, kind: source.kind, sha256: source.sha256}
        row.sourceHashes[file] = source.sha256
      }
      const {artifacts: unused, dependencies: ignored, ...identity} = ref
      installed[ref.recipe.data.id + '@1'] = {...identity, artifacts}
    }
    recipes[id] = {build: {status: 'passed', exitCode: 0}, audit: row.audit, cliRuntime: row.cliRuntime, buildRuntime: row.buildRuntime, protectedHashes: {'ui-preset.json': 'a'.repeat(64)}, recipes: installed}
  }
  return {matrix, consumers, recipes}
}
