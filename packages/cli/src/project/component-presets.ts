import {
  FoundationError,
  type InstalledComponentPreset,
  type ProjectLock,
} from '@ombelle/contracts'
import { canonicalize, compileButtonPreset } from '@ombelle/compiler'
import { safePath } from './paths.js'

const object = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === 'object' && !Array.isArray(value)

export async function validateInstalledComponentPresets(
  root: string,
  value: unknown,
  artifacts: ProjectLock['artifacts'],
): Promise<Record<string, InstalledComponentPreset>> {
  if (value === undefined) return {}
  const bad = () =>
    new FoundationError(
      'UNSUPPORTED_PROJECT',
      'Invalid component preset provenance in the project lock',
      '/componentPresets',
      'Restore the committed lockfile before installing.',
    )
  if (!object(value) || !object(artifacts)) throw bad()

  const rows: Record<string, InstalledComponentPreset> = Object.create(null)
  for (const [key, item] of Object.entries(value)) {
    if (
      !object(item) ||
      !object(item.preset) ||
      !object(item.preset.data) ||
      !object(item.artifacts) ||
      typeof item.darkSelector !== 'string'
    )
      throw bad()

    let canonical
    try {
      canonical = await compileButtonPreset({
        preset: item.preset.data,
        darkSelector: item.darkSelector,
      })
    } catch {
      throw bad()
    }

    const { artifacts: ignored, dependencies: unused, ...identity } = canonical
    const { artifacts: stored, ...metadata } = item
    if (
      key !== canonical.preset.data.id + '@' + canonical.preset.data.revision ||
      canonicalize(identity) !== canonicalize(metadata)
    )
      throw bad()

    const expected = canonical.artifacts.filter(
      (artifact) => artifact.kind !== 'utility',
    )
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
        (artifact) =>
          artifact.logicalPath === record.logicalPath &&
          artifact.kind === record.kind,
      )
      if (
        !source ||
        source.sha256 !== record.sha256 ||
        seen.has(source.logicalPath) ||
        !Object.hasOwn(artifacts, file) ||
        canonicalize(artifacts[file]) !== canonicalize(record)
      )
        throw bad()
      seen.add(source.logicalPath)
    }
    rows[key] = structuredClone(item) as InstalledComponentPreset
  }
  return rows
}
