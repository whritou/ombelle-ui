import { expect, it } from 'vitest'
import { compileRecipe } from '@ombelle/compiler'
import type { InstallPlan } from '@ombelle/contracts'
import { formatPlan } from '../src/format.js'
import example from '../../../examples/recipe.example.json'
it('shows precise recipe provenance and actionable conflict diagnostics in human output', async () => {
  const result = await compileRecipe({ recipe: example }),
    { artifacts, dependencies, ...identity } = result
  const plan: InstallPlan = {
    packageManager: 'pnpm',
    preconditions: {},
    projectRoot: '/app',
    preset: result.preset,
    provenance: result.provenance,
    changes: [],
    managedDeclarations: [],
    dependencyPlan: [],
    diagnostics: [
      {
        code: 'FILE_CONFLICT',
        message: 'Recipe revision changed; install a new revision',
        path: 'rc_primary-button@2',
      },
    ],
    networkAccess: false,
    recipe: {
      ...identity,
      importPath: '@/components/ui/recipes/rc_primary-button/r2/button',
      examplePath: 'src/ombelle-examples/recipes/rc_primary-button/r2.tsx',
    },
  }
  const text = formatPlan('add', 'conflict', plan)
  for (const value of [
    result.recipe.hash,
    result.preset.hash,
    result.scope,
    result.darkSelector,
    result.provenance.catalogRelease,
    result.provenance.compilerVersion,
    'install a new revision',
    'rc_primary-button@2',
  ])
    expect(text).toContain(value)
})
