// RL-11: published-code pages show user-chosen text on the official domain and must not be indexed.
// The pages also set per-snapshot titles, and Next.js refuses a page that exports both `metadata` and
// `generateMetadata`, so the noindex rule travels in every generateMetadata return.
import { readFileSync } from 'node:fs'
import { expect, it } from 'vitest'

it.each(['presets', 'recipes'])('marks the published %s page noindex', (kind) => {
  const source = readFileSync(new URL(`./app/${kind}/[id]/[revision]/page.tsx`, import.meta.url), 'utf8')
  expect(source).toContain('const robots = { index: false, follow: false }')
  expect(source).not.toMatch(/export const metadata\b/)
  const body = source.slice(source.indexOf('export async function generateMetadata'))
  const returns = body.slice(0, body.indexOf('\n}\n')).match(/return \{[^\n]*\}/g) ?? []
  expect(returns.length).toBeGreaterThan(0)
  for (const value of returns) expect(value).toContain('robots }')
})
