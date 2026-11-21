import {
  FoundationError,
  type InstalledRecipe,
  type Preset,
  type ProjectLock,
} from '@ombelle/contracts'
import { canonicalize, compileInstallableRecipe } from '@ombelle/compiler'
import { safePath } from './paths.js'
const object = (v: unknown): v is Record<string, unknown> =>
  !!v && typeof v === 'object' && !Array.isArray(v)
export async function validateInstalledRecipes(
  root: string,
  value: unknown,
  artifacts: ProjectLock['artifacts'],
): Promise<Record<string, InstalledRecipe>> {
  if (value === undefined) return {}
  const bad = () =>
    new FoundationError(
      'UNSUPPORTED_PROJECT',
      'Invalid recipe provenance in the project lock',
      '/recipes',
      'Restore the committed lockfile before installing.',
    )
  if (!object(value)) throw bad()
  const rows: Record<string, InstalledRecipe> = Object.create(null)
  for (const [key, item] of Object.entries(value)) {
    if (
      !object(item) ||
      !object(item.recipe) ||
      !object(item.artifacts) ||
      !object(item.preset) ||
      !object(item.preset.data) ||
      typeof item.darkSelector !== 'string'
    )
      throw bad()
    let canonical
    try {
      canonical = await compileInstallableRecipe({
        recipe: item.recipe.data,
        darkSelector: item.darkSelector,
        // The row's stored preset, so a later change to the built-in cannot invalidate the lock (decision 0009).
        preset: item.preset.data as Preset,
      })
    } catch {
      throw bad()
    }
    const { artifacts: ignored, dependencies: unused, ...identity } = canonical
    const { artifacts: stored, ...meta } = item
    if (
      key !== canonical.recipe.data.id + '@' + canonical.recipe.data.revision ||
      canonicalize(identity) !== canonicalize(meta)
    )
      throw bad()
    const expected = canonical.artifacts.filter((a) => a.kind !== 'utility')
    if (Object.keys(stored).length !== expected.length) throw bad()
    const seen = new Set<string>()
    for (const [file, record] of Object.entries(stored)) {
      await safePath(root, file)
      if (
        !object(record) ||
        typeof record.logicalPath !== 'string' ||
        typeof record.sha256 !== 'string' ||
        !/^[a-f0-9]{64}$/.test(record.sha256)
      )
        throw bad()
      const source = expected.find(
        (a) => a.logicalPath === record.logicalPath && a.kind === record.kind,
      )
      if (
        !source ||
        seen.has(source.logicalPath) ||
        !Object.hasOwn(artifacts, file) ||
        canonicalize(artifacts[file]) !== canonicalize(record)
      )
        throw bad()
      seen.add(source.logicalPath)
    }
    rows[key] = structuredClone(item) as InstalledRecipe
  }
  return rows
}
