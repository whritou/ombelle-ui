import { recipeFixtures } from '../fixtures/shared/recipes.ts'
import { supportedStyleFamilies } from '../packages/contracts/src/style-families.ts'
import type { RecipeCompileResult } from '@ombelle/contracts'
import type { ConsumerEvidence } from './consumer-evidence.js'
import path from 'node:path'
const checks = [
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
] as const
export type RecipeMeasurement = {
  hostFamily: string
  recipeId: string
  recipeHash: string
  app: string
  mode: string
  canonicalHashes: Record<string, string>
  transformedHashes: Record<string, string>
  computedStyles: Record<string, string>
  checks: Record<(typeof checks)[number], boolean>
  textEvidence: {
    width: number
    samples: { before: number; after: number; selector?: string }[]
  }[]
}
const object = (v: unknown): Record<string, unknown> => {
  if (!v || typeof v !== 'object' || Array.isArray(v))
    throw Error('Expected recipe evidence object')
  return v as Record<string, unknown>
}
const equal = (a: unknown, b: unknown): boolean =>
  JSON.stringify(sort(a)) === JSON.stringify(sort(b))
function sort(v: unknown): unknown {
  if (Array.isArray(v)) return v.map(sort)
  if (v && typeof v === 'object')
    return Object.fromEntries(
      Object.entries(v)
        .sort(([a], [b]) => (a < b ? -1 : 1))
        .map(([k, v]) => [k, sort(v)]),
    )
  return v
}
let compiled: Promise<RecipeCompileResult[]> | undefined
async function references(): Promise<RecipeCompileResult[]> {
  // Resolve only after package building, also when the gate itself runs directly under Node.
  const compiler = await import(
    new URL('../packages/compiler/dist/index.js', import.meta.url).href
  )
  return (compiled ??= Promise.all(
    recipeFixtures().map((recipe) => compiler.compileRecipe({ recipe })),
  ))
}
export function recipeMeasurementKeys(): readonly string[] {
  return supportedStyleFamilies.flatMap((host) =>
    recipeFixtures().flatMap((r) =>
      ['light', 'dark'].flatMap((mode) =>
        ['preview', 'vite', 'next', 'npm-vite', 'npm-next'].map((app) =>
          [host, r.id, mode, app].join('/'),
        ),
      ),
    ),
  )
}
export async function recipeTransformedHashes(
  ref: RecipeCompileResult,
  app: string,
): Promise<Record<string, string>> {
  const compiler = await import(
    new URL('../packages/compiler/dist/index.js', import.meta.url).href
  )
  return Object.fromEntries(
    await Promise.all(
      ref.artifacts
        .filter((a) => a.kind !== 'utility')
        .map(async (a) => {
          if (app !== 'preview') return [a.logicalPath, a.sha256]
          const dest =
            a.kind === 'usage'
              ? a.logicalPath
              : 'components/ui/' + a.logicalPath
          const relative = (to: string) => {
            const p = path.posix.relative(path.posix.dirname(dest), to)
            return p.startsWith('.') ? p : './' + p
          }
          const content =
            a.kind === 'style'
              ? a.content
              : await compiler.rewriteModuleSpecifiers(
                  a.content,
                  (specifier: string) =>
                    compiler.recipeImportAlias(
                      specifier,
                      relative('lib/utils'),
                      relative('components/ui'),
                    ),
                )
          return [a.logicalPath, await compiler.sha256(content)]
        }),
    ),
  )
}
export async function validateRecipeMeasurements(
  value: unknown,
): Promise<RecipeMeasurement[]> {
  const expected = new Set(recipeMeasurementKeys()),
    refs = await references(),
    styles = new Map<string, unknown>()
  if (!Array.isArray(value) || value.length !== expected.size)
    throw Error('Expected all 90 recipe measurements')
  for (const item of value) {
    const row = object(item),
      key = [row.hostFamily, row.recipeId, row.mode, row.app].join('/')
    if (!expected.delete(key))
      throw Error('Duplicate or unexpected recipe measurement ' + key)
    const ref = refs.find((r) => r.recipe.data.id === row.recipeId)
    if (
      !ref ||
      row.recipeHash !== ref.recipe.hash ||
      !equal(
        row.canonicalHashes,
        Object.fromEntries(ref.artifacts.map((a) => [a.logicalPath, a.sha256])),
      )
    )
      throw Error('Recipe measurement canonical identity mismatch ' + key)
    const hashes = object(row.transformedHashes),
      paths = ref.artifacts
        .filter((a) => a.kind !== 'utility')
        .map((a) => a.logicalPath)
    if (
      !equal(Object.keys(hashes).sort(), paths.sort()) ||
      !equal(hashes, await recipeTransformedHashes(ref, String(row.app))) ||
      Object.values(hashes).some(
        (v) => typeof v !== 'string' || !/^[a-f0-9]{64}$/.test(v),
      )
    )
      throw Error('Missing transformed recipe hashes')
    const results = object(row.checks)
    if (checks.some((k) => results[k] !== true))
      throw Error('Missing or failed recipe check ' + key)
    const measured = object(row.computedStyles),
      styleKey = row.recipeId + '/' + row.mode
    if (
      !Object.keys(measured).length ||
      Object.values(measured).some((v) => typeof v !== 'string')
    )
      throw Error('Missing rendered recipe styles')
    if (styles.has(styleKey) && !equal(styles.get(styleKey), measured))
      throw Error('Recipe style differs across host/apps ' + key)
    styles.set(styleKey, measured)
    if (!Array.isArray(row.textEvidence) || row.textEvidence.length !== 2)
      throw Error('Missing recipe enlargement evidence')
    const widths = new Set([1100, 320])
    for (const input of row.textEvidence) {
      const layout = object(input)
      if (
        !widths.delete(layout.width as number) ||
        !Array.isArray(layout.samples) ||
        !layout.samples.length
      )
        throw Error('Missing enlargement layout')
      for (const item of layout.samples) {
        const sample = object(item)
        if (
          typeof sample.before !== 'number' ||
          sample.before <= 0 ||
          typeof sample.after !== 'number' ||
          !Number.isFinite(sample.after) ||
          Math.abs(sample.after / sample.before - 2) >= 0.02
        )
          throw Error('Recipe text did not double')
      }
    }
  }
  return value as RecipeMeasurement[]
}
export async function validateRecipeConsumers(
  value: unknown,
  matrix: Record<string, ConsumerEvidence>,
): Promise<void> {
  const rows = object(value),
    refs = await references()
  if (
    Object.keys(rows).length !== 34 ||
    !equal(Object.keys(rows).sort(), Object.keys(matrix).sort())
  )
    throw Error('Recipe consumer descriptor set mismatch')
  for (const [id, input] of Object.entries(rows)) {
    const row = object(input),
      build = object(row.build),
      recipes = object(row.recipes),
      global = matrix[id]
    if (
      build.status !== 'passed' ||
      build.exitCode !== 0 ||
      !equal(row.audit, global.audit) ||
      !equal(row.cliRuntime, global.cliRuntime) ||
      !equal(row.buildRuntime, global.buildRuntime)
    )
      throw Error(
        'Recipe consumer requires actual audit/runtime/build success ' + id,
      )
    const protectedHashes = object(row.protectedHashes)
    if (
      !Object.keys(protectedHashes).includes('ui-preset.json') ||
      Object.values(protectedHashes).some(
        (h) => typeof h !== 'string' || !/^[a-f0-9]{64}$/.test(h),
      )
    )
      throw Error('Missing protected project hashes ' + id)
    if (Object.keys(recipes).length !== 3)
      throw Error('Missing consumer recipe installation ' + id)
    for (const ref of refs) {
      const entry = object(recipes[ref.recipe.data.id + '@1']),
        { artifacts, ...meta } = entry
      const { artifacts: ignored, dependencies: unused, ...identity } = ref
      if (!equal(meta, identity))
        throw Error('Consumer recipe identity mismatch ' + id)
      const files = object(artifacts),
        expected = ref.artifacts.filter((a) => a.kind !== 'utility')
      if (Object.keys(files).length !== 3)
        throw Error('Missing installed recipe files ' + id)
      for (const source of expected) {
        const file =
          source.kind === 'usage'
            ? 'src/ombelle-examples/' +
              source.logicalPath.slice('examples/'.length)
            : 'src/components/ui/' + source.logicalPath
        const recorded = object(files[file])
        if (
          recorded.logicalPath !== source.logicalPath ||
          recorded.kind !== source.kind ||
          recorded.sha256 !== source.sha256 ||
          global.sourceHashes[file] !== source.sha256
        )
          throw Error('Installed recipe source mismatch ' + id + '/' + file)
      }
    }
  }
}
export async function finalizeRecipeEvidence(
  input: { measurements: unknown; consumers: unknown },
  matrix: Record<string, ConsumerEvidence>,
): Promise<{ measurements: RecipeMeasurement[]; consumers: unknown }> {
  const measurements = await validateRecipeMeasurements(input.measurements)
  await validateRecipeConsumers(input.consumers, matrix)
  return { measurements, consumers: input.consumers }
}
