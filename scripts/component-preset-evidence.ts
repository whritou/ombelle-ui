import { supportedStyleFamilies } from '../packages/contracts/src/style-families.ts'
import { consumerCases } from './consumer-matrix.ts'
import {
  finalizeConsumerEvidence,
  type ConsumerEvidence,
} from './consumer-evidence.ts'
import {
  componentPresetReferences,
  componentPresetArtifact,
} from '../tests/helpers/component-preset-fixture.ts'
import {
  recipeScreenshotBlockSize,
  type NormalizedRecipeScreenshot,
} from '../tests/helpers/recipe-measurements.ts'
import { canonicalize } from '../packages/compiler/src/canonicalize.ts'
import { sha256 } from '../packages/compiler/src/hash.ts'

const checks = [
  'parity',
  'isolation',
  'activation',
  'disabled',
  'loading',
  'focus',
  'forcedColors',
  'reducedMotion',
] as const
export const componentPresetIsolationMethod =
  'separate host page without component preset imports' as const
export type ComponentPresetMeasurement = {
  hostFamily: string
  presetId: string
  presetHash: string
  scope: string
  app: string
  mode: string
  canonicalHashes: Record<string, string>
  transformedHashes: Record<string, string>
  computedStyles: Record<string, string>
  isolationMethod: typeof componentPresetIsolationMethod
  domHash: string
  screenshotHash: string
  normalizedScreenshotHash: string
  normalizedScreenshot: NormalizedRecipeScreenshot
  focusOutlineWidth: number
  forcedColorsOutline: string
  motionPositiveControlMs: number
  reducedMotionMs: number
  checks: Record<(typeof checks)[number], boolean>
}
function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw Error('Expected component preset evidence object')
  return value as Record<string, unknown>
}
const equal = (a: unknown, b: unknown) => canonicalize(a) === canonicalize(b)
const digest = (v: unknown) => typeof v === 'string' && /^[a-f0-9]{64}$/.test(v)
const screenshotMaxRmse = 2
const screenshotMaxChannelDifference = 24

export function normalizedScreenshotsMatch(
  left: NormalizedRecipeScreenshot,
  right: NormalizedRecipeScreenshot,
): boolean {
  if (left.width !== right.width || left.height !== right.height) return false
  const a = Buffer.from(left.pixels, 'base64'),
    b = Buffer.from(right.pixels, 'base64')
  if (!a.length || a.length !== b.length || a.length % 4 !== 0) return false
  let squaredError = 0
  for (let pixel = 0; pixel < a.length; pixel += 4) {
    let maxDifference = 0
    for (let channel = 0; channel < 4; channel++) {
      const difference = Math.abs(a[pixel + channel] - b[pixel + channel])
      squaredError += difference * difference
      maxDifference = Math.max(maxDifference, difference)
    }
    if (maxDifference > screenshotMaxChannelDifference) return false
  }
  return Math.sqrt(squaredError / a.length) <= screenshotMaxRmse
}

function isNormalizedScreenshot(value: unknown): value is NormalizedRecipeScreenshot {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false
  const image = value as Record<string, unknown>
  if (
    !Number.isInteger(image.width) ||
    !Number.isInteger(image.height) ||
    Number(image.width) <= 0 ||
    Number(image.height) <= 0 ||
    typeof image.pixels !== 'string' ||
    !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(
      image.pixels,
    )
  )
    return false
  const pixels = Buffer.from(image.pixels, 'base64'),
    expectedWidth = Math.ceil(Number(image.width) / recipeScreenshotBlockSize),
    expectedHeight = Math.ceil(Number(image.height) / recipeScreenshotBlockSize)
  return (
    pixels.toString('base64') === image.pixels &&
    pixels.length === expectedWidth * expectedHeight * 4
  )
}

