import Ajv2020 from 'ajv/dist/2020.js'
import type { Preset } from './types.js'
import { presetSchema } from './preset-schema.js'
import { FoundationError } from './diagnostics.js'
const check = new Ajv2020({ allErrors: true, strict: true }).compile(
  presetSchema,
)
export function validatePreset(input: unknown): Preset {
  if (!check(input)) {
    const error = check.errors![0]
    const suffix =
      error.keyword === 'additionalProperties'
        ? '/' + error.params.additionalProperty
        : error.keyword === 'required'
          ? '/' + error.params.missingProperty
          : ''
    throw new FoundationError(
      'INVALID_DATA',
      error.message ?? 'Invalid preset',
      error.instancePath + suffix,
    )
  }
  const preset = input as Preset
  if (!Number.isSafeInteger(preset.revision))
    throw new FoundationError(
      'INVALID_DATA',
      'Revision must be a safe integer',
      '/revision',
    )
  for (const [mode, colors] of Object.entries(preset.modes))
    for (const [key, color] of Object.entries(colors)) {
      if (color.startsWith('#')) continue
      const numbers = color.slice(6, -1).split(/ +/)
      const [l, c, h, slash, a] = numbers
      const light = Number(l.replace('%', '')) / (l.endsWith('%') ? 100 : 1)
      const alpha =
        a === undefined
          ? 1
          : Number(a.replace('%', '')) / (a.endsWith('%') ? 100 : 1)
      if (
        ![light, Number(c), Number(h), alpha].every(Number.isFinite) ||
        light < 0 ||
        light > 1 ||
        Number(c) < 0 ||
        Number(c) > 0.4 ||
        Number(h) < 0 ||
        Number(h) > 360 ||
        alpha < 0 ||
        alpha > 1 ||
        (slash !== undefined && slash !== '/')
      )
        throw new FoundationError(
          'INVALID_DATA',
          'OKLCH values exceed the supported numeric bounds',
          '/modes/' + mode + '/' + key,
        )
    }
  return structuredClone(preset)
}
