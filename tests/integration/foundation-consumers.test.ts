import fs from 'node:fs/promises'
import path from 'node:path'
import { afterEach, expect, test, vi } from 'vitest'
import { prepareNodeConsumer } from '../../scripts/prepare-node-consumer.js'
import { managerEntry } from '../../packages/cli/src/apply/manager.js'

afterEach(() => vi.unstubAllEnvs())

// Exercise the nightly preparation path, including the real CLI, frozen lock,
// dependency versions on disk, and audit. Preview contains more components
// than either scenario: its full dependency union is not a consumer contract.
test.each(['flat', 'liquid-glass'] as const)(
  'prepares the %s pnpm consumer against its installed component scope',
  async (family) => {
    vi.stubEnv('npm_execpath', await managerEntry('pnpm'))
    const row = await prepareNodeConsumer({
      id: 'vite-' + family,
      family,
      framework: 'vite',
      manager: 'pnpm',
      cliRuntime: 'node',
    })
    try {
      const pkg = JSON.parse(
        await fs.readFile(path.join(row.root, 'package.json'), 'utf8'),
      )
      expect(pkg.dependencies['@radix-ui/react-accordion']).toBeUndefined()
      expect(pkg.dependencies['@radix-ui/react-dialog']).toBe('1.3.1')
      expect(row.artifacts.map((a) => a.logicalPath)).toContain(
        'components/ui/button.tsx',
      )
      if (family === 'liquid-glass') {
        expect(row.artifacts.map((a) => a.logicalPath)).toContain(
          'components/ui/liquid-glass-filter.tsx',
        )
        expect(row.recipeEvidence).toBeUndefined()
      } else {
        expect(row.artifacts.map((a) => a.logicalPath)).toContain(
          'components/ui/checkbox.tsx',
        )
        expect(row.recipeEvidence).toBeDefined()
      }
    } finally {
      await fs.rm(row.root, { recursive: true, force: true })
    }
  },
  240000,
)