export function componentPresetMeasurementKeys(): readonly string[] {
  return supportedStyleFamilies.flatMap((host) =>
    supportedStyleFamilies.flatMap((selected) =>
      ['light', 'dark'].flatMap((mode) =>
        ['preview', 'vite', 'next', 'npm-vite', 'npm-next'].map((app) =>
          [host, 'builtin-' + selected, mode, app].join('/'),
        ),
      ),
    ),
  )
}
export async function validateComponentPresetMeasurements(
  value: unknown,
): Promise<ComponentPresetMeasurement[]> {
  const expected = new Set(componentPresetMeasurementKeys()),
    refs = await componentPresetReferences(),
    rendered = new Map<string, unknown>()
  if (!Array.isArray(value) || value.length !== expected.size)
    throw Error('Expected all 90 component preset measurements')
  for (const input of value) {
    const row = object(input),
      key = [row.hostFamily, row.presetId, row.mode, row.app].join('/')
    if (!expected.delete(key))
      throw Error('Duplicate or unexpected component preset measurement ' + key)
    const ref = refs.find((r) => r.preset.data.id === row.presetId)
    if (
      !ref ||
      row.presetHash !== ref.preset.hash ||
      row.scope !== ref.scope ||
      !equal(
        row.canonicalHashes,
        Object.fromEntries(ref.artifacts.map((a) => [a.logicalPath, a.sha256])),
      )
    )
      throw Error('Component preset canonical provenance mismatch ' + key)
    const transformed: Record<string, string> = {}
    for (const a of ref.artifacts.filter((a) => a.kind !== 'utility'))
      transformed[a.logicalPath] = await sha256(
        (
          await componentPresetArtifact(
            a,
            row.app === 'preview' ? 'preview' : 'consumer',
          )
        ).content,
      )
    if (!equal(row.transformedHashes, transformed))
      throw Error('Component preset transformed hash mismatch ' + key)
    const result = object(row.checks),
      styles = object(row.computedStyles)
    if (
      row.isolationMethod !== componentPresetIsolationMethod ||
      checks.some((k) => result[k] !== true) ||
      [
        'color',
        'background',
        'border',
        'borderRadius',
        'minHeight',
        'fontFamily',
        'fontSize',
        'lineHeight',
        'boxShadow',
        'padding',
      ].some(
        (k) => typeof styles[k] !== 'string' || !String(styles[k]).trim(),
      ) ||
      Object.values(styles).some((v) => typeof v !== 'string') ||
      !digest(row.domHash) ||
      !digest(row.screenshotHash) ||
      !digest(row.normalizedScreenshotHash) ||
      !isNormalizedScreenshot(row.normalizedScreenshot) ||
      (await sha256(row.normalizedScreenshot.pixels)) !==
        row.normalizedScreenshotHash
    )
      throw Error('Missing rendered component preset results ' + key)
    if (
      typeof row.focusOutlineWidth !== 'number' ||
      !Number.isFinite(row.focusOutlineWidth) ||
      row.focusOutlineWidth < 3 ||
      ![
        'solid',
        'dashed',
        'dotted',
        'double',
        'groove',
        'ridge',
        'inset',
        'outset',
      ].includes(String(row.forcedColorsOutline)) ||
      row.motionPositiveControlMs !== 150 ||
      row.reducedMotionMs !== 0
    )
      throw Error('Failed component preset accessibility state ' + key)
    const identity = row.presetId + '/' + row.mode,
      evidence = {
        styles,
        domHash: row.domHash,
        normalizedScreenshot: row.normalizedScreenshot,
      }
    if (rendered.has(identity)) {
      const previous = object(rendered.get(identity)),
        differences = []
      if (!equal(previous.styles, styles)) differences.push('computed styles')
      if (previous.domHash !== row.domHash) differences.push('DOM')
      if (
        !normalizedScreenshotsMatch(
          previous.normalizedScreenshot as NormalizedRecipeScreenshot,
          row.normalizedScreenshot as NormalizedRecipeScreenshot,
        )
      )
        differences.push('normalized screenshot')
      if (differences.length)
        throw Error(
          'Component preset differs across hosts/apps ' +
            key +
            ' (' +
            differences.join(', ') +
            ')',
        )
    } else {
      rendered.set(identity, evidence)
    }
  }
  return value as ComponentPresetMeasurement[]
}

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
    ) throw Error('Missing or incorrect manager lock provenance ' + c.id)
    if (!Object.keys(before).some(file => /^src\/ombelle-examples\/(?:recipes|presets)\/.+\.tsx$/.test(file)))
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

export async function finalizeComponentPresetEvidence(
  input: { measurements: unknown; consumers: unknown },
  matrix: Record<string, ConsumerEvidence>,
) {
  const measurements = await validateComponentPresetMeasurements(
    input.measurements,
  )
  await validateComponentPresetConsumers(input.consumers, matrix)
  return { measurements, consumers: input.consumers }
}
