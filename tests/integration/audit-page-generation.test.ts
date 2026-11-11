import { afterEach, expect, it } from 'vitest'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { styleFamilies, supportedComponentIds } from '@ombelle/contracts'
import { glassPresetBackdrop } from '../../apps/www/src/site/glass-presets.js'
import { writeAuditPages, type AuditData } from '../../scripts/generate-audit.js'

const roots: string[] = []
afterEach(async () => {
  for (const root of roots.splice(0)) await fs.rm(root, { recursive: true, force: true })
})

const read = async (root: string) => {
  const files: Record<string, string> = {}
  for (const name of await fs.readdir(root)) files[name] = await fs.readFile(path.join(root, name), 'utf8')
  return files
}

it('writes one deterministic audit page per family and edition', { timeout: 240000 }, async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'ombelle-audit-'))
  roots.push(root)
  await writeAuditPages(root)
  const first = await read(root)
  expect(Object.keys(first).sort()).toEqual([...styleFamilies.flatMap(family => [`${family}-base.json`, `${family}-radix.json`]), 'index.ts'].sort())
  for (const family of styleFamilies)
    for (const edition of ['radix', 'base'] as const) {
      const data = JSON.parse(first[`${family}-${edition}.json`]) as AuditData
      expect(data.family).toBe(family)
      expect(data.edition).toBe(edition)
      expect(data.specimens.map(item => item.component)).toEqual([...supportedComponentIds].sort())
      for (const item of data.specimens) {
        if (edition === 'base' || item.component === 'button') {
          expect(item.scope).toBeNull()
          expect(item.css).toBeNull()
        } else {
          expect(item.css).toMatch(new RegExp(String.raw`\[data-ombelle-recipe=["']${item.scope}["']\]`))
        }
      }
      expect(data.specimens.find(item => item.component === 'button')!.specimen)
        .toEqual({ tag: 'Button', props: {}, children: ['Save changes'] })
      expect(data.backdrop).toEqual(family === 'liquid-glass'
        ? { light: glassPresetBackdrop('builtin-liquid-glass', 'light'), dark: glassPresetBackdrop('builtin-liquid-glass', 'dark') }
        : { light: null, dark: null })
    }
  await writeAuditPages(root)
  expect(await read(root)).toEqual(first)
})
