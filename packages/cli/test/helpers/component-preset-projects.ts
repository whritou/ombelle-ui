import { afterEach } from 'vitest'
import fs from 'node:fs/promises'
import path from 'node:path'
import { compile } from '@ombelle/compiler'
import { getCatalog } from '@ombelle/catalog'
import { createProject } from '../../../../tests/helpers/projects.js'
import { inspectProject } from '../../src/project/inspect.js'
import { planTheme } from '../../src/plan/theme.js'
import { planAdd } from '../../src/plan/components.js'
import { applyPlan } from '../../src/apply/transaction.js'

/** A fresh initialized project per test, optionally with an ordinary Button. */
export function componentPresetProjects(
  options: { ordinaryButton?: boolean } = {},
) {
  const roots: string[] = []
  afterEach(async () => {
    for (const root of roots.splice(0))
      await fs.rm(root, { recursive: true, force: true })
  })
  async function setup(customAliases = false) {
    const root = await createProject('vite')
    roots.push(root)
    if (customAliases) {
      const file = path.join(root, 'components.json')
      const upstream = JSON.parse(await fs.readFile(file, 'utf8'))
      upstream.aliases.ui = '@/design/ui'
      upstream.aliases.utils = '@/shared/cn'
      await fs.writeFile(file, JSON.stringify(upstream))
    }
    const result = await compile({
      preset:
        getCatalog('0.1.0').presets[
          options.ordinaryButton ? 'minimalist' : 'flat'
        ],
      componentIds: options.ordinaryButton ? ['button'] : [],
      catalogRelease: '0.1.0',
      compilerVersion: '0.1.0',
    })
    await applyPlan(await planTheme(await inspectProject(root), result))
    if (options.ordinaryButton)
      await applyPlan(await planAdd(await inspectProject(root), result), {
        dependencies: async () => {},
      })
    return root
  }
  return { roots, setup }
}
