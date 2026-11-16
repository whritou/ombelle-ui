import { expect, it } from 'vitest'
import fs from 'node:fs/promises'

it('runs the workspace audit without advisory exclusions or a severity threshold', async () => {
  const workspace = await fs.readFile('pnpm-workspace.yaml', 'utf8')
  expect(workspace).not.toMatch(/ignoreGhsas|ignoreCves|ignoreUnfixable|auditLevel/)
  const pkg = JSON.parse(await fs.readFile('package.json', 'utf8'))
  expect(pkg.scripts['audit:workspace']).toBe('pnpm audit')
})
