import Ajv2020, { type ValidateFunction } from 'ajv/dist/2020.js'
import type { FromSchema } from 'json-schema-to-ts'
import { FoundationError } from './diagnostics.js'
import { presetSchema } from './preset-schema.js'
import { presetSnapshotSchema } from './preset-snapshot-schema.js'
import { snapshotSourceSchema } from './snapshot-source-schema.js'
import { isStyleFamily } from './style-families.js'
import { validatePreset } from './validate.js'

export type SnapshotReference = { id: string; revision: 1 }
// json-schema-to-ts keeps the outer root when resolving external schemas.
// Qualify the referenced preset's local pointers for type inference only;
// AJV resolves the original registered schema's pointers itself.
type AbsolutePresetReferences<T> = {
  [K in keyof T]: K extends '$ref'
    ? T[K] extends `#${string}`
      ? `${typeof presetSchema.$id}${T[K]}`
      : T[K]
    : T[K] extends object
      ? AbsolutePresetReferences<T[K]>
      : T[K]
}
export type PresetSnapshot = FromSchema<
  typeof presetSnapshotSchema,
  { references: [AbsolutePresetReferences<typeof presetSchema>] }
>
export type SnapshotSource = FromSchema<typeof snapshotSourceSchema>

const ajv = new Ajv2020({ allErrors: true, strict: true }).addSchema(
  presetSchema,
)
const checkSnapshot = ajv.compile(presetSnapshotSchema)
const checkSource = ajv.compile(snapshotSourceSchema)

function assertSchema(check: ValidateFunction, input: unknown): void {
  if (check(input)) return
  const error = check.errors![0]
  const suffix =
    error.keyword === 'additionalProperties'
      ? '/' + error.params.additionalProperty
      : error.keyword === 'required'
        ? '/' + error.params.missingProperty
        : ''
  throw new FoundationError(
    'INVALID_DATA',
    error.message ?? 'Invalid snapshot data',
    error.instancePath + suffix,
  )
}

export function parseSnapshotReference(value: string): SnapshotReference {
  if (
    typeof value !== 'string' ||
    value.length !== 37 ||
    !/^ps_[0-9a-f]{32}@1$/.test(value)
  )
    throw new FoundationError(
      'INVALID_REFERENCE',
      'Expected a snapshot reference ps_<32 lowercase hexadecimal digits>@1',
      '/reference',
    )
  return { id: value.slice(0, 35), revision: 1 }
}

export function validatePresetSnapshot(input: unknown): PresetSnapshot {
  assertSchema(checkSnapshot, input)
  const snapshot = input as PresetSnapshot
  for (const field of ['catalogRelease', 'compilerVersion'] as const)
    if (snapshot.preset[field] !== snapshot[field])
      throw new FoundationError(
        'INVALID_DATA',
        'Snapshot and preset releases must match',
        '/preset/' + field,
      )
  if (!isStyleFamily(snapshot.preset.styleFamily))
    throw new FoundationError(
      'INVALID_DATA',
      'Style family is not available in the foundation',
      '/preset/styleFamily',
    )
  const timestamp = new Date(snapshot.createdAt)
  if (
    !Number.isFinite(timestamp.getTime()) ||
    timestamp.toISOString() !== snapshot.createdAt
  )
    throw new FoundationError(
      'INVALID_DATA',
      'Expected a valid UTC ISO timestamp',
      '/createdAt',
    )
  // Reuse the semantic color and safe-revision checks beyond JSON Schema.
  try {
    validatePreset(snapshot.preset)
  } catch (error) {
    if (error instanceof FoundationError && error.path)
      error.path = '/preset' + error.path
    throw error
  }
  return structuredClone(snapshot)
}

export function normalizeSnapshotOrigin(input: string): string {
  // Check the supplied authority before WHATWG URL parsing can rewrite numeric
  // IP aliases, dot paths, backslashes, whitespace, or empty credentials.
  const match =
    typeof input === 'string' &&
    input.length <= 2048 &&
    !/[\s\\@]/.test(input) &&
    /^(https?):\/\/([^/?#]+)\/?$/i.exec(input)
  if (!match)
    throw new FoundationError(
      'INVALID_DATA',
      'Expected an HTTPS origin, or HTTP on literal loopback',
      '/origin',
    )
  let url: URL
  try {
    url = new URL(input)
  } catch {
    throw new FoundationError(
      'INVALID_DATA',
      'Invalid snapshot origin',
      '/origin',
    )
  }
  const literalLoopback =
    /^(localhost|127\.0\.0\.1|\[::1\])(?::[0-9]+)?$/i.test(match[2])
  if (
    url.protocol !== 'https:' &&
    !(url.protocol === 'http:' && literalLoopback)
  )
    throw new FoundationError(
      'INVALID_DATA',
      'HTTP requires literal localhost, 127.0.0.1, or [::1]',
      '/origin',
    )
  return url.origin
}

export function validateSnapshotSource(input: unknown): SnapshotSource {
  assertSchema(checkSource, input)
  const source = input as SnapshotSource
  parseSnapshotReference(source.reference)
  if (normalizeSnapshotOrigin(source.origin) !== source.origin)
    throw new FoundationError(
      'INVALID_DATA',
      'Snapshot source origin must be canonical',
      '/origin',
    )
  return structuredClone(source)
}
