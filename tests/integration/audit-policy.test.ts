import { expect, it } from 'vitest'
import fs from 'node:fs/promises'
// Audit exceptions are recorded in docs/decisions/0002-registry-adapter.md.
// Each one expires so the upstream fix is re-checked instead of silently kept.
const exceptions = [{ ghsa: 'GHSA-gcqx-w48m-w2h4', reviewBy: '2026-11-30' }]
const ignoredGhsas = async () => {
  const workspace = (await fs.readFile('pnpm-workspace.yaml', 'utf8')).replace(/\r\n/g, '\n')
  const block = /^auditConfig:\n {2}ignoreGhsas:\n((?: {4}- .+\n?)*)/m.exec(workspace)
  return { workspace, ids: block ? block[1].split('\n').filter(Boolean).map((line) => line.replace(/^ {4}- /, '').trim()) : [] }
}
it('ignores exactly the documented audit advisories', async () => {
  const { workspace, ids } = await ignoredGhsas()
  expect(ids).toEqual(exceptions.map((exception) => exception.ghsa))
  expect(workspace.match(/GHSA-[0-9a-z]{4}-[0-9a-z]{4}-[0-9a-z]{4}/g)).toEqual(ids)
})
it('keeps every audit exception within its review date', () => {
  const today = new Date().toISOString().slice(0, 10)
  for (const exception of exceptions) expect(today <= exception.reviewBy, exception.ghsa + ' exception expired on ' + exception.reviewBy + '; re-check upstream and renew or remove it').toBe(true)
})
