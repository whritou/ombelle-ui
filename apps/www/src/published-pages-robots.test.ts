// RL-11: published-code pages show user-chosen text on the official domain and must not be indexed.
import { readFileSync } from 'node:fs'
import { expect, it } from 'vitest'

it.each(['presets', 'recipes'])('marks the published %s page noindex', (kind) => {
  const source = readFileSync(new URL(`./app/${kind}/[id]/[revision]/page.tsx`, import.meta.url), 'utf8')
  expect(source).toContain('export const metadata = { robots: { index: false, follow: false } }')
})
