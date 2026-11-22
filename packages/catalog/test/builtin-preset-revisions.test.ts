// Decision 0009: a built-in preset's content is frozen per id@revision. Local recipe files and the editors
// refer to built-ins by id@revision, and built-ins supply every family's defaults, so changing one in place
// silently changes what those references and every sparse preset resolve to.
import { createHash } from 'node:crypto'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { expect, it } from 'vitest'
import { getCatalog } from '../src/index.js'
import { resolveRecipePreset } from '../src/recipe-preset.js'

const fixture = new URL('./fixtures/builtin-preset-hashes.json', import.meta.url)
const sorted = (value: unknown): unknown => Array.isArray(value) ? value.map(sorted)
  : value && typeof value === 'object'
    ? Object.fromEntries(Object.keys(value).sort().map(key => [key, sorted((value as Record<string, unknown>)[key])]))
    : value

it('keeps every built-in and starting preset unchanged at its revision', () => {
  const catalog = getCatalog('0.1.0')
  // Retired revisions are hashed too, so each retired copy must equal the content it was pinned with.
  const actual = Object.fromEntries([...Object.values(catalog.presets), ...Object.values(catalog.startingPresets), ...catalog.retiredPresets]
    .map(preset => [preset.id + '@' + preset.revision,
      createHash('sha256').update(JSON.stringify(sorted(preset))).digest('hex')])
    .sort(([a], [b]) => a < b ? -1 : 1))
  if (process.env.OMBELLE_WRITE_FIXTURES === '1' || !existsSync(fixture))
    writeFileSync(fixture, JSON.stringify(actual, null, 2) + '\n')
  const pinned = JSON.parse(readFileSync(fixture, 'utf8')) as Record<string, string>
  for (const [key, hash] of Object.entries(actual))
    if (Object.hasOwn(pinned, key))
      expect(hash, `${key} changed in place. Bump its revision (keeping the old revision resolvable) instead, ` +
        'see docs/decisions/0009-snapshot-identity-and-contract-version.md').toBe(pinned[key])
})

it('resolves a retired revision by its exact id@revision and the current one by its own', () => {
  const catalog = getCatalog('0.1.0')
  const ref = (revision: number) =>
    ({ id: 'builtin-liquid-glass-cristal', revision, catalogRelease: '0.1.0', compilerVersion: '0.1.0' }) as Parameters<typeof resolveRecipePreset>[0]
  const retired = catalog.retiredPresets.find(preset => preset.id === 'builtin-liquid-glass-cristal' && preset.revision === 1)
  expect(retired).toBeDefined()
  expect(resolveRecipePreset(ref(1))).toEqual(retired)
  expect(resolveRecipePreset(ref(2))).toEqual(catalog.startingPresets['builtin-liquid-glass-cristal'])
  // A retired revision is never a live starting point.
  expect(catalog.startingPresets['builtin-liquid-glass-cristal'].revision).toBe(2)
})
